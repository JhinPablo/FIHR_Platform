# FHIR Platform Corte 2

Sistema clinico digital interoperable para UAO Salud Digital. Esta version
reemplaza la fase anterior por una implementacion limpia basada en FastAPI,
Supabase PostgreSQL, FHIR-Lite/FHIR R4, doble API-Key, cifrado aplicativo,
rate limiting, frontend SPA y flujos de inferencia clinica.

## Stack

- Backend: FastAPI + SQLAlchemy + Pydantic.
- Base de datos: Supabase PostgreSQL mediante `DATABASE_URL`.
- Frontend: SPA Vite desplegable en Vercel, Netlify o Render Static.
- Servicios IA: `ml-service` y `dl-service` CPU-first, con adaptadores listos para ONNX.
- Imagenes: MinIO S3-compatible, bucket `clinical-images`.
- Dataset objetivo: MIMIC-IV FHIR Demo v2.1.0 + MIMIC-IV-ECG Demo v0.1.

## Arranque Local

```bash
cd project2
copy .env.example .env
docker compose up -d --build
```

Backend:

- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

Frontend:

- Local: `http://localhost:5173`

## Usuarios de Prueba

```bash
cd project2
python scripts/create_test_users.py
```

Estas llaves son credenciales academicas de prueba para operadores. No crean ni
simulan datos clinicos; los pacientes deben venir del seed MIMIC autorizado.

| Rol | X-Access-Key | X-Permission-Key |
|---|---|---|
| Admin | `dev-access-admin` | `dev-permission-admin` |
| Medico 1 | `dev-access-medico-1` | `dev-permission-medico-1` |
| Medico 2 | `dev-access-medico-2` | `dev-permission-medico-2` |
| Paciente | `dev-access-patient` | `dev-permission-patient` |

En produccion, estas llaves deben generarse como secretos y persistirse en
Supabase. No se deben committear `.env` ni llaves reales.

## Dataset Publico

El proyecto usa demos publicos de PhysioNet, disponibles sin credenciales:

- MIMIC-IV Clinical Database Demo on FHIR v2.1.0.
- MIMIC-IV-ECG Demo v0.1.

Las carpetas locales de referencia quedan fuera de Git en:

Estructura esperada:

```text
project2/datasets/
  mimic-iv-fhir-demo-2.1.0/
    fhir/
      MimicPatient.ndjson.gz
      MimicEncounter.ndjson.gz
      MimicObservationLabevents.ndjson.gz
  mimic-iv-ecg-demo-0.1/
    record_list.csv
    files/
      p10000032/
        s107143276/
          107143276.hea
          107143276.dat
```

Para cargar un subset demo publico:

```bash
docker compose --profile seed run --rm seed
```

El seed principal esta en `scripts/seed_physionet_demo.py`. Si faltan archivos,
falla con un mensaje explicito. El flujo crea pacientes/encuentros/observaciones
desde el FHIR demo, sube ECG WFDB reales (`.hea` y `.dat`) a MinIO y enlaza
`Media`/`DiagnosticReport` con URL presignada. La seleccion prioriza sujetos que
tengan ECG disponible. El dashboard valida el resultado mediante
`GET /data/status`.

Ver citas y licencia en `docs/datasets.md`.

## Funcionalidades Cubiertas

| Requisito | Estado |
|---|---|
| PostgreSQL normalizado en Supabase | Preparado con migracion SQL y `DATABASE_URL` |
| Sin JSON como persistencia primaria | Cumplido: modelos relacionales |
| Doble API-Key | Cumplido |
| Roles admin/medico/paciente/auditor | Cumplido |
| FHIR Patient y Observation | Cumplido |
| Paginacion `limit/offset` | Cumplido |
| Cifrado de datos sensibles | Cumplido con Fernet/AES |
| Rate limiting 429 | Cumplido |
| Audit log filtrado | Cumplido |
| Inferencia ML/DL y firma RiskReport | Implementacion inicial |
| MinIO bucket `clinical-images` | Cumplido en Docker Compose |
| Objetos ECG reales en informes FHIR | `DiagnosticReport.presentedForm` enlaza MinIO |
| Estado operativo del flujo MIMIC/Supabase/MinIO | `GET /data/status` |
| README datasets sin subir datos | Cumplido en `docs/datasets.md` |
| Postman | `postman/FHIR_Platform_Corte2.postman_collection.json` |

## Deploy

- Backend: Render Web Service o VPS Docker segun guia de despliegue Corte 2.
- Base de datos: Supabase PostgreSQL.
- Frontend: Vercel/Netlify/Render Static o Nginx en VPS.
- Variables sensibles: configurar en secretos, nunca en codigo.
