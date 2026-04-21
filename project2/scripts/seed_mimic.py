"""Seed authorized MIMIC-IV + MIMIC-CXR-JPG files into the platform database.

This script does not ship, download, or fabricate clinical records. It expects
real files downloaded under the PhysioNet DUA/CITI workflow.

Expected input layout:

    datasets/
      mimic-iv/
        hosp/
          patients.csv.gz
          admissions.csv.gz
          labevents.csv.gz
          d_labitems.csv.gz
      mimic-cxr-jpg/
        mimic-cxr-2.0.0-metadata.csv.gz
        mimic-cxr-2.0.0-chexpert.csv.gz       # optional
        files/pXX/pXXXXXXXX/sXXXXXXXX/*.jpg

Run from project2:

    python scripts/seed_mimic.py --limit-subjects 30 --max-labs-per-subject 8 --max-images 30

Run in Docker Compose:

    docker compose --profile seed run --rm seed
"""

from __future__ import annotations

import argparse
import csv
import gzip
import os
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(os.environ.get("BACKEND_DIR", "/app" if Path("/app/app").exists() else str(ROOT / "backend")))
sys.path.append(str(BACKEND_DIR))

from app import minio_client  # noqa: E402
from app.crypto import encrypt_text  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.fhir import diagnostic_report_resource, media_resource, observation_resource, patient_resource  # noqa: E402
from app.models import Consent, DiagnosticReport, Encounter, ImagingStudy, Observation, Patient, User  # noqa: E402


DEFAULT_MIMIC_IV = Path(os.environ.get("MIMIC_IV_DIR", str(ROOT / "datasets" / "mimic-iv")))
DEFAULT_MIMIC_CXR = Path(os.environ.get("MIMIC_CXR_JPG_DIR", str(ROOT / "datasets" / "mimic-cxr-jpg")))


def open_text(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, mode="rt", encoding="utf-8", newline="")
    return path.open(mode="r", encoding="utf-8", newline="")


def required(path: Path) -> Path:
    if not path.exists():
        raise FileNotFoundError(
            f"Required MIMIC file not found: {path}\n"
            "Place authorized PhysioNet files in project2/datasets/mimic-iv and "
            "project2/datasets/mimic-cxr-jpg. Do not commit those files."
        )
    return path


def rows(path: Path) -> Iterable[dict[str, str]]:
    with open_text(path) as fh:
        yield from csv.DictReader(fh)


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    return None


def pseudo_birth_date(anchor_age: str | None, anchor_year: str | None) -> str | None:
    try:
        age = int(float(anchor_age or ""))
        year = int(float(anchor_year or ""))
    except ValueError:
        return None
    if age > 89:
        age = 90
    return f"{year - age:04d}-01-01"


def load_lab_dictionary(mimic_iv: Path) -> dict[str, dict[str, str]]:
    dictionary: dict[str, dict[str, str]] = {}
    for row in rows(required(mimic_iv / "hosp" / "d_labitems.csv.gz")):
        itemid = row.get("itemid")
        if itemid:
            dictionary[itemid] = {
                "label": row.get("label") or f"Lab item {itemid}",
                "loinc_code": row.get("loinc_code") or f"mimic-itemid-{itemid}",
            }
    return dictionary


def discover_cxr_subjects(mimic_cxr: Path, limit_subjects: int, max_images: int) -> list[str]:
    """Prefer subjects that have an actual JPG object on disk.

    MIMIC-IV and MIMIC-CXR overlap by `subject_id`, but selecting the first N
    rows from MIMIC-IV can easily produce a cohort with zero linked images.
    This pass makes the sample clinically useful for the Corte 2 review: each
    preferred subject has at least one local CXR JPG ready to upload to MinIO.
    """
    preferred: list[str] = []
    seen: set[str] = set()
    image_count = 0
    for row in rows(required(mimic_cxr / "mimic-cxr-2.0.0-metadata.csv.gz")):
        subject_id = row.get("subject_id")
        study_id = row.get("study_id")
        dicom_id = row.get("dicom_id")
        if not subject_id or not study_id or not dicom_id:
            continue
        if not cxr_file_path(mimic_cxr, subject_id, study_id, dicom_id).exists():
            continue
        image_count += 1
        if subject_id not in seen:
            seen.add(subject_id)
            preferred.append(subject_id)
        if len(preferred) >= limit_subjects and image_count >= max_images:
            break
    if not preferred:
        raise RuntimeError(
            "No local MIMIC-CXR-JPG files were found from metadata. "
            "Verify project2/datasets/mimic-cxr-jpg/files/pXX/pSUBJECT/sSTUDY/*.jpg."
        )
    return preferred


def select_subjects(mimic_iv: Path, limit: int, preferred_subject_ids: list[str]) -> list[dict[str, str]]:
    preferred = set(preferred_subject_ids)
    selected: list[dict[str, str]] = []
    fallback: list[dict[str, str]] = []
    for row in rows(required(mimic_iv / "hosp" / "patients.csv.gz")):
        if row.get("subject_id") in preferred:
            selected.append(row)
        elif len(fallback) < limit:
            fallback.append(row)
        if len(selected) >= limit:
            break
    if len(selected) < limit:
        needed = limit - len(selected)
        selected.extend(fallback[:needed])
    if not selected:
        raise RuntimeError("No subjects found in MIMIC-IV patients.csv.gz")
    return selected


def load_first_admissions(mimic_iv: Path, subjects: set[str]) -> dict[str, dict[str, str]]:
    admissions: dict[str, dict[str, str]] = {}
    for row in rows(required(mimic_iv / "hosp" / "admissions.csv.gz")):
        subject_id = row.get("subject_id")
        if subject_id in subjects and subject_id not in admissions:
            admissions[subject_id] = row
        if len(admissions) == len(subjects):
            break
    return admissions


def load_labs(
    mimic_iv: Path,
    subjects: set[str],
    lab_dict: dict[str, dict[str, str]],
    max_labs_per_subject: int,
) -> dict[str, list[dict[str, str]]]:
    labs: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows(required(mimic_iv / "hosp" / "labevents.csv.gz")):
        subject_id = row.get("subject_id")
        if subject_id not in subjects or len(labs[subject_id]) >= max_labs_per_subject:
            continue
        if not row.get("valuenum"):
            continue
        item = lab_dict.get(row.get("itemid") or "", {})
        row["display"] = item.get("label") or f"Lab item {row.get('itemid')}"
        row["loinc_code"] = item.get("loinc_code") or f"mimic-itemid-{row.get('itemid')}"
        labs[subject_id].append(row)
        if all(len(labs[s]) >= max_labs_per_subject for s in subjects):
            break
    return labs


def load_chexpert_labels(mimic_cxr: Path) -> dict[tuple[str, str], str]:
    path = mimic_cxr / "mimic-cxr-2.0.0-chexpert.csv.gz"
    if not path.exists():
        return {}
    labels: dict[tuple[str, str], str] = {}
    ignored = {"subject_id", "study_id"}
    for row in rows(path):
        positives = [k for k, v in row.items() if k not in ignored and v and v.strip() == "1.0"]
        uncertain = [k for k, v in row.items() if k not in ignored and v and v.strip() == "-1.0"]
        parts = []
        if positives:
            parts.append("Positive labels: " + ", ".join(positives))
        if uncertain:
            parts.append("Uncertain labels: " + ", ".join(uncertain))
        labels[(row["subject_id"], row["study_id"])] = " ".join(parts) or "No positive CheXpert label."
    return labels


def cxr_file_path(mimic_cxr: Path, subject_id: str, study_id: str, dicom_id: str) -> Path:
    return mimic_cxr / "files" / f"p{subject_id[:2]}" / f"p{subject_id}" / f"s{study_id}" / f"{dicom_id}.jpg"


def load_cxr_metadata(mimic_cxr: Path, subjects: set[str], max_images: int) -> dict[str, list[dict[str, str]]]:
    images: dict[str, list[dict[str, str]]] = defaultdict(list)
    total = 0
    for row in rows(required(mimic_cxr / "mimic-cxr-2.0.0-metadata.csv.gz")):
        subject_id = row.get("subject_id")
        dicom_id = row.get("dicom_id")
        study_id = row.get("study_id")
        if subject_id not in subjects or not dicom_id or not study_id:
            continue
        file_path = cxr_file_path(mimic_cxr, subject_id, study_id, dicom_id)
        if not file_path.exists():
            continue
        row["image_path"] = str(file_path)
        row["modality"] = row.get("modality") or "CR"
        images[subject_id].append(row)
        total += 1
        if total >= max_images:
            break
    return images


def upsert_patient(db, row: dict[str, str]) -> Patient:
    subject_id = row["subject_id"]
    patient = db.query(Patient).filter_by(source_subject_id=subject_id).first()
    if not patient:
        patient = Patient(
            source_dataset="MIMIC-IV",
            source_subject_id=subject_id,
            name=f"MIMIC subject {subject_id}",
            gender=(row.get("gender") or "").lower() or None,
            birth_date=pseudo_birth_date(row.get("anchor_age"), row.get("anchor_year")),
            identification_doc_encrypted=encrypt_text(f"mimic-iv:subject_id:{subject_id}"),
            medical_summary_encrypted=encrypt_text(
                f"Authorized MIMIC-IV subject. anchor_year_group={row.get('anchor_year_group') or 'unknown'}"
            ),
        )
        db.add(patient)
        db.flush()
    patient.fhir_json = patient_resource(patient, True)
    return patient


def upsert_encounter(db, patient: Patient, row: dict[str, str] | None) -> Encounter | None:
    if not row or not row.get("hadm_id"):
        return None
    encounter = db.query(Encounter).filter_by(source_hadm_id=row["hadm_id"]).first()
    if not encounter:
        encounter = Encounter(
            patient_id=patient.id,
            source_hadm_id=row["hadm_id"],
            status="finished" if row.get("dischtime") else "in-progress",
            class_code=(row.get("admission_type") or "inpatient").lower(),
            started_at=parse_dt(row.get("admittime")),
            ended_at=parse_dt(row.get("dischtime")),
        )
        db.add(encounter)
        db.flush()
    return encounter


def add_observations(db, patient: Patient, encounter: Encounter | None, lab_rows: list[dict[str, str]]) -> int:
    created = 0
    for lab in lab_rows:
        itemid = lab.get("itemid")
        charttime = parse_dt(lab.get("charttime")) or datetime.utcnow()
        exists = db.query(Observation).filter_by(patient_id=patient.id, source_itemid=itemid, effective_at=charttime).first()
        if exists:
            continue
        try:
            value = float(lab["valuenum"])
        except (TypeError, ValueError):
            continue
        obs = Observation(
            patient_id=patient.id,
            encounter_id=encounter.id if encounter else None,
            code=lab.get("loinc_code") or f"mimic-itemid-{itemid}",
            display=lab.get("display") or f"Lab item {itemid}",
            value=value,
            unit=lab.get("valueuom") or None,
            effective_at=charttime,
            source_itemid=itemid,
        )
        db.add(obs)
        db.flush()
        obs.fhir_json = observation_resource(obs)
        created += 1
    return created


def add_images(db, patient: Patient, image_rows: list[dict[str, str]], labels: dict[tuple[str, str], str]) -> int:
    created = 0
    for image in image_rows:
        source_study_id = image["study_id"]
        source_dicom_id = image["dicom_id"]
        if db.query(ImagingStudy).filter_by(source_dicom_id=source_dicom_id).first():
            continue
        image_path = Path(image["image_path"])
        object_name = f"patients/{patient.id}/mimic-cxr-jpg/{source_study_id}/{source_dicom_id}.jpg"
        minio_object_name, content_type = minio_client.put_file(patient.id, image_path, "mimic-cxr-jpg", object_name)
        study = ImagingStudy(
            patient_id=patient.id,
            source_study_id=source_study_id,
            source_dicom_id=source_dicom_id,
            modality=image.get("modality") or "CR",
            minio_object_name=minio_object_name,
            content_type=content_type,
            image_url=minio_client.presigned_url(minio_object_name),
        )
        db.add(study)
        db.flush()
        study.fhir_json = media_resource(study)
        report = DiagnosticReport(
            patient_id=patient.id,
            imaging_study_id=study.id,
            conclusion=labels.get((image["subject_id"], source_study_id), "MIMIC-CXR image available; labels not loaded."),
            conclusion_code="404684003",
        )
        db.add(report)
        db.flush()
        report.fhir_json = diagnostic_report_resource(report, study)
        created += 1
    return created


def add_consent(db, patient: Patient) -> None:
    if not db.query(Consent).filter_by(patient_id=patient.id, scope="RESEARCH_DUA").first():
        db.add(Consent(patient_id=patient.id, scope="RESEARCH_DUA", granted=True))


def bind_patient_user(db, patient: Patient) -> None:
    user = db.query(User).filter_by(username="paciente").first()
    if user and not user.patient_id:
        user.patient_id = patient.id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed authorized MIMIC-IV + MIMIC-CXR-JPG records.")
    parser.add_argument("--mimic-iv-root", type=Path, default=DEFAULT_MIMIC_IV)
    parser.add_argument("--mimic-cxr-root", type=Path, default=DEFAULT_MIMIC_CXR)
    parser.add_argument("--limit-subjects", type=int, default=int(os.environ.get("MIMIC_SAMPLE_SIZE", "30")))
    parser.add_argument("--max-labs-per-subject", type=int, default=int(os.environ.get("MIMIC_OBS_PER_PATIENT", "8")))
    parser.add_argument("--max-images", type=int, default=int(os.environ.get("MIMIC_IMAGE_LIMIT", "15")))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    Base.metadata.create_all(bind=engine)
    lab_dict = load_lab_dictionary(args.mimic_iv_root)
    preferred_subjects = discover_cxr_subjects(args.mimic_cxr_root, args.limit_subjects, args.max_images)
    subject_rows = select_subjects(args.mimic_iv_root, args.limit_subjects, preferred_subjects)
    subject_ids = {row["subject_id"] for row in subject_rows}
    admissions = load_first_admissions(args.mimic_iv_root, subject_ids)
    labs = load_labs(args.mimic_iv_root, subject_ids, lab_dict, args.max_labs_per_subject)
    cxr_labels = load_chexpert_labels(args.mimic_cxr_root)
    cxr_images = load_cxr_metadata(args.mimic_cxr_root, subject_ids, args.max_images)

    db = SessionLocal()
    try:
        patient_count = observation_count = image_count = 0
        for row in subject_rows:
            patient = upsert_patient(db, row)
            if patient_count == 0:
                bind_patient_user(db, patient)
            encounter = upsert_encounter(db, patient, admissions.get(row["subject_id"]))
            observation_count += add_observations(db, patient, encounter, labs.get(row["subject_id"], []))
            image_count += add_images(db, patient, cxr_images.get(row["subject_id"], []), cxr_labels)
            add_consent(db, patient)
            patient_count += 1
        db.commit()
        print(
            "MIMIC seed complete: "
            f"{patient_count} patients, {observation_count} observations, {image_count} CXR images/reports."
        )
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as exc:
        raise SystemExit(str(exc)) from exc
