# Estado Corte 2

## Cambio aplicado

Se retiro el flujo anterior de pruebas y el proyecto queda orientado a datos
reales autorizados:

- Dataset clinico: MIMIC-IV.
- Dataset de imagen: MIMIC-CXR-JPG.
- Seed principal: `scripts/seed_mimic.py`.
- Assets ECG: `frontend/public/ecg-previews/` con 30 waveforms SVG exportadas
  desde los `Media` ECG actuales.
- Documentacion de datos: `docs/datasets.md`.
- Mapeo interoperable: `docs/fhir_mapping.md`.
- Explicacion de modelos: `docs/model_explanation.md`.

El sistema no genera pacientes sinteticos ni usa archivos demo como fallback.
Si `project2/datasets/mimic-iv` o `project2/datasets/mimic-cxr-jpg` no existen,
el seed debe fallar con una ruta clara para que el equipo descargue los archivos
autorizados desde PhysioNet.

## Flujo actual

1. `scripts/create_test_users.py` crea usuarios/llaves de prueba para operar el sistema.
2. `scripts/seed_mimic.py` lee MIMIC-IV y MIMIC-CXR-JPG desde `project2/datasets/`.
3. Los pacientes, encounters, observaciones, reportes, consentimientos y auditoria se guardan en PostgreSQL/Supabase.
4. Las imagenes JPG CXR se suben a MinIO y se enlazan desde `Media`/`ImagingStudy` y `DiagnosticReport`.
5. Las waveforms ECG SVG quedan disponibles como assets estaticos para Vercel y fallback de Imaging.
6. El frontend muestra pacientes, observaciones, imagenes, ECG SVG, inferencias, reportes firmados y auditoria.

## Cambios recientes

- Despliegue frontend realizado en Vercel.
- Frontend actualizado para no depender de un dominio fijo:
  - En desarrollo usa `http://localhost:8000`.
  - En build de Vercel usa `VITE_API_URL` si existe.
  - Si `VITE_API_URL` esta vacio, cae a `/api`, que requiere rewrite/proxy
    hacia el backend publico.
- Supabase local configurado con pooler transaction como `DATABASE_URL`.
  Tambien quedan registradas en `.env` local las variantes direct,
  transaction pooler y session pooler. La conexion direct puede requerir red
  con IPv6; desde Docker se verificaron correctamente los poolers transaction
  y session.
- Pacientes renombrados con nombres humanos pseudonimizados en local y Supabase
  remoto; los `subject_id` MIMIC se conservan como identificadores de
  trazabilidad.
- 30 previews ECG SVG exportados a `frontend/public/ecg-previews/`.
- Imaging usa la URL FHIR/MinIO cuando esta disponible y cae al asset estatico
  `/ecg-previews/{study_id}.svg` cuando la URL firmada no sirve en despliegue.
- Debajo de cada waveform se muestra una descripcion de:
  - `.hea`: header WFDB con derivaciones, frecuencia, ganancia y metadatos.
  - `.dat`: senal binaria usada para renderizar el SVG.
- Se documento que hace cada modelo en `docs/model_explanation.md`.

## Rutas locales

- Frontend: `http://localhost:5173`
- Backend Swagger: `http://localhost:8000/docs`
- MinIO console: `http://localhost:9001`
- ML service: `http://localhost:8011/health`
- DL service: `http://localhost:8012/health`
- Nginx local: `http://localhost/`
- Backend via Nginx: `http://localhost/api/health`

## Pendiente para correr con datos reales

- Descargar MIMIC-IV y MIMIC-CXR-JPG con autorizacion PhysioNet.
- Ubicar los archivos en la estructura definida por `docs/datasets.md`.
- Ejecutar `docker compose --profile seed run --rm seed`.
- Reiniciar o limpiar bases locales antiguas si todavia contienen datos de pruebas anteriores.
- Ejecutar la coleccion Postman contra el backend local o Render.
