# FHIR Platform Corte 2

Sistema clínico digital interoperable para UAO Salud Digital. Esta versión
reemplaza la fase anterior por una implementación limpia basada en FastAPI,
Supabase PostgreSQL, FHIR-Lite/FHIR R4, doble API-Key, cifrado aplicativo,
rate limiting, frontend SPA y flujos de inferencia clínica.

## Stack

- Backend: FastAPI + SQLAlchemy + Pydantic.
- Base de datos: Supabase PostgreSQL mediante `DATABASE_URL`.
- Frontend: SPA Vite desplegable en Vercel, Netlify o Render Static.
- Servicios IA: `ml-service` y `dl-service` CPU-first, con adaptadores listos para ONNX.
- Dataset objetivo: MIMIC-IV + MIMIC-CXR-JPG.

## Arranque Local

```bash
cd project2
copy .env.example .env
docker compose up -d --build
```

Para desarrollo sin Docker:

```bash
cd project2/backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Luego crear usuarios demo y datos semilla:

```bash
cd project2
python scripts/create_demo_users.py
python scripts/seed_mimic.py
```

Backend:

- Health: `http://localhost:8000/health`
- Swagger: `http://localhost:8000/docs`

Frontend:

```bash
cd project2/frontend
npm install
npm run dev
```

## Credenciales Demo

| Rol | X-Access-Key | X-Permission-Key |
|---|---|---|
| Admin | `dev-access-admin` | `dev-permission-admin` |
| Medico 1 | `dev-access-medico-1` | `dev-permission-medico-1` |
| Medico 2 | `dev-access-medico-2` | `dev-permission-medico-2` |
| Paciente | `dev-access-patient` | `dev-permission-patient` |

En producción, estas llaves deben generarse como secretos y persistirse en
Supabase. No se deben committear `.env` ni llaves reales.

## Funcionalidades Cubiertas

| Requisito | Estado |
|---|---|
| PostgreSQL normalizado en Supabase | Preparado con `DATABASE_URL` |
| Sin JSON como persistencia primaria | Cumplido: modelos relacionales |
| Doble API-Key | Cumplido |
| Roles admin/medico/paciente/auditor | Cumplido |
| FHIR Patient y Observation | Cumplido |
| Paginación `limit/offset` | Cumplido |
| Cifrado de datos sensibles | Cumplido con Fernet/AES |
| Rate limiting 429 | Cumplido |
| Audit log filtrado | Cumplido |
| Inferencia ML/DL y firma RiskReport | Implementación inicial |
| README datasets sin subir datos | Cumplido en `docs/datasets.md` |
| Postman | `postman/FHIR_Platform_Corte2.postman_collection.json` |

## Dataset

Este repositorio no incluye MIMIC-IV ni MIMIC-CXR-JPG. El equipo debe obtener
acceso autorizado desde PhysioNet y seguir DUA/CITI. La estructura esperada y
el mapeo a FHIR están documentados en:

- `docs/datasets.md`
- `docs/fhir_mapping.md`

## Deploy

- Backend: Render Web Service apuntando a `project2/backend`.
- Base de datos: Supabase PostgreSQL.
- Frontend: Vercel/Netlify/Render Static apuntando a `project2/frontend`.
- Variables sensibles: configurar en Render/Vercel/Supabase secrets.

