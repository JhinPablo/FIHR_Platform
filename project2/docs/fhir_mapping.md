# Mapeo MIMIC a FHIR

| MIMIC | FHIR | Tabla local |
|---|---|---|
| `subject_id` | `Patient.id` / extension `urn:uao:mimic-subject-id` | `patients.source_subject_id` |
| `hadm_id` | `Encounter` | `encounters.source_hadm_id` |
| `labevents.itemid` | `Observation.code` | `observations.source_itemid` |
| valor laboratorio | `Observation.valueQuantity` | `observations.value/unit` |
| `study_id` | `ImagingStudy` / `Media.extension` | `imaging_studies.source_study_id` |
| `dicom_id` | `Media.content.url` / extension | `imaging_studies.source_dicom_id` |
| label/reporte CXR | `DiagnosticReport.conclusion` | `diagnostic_reports.conclusion` |
| salida ML/DL | `RiskAssessment.prediction` | `risk_reports` |
| acción de usuario | `AuditEvent` | `audit_log` |
| habeas data | `Consent` | `consents` |

## Bundle de Paciente

Un paciente listo para demo debe tener:

- 1 `Patient`
- 1 o más `Encounter`
- 5 o más `Observation`
- 0 o más `Media` / `ImagingStudy`
- 0 o más `DiagnosticReport`
- 0 o más `RiskAssessment`
- 1 `Consent` de tratamiento de datos

## Paginación

Todos los listados deben aceptar `limit` y `offset`, devolviendo un `Bundle`
con:

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

