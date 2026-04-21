# Plan de Ejecucion - Corte 2 Sistema Clinico Digital Interoperable

> Documento orquestador actualizado. Esta version reemplaza la estrategia de
> herencia/copia de Corte 1 por una reimplementacion limpia en `project2/`.
>
> Decision base: **FastAPI + Supabase PostgreSQL + FHIR-Lite/FHIR R4 + doble
> API-Key + frontend SPA + ML/DL + auditoria clinica**.

---

## Fase 0 - Decisiones Raiz

| Area | Decision |
|---|---|
| Persistencia | Supabase PostgreSQL, no archivos JSON |
| Backend | FastAPI + SQLAlchemy/Pydantic |
| Frontend | SPA Vite, deployable en Vercel/Netlify/Render Static |
| Dataset | MIMIC-IV + MIMIC-CXR-JPG |
| Seguridad | Doble API-Key, RBAC, cifrado aplicativo, rate limiting |
| Interoperabilidad | Fachada FHIR-Lite compatible con recursos FHIR R4 |
| IA | Servicios ML/DL CPU-first con adaptadores para ONNX |

### Por que MIMIC-IV + MIMIC-CXR-JPG

El problema central no es solo hacer una prediccion de diabetes. El problema
real de salud digital es que los datos clinicos estan fragmentados: laboratorios
en una tabla, diagnosticos en codigos, imagenes en otro sistema, reportes en
texto y predicciones de IA por fuera del HIS. MIMIC-IV + MIMIC-CXR-JPG permite
demostrar interoperabilidad con mayor realismo porque comparte identificadores
pseudonimizados como `subject_id`, `hadm_id`, `study_id` y `dicom_id`.

FHIR resuelve esta fragmentacion al convertir los datos a recursos estables:

- `Patient` para el paciente pseudonimizado.
- `Encounter` para admisiones/hospitalizaciones.
- `Observation` para laboratorios y signos.
- `Media` / `ImagingStudy` para imagenes CXR.
- `DiagnosticReport` para conclusiones radiologicas.
- `RiskAssessment` para salidas ML/DL.
- `AuditEvent` y `Consent` para trazabilidad y habeas data.

### Nota sobre PIMA + APTOS 2019

PIMA + APTOS es util para una demo rapida: PIMA da 768 filas tabulares sobre
riesgo de diabetes y APTOS da imagenes de retina para retinopatia diabetica.
Pero no son los mismos pacientes. Eso obliga a declarar pacientes sinteticos
compuestos, validos para ingenieria de interoperabilidad pero menos convincentes
clinicamente. Por esa razon el plan fija MIMIC como norte.

---

## Fase 1 - Monorepo Limpio

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
  docker-compose.yml
  .env.example
  README.md
```

Objetivo: tener una base ejecutable que no reutiliza codigo de Fase 1, pero si
conserva las capacidades exigidas por la rubrica: PostgreSQL, roles, doble llave,
FHIR-Lite, paginacion, cifrado y rate limiting.

Verificacion:

- `project2/.env.example` documenta secretos.
- `.gitignore` excluye `.env`, datasets, modelos y artefactos pesados.
- `README.md` contiene credenciales demo y pasos de arranque.

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
- Usar FKs para relaciones paciente-observacion-imagen-reporte.
- Cifrar antes de persistir `identification_doc`, `medical_summary`, notas
  clinicas y payload sensible de prediccion.
- Configurar Supabase con `DATABASE_URL`.
- Mantener SQLite solo como fallback local de desarrollo.

Verificacion:

- `GET /health` responde.
- `GET /docs` muestra Swagger.
- Crear paciente y 50 observaciones no duplica nombre del paciente.
- Los campos sensibles no quedan legibles en PostgreSQL.

---

## Fase 3 - Identidad, Doble Llave y RBAC

Headers obligatorios:

- `X-Access-Key`: token de entrada. Si falta o falla, `401`.
- `X-Permission-Key`: token de rol/permisos. Si no autoriza, `403`.

Roles:

- `admin`: gestiona usuarios, corrige datos, consulta audit y soft-delete.
- `medico`: crea pacientes, observaciones, consentimientos, inferencias y firma.
- `paciente`: solo lee su propio registro.
- `auditor`: lectura controlada, sin mutaciones.

Verificacion:

- Request sin `X-Access-Key` -> `401`.
- Request sin `X-Permission-Key` -> `401`.
- Medico intentando `DELETE /fhir/Patient/{id}` -> `403`.
- Paciente intentando leer otro paciente -> `403`.

---

## Fase 4 - FHIR-Lite / FHIR R4

Endpoints publicos minimos:

- `POST /auth/validate-keys`
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

Verificacion:

- `GET /fhir/Patient?limit=10&offset=0` devuelve maximo 10.
- `Observation.subject.reference` apunta a `Patient/{id}`.
- `DiagnosticReport` referencia paciente e imagen.
- `AuditEvent` registra actor, rol, accion, entidad y resultado.

---

## Fase 5 - Dataset MIMIC y Seed

No se suben datasets al repositorio.

Documentos:

- `docs/datasets.md`: descarga, DUA/CITI, estructura esperada.
- `docs/fhir_mapping.md`: mapeo MIMIC -> FHIR.

Scripts:

- `scripts/seed_mimic.py`: crea una cohorte demo con forma MIMIC.
- En produccion academica, reemplazar filas demo por extractos autorizados de
  MIMIC-IV y MIMIC-CXR-JPG.

Verificacion:

- El seed crea pacientes, observaciones, imagenes, reportes y consentimientos.
- No existe `datasets/` versionado.
- El README explica como obtener cada dataset.

---

## Fase 6 - Inferencia ML/DL y RiskReport

Endpoints:

- `POST /infer/ml`
- `POST /infer/dl`
- `POST /infer`
- `GET /infer/jobs/{id}`
- `PATCH /risk-reports/{id}/sign`

Comportamiento:

- `ML` usa variables tabulares derivadas de MIMIC-IV.
- `DL` usa imagenes CXR derivadas de MIMIC-CXR-JPG.
- `MULTIMODAL` fusiona ambas senales.
- La salida se persiste como `risk_reports` y se expone como `RiskAssessment`.
- Firma medica requiere nota clinica de al menos 30 caracteres.

Verificacion:

- Medico puede correr inferencia.
- Paciente no puede correr inferencia.
- RiskReport sin firma queda `preliminary`.
- Firma medica popula `performer` y `signed_at`.

---

## Fase 7 - Frontend SPA

Pantallas minimas:

- Inicio institucional.
- Login por doble API-Key.
- Listado paginado de pacientes.
- Detalle clinico.
- Observaciones FHIR.
- Media CXR.
- Inferencia ML/DL/Multimodal.
- RiskReport y firma.
- Audit log filtrado.
- Vista solo lectura para paciente/auditor.

Verificacion:

- `npm run dev` levanta Vite.
- La SPA consume `http://localhost:8000`.
- No usa Streamlit, Gradio ni Jupyter como interfaz.

---

## Fase 8 - Postman, README y Deploy

Entregables:

- URL GitHub/GitLab con commits significativos por integrante.
- URL backend Render con Swagger en `/docs`.
- URL frontend Vercel/Netlify/Render Static.
- Coleccion Postman con:
  - validacion de llaves
  - paginacion
  - crear paciente
  - crear observacion
  - inferencia ML/DL/Multimodal
  - firma RiskReport
  - audit log filtrado
- Credenciales demo en README.
- README de datasets sin incluir archivos.

Verificacion:

- `newman run postman/FHIR_Platform_Corte2.postman_collection.json` ejecuta la
  coleccion con entorno configurado.
- Render expone `/health` y `/docs`.
- Frontend consume backend publico.
- Secretos estan en variables de entorno, no en codigo.

---

## Fase 9 - Pruebas de Aceptacion

Checklist:

- [ ] `401` sin `X-Access-Key`.
- [ ] `401` sin `X-Permission-Key`.
- [ ] `403` por rol insuficiente.
- [ ] `429` al exceder rate limit.
- [ ] `GET /fhir/Patient?limit=10&offset=0` pagina correctamente.
- [ ] Crear paciente + 50 observaciones mantiene normalizacion.
- [ ] Campos sensibles se ven cifrados en base de datos.
- [ ] Seed MIMIC demo crea pacientes, observations, media, reports y consent.
- [ ] Inferencia crea `RiskAssessment`.
- [ ] Firma RiskReport exige nota clinica >= 30 caracteres.
- [ ] Audit log filtra por actor, rol, accion y paciente.
- [ ] Frontend permite recorrer login -> pacientes -> detalle -> inferencia -> firma.

---

## Supuestos

- El equipo gestionara acceso PhysioNet, DUA y CITI para MIMIC-IV/CXR.
- Si el acceso completo no esta listo, se usa un subset autorizado o demo con la
  misma estructura.
- Supabase es la base PostgreSQL principal.
- Render aloja backend FastAPI.
- El sistema es academico y de apoyo, no un dispositivo diagnostico real.

