import threading
from datetime import datetime
from time import time
from typing import Any

import httpx
from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, Request, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import fhir, minio_client, models
from .config import get_settings
from .crypto import encrypt_text
from .db import Base, engine, get_db
from .schemas import ConsentCreate, InferenceCreate, ObservationCreate, PatientCreate, PatientPatch, Principal, SignRiskReport
from .security import current_principal, require_admin, require_medico, require_reader


settings = get_settings()
app = FastAPI(title=settings.app_name, version="2.0.0", docs_url="/docs", redoc_url="/redoc")
_origins = settings.cors_origin_list
_wildcard = _origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=not _wildcard,
    allow_methods=["*"],
    allow_headers=["*"],
)

_rate_buckets: dict[str, list[float]] = {}
_inference_semaphore = threading.Semaphore(4)


@app.on_event("startup")
def startup() -> None:
    try:
        Base.metadata.create_all(bind=engine)
        ensure_runtime_columns()
    except Exception:
        # Non-fatal: app still starts; DB endpoints will fail individually.
        pass
    try:
        minio_client.ensure_bucket()
    except Exception:
        pass


def ensure_runtime_columns() -> None:
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    with engine.begin() as conn:
        if "imaging_studies" in tables:
            existing = {c["name"] for c in inspector.get_columns("imaging_studies")}
            for col, sql_type in {"minio_object_name": "TEXT", "content_type": "VARCHAR(120)"}.items():
                if col not in existing:
                    conn.execute(text(f"ALTER TABLE imaging_studies ADD COLUMN {col} {sql_type}"))
        if "patients" in tables:
            existing = {c["name"] for c in inspector.get_columns("patients")}
            if "closed_at" not in existing:
                conn.execute(text("ALTER TABLE patients ADD COLUMN closed_at TIMESTAMP"))


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if request.url.path in {"/docs", "/openapi.json", "/redoc"}:
        return await call_next(request)
    key = request.headers.get("X-Access-Key") or (request.client.host if request.client else "anonymous")
    now = time()
    window = now - 60
    bucket = [ts for ts in _rate_buckets.get(key, []) if ts >= window]
    if len(bucket) >= settings.rate_limit_per_minute:
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Too Many Requests"},
            headers={"Retry-After": "60"},
        )
    bucket.append(now)
    _rate_buckets[key] = bucket
    return await call_next(request)


def audit(
    db: Session,
    principal: Principal | None,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    patient_id: str | None = None,
    result: str = "SUCCESS",
    request: Request | None = None,
) -> None:
    db.add(
        models.AuditLog(
            user_id=principal.user_id if principal else None,
            actor=principal.username if principal else None,
            role=principal.role if principal else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            patient_id=patient_id,
            result=result,
            ip=request.client.host if request and request.client else None,
        )
    )


def ensure_patient_visible(patient_id: str, principal: Principal) -> None:
    if principal.role == "paciente" and (not principal.patient_id or principal.patient_id != patient_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Patient role can only access own record")


def risk_category(score: float) -> str:
    if score >= 0.85:
        return "CRITICAL"
    if score >= 0.60:
        return "HIGH"
    if score >= 0.30:
        return "MODERATE"
    return "LOW"


def database_label() -> str:
    return "local SQLite (development only)" if settings.database_url.startswith("sqlite") else "Supabase PostgreSQL"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "database": database_label(), "dataset": "MIMIC-IV + MIMIC-CXR-JPG"}



@app.get("/data/status")
def data_status(
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Operational view of the real MIMIC -> Supabase -> MinIO pipeline."""
    media_with_objects = (
        db.query(models.ImagingStudy)
        .filter(models.ImagingStudy.minio_object_name.isnot(None))
        .count()
    )
    latest_media = (
        db.query(models.ImagingStudy)
        .filter(models.ImagingStudy.minio_object_name.isnot(None))
        .order_by(models.ImagingStudy.created_at.desc())
        .first()
    )
    sample_url = minio_client.presigned_url(latest_media.minio_object_name) if latest_media else None
    return {
        "dataset": "MIMIC-IV + MIMIC-CXR-JPG",
        "storage": {
            "database": database_label(),
            "image_bucket": settings.minio_bucket,
            "media_provider": "MinIO S3-compatible",
        },
        "counts": {
            "patients": db.query(models.Patient).filter_by(active=True).count(),
            "encounters": db.query(models.Encounter).count(),
            "observations": db.query(models.Observation).count(),
            "media": db.query(models.ImagingStudy).count(),
            "media_with_minio_objects": media_with_objects,
            "diagnostic_reports": db.query(models.DiagnosticReport).count(),
            "risk_reports": db.query(models.RiskReport).count(),
            "consents": db.query(models.Consent).count(),
        },
        "latest_image_url": sample_url,
        "ready": media_with_objects > 0,
        "principal": {"role": principal.role, "username": principal.username},
    }


@app.post("/auth/validate-keys")
def validate_keys(principal: Principal = Depends(current_principal)) -> dict[str, Any]:
    return {"valid": True, "principal": principal.model_dump()}


@app.get("/fhir/Patient")
def list_patients(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    query = db.query(models.Patient).filter_by(active=True)
    if principal.role == "paciente" and principal.patient_id:
        query = query.filter(models.Patient.id == principal.patient_id)
    elif principal.role == "paciente":
        query = query.filter(models.Patient.id == "__no_patient_bound__")
    total = query.count()
    rows = query.order_by(models.Patient.created_at.desc()).offset(offset).limit(limit).all()
    audit(db, principal, "LIST_PATIENTS", "Patient", patient_id=principal.patient_id, request=request)
    db.commit()
    return fhir.bundle([fhir.patient_resource(row, principal.role in {"admin", "medico"}) for row in rows], total, limit, offset)


@app.post("/fhir/Patient", status_code=status.HTTP_201_CREATED)
def create_patient(
    body: PatientCreate,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    patient = models.Patient(
        source_dataset=body.source_dataset,
        source_subject_id=body.source_subject_id,
        name=body.name,
        gender=body.gender,
        birth_date=body.birthDate,
        identification_doc_encrypted=encrypt_text(body.identification_doc),
        medical_summary_encrypted=encrypt_text(body.medical_summary),
    )
    db.add(patient)
    db.flush()
    patient.fhir_json = fhir.patient_resource(patient, True)
    audit(db, principal, "CREATE_PATIENT", "Patient", patient.id, patient.id, request=request)
    db.commit()
    db.refresh(patient)
    return fhir.patient_resource(patient, True)


@app.get("/fhir/Patient/{patient_id}")
def get_patient(
    patient_id: str,
    request: Request,
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    ensure_patient_visible(patient_id, principal)
    patient = db.get(models.Patient, patient_id)
    if not patient or not patient.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    audit(db, principal, "VIEW_PATIENT", "Patient", patient.id, patient.id, request=request)
    db.commit()
    return fhir.patient_resource(patient, principal.role in {"admin", "medico"})


@app.patch("/fhir/Patient/{patient_id}")
def patch_patient(
    patient_id: str,
    body: PatientPatch,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    data = body.model_dump(exclude_unset=True)
    if "name" in data:
        patient.name = data["name"]
    if "gender" in data:
        patient.gender = data["gender"]
    if "birthDate" in data:
        patient.birth_date = data["birthDate"]
    if "identification_doc" in data:
        patient.identification_doc_encrypted = encrypt_text(data["identification_doc"])
    if "medical_summary" in data:
        patient.medical_summary_encrypted = encrypt_text(data["medical_summary"])
    if "active" in data and principal.role == "admin":
        patient.active = bool(data["active"])
    audit(db, principal, "UPDATE_PATIENT", "Patient", patient.id, patient.id, request=request)
    db.commit()
    db.refresh(patient)
    return fhir.patient_resource(patient, True)


@app.delete("/fhir/Patient/{patient_id}")
def delete_patient(
    patient_id: str,
    request: Request,
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    patient.active = False
    audit(db, principal, "SOFT_DELETE_PATIENT", "Patient", patient.id, patient.id, request=request)
    db.commit()
    return {"status": "soft-deleted", "id": patient_id}


@app.get("/fhir/Observation")
def list_observations(
    request: Request,
    patient_id: str | None = None,
    limit: int = Query(10, ge=1, le=200),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if patient_id:
        ensure_patient_visible(patient_id, principal)
    query = db.query(models.Observation)
    if patient_id:
        query = query.filter(models.Observation.patient_id == patient_id)
    elif principal.role == "paciente" and principal.patient_id:
        query = query.filter(models.Observation.patient_id == principal.patient_id)
    elif principal.role == "paciente":
        query = query.filter(models.Observation.patient_id == "__no_patient_bound__")
    total = query.count()
    rows = query.order_by(models.Observation.effective_at.desc()).offset(offset).limit(limit).all()
    audit(db, principal, "LIST_OBSERVATIONS", "Observation", patient_id=patient_id, request=request)
    db.commit()
    return fhir.bundle([fhir.observation_resource(row) for row in rows], total, limit, offset)


@app.post("/fhir/Observation", status_code=status.HTTP_201_CREATED)
def create_observation(
    body: ObservationCreate,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not db.get(models.Patient, body.patient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    row = models.Observation(
        patient_id=body.patient_id,
        encounter_id=body.encounter_id,
        code=body.code,
        display=body.display,
        value=body.value,
        unit=body.unit,
        source_itemid=body.source_itemid,
        effective_at=body.effectiveDateTime or datetime.utcnow(),
    )
    db.add(row)
    db.flush()
    row.fhir_json = fhir.observation_resource(row)
    audit(db, principal, "CREATE_OBSERVATION", "Observation", row.id, body.patient_id, request=request)
    db.commit()
    db.refresh(row)
    return fhir.observation_resource(row)


@app.get("/fhir/DiagnosticReport")
def list_diagnostic_reports(
    request: Request,
    patient_id: str | None = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if patient_id:
        ensure_patient_visible(patient_id, principal)
    query = db.query(models.DiagnosticReport)
    if patient_id:
        query = query.filter(models.DiagnosticReport.patient_id == patient_id)
    total = query.count()
    rows = query.order_by(models.DiagnosticReport.created_at.desc()).offset(offset).limit(limit).all()
    audit(db, principal, "LIST_DIAGNOSTIC_REPORTS", "DiagnosticReport", patient_id=patient_id, request=request)
    db.commit()
    resources = []
    base = str(request.base_url).rstrip("/")
    for row in rows:
        media = db.get(models.ImagingStudy, row.imaging_study_id) if row.imaging_study_id else None
        if media and media.minio_object_name:
            media.image_url = f"{base}/media/proxy/{media.minio_object_name}"
        resources.append(fhir.diagnostic_report_resource(row, media))
    return fhir.bundle(resources, total, limit, offset)


@app.get("/fhir/Media")
def list_media(
    request: Request,
    patient_id: str | None = None,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if patient_id:
        ensure_patient_visible(patient_id, principal)
    query = db.query(models.ImagingStudy)
    if patient_id:
        query = query.filter(models.ImagingStudy.patient_id == patient_id)
    total = query.count()
    rows = query.order_by(models.ImagingStudy.created_at.desc()).offset(offset).limit(limit).all()
    base = str(request.base_url).rstrip("/")
    for row in rows:
        if row.minio_object_name:
            row.image_url = f"{base}/media/proxy/{row.minio_object_name}"
    audit(db, principal, "LIST_MEDIA", "Media", patient_id=patient_id, request=request)
    db.commit()
    return fhir.bundle([fhir.media_resource(row) for row in rows], total, limit, offset)


@app.get("/media/proxy/{object_path:path}", include_in_schema=False)
async def proxy_media(object_path: str) -> Response:
    """Serves MinIO objects through the backend — avoids browser cross-origin issues."""
    settings = get_settings()
    url = f"http://{settings.minio_endpoint}/{settings.minio_bucket}/{object_path}"
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(url)
        if r.status_code != 200:
            raise HTTPException(404, "Media object not found")
        ctype = r.headers.get("content-type", "image/svg+xml")
        return Response(
            content=r.content,
            media_type=ctype,
            headers={
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except httpx.RequestError:
        raise HTTPException(503, "Storage service unavailable")


@app.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    patient_id: str = Form(...),
    source_study_id: str = Form(...),
    source_dicom_id: str | None = Form(default=None),
    modality: str = Form(default="CR"),
    conclusion: str | None = Form(default=None),
    conclusion_code: str | None = Form(default="404684003"),
    file: UploadFile = File(...),
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not db.get(models.Patient, patient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    object_name, content_type = await minio_client.put_upload(patient_id, file, "source")
    url = minio_client.presigned_url(object_name)
    study = models.ImagingStudy(
        patient_id=patient_id,
        source_study_id=source_study_id,
        source_dicom_id=source_dicom_id,
        modality=modality,
        minio_object_name=object_name,
        content_type=content_type,
        image_url=url,
    )
    db.add(study)
    db.flush()
    study.fhir_json = fhir.media_resource(study)
    report = None
    if conclusion:
        report = models.DiagnosticReport(
            patient_id=patient_id,
            imaging_study_id=study.id,
            conclusion=conclusion,
            conclusion_code=conclusion_code,
        )
        db.add(report)
        db.flush()
        report.fhir_json = fhir.diagnostic_report_resource(report, study)
    audit(db, principal, "UPLOAD_IMAGE", "Media", study.id, patient_id, request=request)
    db.commit()
    db.refresh(study)
    response = {"media": fhir.media_resource(study)}
    if report:
        response["diagnostic_report"] = fhir.diagnostic_report_resource(report, study)
    return response


def create_inference(body: InferenceCreate, principal: Principal, db: Session, request: Request) -> dict[str, Any]:
    patient = db.get(models.Patient, body.patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")

    # Phase 1 — PENDING: register job immediately so callers can poll
    job = models.InferenceJob(
        patient_id=body.patient_id,
        model_type=body.model_type,
        status="PENDING",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    with _inference_semaphore:
        # Phase 2 — RUNNING
        job.status = "RUNNING"
        db.commit()

        try:
            obs_count = db.query(models.Observation).filter_by(patient_id=body.patient_id).count()
            media_count = db.query(models.ImagingStudy).filter_by(patient_id=body.patient_id).count()
            base = min(0.95, 0.15 + obs_count * 0.035 + media_count * 0.10)
            if body.model_type == "DL":
                score = min(0.98, base + 0.12)
            elif body.model_type == "MULTIMODAL":
                score = min(0.99, base + 0.20)
            else:
                score = base

            report = models.RiskReport(
                patient_id=body.patient_id,
                model_type=body.model_type,
                risk_score=round(score, 4),
                risk_category=risk_category(score),
                sensitive_payload_encrypted=encrypt_text(
                    str({"features": body.features, "image_url": body.image_url})
                ),
                explanation={
                    "dataset": "MIMIC-IV + MIMIC-CXR-JPG",
                    "method": "MIMIC-IV observations and MIMIC-CXR-JPG media scoring adapter",
                    "signals": {"observations": obs_count, "media": media_count},
                },
            )
            db.add(report)
            db.flush()
            report.fhir_json = fhir.risk_assessment_resource(report)

            # Phase 3 — DONE
            job.status = "DONE"
            job.result_id = report.id
            job.finished_at = datetime.utcnow()
            audit(db, principal, f"RUN_INFERENCE_{body.model_type}", "RiskAssessment", report.id, body.patient_id, request=request)
            db.commit()
        except Exception as exc:
            job.status = "ERROR"
            job.error = str(exc)
            db.commit()
            raise

    return {"job_id": job.id, "status": job.status, "risk_report": fhir.risk_assessment_resource(report)}


@app.post("/infer/ml")
def infer_ml(
    body: InferenceCreate,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    body.model_type = "ML"
    return create_inference(body, principal, db, request)


@app.post("/infer/dl")
def infer_dl(
    body: InferenceCreate,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    body.model_type = "DL"
    return create_inference(body, principal, db, request)


@app.post("/infer")
def infer(
    body: InferenceCreate,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    return create_inference(body, principal, db, request)


@app.get("/infer/jobs/{job_id}")
def get_job(
    job_id: str,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    job = db.get(models.InferenceJob, job_id)
    if not job:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inference job not found")
    return {
        "id": job.id,
        "patient_id": job.patient_id,
        "model_type": job.model_type,
        "status": job.status,
        "result_id": job.result_id,
        "created_at": job.created_at,
        "finished_at": job.finished_at,
    }


@app.patch("/risk-reports/{risk_report_id}/sign")
def sign_risk_report(
    risk_report_id: str,
    body: SignRiskReport,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    report = db.get(models.RiskReport, risk_report_id)
    if not report:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Risk report not found")
    report.signed_by = principal.user_id
    report.signed_at = datetime.utcnow()
    report.clinical_note_encrypted = encrypt_text(body.clinical_note)
    report.fhir_json = fhir.risk_assessment_resource(report)
    audit(db, principal, f"SIGN_RISK_REPORT_{body.decision}", "RiskAssessment", report.id, report.patient_id, request=request)
    db.commit()
    db.refresh(report)
    return fhir.risk_assessment_resource(report)


@app.patch("/fhir/Patient/{patient_id}/close")
def close_patient(
    patient_id: str,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    patient = db.get(models.Patient, patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    unsigned = (
        db.query(models.RiskReport)
        .filter_by(patient_id=patient_id)
        .filter(models.RiskReport.signed_at.is_(None))
        .count()
    )
    if unsigned:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Cannot close patient: {unsigned} RiskReport(s) require physician signature before closing",
        )
    patient.closed_at = datetime.utcnow()
    audit(db, principal, "CLOSE_PATIENT", "Patient", patient_id, patient_id, request=request)
    db.commit()
    return {"patient_id": patient_id, "closed_at": patient.closed_at.isoformat(), "status": "closed"}


@app.get("/audit-log")
def list_audit_log(
    actor: str | None = None,
    role: str | None = None,
    action: str | None = None,
    patient_id: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    query = db.query(models.AuditLog)
    if actor:
        query = query.filter(models.AuditLog.actor == actor)
    if role:
        query = query.filter(models.AuditLog.role == role)
    if action:
        query = query.filter(models.AuditLog.action == action)
    if patient_id:
        query = query.filter(models.AuditLog.patient_id == patient_id)
    total = query.count()
    rows = query.order_by(models.AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return fhir.bundle([fhir.audit_event_resource(row) for row in rows], total, limit, offset)


@app.get("/consents")
def list_consents(
    patient_id: str | None = None,
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    principal: Principal = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if patient_id:
        ensure_patient_visible(patient_id, principal)
    query = db.query(models.Consent)
    if patient_id:
        query = query.filter(models.Consent.patient_id == patient_id)
    elif principal.role == "paciente" and principal.patient_id:
        query = query.filter(models.Consent.patient_id == principal.patient_id)
    elif principal.role == "paciente":
        query = query.filter(models.Consent.patient_id == "__no_patient_bound__")
    total = query.count()
    rows = query.order_by(models.Consent.created_at.desc()).offset(offset).limit(limit).all()
    return fhir.bundle([fhir.consent_resource(row) for row in rows], total, limit, offset)


@app.post("/consents", status_code=status.HTTP_201_CREATED)
def create_consent(
    body: ConsentCreate,
    request: Request,
    principal: Principal = Depends(require_medico),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not db.get(models.Patient, body.patient_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    row = models.Consent(patient_id=body.patient_id, scope=body.scope, granted=body.granted)
    db.add(row)
    db.flush()
    row.fhir_json = fhir.consent_resource(row)
    audit(db, principal, "CREATE_CONSENT", "Consent", row.id, body.patient_id, request=request)
    db.commit()
    db.refresh(row)
    return fhir.consent_resource(row)
