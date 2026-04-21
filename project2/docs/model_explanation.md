# Explicacion de modelos de IA

Este proyecto presenta inferencia clinica academica. Los resultados sirven para
demostrar interoperabilidad, trazabilidad, auditoria y firma de reportes; no son
un diagnostico medico real.

## Modelo ML tabular

Endpoint: `POST /infer/ml`

Servicio: `ml-service`

Entrada esperada:

- `patient_id`
- variables tabulares como `creatinine`, `bun`, `glucose`, `sodium`,
  `potassium`, `hematocrit`, `wbc`, `bicarbonate`

Funcion:

- Toma variables clinicas equivalentes a observaciones FHIR/laboratorios
  extraidas de MIMIC-IV.
- Si hay runtime ONNX disponible, carga o entrena una regresion logistica
  calibrada y exportada a ONNX.
- Si ONNX no esta disponible, usa una ruta `numpy-fallback`.
- Calcula un score de riesgo entre 0.01 y 0.99.
- Clasifica el riesgo como `LOW`, `MODERATE` o `HIGH`.
- Devuelve `shap_values` lineales para explicar que variables empujan el score.

## Modelo DL CXR

Endpoint: `POST /infer/dl`

Servicio: `dl-service`

Entrada esperada:

- `patient_id`
- `study_id`
- `image_url` de una imagen JPG CXR almacenada en MinIO
- metadatos opcionales

Funcion:

- Trabaja sobre el estudio radiologico asociado al paciente.
- La imagen visible en Imaging viene de MIMIC-CXR-JPG y se enlaza como
  `Media`/`ImagingStudy`.
- El adaptador actual calcula un score reproducible usando `patient_id`,
  `study_id`, `image_url` y metadatos. Conserva el contrato para reemplazarlo
  por un modelo ONNX/PyTorch real entrenado con MIMIC-CXR-JPG.
- Devuelve score, categoria y resumen de fuente/modelo.

## Modelo multimodal

Endpoint: `POST /infer`

Servicio: backend FastAPI

Entrada esperada:

- `patient_id`
- `model_type = MULTIMODAL`
- features tabulares y/o referencia de imagen

Funcion:

- Combina observaciones FHIR de MIMIC-IV y media CXR asociada.
- Crea un `InferenceJob` con estados `PENDING`, `RUNNING`, `DONE` o `ERROR`.
- Genera un `RiskReport` cifrando payload sensible.
- Expone el resultado como `RiskAssessment`.
- Registra auditoria del evento de inferencia.

## Limitacion academica

Los modelos actuales no deben presentarse como dispositivos diagnosticos. La
fortaleza del proyecto esta en el flujo interoperable: FHIR, Supabase, MinIO,
doble API-key, cifrado, auditoria, paginacion, firma y trazabilidad.
