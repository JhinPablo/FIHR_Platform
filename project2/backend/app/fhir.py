from datetime import datetime
from typing import Any

from . import models


def patient_resource(patient: models.Patient, include_sensitive: bool = False) -> dict[str, Any]:
    resource = {
        "resourceType": "Patient",
        "id": patient.id,
        "active": patient.active,
        "name": [{"text": patient.name}],
        "gender": patient.gender,
        "birthDate": patient.birth_date,
        "extension": [
            {"url": "urn:uao:source-dataset", "valueString": patient.source_dataset},
            {"url": "urn:uao:mimic-subject-id", "valueString": patient.source_subject_id},
        ],
    }
    if include_sensitive:
        resource["identifier"] = [{"system": "urn:uao:encrypted-at-rest", "value": "available-to-authorized-role"}]
    return {k: v for k, v in resource.items() if v is not None}


def observation_resource(obs: models.Observation) -> dict[str, Any]:
    value = {"value": obs.value, "unit": obs.unit, "system": "http://unitsofmeasure.org", "code": obs.unit}
    return {
        "resourceType": "Observation",
        "id": obs.id,
        "status": "final",
        "subject": {"reference": f"Patient/{obs.patient_id}"},
        "encounter": {"reference": f"Encounter/{obs.encounter_id}"} if obs.encounter_id else None,
        "code": {"coding": [{"system": "http://loinc.org", "code": obs.code, "display": obs.display}]},
        "valueQuantity": value if obs.value is not None else None,
        "effectiveDateTime": obs.effective_at.isoformat(),
    }


def media_resource(study: models.ImagingStudy) -> dict[str, Any]:
    return {
        "resourceType": "Media",
        "id": study.id,
        "status": "completed",
        "subject": {"reference": f"Patient/{study.patient_id}"},
        "modality": {"coding": [{"system": "http://dicom.nema.org/resources/ontology/DCM", "code": study.modality}]},
        "content": {"url": study.image_url, "contentType": study.content_type or "image/jpeg"},
        "extension": [
            {"url": "urn:uao:mimic-study-id", "valueString": study.source_study_id},
            {"url": "urn:uao:mimic-dicom-id", "valueString": study.source_dicom_id},
            {"url": "urn:uao:minio-object", "valueString": study.minio_object_name},
        ],
    }


def diagnostic_report_resource(report: models.DiagnosticReport, media: models.ImagingStudy | None = None) -> dict[str, Any]:
    return {
        "resourceType": "DiagnosticReport",
        "id": report.id,
        "status": report.status,
        "subject": {"reference": f"Patient/{report.patient_id}"},
        "imagingStudy": [{"reference": f"ImagingStudy/{report.imaging_study_id}"}] if report.imaging_study_id else [],
        "media": [{"link": {"reference": f"Media/{media.id}"}}] if media else [],
        "presentedForm": [
            {
                "contentType": media.content_type or "image/jpeg",
                "url": media.image_url,
                "title": f"{media.modality} image from MinIO",
            }
        ]
        if media and media.image_url
        else [],
        "conclusion": report.conclusion,
        "conclusionCode": [{"coding": [{"system": "http://snomed.info/sct", "code": report.conclusion_code}]}]
        if report.conclusion_code
        else [],
        "issued": report.created_at.isoformat(),
    }


def risk_assessment_resource(report: models.RiskReport) -> dict[str, Any]:
    return {
        "resourceType": "RiskAssessment",
        "id": report.id,
        "status": "final" if report.signed_at else "preliminary",
        "subject": {"reference": f"Patient/{report.patient_id}"},
        "prediction": [
            {
                "outcome": {"text": f"{report.model_type} clinical risk"},
                "probabilityDecimal": report.risk_score,
                "qualitativeRisk": {"text": report.risk_category},
            }
        ],
        "basis": [{"display": "MIMIC-IV observations and MIMIC-CXR-JPG media"}],
        "performer": {"reference": f"Practitioner/{report.signed_by}"} if report.signed_by else None,
        "extension": [
            {"url": "urn:uao:model-type", "valueString": report.model_type},
            {"url": "urn:uao:explanation", "valueString": str(report.explanation)},
            {"url": "urn:uao:signed-at", "valueDateTime": report.signed_at.isoformat()} if report.signed_at else {},
        ],
    }


def audit_event_resource(row: models.AuditLog) -> dict[str, Any]:
    return {
        "resourceType": "AuditEvent",
        "id": row.id,
        "type": {"text": row.action},
        "action": "E" if row.result == "SUCCESS" else "R",
        "recorded": row.created_at.isoformat(),
        "outcome": "0" if row.result == "SUCCESS" else "8",
        "agent": [{"who": {"display": row.actor}, "requestor": True, "role": [{"text": row.role}]}],
        "entity": [{"what": {"reference": f"{row.entity_type}/{row.entity_id}"}}],
    }


def consent_resource(row: models.Consent) -> dict[str, Any]:
    return {
        "resourceType": "Consent",
        "id": row.id,
        "status": "active" if row.granted else "inactive",
        "patient": {"reference": f"Patient/{row.patient_id}"},
        "scope": {"text": row.scope},
        "dateTime": row.created_at.isoformat(),
    }


def bundle(resources: list[dict[str, Any]], total: int, limit: int, offset: int) -> dict[str, Any]:
    clean = []
    for resource in resources:
        clean.append({"resource": {k: v for k, v in resource.items() if v not in (None, {}, [])}})
    return {"resourceType": "Bundle", "type": "searchset", "total": total, "limit": limit, "offset": offset, "entry": clean}
