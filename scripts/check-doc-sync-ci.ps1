param(
  [Parameter(Mandatory = $true)]
  [string]$DiffFile
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $DiffFile)) {
  throw "Diff file not found: $DiffFile"
}

function Is-ImplementationFile([string]$path) {
  if ($path -match '^(Plan\.md|README\.md)$') { return $false }
  if ($path -match '^scripts/') { return $false }
  if ($path -match '^\.githooks/') { return $false }
  if ($path -match '^\.github/workflows/') { return $false }
  if ($path -match '\.(html|css|js)$') { return $true }
  if ($path -match '^data/.*\.csv$') { return $true }
  return $false
}

$changedFiles = @(Get-Content -Path $DiffFile | Where-Object { $_ -and $_.Trim().Length -gt 0 })

if ($changedFiles.Count -eq 0) {
  Write-Host "Doc sync CI check passed (no changed files)."
  exit 0
}

$hasPlan = $changedFiles -contains "Plan.md"
$hasReadme = $changedFiles -contains "README.md"
$implementationChanged = $false

foreach ($file in $changedFiles) {
  if (Is-ImplementationFile $file) {
    $implementationChanged = $true
    break
  }
}

if (-not $implementationChanged) {
  Write-Host "Doc sync CI check passed (no implementation files changed)."
  exit 0
}

$missing = @()
if (-not $hasPlan) { $missing += "Plan.md" }
if (-not $hasReadme) { $missing += "README.md" }

if ($missing.Count -gt 0) {
  Write-Error ("Doc sync CI check failed. Implementation files changed, but missing docs in the same change set: " + ($missing -join ", "))
  exit 1
}

Write-Host "Doc sync CI check passed."
exit 0
