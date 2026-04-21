import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def uuid_str() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    role: Mapped[str] = mapped_column(String(24), index=True)
    patient_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("patients.id"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))
    access_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    permission_key: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    role: Mapped[str] = mapped_column(String(24), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped[User] = relationship("User")


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    source_dataset: Mapped[str] = mapped_column(String(80), default="MIMIC-IV")
    source_subject_id: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(180))
    gender: Mapped[str | None] = mapped_column(String(24), nullable=True)
    birth_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    identification_doc_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    medical_summary_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    observations: Mapped[list["Observation"]] = relationship("Observation", back_populates="patient")


class Encounter(Base):
    __tablename__ = "encounters"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    source_hadm_id: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="finished")
    class_code: Mapped[str] = mapped_column(String(40), default="inpatient")
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)


class Observation(Base):
    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    encounter_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("encounters.id"), nullable=True)
    code: Mapped[str] = mapped_column(String(80), index=True)
    display: Mapped[str] = mapped_column(String(180))
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(40), nullable=True)
    effective_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    source_itemid: Mapped[str | None] = mapped_column(String(80), nullable=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)

    patient: Mapped[Patient] = relationship("Patient", back_populates="observations")


class ImagingStudy(Base):
    __tablename__ = "imaging_studies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    source_study_id: Mapped[str] = mapped_column(String(80), index=True)
    source_dicom_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    modality: Mapped[str] = mapped_column(String(40), default="CR")
    minio_object_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DiagnosticReport(Base):
    __tablename__ = "diagnostic_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    imaging_study_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("imaging_studies.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="final")
    conclusion: Mapped[str] = mapped_column(Text)
    conclusion_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RiskReport(Base):
    __tablename__ = "risk_reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    model_type: Mapped[str] = mapped_column(String(20))
    risk_score: Mapped[float] = mapped_column(Float)
    risk_category: Mapped[str] = mapped_column(String(24))
    sensitive_payload_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[dict] = mapped_column(JSON, default=dict)
    signed_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    signed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    clinical_note_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    user_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    actor: Mapped[str | None] = mapped_column(String(80), nullable=True)
    role: Mapped[str | None] = mapped_column(String(24), nullable=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    entity_type: Mapped[str] = mapped_column(String(60))
    entity_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    patient_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    result: Mapped[str] = mapped_column(String(24), default="SUCCESS")
    ip: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    scope: Mapped[str] = mapped_column(String(80))
    granted: Mapped[bool] = mapped_column(Boolean, default=True)
    fhir_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InferenceJob(Base):
    __tablename__ = "inference_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uuid_str)
    patient_id: Mapped[str] = mapped_column(String(36), ForeignKey("patients.id"), index=True)
    model_type: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(24), default="DONE")
    result_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("risk_reports.id"), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
