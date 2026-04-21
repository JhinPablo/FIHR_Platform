from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


Role = Literal["admin", "medico", "paciente", "auditor"]


class Principal(BaseModel):
    user_id: str
    username: str
    display_name: str
    role: Role
    patient_id: str | None = None


class PatientCreate(BaseModel):
    resourceType: Literal["Patient"] = "Patient"
    name: str = Field(..., min_length=2)
    gender: str | None = None
    birthDate: str | None = None
    identification_doc: str | None = None
    medical_summary: str | None = None
    source_subject_id: str | None = None
    source_dataset: str = "MIMIC-IV"
    extension: list[dict[str, Any]] = []


class PatientPatch(BaseModel):
    name: str | None = None
    gender: str | None = None
    birthDate: str | None = None
    identification_doc: str | None = None
    medical_summary: str | None = None
    active: bool | None = None


class ObservationCreate(BaseModel):
    resourceType: Literal["Observation"] = "Observation"
    patient_id: str
    encounter_id: str | None = None
    code: str
    display: str
    value: float | None = None
    unit: str | None = None
    source_itemid: str | None = None
    effectiveDateTime: datetime | None = None


class ConsentCreate(BaseModel):
    patient_id: str
    scope: str = "HABEAS_DATA"
    granted: bool = True


class ImageMetadata(BaseModel):
    patient_id: str
    source_study_id: str
    source_dicom_id: str | None = None
    modality: str = "CR"
    conclusion: str | None = None
    conclusion_code: str | None = "404684003"


class InferenceCreate(BaseModel):
    patient_id: str
    model_type: Literal["ML", "DL", "MULTIMODAL"] = "ML"
    features: dict[str, Any] = {}
    image_url: str | None = None


class SignRiskReport(BaseModel):
    decision: Literal["ACCEPT", "REJECT"] = "ACCEPT"
    clinical_note: str = Field(..., min_length=30)


class Page(BaseModel):
    resourceType: Literal["Bundle"] = "Bundle"
    type: Literal["searchset"] = "searchset"
    total: int
    limit: int
    offset: int
    entry: list[dict[str, Any]]
