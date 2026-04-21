# Deploy

## Backend en Render

1. Crear Web Service desde GitHub.
2. Root directory: `project2/backend`.
3. Build command:

```bash
pip install -r requirements.txt
```

4. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

5. Variables:
   - `DATABASE_URL`
   - `DATA_ENCRYPTION_KEY`
   - llaves `ACCESS_KEY_*` y `PERMISSION_KEY_*`
   - `CORS_ORIGINS`

## Supabase

1. Crear proyecto Supabase.
2. Copiar connection string PostgreSQL.
3. Para FastAPI/SQLAlchemy usar URLs con driver `postgresql+psycopg`.
4. Para runtime serverless o despliegues con muchas conexiones cortas, usar el
   pooler en modo transaction:

```text
DATABASE_URL=postgresql+psycopg://postgres.<ref>:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres
```

5. Mantener estas variantes en secretos, no en Git:

```text
# Direct connection: migraciones y mantenimiento. Puede requerir red con IPv6.
SUPABASE_DATABASE_URL_DIRECT=postgresql+psycopg://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# Transaction pooler: recomendado para backend API/serverless.
SUPABASE_DATABASE_URL_POOLER_TRANSACTION=postgresql+psycopg://postgres.<ref>:<password>@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# Session pooler: usar cuando el cliente necesita estado de sesion.
SUPABASE_DATABASE_URL_POOLER_SESSION=postgresql+psycopg://postgres.<ref>:<password>@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

El helper opcional `db.js` usa el paquete `postgres` para scripts Node.js que
necesiten consultar Supabase via `process.env.DATABASE_URL`. El backend de
produccion sigue usando Python, SQLAlchemy y `psycopg`.

## Frontend en Vercel/Netlify

1. El root del repositorio usa `vercel.json`.
2. Build command: `cd project2/frontend && npm install && npm run build`.
3. Output directory: `project2/frontend/dist`.
4. Configurar `VITE_API_URL` en Vercel para apuntar al backend publico. Si no
   existe, el frontend usa `/api`, que requiere un rewrite/proxy hacia el
   backend.
## MinIO Local

Docker Compose levanta:

- API S3: `http://localhost:9000`
- Console: `http://localhost:9001`
- Bucket: `clinical-images`

Credenciales locales por defecto:

```text
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
```
