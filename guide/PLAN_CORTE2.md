# Plan de Ejecucion - Corte 2 Sistema Clinico Digital Interoperable

> Documento orquestador actualizado. Esta version reemplaza la estrategia de
> herencia/copia de Corte 1 por una reimplementacion limpia en `project2/`.
>
> Decision base: **FastAPI + Supabase PostgreSQL + FHIR-Lite/FHIR R4 + doble
> API-Key + frontend SPA + ML/DL + auditoria clinica**.

---

## Fase 0 - Decisiones raiz

| Area | Decision |
|---|---|
| Persistencia | Supabase PostgreSQL, no archivos JSON |
| Backend | FastAPI + SQLAlchemy/Pydantic |
| Frontend | SPA Vite, deployable en Vercel/Netlify/Render Static |
| Dataset | MIMIC-IV FHIR Demo v2.1.0 + MIMIC-IV-ECG Demo v0.1 |
| Seguridad | Doble API-Key, RBAC, cifrado aplicativo, rate limiting |
| Interoperabilidad | Fachada FHIR-Lite compatible con recursos FHIR R4 |
| IA | Servicios ML/DL CPU-first con adaptadores para ONNX |

### Por que usar los demos publicos PhysioNet

El problema central no es solo hacer una prediccion aislada. El problema real
de salud digital es que los datos clinicos estan fragmentados: pacientes,
encuentros, observaciones, objetos fisiologicos, reportes y predicciones viven
en formatos distintos. Los demos publicos permiten demostrar ese problema sin
gestionar credenciales de acceso controlado durante el desarrollo:

- MIMIC-IV FHIR Demo ya entrega recursos FHIR como `Patient`, `Encounter` y
  `Observation`.
- MIMIC-IV-ECG Demo aporta senales diagnosticas reales en formato WFDB
  (`.hea` + `.dat`) enlazables por `subject_id`.
- MinIO simula el repositorio de objetos clinicos; Supabase guarda las
  relaciones normalizadas.

FHIR resuelve la fragmentacion al exponer recursos estables:

- `Patient` para el paciente pseudonimizado.
- `Encounter` para admisiones/encuentros.
- `Observation` para laboratorios y signos.
- `Media` / `ImagingStudy` para ECG/WFDB en MinIO.
- `DiagnosticReport` para conclusiones asociadas a ECG.
- `RiskAssessment` para salidas ML/DL.
- `AuditEvent` y `Consent` para trazabilidad y habeas data.

---

## Fase 1 - Monorepo limpio

Carpeta de trabajo: `project2/`.

Estructura implementada:

```text
project2/
  backend/
  frontend/
  ml-service/
  dl-service/
  scripts/
  postman/
  docs/
  datasets/        # local, ignorado por Git
  docker-compose.yml
  .env.example
  README.md
```

Objetivo: tener una base ejecutable que no reutiliza codigo de Fase 1, pero si
conserva las capacidades exigidas por la rubrica: PostgreSQL, roles, doble llave,
FHIR-Lite, paginacion, cifrado y rate limiting.

---

## Fase 2 - Backend FastAPI + Supabase PostgreSQL

Tablas normalizadas:

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

Reglas:

- No guardar JSON como persistencia primaria.
- Usar FKs para relaciones paciente-observacion-media-reporte.
- Cifrar `identification_doc`, `medical_summary`, notas clinicas y payload
  sensible de prediccion.
- Configurar Supabase con `DATABASE_URL`.
- Mantener SQLite solo como fallback local de desarrollo.

---

## Fase 3 - Identidad, doble llave y RBAC

Headers obligatorios:

- `X-Access-Key`: token de entrada. Si falta o falla, `401`.
- `X-Permission-Key`: token de rol/permisos. Si no autoriza, `403`.

Roles:

- `admin`: gestiona usuarios, corrige datos, consulta audit y soft-delete.
- `medico`: crea pacientes, observaciones, consentimientos, inferencias y firma.
- `paciente`: solo lee su propio registro.
- `auditor`: lectura controlada, sin mutaciones.

---

## Fase 4 - FHIR-Lite / FHIR R4

Endpoints publicos minimos:

- `POST /auth/validate-keys`
- `GET /data/status`
- `GET /fhir/Patient?limit=&offset=`
- `POST /fhir/Patient`
- `GET /fhir/Patient/{id}`
- `PATCH /fhir/Patient/{id}`
- `DELETE /fhir/Patient/{id}` solo admin, como soft-delete
- `GET /fhir/Observation?patient_id=&limit=&offset=`
- `POST /fhir/Observation`
- `GET /fhir/DiagnosticReport?patient_id=&limit=&offset=`
- `GET /fhir/Media?patient_id=&limit=&offset=`
- `GET /audit-log?actor=&role=&action=&patient_id=&limit=&offset=`
- `GET /consents?patient_id=`
- `POST /consents`

Todos los listados devuelven `Bundle` paginado con `total`, `limit`, `offset` y
`entry`.

---

## Fase 5 - Datasets demo PhysioNet y seed

Datasets locales:

```text
project2/datasets/
  mimic-iv-fhir-demo-2.1.0/
  mimic-iv-ecg-demo-0.1/
```

Documentos:

- `docs/datasets.md`: acceso open access, licencia, citas y estructura local.
- `docs/fhir_mapping.md`: mapeo PhysioNet demo -> FHIR -> DB.

Scripts:

- `scripts/seed_physionet_demo.py`: seed principal.
- `scripts/seed_mimic.py`: referencia para MIMIC completo, no usado por defecto.

Verificacion:

- El seed crea pacientes, encounters, observaciones, ECG media, reportes y
  consentimientos desde archivos demo publicos.
- MinIO contiene objetos en
  `patients/{patient_id}/mimic-iv-ecg-demo/{study_id}/{study_id}.hea`.
- `GET /fhir/DiagnosticReport` incluye `presentedForm[].url` presignada.
- `datasets/` esta excluido por Git.

---

## Fase 6 - Inferencia ML/DL y RiskReport

Endpoints:

- `POST /infer/ml`
- `POST /infer/dl`
- `POST /infer`
- `GET /infer/jobs/{id}`
- `PATCH /risk-reports/{id}/sign`

Comportamiento:

- `ML` usa variables tabulares derivadas del FHIR demo.
- `DL` usa media ECG derivada del MIMIC-IV-ECG Demo.
- `MULTIMODAL` fusiona ambas senales.
- La salida se persiste como `risk_reports` y se expone como `RiskAssessment`.
- Firma medica requiere nota clinica de al menos 30 caracteres.

---

## Fase 7 - Frontend SPA

Pantallas minimas:

- Inicio institucional.
- Login por doble API-Key.
- Dashboard con estado `/data/status`.
- Listado paginado de pacientes.
- Detalle clinico.
- Observaciones FHIR.
- Media ECG desde MinIO.
- Inferencia ML/DL/Multimodal.
- RiskReport y firma.
- Audit log filtrado.
- Vista solo lectura para paciente/auditor.

---

## Fase 8 - Postman, README y deploy

Entregables:

- URL GitHub/GitLab con commits significativos por integrante.
- URL backend Render con Swagger en `/docs`.
- URL frontend Vercel/Netlify/Render Static.
- Coleccion Postman con validacion de llaves, `/data/status`, paginacion,
  media ECG, inferencia, firma RiskReport y audit log.
- Credenciales de prueba en README o variables de entorno, sin llaves reales.
- README de datasets con citas y licencia, sin incluir archivos pesados.

---

## Fase 9 - Pruebas de aceptacion

Checklist:

- [ ] `401` sin `X-Access-Key`.
- [ ] `401` sin `X-Permission-Key`.
- [ ] `403` por rol insuficiente.
- [ ] `429` al exceder rate limit.
- [ ] `GET /fhir/Patient?limit=10&offset=0` pagina correctamente.
- [ ] Seed demo crea pacientes, encounters, observations, media, reports y consent.
- [ ] Objetos `.hea` y `.dat` estan en MinIO.
- [ ] Campos sensibles se ven cifrados en base de datos.
- [ ] Inferencia crea `RiskAssessment`.
- [ ] Firma RiskReport exige nota clinica >= 30 caracteres.
- [ ] Audit log filtra por actor, rol, accion y paciente.
- [ ] Frontend permite recorrer login -> pacientes -> detalle -> media -> inferencia -> firma.

---

## Supuestos

- Los demos publicos de PhysioNet son suficientes para desarrollo y entrega
  academica.
- Supabase es la base PostgreSQL principal.
- Render aloja backend FastAPI.
- El sistema es academico y de apoyo, no un dispositivo diagnostico real.
