# Datasets: MIMIC-IV + MIMIC-CXR-JPG

Este proyecto usa MIMIC-IV y MIMIC-CXR-JPG como norte de integración, pero no
incluye datos en el repositorio.

## Problema Que Resuelve

Los datos clínicos reales están fragmentados: el EHR guarda demografía,
admisiones, diagnósticos y laboratorios; el sistema de imágenes guarda estudios
y objetos DICOM/JPG; los reportes radiológicos viven como texto; y los modelos
de IA suelen producir predicciones fuera del HIS.

FHIR resuelve el problema creando una capa común:

- `Patient` para la persona pseudonimizada.
- `Encounter` para hospitalizaciones/admisiones.
- `Observation` para signos, laboratorios y mediciones.
- `Media` o `ImagingStudy` para imágenes CXR.
- `DiagnosticReport` para conclusiones radiológicas.
- `RiskAssessment` para predicciones ML/DL.
- `AuditEvent` y `Consent` para trazabilidad y cumplimiento.

## Descarga

1. Crear cuenta en PhysioNet.
2. Completar entrenamiento CITI requerido para acceso a datos clínicos.
3. Firmar el Data Use Agreement correspondiente.
4. Solicitar acceso a:
   - MIMIC-IV.
   - MIMIC-CXR-JPG.
5. Descargar un subconjunto mínimo autorizado para demo, no el dataset completo.

## Estructura Esperada

No committear esta carpeta:

```text
datasets/
  mimic-iv/
    hosp/
    icu/
  mimic-cxr-jpg/
    files/
    mimic-cxr-2.0.0-metadata.csv.gz
    mimic-cxr-2.0.0-chexpert.csv.gz
```

## Subset Recomendado

Para la entrega, basta un extracto reproducible de 30 a 100 pacientes con:

- `subject_id`
- `hadm_id`
- al menos 5 `labevents` o signos por paciente
- al menos 15 estudios CXR vinculados por `subject_id`/`study_id`
- labels o texto de reporte para `DiagnosticReport`

## Restricciones

- MIMIC contiene datos clínicos desidentificados, pero sensibles.
- No redistribuir datos.
- No subir datasets, imágenes, ONNX entrenados con datos restringidos ni dumps a GitHub.
- Documentar fuente, versión, fecha de descarga y subset utilizado.

