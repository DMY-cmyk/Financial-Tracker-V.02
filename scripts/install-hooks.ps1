param()

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$hooksDir = Join-Path $repoRoot ".githooks"
$sourceHook = Join-Path $PSScriptRoot "hooks\pre-commit"
$targetHook = Join-Path $hooksDir "pre-commit"

if (-not (Test-Path $sourceHook)) {
  throw "Missing hook template: $sourceHook"
}

New-Item -ItemType Directory -Force -Path $hooksDir | Out-Null
Copy-Item -Path $sourceHook -Destination $targetHook -Force

git config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
  throw "Failed to set git core.hooksPath."
}

Write-Host "Installed pre-commit hook to $targetHook"
Write-Host "Configured hooks path: .githooks"
