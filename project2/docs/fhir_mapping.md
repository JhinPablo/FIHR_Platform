# Mapeo MIMIC a FHIR/DB local

| Fuente MIMIC | FHIR / media | Tabla local |
|---|---|---|
| `patients.csv.gz.subject_id` | `Patient.identifier` | `patients.source_subject_id` |
| `patients.csv.gz.gender`, `anchor_age` | `Patient.gender`, extension local | `patients.fhir_resource` |
| `admissions.csv.gz.hadm_id` | `Encounter.identifier` | `encounters.source_hadm_id` |
| `admissions.csv.gz.admittime/dischtime` | `Encounter.period` | `encounters.period_start/end` |
| `labevents.csv.gz.itemid` + `d_labitems.csv.gz` | `Observation.code` | `observations.code/display` |
| `labevents.csv.gz.valuenum/valueuom` | `Observation.valueQuantity` | `observations.value/unit` |
| `mimic-cxr-2.0.0-metadata.csv.gz.subject_id` | enlace paciente CXR | `patients.source_subject_id` |
| `metadata.study_id` | `Media` / `ImagingStudy` modalidad `CXR` | `imaging_studies.source_study_id` |
| `metadata.dicom_id` + JPG | objeto MinIO | `imaging_studies.minio_object_name` |
| CheXpert labels / metadata CXR | `DiagnosticReport.conclusion` | `diagnostic_reports.conclusion` |
| salida ML/DL | `RiskAssessment.prediction` | `risk_reports` |
| accion de usuario | `AuditEvent` | `audit_log` |
| autorizacion academica | `Consent` | `consents` |

## Bundle de paciente

Un paciente importado desde MIMIC debe tener:

- 1 `Patient`.
- 0 o mas `Encounter`.
- 0 o mas `Observation`.
- 0 o mas `Media` / `ImagingStudy` de modalidad `CXR`.
- 0 o mas `DiagnosticReport` enlazados a imagenes CXR.
- 0 o mas `RiskAssessment`.
- 1 `Consent` academico `RESEARCH_DUA`.

## Paginacion

Todos los listados aceptan `limit` y `offset`, devolviendo un `Bundle`:

```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 100,
  "limit": 10,
  "offset": 0,
  "entry": []
}
```
