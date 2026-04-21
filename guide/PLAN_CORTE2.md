# Plan Corte 2 - Sistema Clinico Digital Interoperable

## Decision principal

La fase 1 se reemplaza por completo. No se reutiliza persistencia JSON ni
datos demo como fuente clinica. La nueva plataforma usa FastAPI, Supabase
PostgreSQL, FHIR-Lite/FHIR R4, doble API-Key, cifrado, rate limiting, MinIO,
frontend SPA e inferencia ML/DL.

El dataset objetivo queda fijado en **MIMIC-IV + MIMIC-CXR-JPG**.

## Problema que resuelve

Los datos clinicos reales suelen estar fragmentados: pacientes y admisiones en
un sistema, laboratorios en otro, diagnosticos codificados por separado,
imagenes en PACS, reportes en texto y salidas de IA por fuera del HIS. La capa
FHIR del proyecto resuelve esa fragmentacion convirtiendo MIMIC-IV y
MIMIC-CXR-JPG a recursos interoperables consumibles por frontend, Postman,
servicios externos y modelos de IA sin depender del formato original.

## Dataset

- **MIMIC-IV**: pacientes, admisiones, laboratorios, diagnosticos y eventos.
- **MIMIC-CXR-JPG**: radiografias de torax en JPG, metadata de estudios y
  etiquetas/reportes.

No se suben datasets al repositorio. El equipo debe gestionar acceso PhysioNet,
DUA/CITI y ubicar los archivos autorizados bajo `project2/datasets/`.

## Mapeo minimo

| Fuente | Recurso interoperable |
|---|---|
| `subject_id` | `Patient` |
| `hadm_id` | `Encounter` |
| `labevents` + `d_labitems` | `Observation` |
| `study_id` / `dicom_id` | `Media` / `ImagingStudy` |
| labels/reportes CXR | `DiagnosticReport` |
| salida ML/DL | `RiskAssessment` / `risk_reports` |
| accesos y cambios | `AuditEvent` / `audit_log` |
| autorizacion academica | `Consent` |

## Arquitectura

```text
project2/
  backend/        FastAPI, SQLAlchemy, FHIR endpoints, RBAC, cifrado
  frontend/       SPA Vite para consola clinica
  ml-service/     adaptador ML tabular MIMIC-IV
  dl-service/     adaptador DL imagen MIMIC-CXR-JPG
  scripts/        seed, usuarios de prueba y entrenamiento
  postman/        coleccion de validacion
  docs/           datasets, seguridad, FHIR mapping y estado
```

## Base de datos

Supabase PostgreSQL con modelo relacional normalizado:

- `users`
- `api_keys`
- `patients`
- `encounters`
- `observations`
- `imaging_studies`
- `diagnostic_reports`
- `risk_reports`
- `audit_log`
- `consents`
- `inference_jobs`

Las credenciales se leen desde `.env`, secretos de Render o secretos de
Supabase. No deben escribirse en codigo.

## Seguridad

- `X-Access-Key`: valida acceso inicial; falla con `401`.
- `X-Permission-Key`: identifica rol y permisos; falla con `403` si no autoriza.
- Roles:
  - `admin`: gestiona usuarios, corrige datos y consulta auditoria completa.
  - `medico`: crea pacientes, observaciones, inferencias y reportes; no borra pacientes.
  - `paciente/auditor`: solo lectura; paciente solo ve sus propios datos.
- Campos sensibles cifrados antes de persistir:
  - `identification_doc`
  - `medical_summary`
  - notas clinicas sensibles
  - payloads internos de prediccion con datos clinicos.
- Rate limiting con respuesta `429 Too Many Requests`.

## Endpoints minimos

- `GET /health`
- `GET /docs`
- `POST /auth/validate-keys`
- `GET /fhir/Patient?limit=&offset=`
- `POST /fhir/Patient`
- `GET /fhir/Patient/{id}`
- `PATCH /fhir/Patient/{id}`
- `DELETE /fhir/Patient/{id}` solo admin o soft-delete
- `GET /fhir/Observation?patient_id=&limit=&offset=`
- `POST /fhir/Observation`
- `GET /fhir/DiagnosticReport?patient_id=&limit=&offset=`
- `GET /fhir/Media?patient_id=&limit=&offset=`
- `POST /images`
- `POST /infer/ml`
- `POST /infer/dl`
- `POST /infer`
- `GET /infer/jobs/{id}`
- `PATCH /risk-reports/{id}/sign`
- `GET /audit-log?actor=&role=&action=&patient_id=&limit=&offset=`
- `GET /consents?patient_id=`
- `POST /consents`

Todas las listas deben soportar `limit` y `offset`.

## Frontend

Debe cubrir:

- Login por doble API-Key.
- Dashboard operativo.
- Listado paginado de pacientes.
- Detalle clinico del paciente.
- Observaciones FHIR.
- Imagenes MIMIC-CXR-JPG desde MinIO.
- Inferencia ML/DL.
- Reporte de riesgo firmado.
- Audit log filtrado.
- Vista paciente/auditor solo lectura.

## Test plan

- Sin `X-Access-Key` -> `401`.
- Permiso insuficiente -> `403`.
- Medico intentando borrar paciente -> `403`.
- Paciente consultando otro paciente -> `403`.
- Exceso de peticiones -> `429`.
- Crear paciente y observaciones con FK.
- Confirmar que el nombre del paciente no se duplica en observaciones.
- Verificar que campos sensibles no quedan legibles en PostgreSQL.
- `GET /fhir/Patient?limit=10&offset=0` devuelve maximo 10.
- `GET /fhir/Observation?patient_id=...` devuelve bundle paginado.
- `DiagnosticReport` referencia paciente e imagen.
- `RiskAssessment` referencia observaciones/modelo/reporte.
- Seed crea pacientes, observaciones, reportes e imagenes vinculadas desde MIMIC.
- No se incluye ningun archivo MIMIC en el repo.

## Entregables

- URL GitHub/GitLab con historial de commits.
- URL Backend Render con Swagger en `/docs`.
- URL Frontend desplegado.
- Coleccion Postman con inferencia ML, DL, firma RiskReport, audit log filtrado y paginacion.
- Credenciales de prueba en README.
- README de datasets sin archivos de datos en el repo.
