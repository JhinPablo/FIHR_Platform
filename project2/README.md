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
- Dataset real objetivo: MIMIC-IV + MIMIC-CXR-JPG.

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
python scripts/create_demo_users.py
```

Estas llaves son credenciales academicas de prueba, no datos clinicos demo:

| Rol | X-Access-Key | X-Permission-Key |
|---|---|---|
| Admin | `dev-access-admin` | `dev-permission-admin` |
| Medico 1 | `dev-access-medico-1` | `dev-permission-medico-1` |
| Medico 2 | `dev-access-medico-2` | `dev-permission-medico-2` |
| Paciente | `dev-access-patient` | `dev-permission-patient` |

En produccion, estas llaves deben generarse como secretos y persistirse en
Supabase. No se deben committear `.env` ni llaves reales.

## Dataset Real

El proyecto queda orientado a datos reales autorizados: MIMIC-IV y
MIMIC-CXR-JPG. El repositorio no incluye esos archivos por restricciones de
PhysioNet/DUA/CITI. Deben colocarse localmente fuera de Git en:

```text
project2/datasets/mimic-iv/
project2/datasets/mimic-cxr-jpg/
```

Estructura esperada:

```text
project2/datasets/mimic-iv/
  hosp/
    patients.csv.gz
    admissions.csv.gz
    labevents.csv.gz
    d_labitems.csv.gz

project2/datasets/mimic-cxr-jpg/
  files/
    p10/
      p10000032/
        s50414267/
          <dicom_id>.jpg
  mimic-cxr-2.0.0-metadata.csv.gz
  mimic-cxr-2.0.0-chexpert.csv.gz
```

Para cargar un subset real autorizado:

```bash
docker compose --profile seed run --rm seed
```

El seed real esta en `scripts/seed_mimic.py`. Si faltan archivos, falla con un
mensaje explicito en lugar de crear informacion demo. El flujo crea pacientes
desde MIMIC-IV, observaciones desde `labevents`, sube imagenes JPG reales de
MIMIC-CXR-JPG a MinIO y enlaza `Media`/`DiagnosticReport` con URL presignada.

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
| Imagenes reales en informes FHIR | `DiagnosticReport.presentedForm` enlaza MinIO |
| README datasets sin subir datos | Cumplido en `docs/datasets.md` |
| Postman | `postman/FHIR_Platform_Corte2.postman_collection.json` |

## Deploy

- Backend: Render Web Service o VPS Docker segun guia de despliegue Corte 2.
- Base de datos: Supabase PostgreSQL.
- Frontend: Vercel/Netlify/Render Static o Nginx en VPS.
- Variables sensibles: configurar en secretos, nunca en codigo.
