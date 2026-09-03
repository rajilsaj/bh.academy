# Restaure une sauvegarde SQL produite par scripts\sauvegarde.ps1.
# Usage : powershell -ExecutionPolicy Bypass -File scripts\restauration.ps1 bantuhub-20260902-120000.sql
param([Parameter(Mandatory = $true)][string]$Fichier)
$ErrorActionPreference = 'Stop'
$racine = Split-Path -Parent $PSScriptRoot
Set-Location $racine

$nom = Split-Path -Leaf $Fichier
if (-not (Test-Path "$racine\backups\$nom")) { throw "Introuvable : backups\$nom" }

Write-Host "Restauration de backups\$nom — les donnees actuelles seront remplacees."
$reponse = Read-Host "Taper OUI pour confirmer"
if ($reponse -ne 'OUI') { Write-Host "Annule."; exit 0 }

docker compose exec -T db psql -U bantu -d bantuhub -v ON_ERROR_STOP=1 -f "/backups/$nom"
if ($LASTEXITCODE -ne 0) { throw "La restauration a echoue" }
Write-Host "Restauration terminee."
