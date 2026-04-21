# Estado del Proyecto - Sistema Clinico Digital Interoperable

Fecha de estado: 2026-04-21

Este documento resume el avance actual del proyecto Corte 2, lo que ya esta
implementado, lo que se verifico localmente y lo que falta para completar una
entrega final robusta.

## Resumen Ejecutivo

El proyecto fue reestructurado como una implementacion limpia en `project2/`,
sin reutilizar la Fase 1 anterior ni persistencia en JSON. La nueva base usa
FastAPI, modelos relacionales, endpoints FHIR-Lite/FHIR R4, doble API-Key,
roles, cifrado aplicativo, rate limiting, frontend SPA, MinIO para imagenes y
servicios placeholder de ML/DL.

Tambien se configuro el MCP remoto de Supabase y se autentico correctamente
desde Codex. La base remota de Supabase responde, pero todavia no tiene tablas
creadas en el schema `public`. Localmente, el sistema corre con SQLite para
desarrollo y Docker Compose levanta backend, frontend, servicios IA y MinIO.

El frontend fue mejorado tomando como referencia el contenido de
`guide/design_bundle/digitalhealth`, especialmente la identidad visual Novena
Health Systems, la navegacion por areas clinicas y las pantallas tipo Overview,
Access, Dashboard, Patients, Record, Imaging, AI Inference, Risk Report y
Audit & Consent.

## Estructura Actual

```text
project2/
  backend/
    app/
      config.py
      crypto.py
      db.py
      fhir.py
      main.py
      minio_client.py
      models.py
      schemas.py
      security.py
    tests/
    Dockerfile
    requirements.txt
  frontend/
    src/
      main.js
      styles.css
    Dockerfile
    index.html
    package.json
  ml-service/
  dl-service/
  scripts/
  datasets/
    local-demo/
  docs/
  postman/
  supabase/
  docker-compose.yml
  README.md
```

## Servicios Locales

El stack local se levanto con Docker Compose y responde en:

| Servicio | URL | Estado |
|---|---|---|
| Frontend | `http://localhost:5173` | Responde `200` |
| Backend Swagger | `http://localhost:8000/docs` | Disponible |
| Backend health | `http://localhost:8000/health` | Responde OK |
| ML service | `http://localhost:8011/health` | Responde OK |
| DL service | `http://localhost:8012/health` | Responde OK |
| MinIO API | `http://localhost:9000` | Activo |
| MinIO Console | `http://localhost:9001` | Responde `200` |

Credenciales locales de MinIO:

```text
user: minioadmin
pass: minioadmin123
```

Credenciales demo del frontend/backend:

```text
X-Access-Key: dev-access-medico-1
X-Permission-Key: dev-permission-medico-1
```

## Backend

El backend esta implementado con FastAPI y SQLAlchemy. Expone Swagger en
`/docs` y health check en `/health`.

### Capacidades Implementadas

- Configuracion por variables de entorno usando `.env`.
- Soporte para Supabase PostgreSQL mediante `DATABASE_URL`.
- Fallback local SQLite para desarrollo: `sqlite:///./dev.db`.
- Modelos relacionales:
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
- Doble API-Key:
  - `X-Access-Key`
  - `X-Permission-Key`
- Roles:
  - `admin`
  - `medico`
  - `paciente`
  - `auditor`
- Cifrado aplicativo de datos sensibles con Fernet/AES.
- Rate limiting por minuto con respuesta `429`.
- Audit log para acciones relevantes.
- Endpoints FHIR-Lite/FHIR R4:
  - `GET /fhir/Patient`
  - `POST /fhir/Patient`
  - `GET /fhir/Patient/{id}`
  - `PATCH /fhir/Patient/{id}`
  - `DELETE /fhir/Patient/{id}`
  - `GET /fhir/Observation`
  - `POST /fhir/Observation`
  - `GET /fhir/Media`
  - `GET /fhir/DiagnosticReport`
  - `GET /audit-log`
  - `GET /consents`
  - `POST /consents`
- Endpoints IA:
  - `POST /infer/ml`
  - `POST /infer/dl`
  - `POST /infer`
  - `GET /infer/jobs/{id}`
  - `PATCH /risk-reports/{id}/sign`
- Endpoint de imagenes:
  - `POST /images`

### Imagenes y MinIO

Se implemento MinIO como almacenamiento S3-compatible local. El bucket creado
es:

```text
clinical-images
```

El backend sube imagenes con el endpoint `POST /images`. Cada objeto queda con
la forma:

```text
patients/{patient_id}/source/{filename}
```

Se verificaron objetos reales en el bucket:

```text
patients/238c4c63-e009-4a53-9c13-80de16df1c7e/source/cxr-demo-10001217.svg
patients/a3c20c2d-c207-4739-a44c-d29aa9e56f19/source/cxr-demo-10000032.svg
```

Los endpoints FHIR usan URLs presignadas:

- `Media.content.url`
- `DiagnosticReport.presentedForm[].url`

Se corrigio la generacion de URLs para que la firma S3 sea valida usando
`localhost:9000` directamente como endpoint publico. Se verifico que una URL
presignada responde `200`.

## Frontend

El frontend esta implementado como SPA Vite en `project2/frontend`.

La version inicial era una SPA minima. Luego se mejoro para seguir de forma mas
clara el contenido de `guide/design_bundle/digitalhealth`, especialmente:

- Marca: `Novena Health Systems`.
- Paleta navy, crimson y gold.
- Topbar tipo consola clinica.
- Rutas alineadas con el bundle:
  - Overview
  - Access
  - Dashboard
  - Patients
  - Record
  - Imaging
  - AI Inference
  - Risk Report
  - Audit & Consent
- Flujo conectado al backend real:
  - login por doble API-Key
  - carga de pacientes
  - apertura de paciente
  - observaciones FHIR
  - imagenes MinIO
  - subida de imagen por formulario
  - inferencia ML/DL/Multimodal
  - firma de RiskReport
  - audit log

Archivos principales:

```text
project2/frontend/src/main.js
project2/frontend/src/styles.css
```

## Datasets

### Dataset Local Demo

Se agrego un dataset local versionable, sin PHI real, para probar el flujo de
forma reproducible:

```text
project2/datasets/local-demo/
  README.md
  mimic-iv/
    patients.csv
    labs.csv
  mimic-cxr-jpg/
    metadata.csv
    images/
      cxr-demo-10000032.svg
      cxr-demo-10001217.svg
```

Este dataset simula la forma de MIMIC-IV y MIMIC-CXR-JPG:

- `patients.csv` simula datos de paciente.
- `labs.csv` simula laboratorios/observaciones.
- `metadata.csv` simula metadata CXR.
- `images/*.svg` simula imagenes CXR sin PHI real.

Se creo el script:

```text
project2/scripts/seed_local_datasets.py
```

Ese script esta pensado para:

1. Leer `datasets/local-demo`.
2. Crear pacientes via `/fhir/Patient`.
3. Crear observaciones via `/fhir/Observation`.
4. Subir imagenes via `/images`.
5. Crear `Media` y `DiagnosticReport` enlazados a MinIO.

Debido a problemas de Python local en Windows, el seed local fue ejecutado
manualmente via API/curl durante la sesion, y quedo verificado.

### Datasets Reales

Los datasets reales todavia no estan descargados. Por diseno, no deben
versionarse en Git.

Ubicacion esperada:

```text
project2/datasets/mimic-iv/
project2/datasets/mimic-cxr-jpg/
```

Estas carpetas deben contener datos obtenidos legalmente desde PhysioNet con
DUA/CITI. El repositorio documenta el procedimiento en:

```text
project2/docs/datasets.md
```

## Supabase

### MCP

El MCP remoto de Supabase fue configurado con el proyecto:

```text
project_ref = lgyvsoehmzvhoblonydz
```

La autenticacion remota con Codex fue aceptada y luego verificada. En esta
sesion, las herramientas MCP de Supabase ya estan disponibles.

Se consulto el schema `public` y respondio:

```json
{"tables":[]}
```

Esto confirma conexion, pero tambien confirma que la base remota todavia esta
vacia.

### Supabase CLI

Se ejecuto:

```bash
npx supabase init
```

Esto creo:

```text
project2/supabase/
```

El comando:

```bash
npx supabase link --project-ref lgyvsoehmzvhoblonydz
```

no pudo completarse porque la terminal no interactiva no tiene
`SUPABASE_ACCESS_TOKEN` configurado.

Pendiente:

```powershell
$env:SUPABASE_ACCESS_TOKEN="tu-token"
npx supabase link --project-ref lgyvsoehmzvhoblonydz
```

## DigitalOcean MCP

Se agrego el requerimiento de acceso remoto por MCP a DigitalOcean para preparar
despliegue y gestion de infraestructura.

Servidores MCP configurados en Codex:

```text
do-apps       https://apps.mcp.digitalocean.com/mcp
do-databases  https://databases.mcp.digitalocean.com/mcp
```

Ambos servidores quedaron configurados para leer el token desde la variable de
entorno:

```text
DIGITALOCEAN_API_TOKEN
```

Esto evita guardar el token directamente en `~/.codex/config.toml`. Para que las
herramientas funcionen despues de reiniciar Codex, el token debe existir en el
entorno del proceso de Codex.

Importante: si un token fue pegado en texto plano durante la conversacion, se
debe rotar en DigitalOcean y reemplazarlo por uno nuevo.

## Postman

Existe una coleccion Postman:

```text
project2/postman/FHIR_Platform_Corte2.postman_collection.json
```

Incluye ejemplos para:

- Validar llaves.
- Listar pacientes paginados.
- Crear paciente.
- Crear observacion.
- Subir imagen a MinIO.
- Listar Media.
- Ejecutar inferencia multimodal.
- Firmar RiskReport.
- Consultar audit log filtrado.

La coleccion fue validada como JSON correcto con Node.

## Git

Se hizo un commit firmado y push inicial:

```text
commit: c1378a707b47013d379819fa84d16d468949127b
mensaje: Implement Corte 2 FHIR platform scaffold
remote: https://github.com/JhinPablo/FIHR_Platform.git
branch: main
```

La firma local fue verificada:

```text
Good "git" signature for juanpablogranadoscoral@gmail.com
```

Despues de ese commit se hicieron nuevos cambios importantes que todavia no se
han commiteado:

- MinIO.
- Dataset local demo.
- Endpoint `/images`.
- Mejoras frontend basadas en `guide/design_bundle`.
- Actualizacion de documentacion.

## Checklist de Avance

### Hecho

- [x] Reestructuracion limpia del proyecto en `project2/`.
- [x] Backend FastAPI creado.
- [x] Swagger disponible en `/docs`.
- [x] Health check disponible en `/health`.
- [x] Modelos relacionales definidos.
- [x] Fallback local SQLite funcionando.
- [x] Preparacion para Supabase via `DATABASE_URL`.
- [x] Doble API-Key implementada.
- [x] Roles `admin`, `medico`, `paciente`, `auditor` implementados.
- [x] RBAC basico implementado.
- [x] Cifrado aplicativo de campos sensibles.
- [x] Rate limiting con respuesta `429`.
- [x] Endpoints FHIR para `Patient`.
- [x] Endpoints FHIR para `Observation`.
- [x] Endpoints FHIR para `Media`.
- [x] Endpoints FHIR para `DiagnosticReport`.
- [x] Endpoint de `AuditEvent` via `/audit-log`.
- [x] Endpoint de `Consent`.
- [x] Inferencia ML/DL/Multimodal placeholder.
- [x] Firma de RiskReport.
- [x] Docker Compose para backend, frontend, ML y DL.
- [x] MinIO agregado a Docker Compose.
- [x] Bucket `clinical-images` creado.
- [x] Endpoint `POST /images` implementado.
- [x] Subida real de imagenes a MinIO verificada.
- [x] URLs presignadas de MinIO funcionando.
- [x] `Media.content.url` enlaza imagen presignada.
- [x] `DiagnosticReport.presentedForm[].url` enlaza imagen presignada.
- [x] Dataset local demo agregado.
- [x] Script `seed_local_datasets.py` agregado.
- [x] Frontend SPA funcional.
- [x] Frontend mejorado usando como referencia `guide/design_bundle`.
- [x] Vista de imagenes MinIO en frontend.
- [x] Formulario frontend para subir imagenes.
- [x] Postman collection agregada.
- [x] Documentacion de datasets.
- [x] Documentacion de seguridad.
- [x] Documentacion de mapeo FHIR.
- [x] Documentacion de deploy.
- [x] Supabase MCP remoto configurado.
- [x] Supabase MCP autenticado.
- [x] Consulta MCP a Supabase ejecutada.
- [x] DigitalOcean MCP App Platform configurado.
- [x] DigitalOcean MCP Databases configurado.
- [x] Primer commit firmado y push a GitHub.

### Parcial

- [ ] Supabase PostgreSQL conectado como base runtime real.
  - MCP funciona, pero la app local todavia corre con SQLite.
- [ ] Supabase CLI link.
  - `supabase init` esta hecho, pero `supabase link` requiere access token.
- [ ] Migraciones formales.
  - Hay creacion automatica de tablas con SQLAlchemy y una migracion runtime
    simple para columnas MinIO, pero falta Alembic o SQL migrations versionadas.
- [ ] Frontend basado en bundle.
  - La estetica y estructura se mejoraron con base en el bundle, pero aun no es
    una migracion React componente-por-componente de todos los JSX originales.
- [ ] Seed local por script.
  - El script existe, pero por limitaciones del Python local no se ejecuto desde
    `python`; los datos se sembraron manualmente via API.

### Falta Por Hacer

- [ ] Crear tablas reales en Supabase usando MCP o migraciones SQL.
- [ ] Configurar `DATABASE_URL` real de Supabase en `.env`/Render.
- [ ] Ejecutar backend contra Supabase y validar persistencia cloud.
- [ ] Crear migraciones Alembic o archivos SQL versionados.
- [ ] Completar `supabase link` con `SUPABASE_ACCESS_TOKEN`.
- [ ] Implementar RLS/policies si se decide exponer Supabase directamente.
- [ ] Revisar advisors de Supabase seguridad/performance tras crear tablas.
- [ ] Descargar datasets reales MIMIC-IV y MIMIC-CXR-JPG con acceso autorizado.
- [ ] Construir extracto real MIMIC de 30-100 pacientes.
- [ ] Adaptar `seed_local_datasets.py` o crear `seed_mimic_real.py` para datos
      autorizados.
- [ ] Implementar entrenamiento ML real con MIMIC-IV.
- [ ] Exportar modelo ML a ONNX.
- [ ] Implementar inferencia ML real usando ONNX Runtime.
- [ ] Implementar entrenamiento DL real con MIMIC-CXR-JPG.
- [ ] Exportar modelo DL a ONNX/INT8.
- [ ] Implementar Grad-CAM real y almacenamiento del heatmap en MinIO.
- [ ] Reemplazar servicios ML/DL placeholder por inferencia real.
- [ ] Implementar orquestador asincrono con cola real y concurrencia controlada.
- [ ] Añadir WebSocket o polling robusto para estado de inferencias.
- [ ] Completar frontend React/TypeScript si se quiere produccion mas limpia.
- [ ] Integrar de forma mas fiel todos los componentes JSX del bundle original.
- [ ] Agregar visor medico con zoom, pan, brillo y contraste.
- [ ] Agregar graficas de Observations con Recharts u otra libreria.
- [ ] Ejecutar tests backend con Python funcional.
- [ ] Arreglar entorno Python local de Windows o usar contenedor para tests.
- [ ] Ejecutar Postman/Newman end-to-end.
- [ ] Desplegar backend en Render.
- [ ] Desplegar frontend en Vercel/Netlify/Render Static.
- [ ] Definir si el despliegue final cambia de Render/Vercel a DigitalOcean App
      Platform.
- [ ] Configurar `DIGITALOCEAN_API_TOKEN` en el entorno local de Codex.
- [ ] Reiniciar Codex y verificar herramientas MCP de DigitalOcean.
- [ ] Rotar el token de DigitalOcean si fue expuesto en texto plano.
- [ ] Configurar secretos de produccion.
- [ ] Actualizar README con URLs publicas reales.
- [ ] Hacer nuevo commit firmado con los cambios posteriores a MinIO/frontend.
- [ ] Push del nuevo commit.

## Riesgos y Observaciones

- El Python local de Windows no pudo ejecutarse correctamente en sesiones
  anteriores porque `python.exe` y `py.exe` apuntaban a WindowsApps con acceso
  denegado. Docker si permitio construir y correr el backend.
- La base Supabase remota esta vacia. Si se evalua persistencia cloud, hay que
  crear el schema y cambiar `DATABASE_URL`.
- Los modelos ML/DL son placeholders. Cumplen contrato de API, pero no son
  modelos clinicos reales.
- El dataset local demo es deliberadamente pequeno y sintetico. Sirve para
  demostrar interoperabilidad y almacenamiento, no para evaluar desempeno
  clinico.
- Las URLs presignadas de MinIO expiran. Esto es correcto para seguridad; el
  frontend debe refrescar Media/DiagnosticReport para obtener nuevas URLs.

## Proximo Paso Recomendado

El siguiente avance de mayor valor es crear el schema real en Supabase via MCP,
validar el backend contra Supabase y luego hacer commit firmado de esta segunda
etapa:

1. Crear migracion SQL/Supabase.
2. Aplicar tablas en Supabase.
3. Cambiar `DATABASE_URL` a Supabase.
4. Ejecutar smoke test contra Supabase.
5. Commit firmado.
6. Push a `main`.
