# Seguridad

## Doble API-Key

Cada request protegido debe incluir:

- `X-Access-Key`: token de entrada. Si falta o no existe, respuesta `401`.
- `X-Permission-Key`: token de permisos. Si el rol no puede ejecutar la acción,
  respuesta `403`.

## Roles

- `admin`: gestión completa, audit log y soft-delete.
- `medico`: crea pacientes, observaciones, consentimientos, inferencias y firma reportes.
- `paciente`: solo lectura de su propio registro.
- `auditor`: lectura controlada si se activa en llaves de producción.

## Cifrado

Campos sensibles se cifran antes de persistir:

- `identification_doc`
- `medical_summary`
- notas clínicas de firma
- payloads internos de predicción

La variable `DATA_ENCRYPTION_KEY` debe configurarse como secreto. Para generar
una llave Fernet:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

## Rate Limiting

El backend aplica límite por minuto usando `X-Access-Key` o IP. Cuando se excede
el límite, responde:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## Secretos

No se debe subir `.env`. En Render/Vercel/Supabase, usar secret manager o
variables de entorno protegidas.

