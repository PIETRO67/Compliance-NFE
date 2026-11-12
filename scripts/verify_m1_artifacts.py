"""Verificações locais sem imprimir valores secretos."""

from pathlib import Path
import subprocess
import json
import yaml
from dotenv import dotenv_values

root = Path(__file__).resolve().parents[1]
config = yaml.safe_load((root / "compose.yaml").read_text(encoding="utf8"))
assert {"db", "redis", "migrate", "api", "worker", "web"} == set(config["services"])
assert (
    config["services"]["api"]["depends_on"]["migrate"]["condition"]
    == "service_completed_successfully"
)
values = dotenv_values(root / ".env")
secrets = [
    values.get(k, "").encode()
    for k in [
        "SECRET_KEY",
        "MFA_ENCRYPTION_KEY",
        "POSTGRES_PASSWORD",
        "APP_DB_PASSWORD",
        "ASAAS_API_KEY",
        "ASAAS_WEBHOOK_AUTH_TOKEN",
    ]
]
access = root / ".local/m1-access.json"
if access.exists():
    def passwords(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key == "password" and isinstance(item, str):
                    secrets.append(item.encode())
                else:
                    passwords(item)
        elif isinstance(value, list):
            for item in value:
                passwords(item)
    passwords(json.loads(access.read_text(encoding="utf8")))
tracked = subprocess.run(["git", "ls-files", "-z"], cwd=root, capture_output=True, check=True).stdout
for name in tracked.decode("utf8").split("\0"):
    if not name:
        continue
    assert not name.startswith((".local/", "backend/.venv/")) and name != ".env", "Arquivo privado versionado."
    path = root / name
    if path.is_file():
        content = path.read_bytes()
        assert not any(value and value in content for value in secrets), "Segredo detectado em arquivo versionado."
for folder in [".next-operational/static", "out/_next/static"]:
    path = root / folder
    if not path.exists():
        continue
    for file in path.rglob("*"):
        if file.is_file():
            content = file.read_bytes()
            assert not any(value and value in content for value in secrets), (
                "Segredo detectado em artefato público."
            )
result = subprocess.run(
    [str(root / "backend/.venv/Scripts/python.exe"), "-m", "pip", "freeze"],
    capture_output=True,
    text=True,
    check=True,
)
(root / "backend/requirements-lock.txt").write_text(result.stdout, encoding="utf8")
print(
    "YAML estrutural válido; nenhum segredo de configuração nos bundles públicos; snapshot de dependências gerado."
)
