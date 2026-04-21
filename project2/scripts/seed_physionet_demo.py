"""Seed public PhysioNet demo datasets into Supabase/PostgreSQL and MinIO.

Input datasets:

- MIMIC-IV Clinical Database Demo on FHIR v2.1.0
- MIMIC-IV-ECG Demo v0.1

Expected local layout:

    datasets/
      mimic-iv-fhir-demo-2.1.0/
        fhir/
          MimicPatient.ndjson.gz
          MimicEncounter.ndjson.gz
          MimicObservationLabevents.ndjson.gz
      mimic-iv-ecg-demo-0.1/
        record_list.csv
        files/pSUBJECT/sSTUDY/STUDY.hea
        files/pSUBJECT/sSTUDY/STUDY.dat

Run from project2:

    python scripts/seed_physionet_demo.py

Run in Docker Compose:

    docker compose --profile seed run --rm seed
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import os
import struct
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = Path(os.environ.get("BACKEND_DIR", "/app" if Path("/app/app").exists() else str(ROOT / "backend")))
sys.path.append(str(BACKEND_DIR))

from app import minio_client  # noqa: E402
from app.crypto import encrypt_text  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.fhir import diagnostic_report_resource, media_resource, observation_resource, patient_resource  # noqa: E402
from app.models import Consent, DiagnosticReport, Encounter, ImagingStudy, Observation, Patient, User  # noqa: E402


DEFAULT_FHIR = Path(os.environ.get("MIMIC_FHIR_DEMO_DIR", str(ROOT / "datasets" / "mimic-iv-fhir-demo-2.1.0")))
DEFAULT_ECG = Path(os.environ.get("MIMIC_ECG_DEMO_DIR", str(ROOT / "datasets" / "mimic-iv-ecg-demo-0.1")))


def open_text(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, mode="rt", encoding="utf-8", newline="")
    return path.open(mode="r", encoding="utf-8", newline="")


def required(path: Path) -> Path:
    if not path.exists():
        raise FileNotFoundError(
            f"Required PhysioNet demo file not found: {path}\n"
            "Copy the public demo datasets into project2/datasets/mimic-iv-fhir-demo-2.1.0 "
            "and project2/datasets/mimic-iv-ecg-demo-0.1."
        )
    return path


def ndjson(path: Path) -> Iterable[dict[str, Any]]:
    with open_text(path) as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def csv_rows(path: Path) -> Iterable[dict[str, str]]:
    with open_text(path) as fh:
        yield from csv.DictReader(fh)


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
        return parsed.replace(tzinfo=None)
    except ValueError:
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(text, fmt)
            except ValueError:
                pass
    return None


def first_identifier(resource: dict[str, Any], contains: str | None = None) -> str | None:
    for identifier in resource.get("identifier", []):
        system = identifier.get("system", "")
        if contains is None or contains in system:
            value = identifier.get("value")
            if value:
                return str(value)
    return None


def subject_ref_id(resource: dict[str, Any]) -> str | None:
    reference = resource.get("subject", {}).get("reference")
    if not reference:
        return None
    return reference.split("/")[-1]


def patient_subject_id(resource: dict[str, Any]) -> str | None:
    return first_identifier(resource, "identifier/patient")


def patient_name(resource: dict[str, Any], subject_id: str) -> str:
    names = resource.get("name") or []
    if names:
        first = names[0]
        return first.get("text") or first.get("family") or f"Patient_{subject_id}"
    return f"Patient_{subject_id}"


def load_ecg_subjects(ecg_root: Path, limit_records: int) -> tuple[set[str], dict[str, list[dict[str, str]]]]:
    records_by_subject: dict[str, list[dict[str, str]]] = {}
    record_path = required(ecg_root / "record_list.csv")
    for row in csv_rows(record_path):
        subject_id = row.get("subject_id")
        rel = row.get("path")
        if not subject_id or not rel:
            continue
        base = ecg_root / rel
        if not base.with_suffix(".hea").exists() or not base.with_suffix(".dat").exists():
            continue
        records_by_subject.setdefault(subject_id, []).append(row)
        if sum(len(v) for v in records_by_subject.values()) >= limit_records:
            break
    if not records_by_subject:
        raise RuntimeError("No ECG WFDB records found. Verify record_list.csv and files/ layout.")
    return set(records_by_subject), records_by_subject


def load_fhir_patients(fhir_root: Path, preferred_subjects: set[str], limit: int) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    fallback: list[dict[str, Any]] = []
    for resource in ndjson(required(fhir_root / "fhir" / "MimicPatient.ndjson.gz")):
        subject_id = patient_subject_id(resource)
        if subject_id in preferred_subjects:
            selected.append(resource)
        elif len(fallback) < limit:
            fallback.append(resource)
        if len(selected) >= limit:
            break
    if len(selected) < limit:
        selected.extend(fallback[: limit - len(selected)])
    if not selected:
        raise RuntimeError("No Patient resources found in MimicPatient.ndjson.gz")
    return selected


def load_encounters(fhir_root: Path, patient_ids: set[str]) -> dict[str, dict[str, Any]]:
    encounters: dict[str, dict[str, Any]] = {}
    for resource in ndjson(required(fhir_root / "fhir" / "MimicEncounter.ndjson.gz")):
        patient_fhir_id = subject_ref_id(resource)
        if patient_fhir_id in patient_ids and patient_fhir_id not in encounters:
            encounters[patient_fhir_id] = resource
        if len(encounters) == len(patient_ids):
            break
    return encounters


def load_observations(fhir_root: Path, patient_ids: set[str], max_per_patient: int) -> dict[str, list[dict[str, Any]]]:
    observations: dict[str, list[dict[str, Any]]] = {pid: [] for pid in patient_ids}
    path = required(fhir_root / "fhir" / "MimicObservationLabevents.ndjson.gz")
    for resource in ndjson(path):
        patient_fhir_id = subject_ref_id(resource)
        if patient_fhir_id not in observations or len(observations[patient_fhir_id]) >= max_per_patient:
            continue
        if "valueQuantity" not in resource:
            continue
        observations[patient_fhir_id].append(resource)
        if all(len(rows) >= max_per_patient for rows in observations.values()):
            break
    return observations


def upsert_patient(db, resource: dict[str, Any]) -> Patient:
    fhir_id = resource["id"]
    subject_id = patient_subject_id(resource) or fhir_id
    patient = db.get(Patient, fhir_id) or db.query(Patient).filter_by(source_subject_id=subject_id).first()
    if not patient:
        patient = Patient(
            id=fhir_id,
            source_dataset="MIMIC-IV FHIR Demo v2.1.0",
            source_subject_id=subject_id,
            name=patient_name(resource, subject_id),
            gender=resource.get("gender"),
            birth_date=resource.get("birthDate"),
            identification_doc_encrypted=encrypt_text(f"physionet-demo:subject_id:{subject_id}"),
            medical_summary_encrypted=encrypt_text("Open-access PhysioNet MIMIC-IV demo on FHIR resource."),
        )
        db.add(patient)
        db.flush()
    patient.fhir_json = resource
    return patient


def upsert_encounter(db, patient: Patient, resource: dict[str, Any] | None) -> Encounter | None:
    if not resource:
        return None
    encounter = db.get(Encounter, resource["id"])
    if not encounter:
        period = resource.get("period") or {}
        encounter = Encounter(
            id=resource["id"],
            patient_id=patient.id,
            source_hadm_id=first_identifier(resource, "encounter-hosp") or resource["id"],
            status=resource.get("status") or "finished",
            class_code=(resource.get("class") or {}).get("code") or "inpatient",
            started_at=parse_dt(period.get("start")),
            ended_at=parse_dt(period.get("end")),
            fhir_json=resource,
        )
        db.add(encounter)
        db.flush()
    return encounter


def upsert_observations(db, patient: Patient, encounter: Encounter | None, resources: list[dict[str, Any]]) -> int:
    created = 0
    for resource in resources:
        if db.get(Observation, resource["id"]):
            continue
        coding = (resource.get("code", {}).get("coding") or [{}])[0]
        value = resource.get("valueQuantity") or {}
        row = Observation(
            id=resource["id"],
            patient_id=patient.id,
            encounter_id=encounter.id if encounter else None,
            code=str(coding.get("code") or "unknown"),
            display=coding.get("display") or resource.get("code", {}).get("text") or "FHIR Observation",
            value=value.get("value"),
            unit=value.get("unit") or value.get("code"),
            effective_at=parse_dt(resource.get("effectiveDateTime")) or datetime.utcnow(),
            source_itemid=first_identifier(resource, "observation-labevents"),
            fhir_json=resource,
        )
        db.add(row)
        created += 1
    return created


def read_wfdb_header(hea_path: Path) -> tuple[list[str], int, int]:
    lines = hea_path.read_text(encoding="utf-8").splitlines()
    head = lines[0].split()
    signal_count = int(head[1])
    sample_rate = int(float(head[2]))
    sample_count = int(head[3])
    labels = []
    for line in lines[1 : 1 + signal_count]:
        parts = line.split()
        labels.append(parts[-1] if parts else f"Lead {len(labels) + 1}")
    return labels, sample_rate, sample_count


def read_wfdb_int16(dat_path: Path, signal_count: int, sample_count: int) -> list[list[int]]:
    raw = dat_path.read_bytes()
    total_values = min(len(raw) // 2, signal_count * sample_count)
    values = struct.unpack("<" + "h" * total_values, raw[: total_values * 2])
    leads = [[] for _ in range(signal_count)]
    for index, value in enumerate(values):
        lead_index = index % signal_count
        leads[lead_index].append(value)
    return leads


def svg_polyline(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def build_ecg_preview_svg(hea_path: Path, dat_path: Path, subject_id: str, study_id: str) -> bytes:
    labels, sample_rate, sample_count = read_wfdb_header(hea_path)
    leads = read_wfdb_int16(dat_path, len(labels), sample_count)
    width = 1280
    lead_height = 72
    top = 72
    left = 82
    right = 24
    height = top + lead_height * len(labels) + 38
    usable_width = width - left - right
    max_points = 900
    step = max(1, sample_count // max_points)
    grid = []
    for x in range(left, width - right + 1, 40):
        grid.append(f'<line x1="{x}" y1="44" x2="{x}" y2="{height - 28}" class="minor"/>')
    for y in range(44, height - 28, 24):
        grid.append(f'<line x1="{left}" y1="{y}" x2="{width - right}" y2="{y}" class="minor"/>')
    for x in range(left, width - right + 1, 200):
        grid.append(f'<line x1="{x}" y1="44" x2="{x}" y2="{height - 28}" class="major"/>')

    traces = []
    for idx, lead in enumerate(leads):
        baseline = top + idx * lead_height + lead_height / 2
        sampled = lead[:sample_count:step]
        if not sampled:
            continue
        lo = min(sampled)
        hi = max(sampled)
        span = max(hi - lo, 1)
        scale = min(28.0 / span, 0.06)
        points = []
        denom = max(len(sampled) - 1, 1)
        center = (hi + lo) / 2
        for j, value in enumerate(sampled):
            x = left + (j / denom) * usable_width
            y = baseline - (value - center) * scale
            points.append((x, y))
        traces.append(f'<text x="24" y="{baseline + 4:.1f}" class="lead">{labels[idx]}</text>')
        traces.append(f'<line x1="{left}" y1="{baseline:.1f}" x2="{width - right}" y2="{baseline:.1f}" class="zero"/>')
        traces.append(f'<polyline points="{svg_polyline(points)}" class="trace"/>')

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="ECG preview {study_id}">
  <style>
    .bg {{ fill: #08111c; }}
    .minor {{ stroke: #19324b; stroke-width: 0.65; opacity: 0.75; }}
    .major {{ stroke: #2d5d85; stroke-width: 1; opacity: 0.55; }}
    .zero {{ stroke: #42627a; stroke-width: 0.8; opacity: 0.45; }}
    .trace {{ fill: none; stroke: #e7f7ff; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }}
    .lead {{ fill: #9dc7e0; font: 600 14px ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .title {{ fill: #f8fbff; font: 700 18px Inter, Arial, sans-serif; }}
    .meta {{ fill: #8aa9bd; font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }}
  </style>
  <rect class="bg" width="100%" height="100%"/>
  <text x="24" y="30" class="title">MIMIC-IV-ECG Demo · 12-lead diagnostic ECG</text>
  <text x="24" y="50" class="meta">subject_id={subject_id} · study_id={study_id} · {sample_rate} Hz · {sample_count} samples</text>
  {"".join(grid)}
  {"".join(traces)}
</svg>"""
    return svg.encode("utf-8")


def add_ecg_media(db, patient: Patient, ecg_root: Path, ecg_rows: list[dict[str, str]]) -> int:
    created = 0
    for row in ecg_rows:
        study_id = row["study_id"]
        base = ecg_root / row["path"]
        hea_path = base.with_suffix(".hea")
        dat_path = base.with_suffix(".dat")
        preview_object = f"patients/{patient.id}/mimic-iv-ecg-demo/{study_id}/preview.svg"
        preview_svg = build_ecg_preview_svg(hea_path, dat_path, patient.source_subject_id or "", study_id)
        minio_client.put_bytes(preview_object, preview_svg, "image/svg+xml")
        hea_object, hea_type = minio_client.put_file(
            patient.id,
            hea_path,
            "mimic-iv-ecg-demo",
            f"patients/{patient.id}/mimic-iv-ecg-demo/{study_id}/{hea_path.name}",
        )
        dat_object, _ = minio_client.put_file(
            patient.id,
            dat_path,
            "mimic-iv-ecg-demo",
            f"patients/{patient.id}/mimic-iv-ecg-demo/{study_id}/{dat_path.name}",
        )
        study = db.query(ImagingStudy).filter_by(source_dicom_id=study_id).first()
        if not study:
            study = ImagingStudy(
                patient_id=patient.id,
                source_study_id=study_id,
                source_dicom_id=study_id,
                modality="ECG",
            )
            db.add(study)
            db.flush()
            created += 1
        study.minio_object_name = preview_object
        study.content_type = "image/svg+xml"
        study.image_url = minio_client.presigned_url(preview_object)
        study.fhir_json = media_resource(study)
        report = db.query(DiagnosticReport).filter_by(imaging_study_id=study.id).first()
        if not report:
            report = DiagnosticReport(
                patient_id=patient.id,
                imaging_study_id=study.id,
                conclusion="",
                conclusion_code="164847006",
            )
            db.add(report)
            db.flush()
        report.conclusion = (
            "MIMIC-IV-ECG Demo WFDB diagnostic ECG record stored in MinIO with visible SVG preview. "
            f"Preview object: {preview_object}. Header object: {hea_object}. Signal object: {dat_object}. "
            f"ECG timestamp: {row.get('ecg_time') or 'not provided'}."
        )
        report.fhir_json = diagnostic_report_resource(report, study)
    return created


def add_consent(db, patient: Patient) -> None:
    if not db.query(Consent).filter_by(patient_id=patient.id, scope="PHYSIONET_OPEN_ACCESS_DEMO").first():
        db.add(Consent(patient_id=patient.id, scope="PHYSIONET_OPEN_ACCESS_DEMO", granted=True))


def bind_patient_user(db, patient: Patient) -> None:
    user = db.query(User).filter_by(username="paciente").first()
    if user and not user.patient_id:
        user.patient_id = patient.id


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed open-access PhysioNet MIMIC demo datasets.")
    parser.add_argument("--fhir-root", type=Path, default=DEFAULT_FHIR)
    parser.add_argument("--ecg-root", type=Path, default=DEFAULT_ECG)
    parser.add_argument("--limit-subjects", type=int, default=int(os.environ.get("PHYSIONET_DEMO_SAMPLE_SIZE", "30")))
    parser.add_argument("--max-observations-per-subject", type=int, default=int(os.environ.get("PHYSIONET_DEMO_OBS_PER_PATIENT", "8")))
    parser.add_argument("--max-ecg-records", type=int, default=int(os.environ.get("PHYSIONET_DEMO_ECG_LIMIT", "30")))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    Base.metadata.create_all(bind=engine)
    ecg_subjects, ecg_by_subject = load_ecg_subjects(args.ecg_root, args.max_ecg_records)
    patient_resources = load_fhir_patients(args.fhir_root, ecg_subjects, args.limit_subjects)
    patient_ids = {resource["id"] for resource in patient_resources}
    encounters = load_encounters(args.fhir_root, patient_ids)
    observations = load_observations(args.fhir_root, patient_ids, args.max_observations_per_subject)

    db = SessionLocal()
    try:
        patient_count = observation_count = ecg_count = 0
        for resource in patient_resources:
            patient = upsert_patient(db, resource)
            if patient_count == 0:
                bind_patient_user(db, patient)
            encounter = upsert_encounter(db, patient, encounters.get(resource["id"]))
            observation_count += upsert_observations(db, patient, encounter, observations.get(resource["id"], []))
            ecg_count += add_ecg_media(db, patient, args.ecg_root, ecg_by_subject.get(patient.source_subject_id or "", []))
            add_consent(db, patient)
            patient_count += 1
        db.commit()
        print(
            "PhysioNet demo seed complete: "
            f"{patient_count} patients, {observation_count} observations, {ecg_count} ECG WFDB records/reports."
        )
    finally:
        db.close()


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError as exc:
        raise SystemExit(str(exc)) from exc
