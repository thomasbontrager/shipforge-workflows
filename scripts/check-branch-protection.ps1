param(
  [string]$Owner = "thomasbontrager",
  [string]$Repo = "shipforge-workflows",
  [string]$Branch = "main",
  [switch]$Json
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-GhExecutable {
  $ghCommand = Get-Command gh -ErrorAction SilentlyContinue
  if ($ghCommand) {
    return $ghCommand.Source
  }

  $localGh = Get-ChildItem -Path (Join-Path $PSScriptRoot "..\\.tools\\gh") -Filter gh.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($localGh) {
    return $localGh.FullName
  }

  throw "GitHub CLI ('gh') is not installed on PATH and no local fallback was found under .tools/gh."
}

function Assert-Authenticated {
  param([string]$GhExecutable)
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  & $GhExecutable auth status --hostname github.com *> $null
  $authExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference

  if ($authExitCode -ne 0) {
    throw "GitHub CLI is not authenticated. Run 'gh auth login' or set GH_TOKEN before checking branch protection."
  }
}

function Invoke-GhApi {
  param(
    [string]$GhExecutable,
    [string[]]$Arguments
  )

  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $output = & $GhExecutable @Arguments 2>&1 | Out-String
  $exitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = $output
  }
}

function To-Set {
  param([string[]]$Items)
  $set = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
  foreach ($item in $Items) {
    if (-not [string]::IsNullOrWhiteSpace($item)) {
      $null = $set.Add($item)
    }
  }
  return $set
}

function Set-Equals {
  param(
    [System.Collections.Generic.HashSet[string]]$A,
    [System.Collections.Generic.HashSet[string]]$B
  )
  if ($A.Count -ne $B.Count) {
    return $false
  }
  foreach ($item in $A) {
    if (-not $B.Contains($item)) {
      return $false
    }
  }
  return $true
}

$GhExe = Resolve-GhExecutable
Assert-Authenticated -GhExecutable $GhExe

$requiredContexts = @(
  "CI / Verify (Node 20) (pull_request)",
  "CI / Verify (Node 22) (pull_request)",
  "CI / Verify (Postgres strict health) (pull_request)"
)

$endpoint = "repos/$Owner/$Repo/branches/$Branch/protection"
$apiResult = Invoke-GhApi -GhExecutable $GhExe -Arguments @("api", "--method", "GET", $endpoint)

if ($apiResult.ExitCode -ne 0) {
  if ($apiResult.Output -match "Branch not protected" -or $apiResult.Output -match "HTTP 404") {
    $report = [ordered]@{
      repo = "$Owner/$Repo"
      branch = $Branch
      compliant = $false
      checks = [ordered]@{
        strict_status_checks = $false
        required_checks_match_exact = $false
        enforce_admins = $false
        dismiss_stale_reviews = $false
        required_approving_review_count_min_1 = $false
        required_conversation_resolution = $false
        allow_force_pushes_disabled = $false
        allow_deletions_disabled = $false
      }
      required_checks = $requiredContexts
      actual_checks = @()
      missing_checks = $requiredContexts
      unexpected_checks = @()
      message = "Branch protection is not configured."
    }

    if ($Json) {
      $report | ConvertTo-Json -Depth 6
    } else {
      Write-Host "Branch protection drift detected." -ForegroundColor Red
      Write-Host "Repository: $($report.repo)"
      Write-Host "Branch: $($report.branch)"
      Write-Host ""
      Write-Host "Branch protection is not configured." -ForegroundColor Yellow
      Write-Host "Run: npm run branch-protection:setup" -ForegroundColor Yellow
    }

    exit 1
  }

  throw "Failed to read branch protection from GitHub API. Details: $($apiResult.Output)"
}

try {
  $protection = $apiResult.Output | ConvertFrom-Json
} catch {
  throw "GitHub API did not return valid JSON. Response: $($apiResult.Output)"
}

$actualContexts = @($protection.required_status_checks.contexts)
$actualSet = To-Set -Items $actualContexts
$requiredSet = To-Set -Items $requiredContexts

$missingContexts = @()
foreach ($required in $requiredContexts) {
  if (-not $actualSet.Contains($required)) {
    $missingContexts += $required
  }
}

$unexpectedContexts = @()
foreach ($actual in $actualContexts) {
  if (-not $requiredSet.Contains($actual)) {
    $unexpectedContexts += $actual
  }
}

$report = [ordered]@{
  repo = "$Owner/$Repo"
  branch = $Branch
  compliant = $true
  checks = [ordered]@{
    strict_status_checks = ($protection.required_status_checks.strict -eq $true)
    required_checks_match_exact = (Set-Equals -A $actualSet -B $requiredSet)
    enforce_admins = (($protection.enforce_admins.enabled) -eq $true)
    dismiss_stale_reviews = (($protection.required_pull_request_reviews.dismiss_stale_reviews) -eq $true)
    required_approving_review_count_min_1 = (($protection.required_pull_request_reviews.required_approving_review_count) -ge 1)
    required_conversation_resolution = (($protection.required_conversation_resolution.enabled) -eq $true)
    allow_force_pushes_disabled = (($protection.allow_force_pushes.enabled) -eq $false)
    allow_deletions_disabled = (($protection.allow_deletions.enabled) -eq $false)
  }
  required_checks = $requiredContexts
  actual_checks = $actualContexts
  missing_checks = $missingContexts
  unexpected_checks = $unexpectedContexts
}

foreach ($key in $report.checks.Keys) {
  if (-not $report.checks[$key]) {
    $report.compliant = $false
    break
  }
}

if ($Json) {
  $report | ConvertTo-Json -Depth 6
} else {
  if ($report.compliant) {
    Write-Host "Branch protection is compliant." -ForegroundColor Green
  } else {
    Write-Host "Branch protection drift detected." -ForegroundColor Red
  }

  Write-Host "Repository: $($report.repo)"
  Write-Host "Branch: $($report.branch)"
  Write-Host ""
  Write-Host "Checks:" 

  foreach ($key in $report.checks.Keys) {
    $ok = [bool]$report.checks[$key]
    if ($ok) {
      Write-Host ("PASS {0}" -f $key) -ForegroundColor Green
    } else {
      Write-Host ("FAIL {0}" -f $key) -ForegroundColor Red
    }
  }

  if ($report.missing_checks.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing required checks:" -ForegroundColor Yellow
    foreach ($item in $report.missing_checks) {
      Write-Host ("- {0}" -f $item)
    }
  }

  if ($report.unexpected_checks.Count -gt 0) {
    Write-Host ""
    Write-Host "Unexpected checks configured:" -ForegroundColor Yellow
    foreach ($item in $report.unexpected_checks) {
      Write-Host ("- {0}" -f $item)
    }
  }
}

if (-not $report.compliant) {
  exit 1
}
