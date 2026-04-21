# Estado del Proyecto - Sistema Clinico Digital Interoperable

Fecha de estado: 2026-04-21

## Cambio de dataset

Se actualizo el flujo de datos para usar demos publicos de PhysioNet, sin
credenciales:

- MIMIC-IV Clinical Database Demo on FHIR v2.1.0.
- MIMIC-IV-ECG Demo v0.1.

Esto reemplaza el plan operativo anterior basado en datasets MIMIC completos
con acceso controlado. La arquitectura se mantiene: backend FastAPI, Supabase
PostgreSQL, MinIO, doble API-Key, FHIR-Lite/FHIR R4, audit log, reportes de
riesgo e inferencia academica.

## Base legal y citacion

Las paginas oficiales de PhysioNet indican que ambos recursos son Open Access y
que cualquiera puede acceder a los archivos si cumple la licencia indicada:
Open Data Commons Open Database License v1.0.

Citas a incluir en el informe:

- Gow, B., Pollard, T., Nathanson, L. A., Moody, B., Johnson, A.,
  Moukheiber, D., Greenbaum, N., Berkowitz, S., Eslami, P., Herbst, E.,
  Mark, R., & Horng, S. (2022). *MIMIC-IV-ECG Demo - Diagnostic
  Electrocardiogram Matched Subset Demo* (version 0.1). PhysioNet.
  <https://doi.org/10.13026/4eqn-kt76>
- Bennett, A., Ulrich, H., Wiedekopf, J., Szul, P., Grimes, J.,
  & Johnson, A. (2025). *MIMIC-IV Clinical Database Demo on FHIR*
  (version 2.1.0). PhysioNet. RRID:SCR_007345.
- Bennett, A. M., Ulrich, H., van Damme, P., Wiedekopf, J., &
  Johnson, A. E. W. (2023). MIMIC-IV on FHIR: converting a decade of
  in-patient data into an exchangeable, interoperable format. *Journal of
  the American Medical Informatics Association*, 30(4), 718-725.
  <https://doi.org/10.1093/jamia/ocac203>
- Goldberger, A. L., Amaral, L. A. N., Glass, L., Hausdorff, J. M.,
  Ivanov, P. C., Mark, R. G., Mietus, J. E., Moody, G. B., Peng, C. K.,
  & Stanley, H. E. (2000). PhysioBank, PhysioToolkit, and PhysioNet:
  Components of a new research resource for complex physiologic signals.
  *Circulation*, 101(23), e215-e220.

## Datasets locales

Se copiaron los datasets desde Downloads hacia:

```text
project2/datasets/
  mimic-iv-fhir-demo-2.1.0/
  mimic-iv-ecg-demo-0.1/
```

Contenido verificado:

- FHIR demo: 33 archivos, incluyendo `MimicPatient.ndjson.gz`,
  `MimicEncounter.ndjson.gz`, `MimicObservationLabevents.ndjson.gz` y otros
  recursos FHIR.
- ECG demo: 1322 archivos, incluyendo `record_list.csv`, `RECORDS`, `.hea` y
  `.dat` WFDB.

`project2/datasets/` permanece ignorado por Git. Los archivos se usan como
referencia local y para seed Docker, no como contenido versionado.

### Dataset 1: MIMIC-IV Clinical Database Demo on FHIR v2.1.0

Ubicacion local:

```text
project2/datasets/mimic-iv-fhir-demo-2.1.0/
```

Estructura:

```text
mimic-iv-fhir-demo-2.1.0/
  LICENSE.txt
  README_DEMO.md
  SHA256SUMS.txt
  fhir/
    MimicPatient.ndjson.gz
    MimicEncounter.ndjson.gz
    MimicEncounterED.ndjson.gz
    MimicEncounterICU.ndjson.gz
    MimicObservationLabevents.ndjson.gz
    MimicObservationChartevents.ndjson.gz
    MimicObservationED.ndjson.gz
    MimicObservationVitalSignsED.ndjson.gz
    MimicCondition*.ndjson.gz
    MimicMedication*.ndjson.gz
    MimicProcedure*.ndjson.gz
    MimicSpecimen*.ndjson.gz
    MimicOrganization.ndjson.gz
    MimicLocation.ndjson.gz
```

Contenido funcional:

- Recursos FHIR en formato **NDJSON comprimido** (`.ndjson.gz`), un recurso
  JSON por linea.
- `MimicPatient.ndjson.gz`: 100 pacientes demo.
- `MimicEncounter.ndjson.gz`: 275 encuentros hospitalarios.
- `MimicObservationLabevents.ndjson.gz`: 107,727 observaciones de laboratorio.
- `MimicObservationChartevents.ndjson.gz`: 668,862 observaciones tipo chart
  events.
- Tambien incluye recursos de condiciones, medicamentos, procedimientos,
  especimenes, organizaciones y ubicaciones.

Uso en el sistema:

- Se importa `Patient` hacia `patients`.
- Se importa `Encounter` hacia `encounters`.
- Se importa `Observation` de laboratorios hacia `observations`.
- El FHIR original se conserva en `fhir_json` como evidencia de
  interoperabilidad, mientras las columnas relacionales permiten consultas y FK.

### Dataset 2: MIMIC-IV-ECG Demo v0.1

Ubicacion local:

```text
project2/datasets/mimic-iv-ecg-demo-0.1/
```

Estructura:

```text
mimic-iv-ecg-demo-0.1/
  LICENSE.txt
  RECORDS
  record_list.csv
  SHA256SUMS.txt
  files/
    p10000032/
      s107143276/
        107143276.hea
        107143276.dat
      s102511170/
        102511170.hea
        102511170.dat
```

Contenido funcional:

- `record_list.csv`: indice maestro con columnas:
  - `subject_id`
  - `study_id`
  - `file_name`
  - `ecg_time`
  - `path`
- 659 registros ECG.
- 92 sujetos unicos.
- Cada ECG esta en formato **WFDB**:
  - `.hea`: header legible con metadatos de la senal.
  - `.dat`: senal fisiologica binaria.
- Cada path sigue el patron:

```text
files/p{subject_id}/s{study_id}/{study_id}.hea
files/p{subject_id}/s{study_id}/{study_id}.dat
```

Uso en el sistema:

- `subject_id` se usa para enlazar ECG con pacientes del FHIR demo.
- `study_id` se guarda como `source_study_id` y tambien como identificador
  unico de estudio en `source_dicom_id` por compatibilidad con el modelo actual.
- `.hea` y `.dat` se suben a MinIO.
- Se crea `ImagingStudy/Media` con modalidad `ECG`.
- Se crea `DiagnosticReport` con referencia al objeto ECG almacenado.

### Relacion entre ambos datasets

El ECG demo esta emparejado con pacientes del demo clinico mediante
`subject_id`. Esa relacion permite construir un caso interoperable completo:

```text
FHIR Patient/Encounter/Observation
        +
WFDB ECG record (.hea/.dat)
        |
        v
Supabase tables + MinIO objects
        |
        v
FHIR-Lite API: Patient, Observation, Media, DiagnosticReport, RiskAssessment
```

## Flujo de importacion

Script principal:

```text
project2/scripts/seed_physionet_demo.py
```

Ejecucion:

```bash
cd project2
docker compose --profile seed run --rm seed
```

El script:

- Lee pacientes desde `MimicPatient.ndjson.gz`.
- Lee encuentros desde `MimicEncounter.ndjson.gz`.
- Lee laboratorios desde `MimicObservationLabevents.ndjson.gz`.
- Lee ECGs desde `record_list.csv`.
- Prioriza pacientes que tengan ECG real disponible.
- Guarda `patients`, `encounters`, `observations`, `diagnostic_reports`,
  `imaging_studies`, `consents` en la DB.
- Sube archivos WFDB `.hea` y `.dat` a MinIO en el bucket `clinical-images`.
- Crea `Media`/`ImagingStudy` con modalidad `ECG`.
- Crea `DiagnosticReport` enlazado al ECG.
- Enlaza el usuario `paciente` al primer paciente importado.

Resultado de la ultima ejecucion local:

```text
PhysioNet demo seed complete:
30 patients, 240 observations, 30 ECG WFDB records/reports.
```

`GET /data/status` verificado:

| Campo | Valor |
|---|---:|
| `patients` | 30 |
| `encounters` | 30 |
| `observations` | 240 |
| `media` | 30 |
| `media_with_minio_objects` | 30 |
| `diagnostic_reports` | 30 |
| `consents` | 30 |
| `ready` | true |

## Supabase

Implementado en Supabase remoto:

- Migracion aplicada por MCP: `initial_schema_corte2_real_mimic`.
- Migracion aplicada por MCP: `fk_indexes_and_no_direct_access_policies`.
- Migracion aplicada por MCP: `add_unique_mimic_cxr_dicom_index`.
- 11 tablas creadas en `public`.
- RLS activado en todas las tablas.
- Politicas `no_direct_access_*` para bloquear acceso directo por Data API.
- Usuarios y API keys de prueba creados, sin pacientes clinicos inventados.

Nota: el nombre historico del indice contiene `dicom`, pero ahora se reutiliza
como identificador unico de estudio ECG (`source_dicom_id = study_id`) para
evitar duplicados.

## MinIO

Implementado:

- Servicio `minio` en Docker Compose.
- Servicio `minio-init` para crear bucket.
- Bucket: `clinical-images`.
- Volumen persistente: `minio_data`.
- Objetos ECG:

```text
patients/{patient_id}/mimic-iv-ecg-demo/{study_id}/preview.svg
patients/{patient_id}/mimic-iv-ecg-demo/{study_id}/{study_id}.hea
patients/{patient_id}/mimic-iv-ecg-demo/{study_id}/{study_id}.dat
```

El archivo `preview.svg` se genera desde la senal WFDB real (`.hea` + `.dat`)
del MIMIC-IV-ECG Demo. No se usa una imagen fija ni inventada: el script lee el
header, separa las 12 derivaciones del binario `int16` intercalado, dibuja la
waveform en una grilla ECG y la sube a MinIO antes de crear la fila
`imaging_studies`.

Los reportes FHIR incluyen URL presignada hacia el `preview.svg` en:

- `Media.content.url`
- `DiagnosticReport.presentedForm[].url`

Verificacion local actual:

| Campo | Valor |
|---|---:|
| Objetos MinIO | 90 |
| ECG previews SVG | 30 |
| Headers WFDB `.hea` | 30 |
| Senales WFDB `.dat` | 30 |

La estructura final por estudio queda asi:

```text
patients/{patient_uuid}/mimic-iv-ecg-demo/{study_id}/
  preview.svg
  {study_id}.hea
  {study_id}.dat
```

`preview.svg` es el objeto usado por la vista Imaging y por los informes. Los
archivos `.hea` y `.dat` quedan preservados como fuente trazable del dataset.

## Supabase - carga clinica remota

Aplicado mediante MCP de Supabase:

- 30 pacientes reales del MIMIC-IV FHIR Demo.
- 30 encounters enlazados por FK a pacientes.
- 30 `imaging_studies` ECG enlazados por FK a pacientes.
- 30 `diagnostic_reports` generados desde `imaging_studies`.
- 30 consentimientos `PHYSIONET_OPEN_ACCESS_DEMO`.
- 5 usuarios/API keys de prueba restaurados.
- Usuario `paciente` enlazado a un paciente importado.

Conteo remoto verificado:

| Tabla / chequeo | Valor |
|---|---:|
| `users` | 5 |
| `api_keys` | 5 |
| `patients` | 30 |
| `encounters` | 30 |
| `imaging_studies` | 30 |
| `imaging_studies` con `preview.svg` | 30 |
| `diagnostic_reports` | 30 |
| `consents` | 30 |
| Usuario paciente enlazado | true |

Pendiente especifico de Supabase remoto: importar tambien las 240 observaciones
tabulares locales. La importacion local esta lista y verificada; la carga remota
de observaciones queda separada porque el canal MCP por chunks es lento y se
debe preferir `supabase db query` cuando haya `SUPABASE_ACCESS_TOKEN` activo.

## Backend y frontend

Implementado:

- `GET /data/status` devuelve conteos de DB y objetos MinIO indexados.
- `GET /health` muestra el dataset activo.
- El dashboard consume `/data/status`.
- La vista Imaging ahora muestra media ECG desde MinIO y enlaza URLs firmadas.
- Los endpoints FHIR siguen exponiendo `Patient`, `Observation`,
  `DiagnosticReport`, `Media`, `Consent`, `AuditEvent`, `RiskAssessment`.

## Nginx y Docker Compose

Implementado:

- Servicio `nginx` en `docker-compose.yml` con imagen `nginx:alpine`.
- Puerto publico local: `http://localhost/`.
- Reverse proxy:
  - `/` -> `frontend:5173`
  - `/api/` -> `backend:8000`
  - `/ml/` -> `ml-service:8011`
  - `/dl/` -> `dl-service:8012`
- Rate limiting anti-DoS en Nginx:
  - `limit_req_zone $binary_remote_addr zone=api_limit:10m rate=120r/m`
  - `limit_req_status 429`
  - `limit_req` aplicado a `/api/`, `/ml/` y `/dl/`.
- Headers de seguridad:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `Permissions-Policy`
- Healthchecks activos en:
  - `minio`
  - `backend`
  - `ml-service`
  - `dl-service`
  - `frontend`
  - `nginx`

Verificacion local:

| Chequeo | Resultado |
|---|---|
| `docker compose config` | valido |
| `docker compose ps` | servicios propios healthy |
| `GET http://localhost/` | 200 + headers de seguridad |
| `GET http://localhost/api/health` | backend ok |
| `GET http://localhost/ml/health` | ML ok |
| `GET http://localhost/dl/health` | DL ok |

## Hecho

- [x] Datasets publicos copiados a `project2/datasets/`.
- [x] Documentacion legal actualizada con citas PhysioNet.
- [x] Nuevo seed `scripts/seed_physionet_demo.py`.
- [x] Docker Compose usa el seed publico por defecto.
- [x] `.env.example` actualizado con variables de demos PhysioNet.
- [x] Backend reconoce dataset FHIR demo + ECG demo.
- [x] MinIO acepta `.hea` como `text/plain` y `.dat` como binario.
- [x] MinIO almacena `preview.svg` generado desde WFDB real.
- [x] Frontend muestra media ECG con enlace firmado desde MinIO.
- [x] Supabase mantiene schema relacional, RLS e indices.
- [x] Seed publico ejecutado localmente con 30 pacientes, 240 observaciones y
  30 ECGs enlazados.
- [x] `/data/status` verificado con `ready=true`.
- [x] Supabase remoto tiene 30 pacientes, 30 ECG SVG, 30 reportes y 30
  consentimientos asociados.
- [x] Nginx agregado al compose con proxy `/api`, `/ml`, `/dl`.
- [x] Rate-limit 429 configurado en Nginx.
- [x] Headers de seguridad configurados en Nginx.
- [x] Healthchecks verificados para Nginx, frontend, backend, ML, DL y MinIO.
- [x] Supabase verificado con `pgcrypto` activo y 11 tablas publicas esperadas.
- [x] Bug imaging corregido: auto-reload de media al entrar a `/imaging` con
  paciente seleccionado (`state._imagingLoadedFor` tracker).
- [x] URL presignada MinIO extendida de 300s a 3600s.
- [x] MinIO CORS habilitado (`mc anonymous set download` + `mc cors set`) en
  `minio-init`.
- [x] `vercel.json` creado para frontend, backend, ml-service y dl-service.
- [x] Entry points `api/index.py` creados para backend, ml-service y dl-service.
- [x] `requirements-vercel.txt` creado en ml-service (sin onnxruntime).
- [x] CORS backend cambiado a `"*"` por defecto con `allow_credentials=False`.
- [x] `VITE_API_URL` integrado en frontend para configurar backend desde Vercel.
- [x] `MODELS_DIR` del ml-service redirige a `/tmp` cuando `VERCEL=1`.

## Despliegue en Vercel

Arquitectura de despliegue completa en Vercel (sin DigitalOcean por ahora):

```
Frontend  → Vercel static (Vite build)          project2/frontend/
Backend   → Vercel Python serverless (FastAPI)   project2/backend/
ML        → Vercel Python serverless (FastAPI)   project2/ml-service/
DL        → Vercel Python serverless (FastAPI)   project2/dl-service/
DB        → Supabase PostgreSQL (ya configurado)
Storage   → MinIO no disponible en Vercel (imagenes muestran fallback)
```

### Archivos de configuracion Vercel creados

| Archivo | Descripcion |
|---|---|
| `frontend/vercel.json` | Build Vite + rewrite SPA hash-router |
| `backend/vercel.json` | Build Python serverless FastAPI |
| `backend/api/index.py` | Entry point: `from app.main import app` |
| `ml-service/vercel.json` | Build Python con `requirements-vercel.txt` |
| `ml-service/api/index.py` | Entry point ML service |
| `ml-service/requirements-vercel.txt` | Sin onnxruntime/skl2onnx (too heavy) |
| `dl-service/vercel.json` | Build Python DL service |
| `dl-service/api/index.py` | Entry point DL service |

### Cambios aplicados al codigo

- `backend/app/config.py`: `cors_origins` default cambiado a `"*"`.
- `backend/app/main.py`: CORS middleware desactiva `allow_credentials` cuando
  `allow_origins=["*"]` (requerido por Starlette).
- `frontend/src/main.js`: `API` usa `import.meta.env.VITE_API_URL` como
  fallback antes de `http://localhost:8000`.
- `ml-service/main.py`: `MODELS_DIR` apunta a `/tmp/ml_models` en Vercel
  (filesystem de escritura). Detectado via `VERCEL=1` env var.
- `backend/app/minio_client.py`: URL presignada expira en 3600s (antes 300s).

### Variables de entorno requeridas en Vercel

Para cada proyecto en Vercel dashboard → Settings → Environment Variables:

**Backend:**

| Variable | Valor |
|---|---|
| `DATABASE_URL` | `postgresql+psycopg://postgres.[ref]:[pass]@aws-0-us-east-1.pooler.supabase.com:5432/postgres` |
| `DATA_ENCRYPTION_KEY` | (clave segura, no dev-only) |
| `ACCESS_KEY_ADMIN` | (clave admin real) |
| `PERMISSION_KEY_ADMIN` | (clave admin real) |
| `ACCESS_KEY_MEDICO_1` | (clave medico real) |
| `PERMISSION_KEY_MEDICO_1` | (clave medico real) |
| `ACCESS_KEY_PATIENT` | (clave paciente real) |
| `PERMISSION_KEY_PATIENT` | (clave paciente real) |
| `ML_SERVICE_URL` | URL del ml-service en Vercel |
| `DL_SERVICE_URL` | URL del dl-service en Vercel |

**Frontend:**

| Variable | Valor |
|---|---|
| `VITE_API_URL` | URL del backend en Vercel (ej. `https://fhir-backend.vercel.app`) |

**ML Service:**

| Variable | Valor |
|---|---|
| `VERCEL` | `1` (para usar `/tmp` como directorio de modelos) |

### Procedimiento de deploy

Cada servicio es un proyecto Vercel independiente. En tu terminal:

```bash
# 1. Frontend
cd project2/frontend
npx vercel --prod
# Root dir: .  |  Framework: Vite  |  Output: dist

# 2. Backend
cd project2/backend
npx vercel --prod
# Root dir: .  |  Framework: Other

# 3. ML Service
cd project2/ml-service
npx vercel --prod
# Root dir: .  |  Framework: Other

# 4. DL Service
cd project2/dl-service
npx vercel --prod
# Root dir: .  |  Framework: Other
```

Orden recomendado: backend primero, luego ml/dl (para tener sus URLs), luego
frontend con `VITE_API_URL` apuntando al backend.

### Limitaciones conocidas en Vercel

| Componente | Estado | Motivo |
|---|---|---|
| Pacientes, Observaciones, Inferencia, Audit | Funcional | Supabase + Vercel |
| Firma de reportes, Consentimientos | Funcional | Supabase + Vercel |
| Imagenes ECG (MinIO SVG) | Sin preview inline | MinIO no corre en Vercel |
| Link "Open SVG" en Imaging | Funcional | URL presignada hacia MinIO local |
| ML inference (numpy fallback) | Funcional | sin onnxruntime en Vercel |
| ONNX real inference | Solo en Docker local | onnxruntime demasiado pesado |
| DL GradCAM | Fallback sin MinIO upload | MinIO no disponible |

## Pendiente

- [ ] Ejecutar `npx vercel --prod` en cada servicio y capturar URLs.
- [ ] Configurar `VITE_API_URL` en frontend Vercel con URL del backend.
- [ ] Configurar `ML_SERVICE_URL` y `DL_SERVICE_URL` en backend Vercel.
- [ ] Verificar `GET /health` y `GET /data/status` en backend Vercel.
- [ ] Importar a Supabase remoto las 240 observaciones tabulares locales.
- [ ] Ejecutar Postman end-to-end con el dataset demo publico contra Vercel.
- [ ] Hacer commit firmado y push.
