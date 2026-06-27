$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $env:USERPROFILE "Desktop\maps"
$target = Join-Path $root "data\pmtiles"

New-Item -ItemType Directory -Force -Path $target | Out-Null

foreach ($name in @("khabarovsk.pmtiles", "krasnoyarsk.pmtiles")) {
    $src = Join-Path $source $name
    if (-not (Test-Path $src)) {
        Write-Warning "File not found: $src"
        continue
    }
    Copy-Item $src (Join-Path $target $name) -Force
    Write-Host "Copied $name"
}

Write-Host "Run: docker compose run --rm minio-init"
