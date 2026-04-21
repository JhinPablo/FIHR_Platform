"""Seed a small MIMIC-like cohort without shipping MIMIC data in the repo.

This creates synthetic demo records with MIMIC-shaped source identifiers. For
real use, replace DEMO_ROWS with rows read from authorized MIMIC-IV and
MIMIC-CXR-JPG extracts.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT / "backend"))

from app.crypto import encrypt_text  # noqa: E402
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.fhir import diagnostic_report_resource, media_resource, observation_resource, patient_resource  # noqa: E402
from app.models import Consent, DiagnosticReport, ImagingStudy, Observation, Patient  # noqa: E402


DEMO_ROWS = [
    {
        "subject_id": "10000032",
        "hadm_id": "22595853",
        "study_id": "50414267",
        "dicom_id": "02aa804e-bde0afdd-112c0b34-7bc16630-4e384014",
        "name": "MIMIC Patient 10000032",
        "gender": "female",
        "birth": "1950-01-01",
        "labs": [("718-7", "Hemoglobin", 10.2, "g/dL"), ("2951-2", "Sodium", 138, "mmol/L")],
        "conclusion": "No acute cardiopulmonary abnormality in demo CXR label.",
    },
    {
        "subject_id": "10001217",
        "hadm_id": "24597018",
        "study_id": "58913004",
        "dicom_id": "8a099177-5e0c26a2-4aa2a7f5-aef1ca0b-9f39f974",
        "name": "MIMIC Patient 10001217",
        "gender": "male",
        "birth": "1964-01-01",
        "labs": [("33747-0", "Lactate", 2.4, "mmol/L"), ("8310-5", "Body temperature", 38.2, "Cel")],
        "conclusion": "Low-volume chest with mild bibasilar atelectatic opacity in demo label.",
    },
]


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for row in DEMO_ROWS:
            patient = db.query(Patient).filter_by(source_subject_id=row["subject_id"]).first()
            if not patient:
                patient = Patient(
                    source_subject_id=row["subject_id"],
                    source_dataset="MIMIC-IV demo extract",
                    name=row["name"],
                    gender=row["gender"],
                    birth_date=row["birth"],
                    identification_doc_encrypted=encrypt_text(f"mimic-subject:{row['subject_id']}"),
                    medical_summary_encrypted=encrypt_text("Demo row shaped like MIMIC-IV. Not real PHI."),
                )
                db.add(patient)
                db.flush()
            patient.fhir_json = patient_resource(patient, True)

            for code, display, value, unit in row["labs"]:
                exists = db.query(Observation).filter_by(patient_id=patient.id, code=code).first()
                if not exists:
                    obs = Observation(patient_id=patient.id, code=code, display=display, value=value, unit=unit)
                    db.add(obs)
                    db.flush()
                    obs.fhir_json = observation_resource(obs)

            study = db.query(ImagingStudy).filter_by(source_study_id=row["study_id"]).first()
            if not study:
                study = ImagingStudy(
                    patient_id=patient.id,
                    source_study_id=row["study_id"],
                    source_dicom_id=row["dicom_id"],
                    modality="CR",
                    image_url=f"https://physionet.org/files/mimic-cxr-jpg/demo/{row['dicom_id']}.jpg",
                )
                db.add(study)
                db.flush()
                study.fhir_json = media_resource(study)

            report = db.query(DiagnosticReport).filter_by(patient_id=patient.id, imaging_study_id=study.id).first()
            if not report:
                report = DiagnosticReport(
                    patient_id=patient.id,
                    imaging_study_id=study.id,
                    conclusion=row["conclusion"],
                    conclusion_code="404684003",
                )
                db.add(report)
                db.flush()
                report.fhir_json = diagnostic_report_resource(report)

            consent = db.query(Consent).filter_by(patient_id=patient.id, scope="HABEAS_DATA").first()
            if not consent:
                db.add(Consent(patient_id=patient.id, scope="HABEAS_DATA", granted=True))

        db.commit()
        print(f"Seeded {len(DEMO_ROWS)} MIMIC-shaped patients.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

