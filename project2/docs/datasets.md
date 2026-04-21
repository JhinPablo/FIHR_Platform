# Datasets: MIMIC-IV y MIMIC-CXR-JPG

Este proyecto usa datasets reales de acceso controlado de PhysioNet:

- **MIMIC-IV** para pacientes, admisiones, laboratorios, diagnosticos y eventos clinicos tabulares.
- **MIMIC-CXR-JPG** para radiografias de torax en JPG, metadata de estudios y etiquetas/reportes asociados.

No se incluyen archivos de datos en el repositorio. Cada integrante debe gestionar el acceso autorizado en PhysioNet, cumplir el DUA y completar los entrenamientos requeridos por el dataset. El sistema no inventa pacientes ni usa datos sinteticos como reemplazo: si faltan archivos, el seed termina con error y muestra la ruta esperada.

## Acceso

1. Crear una cuenta en PhysioNet.
2. Completar los requisitos de entrenamiento y acuerdos de uso para MIMIC-IV y MIMIC-CXR-JPG.
3. Descargar los datasets desde las paginas oficiales:
   - MIMIC-IV: <https://physionet.org/content/mimiciv/>
   - MIMIC-CXR-JPG: <https://physionet.org/content/mimic-cxr-jpg/>
4. Guardar los archivos bajo `project2/datasets/` con la estructura indicada abajo.

## Estructura local esperada

```text
project2/datasets/
  mimic-iv/
    hosp/
      patients.csv.gz
      admissions.csv.gz
      labevents.csv.gz
      d_labitems.csv.gz
      diagnoses_icd.csv.gz
      d_icd_diagnoses.csv.gz
  mimic-cxr-jpg/
    mimic-cxr-2.0.0-metadata.csv.gz
    mimic-cxr-2.0.0-chexpert.csv.gz
    files/
      p10/
        p10000032/
          s50414267/
            02aa804e-bde0afdd-112c0b34-7bc16630-4e384014.jpg
```

`project2/datasets/` esta ignorado por Git para evitar publicar datos clinicos o archivos pesados.

## Seed real

Con Docker:

```bash
cd project2
docker compose --profile seed run --rm seed
```

Sin Docker:

```bash
python scripts/seed_mimic.py \
  --mimic-iv-root datasets/mimic-iv \
  --mimic-cxr-root datasets/mimic-cxr-jpg \
  --limit-subjects 30 \
  --max-observations-per-subject 8 \
  --max-cxr-studies 30
```

El script:

- Lee `patients.csv.gz` y crea `patients`.
- Lee `admissions.csv.gz` y crea `encounters`.
- Lee `labevents.csv.gz` + `d_labitems.csv.gz` y crea `observations`.
- Lee metadata de MIMIC-CXR-JPG y enlaza estudios por `subject_id`.
- Sube JPG reales a MinIO.
- Crea `Media`/`ImagingStudy` con modalidad `CXR`.
- Crea `DiagnosticReport` asociado al estudio radiologico.
- Crea `Consent` academico `RESEARCH_DUA`.
- Enlaza el usuario paciente de prueba al primer paciente importado.

## Validacion

Despues del seed:

```bash
curl http://localhost:8000/data/status \
  -H "X-Access-Key: dev-access-admin" \
  -H "X-Permission-Key: dev-permission-admin"
```

El dashboard consume ese endpoint y muestra conteos reales de PostgreSQL/Supabase y objetos indexados en MinIO.
