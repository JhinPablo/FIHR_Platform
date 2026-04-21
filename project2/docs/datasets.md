# Datasets: MIMIC-IV + MIMIC-CXR-JPG

Este proyecto usa datasets reales autorizados de PhysioNet:

- **MIMIC-IV** para pacientes, admisiones y eventos clinicos tabulares.
- **MIMIC-CXR-JPG** para estudios de radiografia de torax en JPG y metadata.

El repositorio no incluye datasets, imagenes, dumps ni muestras sinteticas. Los
datos deben descargarse con acceso autorizado y permanecer fuera de Git.

## Problema Que Resuelve

Los datos clinicos reales estan fragmentados: el EHR guarda demografia,
admisiones, diagnosticos y laboratorios; el sistema de imagenes guarda estudios
y objetos JPG/DICOM; los reportes radiologicos viven como texto o etiquetas; y
los modelos de IA producen predicciones fuera del HIS.

FHIR crea una capa interoperable:

- `Patient` para el paciente pseudonimizado.
- `Encounter` para admisiones/hospitalizaciones.
- `Observation` para laboratorios y signos.
- `Media` o `ImagingStudy` para imagenes CXR.
- `DiagnosticReport` para conclusiones radiologicas.
- `RiskAssessment` para predicciones ML/DL.
- `AuditEvent` y `Consent` para trazabilidad y cumplimiento.

## Descarga Autorizada

1. Crear cuenta en PhysioNet.
2. Completar el entrenamiento CITI requerido.
3. Firmar el Data Use Agreement correspondiente.
4. Solicitar acceso a:
   - MIMIC-IV.
   - MIMIC-CXR-JPG.
5. Descargar solo el subset necesario para la entrega.

## Estructura Esperada

No committear esta carpeta:

```text
project2/datasets/
  mimic-iv/
    hosp/
      patients.csv.gz
      admissions.csv.gz
      labevents.csv.gz
      d_labitems.csv.gz
  mimic-cxr-jpg/
    files/
      p10/
        p10000032/
          s50414267/
            <dicom_id>.jpg
    mimic-cxr-2.0.0-metadata.csv.gz
    mimic-cxr-2.0.0-chexpert.csv.gz
```

`mimic-cxr-2.0.0-chexpert.csv.gz` es opcional. Si no existe, el seed crea
`DiagnosticReport` indicando que la imagen esta disponible pero las etiquetas no
fueron cargadas.

## Seed Real

Con el stack arriba:

```bash
cd project2
docker compose --profile seed run --rm seed
```

O sin Docker:

```bash
python scripts/seed_mimic.py \
  --mimic-iv-root datasets/mimic-iv \
  --mimic-cxr-root datasets/mimic-cxr-jpg \
  --limit-subjects 30 \
  --max-labs-per-subject 8 \
  --max-images 30
```

El script:

- Lee `patients.csv.gz` y crea `Patient`.
- Lee `admissions.csv.gz` y crea `Encounter`.
- Lee `labevents.csv.gz` + `d_labitems.csv.gz` y crea `Observation`.
- Lee metadata MIMIC-CXR-JPG y sube JPG reales a MinIO.
- Crea `Media` y `DiagnosticReport` enlazados por `subject_id` y `study_id`.
- Falla si faltan archivos requeridos, en vez de crear informacion demo.

## Restricciones

- MIMIC esta desidentificado, pero sigue siendo dato clinico sensible.
- No redistribuir archivos.
- No subir `datasets/`, imagenes, ONNX entrenados con MIMIC ni dumps a GitHub.
- Documentar version, fecha de descarga y subset usado.
