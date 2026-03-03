param()

$ErrorActionPreference = "Stop"

function Get-StagedFiles {
  $files = git diff --cached --name-only
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to read staged files from git index."
  }
  return @($files | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function Is-ImplementationFile([string]$path) {
  if ($path -match '^(Plan\.md|README\.md)$') { return $false }
  if ($path -match '^scripts/') { return $false }
  if ($path -match '^\.githooks/') { return $false }
  if ($path -match '\.(html|css|js)$') { return $true }
  if ($path -match '^data/.*\.csv$') { return $true }
  return $false
}

$stagedFiles = Get-StagedFiles

if ($stagedFiles.Count -eq 0) {
  Write-Host "Doc sync check passed (no staged files)."
  exit 0
}

$hasPlan = $stagedFiles -contains "Plan.md"
$hasReadme = $stagedFiles -contains "README.md"
$implementationChanged = $false

foreach ($file in $stagedFiles) {
  if (Is-ImplementationFile $file) {
    $implementationChanged = $true
    break
  }
}

if (-not $implementationChanged) {
  Write-Host "Doc sync check passed (no implementation files staged)."
  exit 0
}

$missing = @()
if (-not $hasPlan) { $missing += "Plan.md" }
if (-not $hasReadme) { $missing += "README.md" }

if ($missing.Count -gt 0) {
  Write-Error ("Doc sync check failed. Implementation files changed, but missing staged docs: " + ($missing -join ", "))
  Write-Host "Fix: update docs and stage them together, for example:"
  Write-Host "  git add Plan.md README.md"
  exit 1
}

Write-Host "Doc sync check passed."
exit 0
