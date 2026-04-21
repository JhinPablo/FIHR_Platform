"""Export the local SQLite clinical seed into a Supabase-compatible SQL file."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path
from typing import Any


TABLES = [
    "patients",
    "encounters",
    "observations",
    "imaging_studies",
    "diagnostic_reports",
    "consents",
]


def quote(value: Any) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"pragma table_info({table})")]


BOOLEAN_COLUMNS = {"active", "granted"}


def row_values(table_columns: list[str], row: sqlite3.Row) -> str:
    values = []
    for column in table_columns:
        value = row[column]
        if column == "fhir_json":
            values.append(f"{quote(value or '{}')}::jsonb")
        elif column in BOOLEAN_COLUMNS:
            values.append("TRUE" if value else "FALSE")
        else:
            values.append(quote(value))
    return "(" + ",".join(values) + ")"


def compact_columns(table_columns: list[str]) -> list[str]:
    return [column for column in table_columns if column != "fhir_json"]


def batched(rows: list[sqlite3.Row], size: int) -> list[list[sqlite3.Row]]:
    return [rows[index : index + size] for index in range(0, len(rows), size)]


def export_sql(sqlite_path: Path, output_path: Path) -> None:
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    lines = [
        (
            "TRUNCATE TABLE inference_jobs, risk_reports, diagnostic_reports, "
            "imaging_studies, observations, encounters, consents, patients "
            "RESTART IDENTITY CASCADE;"
        ),
    ]

    first_patient_id: str | None = None
    for table in TABLES:
        table_columns = compact_columns(columns(conn, table))
        rows = list(conn.execute(f"select * from {table}"))
        if table == "patients" and rows:
            first_patient_id = rows[0]["id"]
        for chunk in batched(rows, 40):
            values = ",\n".join(row_values(table_columns, row) for row in chunk)
            lines.append(f"INSERT INTO {table} ({','.join(table_columns)}) VALUES\n{values};")

    if first_patient_id:
        lines.append(f"UPDATE users SET patient_id = {quote(first_patient_id)} WHERE username = 'paciente';")

    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {output_path} ({output_path.stat().st_size} bytes)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Export local clinical SQLite seed to SQL.")
    parser.add_argument("--sqlite", type=Path, default=Path("/app/dev.db"))
    parser.add_argument("--output", type=Path, default=Path("/app/supabase_clinical_seed.sql"))
    args = parser.parse_args()
    export_sql(args.sqlite, args.output)


if __name__ == "__main__":
    main()
