"""Auxiliar de desenvolvimento Windows: binários oficiais já baixados, sem instalação no sistema."""

from pathlib import Path
import os
import subprocess
import zipfile
from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / ".local"


def run(args, env=None):
    # Servidores Windows podem herdar handles de pipe; arquivo evita espera infinita pelo EOF.
    output = LOCAL / "pg-control.log"
    with output.open("w", encoding="utf8") as stream:
        result = subprocess.run(
            [str(a) for a in args],
            env=env,
            stdout=stream,
            stderr=subprocess.STDOUT,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )
    if result.returncode:
        raise SystemExit(output.read_text(encoding="utf8", errors="replace"))
    return output.read_text(encoding="utf8", errors="replace")


def main():
    target = LOCAL / "postgres"
    if not (target / "pgsql/bin/pg_ctl.exe").exists():
        with zipfile.ZipFile(LOCAL / "postgresql.zip") as archive:
            for member in archive.infolist():
                if not member.filename.startswith(
                    ("pgsql/bin/", "pgsql/lib/", "pgsql/share/")
                ):
                    continue
                destination = (target / member.filename).resolve()
                if not destination.is_relative_to(target.resolve()):
                    raise SystemExit("Caminho inválido no arquivo.")
                archive.extract(member, target)
    values = dotenv_values(ROOT / ".env")
    binaries = target / "pgsql/bin"
    data = LOCAL / "pgdata"
    if not (data / "PG_VERSION").exists():
        pw = LOCAL / "pg-password"
        pw.write_text(values["POSTGRES_PASSWORD"], encoding="utf8")
        pw.chmod(0o600)
        run(
            [
                binaries / "initdb.exe",
                "-D",
                data,
                "-U",
                values["POSTGRES_USER"],
                "-A",
                "scram-sha-256",
                "--pwfile",
                pw,
                "--encoding",
                "UTF8",
                "--locale",
                "C",
            ]
        )
        pw.unlink()
    status = subprocess.run(
        [str(binaries / "pg_ctl.exe"), "-D", str(data), "status"],
        capture_output=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    if status.returncode:
        run(
            [
                binaries / "pg_ctl.exe",
                "-D",
                data,
                "-l",
                LOCAL / "postgres.log",
                "-o",
                "-h 127.0.0.1 -p 55432",
                "-w",
                "start",
            ]
        )
    import psycopg

    conn = psycopg.connect(
        host="127.0.0.1",
        port=55432,
        user=values["POSTGRES_USER"],
        password=values["POSTGRES_PASSWORD"],
        dbname="postgres",
        autocommit=True,
    )
    from psycopg import sql

    with conn:
        for name in [values["POSTGRES_DB"], "compliance_test"]:
            if not conn.execute(
                "SELECT 1 FROM pg_database WHERE datname=%s", (name,)
            ).fetchone():
                conn.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    print(
        "PostgreSQL local disponível em 127.0.0.1:55432. Bancos de desenvolvimento e testes prontos."
    )


if __name__ == "__main__":
    main()
