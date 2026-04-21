-- =============================================================
-- FHIR Platform Corte 2 — Initial Schema
-- Target: Supabase PostgreSQL (public schema)
-- =============================================================

-- Enable pgcrypto for future use
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- 1. patients  (created first — no outgoing FKs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    id                           TEXT        PRIMARY KEY,
    source_dataset               VARCHAR(80) NOT NULL DEFAULT 'MIMIC-IV',
    source_subject_id            VARCHAR(80) UNIQUE,
    name                         VARCHAR(180) NOT NULL,
    gender                       VARCHAR(24),
    birth_date                   VARCHAR(20),
    identification_doc_encrypted TEXT,
    medical_summary_encrypted    TEXT,
    fhir_json                    JSONB       NOT NULL DEFAULT '{}',
    active                       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_patients_source_subject_id ON patients(source_subject_id);

-- -------------------------------------------------------------
-- 2. users  (FK → patients)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id           TEXT        PRIMARY KEY,
    username     VARCHAR(80) UNIQUE NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    role         VARCHAR(24) NOT NULL,
    patient_id   TEXT        REFERENCES patients(id) ON DELETE SET NULL,
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);

-- -------------------------------------------------------------
-- 3. api_keys  (FK → users)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id             TEXT        PRIMARY KEY,
    user_id        TEXT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_key     VARCHAR(255) UNIQUE NOT NULL,
    permission_key VARCHAR(255) UNIQUE NOT NULL,
    role           VARCHAR(24) NOT NULL,
    active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_api_keys_role ON api_keys(role);

-- -------------------------------------------------------------
-- 4. encounters  (FK → patients)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encounters (
    id             TEXT        PRIMARY KEY,
    patient_id     TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    source_hadm_id VARCHAR(80) UNIQUE,
    status         VARCHAR(40) NOT NULL DEFAULT 'finished',
    class_code     VARCHAR(40) NOT NULL DEFAULT 'inpatient',
    started_at     TIMESTAMPTZ,
    ended_at       TIMESTAMPTZ,
    fhir_json      JSONB       NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ix_encounters_patient_id ON encounters(patient_id);

-- -------------------------------------------------------------
-- 5. observations  (FK → patients, encounters)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS observations (
    id             TEXT           PRIMARY KEY,
    patient_id     TEXT           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    encounter_id   TEXT           REFERENCES encounters(id) ON DELETE SET NULL,
    code           VARCHAR(80)    NOT NULL,
    display        VARCHAR(180)   NOT NULL,
    value          DOUBLE PRECISION,
    unit           VARCHAR(40),
    effective_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    source_itemid  VARCHAR(80),
    fhir_json      JSONB          NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS ix_observations_patient_id ON observations(patient_id);
CREATE INDEX IF NOT EXISTS ix_observations_code       ON observations(code);

-- -------------------------------------------------------------
-- 6. imaging_studies  (FK → patients)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS imaging_studies (
    id                TEXT        PRIMARY KEY,
    patient_id        TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    source_study_id   VARCHAR(80) NOT NULL,
    source_dicom_id   VARCHAR(80),
    modality          VARCHAR(40) NOT NULL DEFAULT 'CR',
    minio_object_name TEXT,
    content_type      VARCHAR(120),
    image_url         TEXT,
    fhir_json         JSONB       NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_imaging_studies_patient_id     ON imaging_studies(patient_id);
CREATE INDEX IF NOT EXISTS ix_imaging_studies_source_study_id ON imaging_studies(source_study_id);

-- -------------------------------------------------------------
-- 7. diagnostic_reports  (FK → patients, imaging_studies)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostic_reports (
    id               TEXT        PRIMARY KEY,
    patient_id       TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    imaging_study_id TEXT        REFERENCES imaging_studies(id) ON DELETE SET NULL,
    status           VARCHAR(40) NOT NULL DEFAULT 'final',
    conclusion       TEXT        NOT NULL,
    conclusion_code  VARCHAR(80),
    fhir_json        JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_diagnostic_reports_patient_id ON diagnostic_reports(patient_id);

-- -------------------------------------------------------------
-- 8. risk_reports  (FK → patients, users)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS risk_reports (
    id                         TEXT           PRIMARY KEY,
    patient_id                 TEXT           NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    model_type                 VARCHAR(20)    NOT NULL,
    risk_score                 DOUBLE PRECISION NOT NULL,
    risk_category              VARCHAR(24)    NOT NULL,
    sensitive_payload_encrypted TEXT,
    explanation                JSONB          NOT NULL DEFAULT '{}',
    signed_by                  TEXT           REFERENCES users(id) ON DELETE SET NULL,
    signed_at                  TIMESTAMPTZ,
    clinical_note_encrypted    TEXT,
    fhir_json                  JSONB          NOT NULL DEFAULT '{}',
    created_at                 TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_risk_reports_patient_id ON risk_reports(patient_id);

-- -------------------------------------------------------------
-- 9. audit_log  (no FKs — intentionally standalone for resilience)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT        PRIMARY KEY,
    user_id     TEXT,
    actor       VARCHAR(80),
    role        VARCHAR(24),
    action      VARCHAR(80) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id   VARCHAR(80),
    patient_id  TEXT,
    result      VARCHAR(24) NOT NULL DEFAULT 'SUCCESS',
    ip          VARCHAR(80),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_audit_log_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS ix_audit_log_patient_id ON audit_log(patient_id);

-- -------------------------------------------------------------
-- 10. consents  (FK → patients)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consents (
    id         TEXT        PRIMARY KEY,
    patient_id TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    scope      VARCHAR(80) NOT NULL,
    granted    BOOLEAN     NOT NULL DEFAULT TRUE,
    fhir_json  JSONB       NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_consents_patient_id ON consents(patient_id);

-- -------------------------------------------------------------
-- 11. inference_jobs  (FK → patients, risk_reports)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inference_jobs (
    id          TEXT        PRIMARY KEY,
    patient_id  TEXT        NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    model_type  VARCHAR(20) NOT NULL,
    status      VARCHAR(24) NOT NULL DEFAULT 'DONE',
    result_id   TEXT        REFERENCES risk_reports(id) ON DELETE SET NULL,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_inference_jobs_patient_id ON inference_jobs(patient_id);

-- =============================================================
-- Demo seed data — users & API keys for local/staging testing
-- These match the defaults in .env.example
-- =============================================================

INSERT INTO users (id, username, display_name, role, active, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin',    'Platform Admin',   'admin',   TRUE, NOW()),
    ('00000000-0000-0000-0000-000000000002', 'medico1',  'Dr. Demo Medico 1','medico',  TRUE, NOW()),
    ('00000000-0000-0000-0000-000000000003', 'medico2',  'Dr. Demo Medico 2','medico',  TRUE, NOW()),
    ('00000000-0000-0000-0000-000000000004', 'auditor1', 'Demo Auditor',     'auditor', TRUE, NOW())
ON CONFLICT (username) DO NOTHING;

INSERT INTO api_keys (id, user_id, access_key, permission_key, role, active, created_at)
VALUES
    ('10000000-0000-0000-0000-000000000001',
     '00000000-0000-0000-0000-000000000001',
     'dev-access-admin', 'dev-permission-admin', 'admin', TRUE, NOW()),
    ('10000000-0000-0000-0000-000000000002',
     '00000000-0000-0000-0000-000000000002',
     'dev-access-medico-1', 'dev-permission-medico-1', 'medico', TRUE, NOW()),
    ('10000000-0000-0000-0000-000000000003',
     '00000000-0000-0000-0000-000000000003',
     'dev-access-medico-2', 'dev-permission-medico-2', 'medico', TRUE, NOW()),
    ('10000000-0000-0000-0000-000000000004',
     '00000000-0000-0000-0000-000000000004',
     'dev-access-auditor', 'dev-permission-auditor', 'auditor', TRUE, NOW())
ON CONFLICT (access_key) DO NOTHING;
