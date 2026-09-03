# Sauvegarde complète : la base en SQL, plus les productions des apprenants.
# Usage : powershell -ExecutionPolicy Bypass -File scripts\sauvegarde.ps1
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
Set-Location $racine

$horodatage = Get-Date -Format 'yyyyMMdd-HHmmss'
New-Item -ItemType Directory -Force -Path "$racine\backups" | Out-Null

# --clean --if-exists rend le fichier rejouable sur une base déjà peuplée.
$sql = "bantuhub-$horodatage.sql"
docker compose exec -T db pg_dump -U bantu --clean --if-exists bantuhub -f "/backups/$sql"
if ($LASTEXITCODE -ne 0) { throw "pg_dump a echoue" }

# Les fichiers déposés par les apprenants sont déjà sur l'hôte : on les archive
# pour qu'une sauvegarde soit un couple (base, fichiers) cohérent.
$uploads = "$racine\data\uploads"
if ((Test-Path $uploads) -and (Get-ChildItem $uploads -Recurse -File -ErrorAction SilentlyContinue)) {
  Compress-Archive -Path "$uploads\*" -DestinationPath "$racine\backups\uploads-$horodatage.zip" -Force
  Write-Host "Fichiers apprenants : backups\uploads-$horodatage.zip"
} else {
  Write-Host "Aucun fichier apprenant a archiver."
}

Write-Host "Base : backups\$sql"
