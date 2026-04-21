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
3. Usar formato SQLAlchemy:

```text
postgresql+psycopg://postgres:<password>@db.<ref>.supabase.co:5432/postgres
```

## Frontend en Vercel/Netlify

1. Root directory: `project2/frontend`.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Configurar variable o reemplazar `API` si se desea usar backend público.

