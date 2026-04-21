# Mapeo PhysioNet demo a FHIR/DB local

| Fuente demo | FHIR / media | Tabla local |
|---|---|---|
| `MimicPatient.ndjson.gz` | `Patient` | `patients` |
| `Patient.identifier` con `identifier/patient` | `Patient.identifier` / extension local | `patients.source_subject_id` |
| `MimicEncounter.ndjson.gz` | `Encounter` | `encounters` |
| `Encounter.identifier` con `encounter-hosp` | `Encounter.identifier` | `encounters.source_hadm_id` |
| `MimicObservationLabevents.ndjson.gz` | `Observation` | `observations` |
| `Observation.code.coding[0].code` | `Observation.code` | `observations.code` |
| `Observation.valueQuantity` | `Observation.valueQuantity` | `observations.value/unit` |
| `record_list.csv.subject_id` | enlace paciente ECG | `patients.source_subject_id` |
| `record_list.csv.study_id` | `Media` / `ImagingStudy` modalidad `ECG` | `imaging_studies.source_study_id` |
| WFDB `.hea` y `.dat` | objetos MinIO | `imaging_studies.minio_object_name` |
| ECG importado | `DiagnosticReport.conclusion` | `diagnostic_reports.conclusion` |
| salida ML/DL | `RiskAssessment.prediction` | `risk_reports` |
| accion de usuario | `AuditEvent` | `audit_log` |
| licencia open access demo | `Consent` | `consents` |

## Bundle de paciente

Un paciente sembrado desde los demos publicos debe tener:

- 1 `Patient`.
- 0 o mas `Encounter`.
- 0 o mas `Observation`.
- 0 o mas `Media` / `ImagingStudy` de modalidad `ECG`.
- 0 o mas `DiagnosticReport` enlazados a ECG.
- 0 o mas `RiskAssessment`.
- 1 `Consent` academico `PHYSIONET_OPEN_ACCESS_DEMO`.

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
