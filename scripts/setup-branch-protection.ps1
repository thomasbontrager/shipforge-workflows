param(
  [string]$Owner = "thomasbontrager",
  [string]$Repo = "shipforge-workflows",
  [string]$Branch = "main",
  [int]$RequiredApprovingReviewCount = 1,
  [switch]$DryRun
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
    throw "GitHub CLI is not authenticated. Run 'gh auth login' or set GH_TOKEN before applying branch protection."
  }
}

function Get-ProtectionPayload {
  param([int]$Approvals)

  return @{
    required_status_checks = @{
      strict   = $true
      contexts = @(
        "CI / Verify (Node 20)",
        "CI / Verify (Node 22)",
        "CI / Verify (Postgres strict health)"
      )
    }
    enforce_admins = $true
    required_pull_request_reviews = @{
      dismiss_stale_reviews            = $true
      require_code_owner_reviews       = $false
      required_approving_review_count  = $Approvals
      require_last_push_approval       = $false
    }
    restrictions = $null
    required_linear_history = $false
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_conversation_resolution = $true
    lock_branch = $false
    allow_fork_syncing = $false
  }
}

$GhExe = Resolve-GhExecutable

if (-not $DryRun) {
  Assert-Authenticated -GhExecutable $GhExe
}

$endpoint = "repos/$Owner/$Repo/branches/$Branch/protection"
$payload = Get-ProtectionPayload -Approvals $RequiredApprovingReviewCount
$json = $payload | ConvertTo-Json -Depth 8

if ($DryRun) {
  Write-Host "Dry run enabled. Request that would be sent:" -ForegroundColor Yellow
  Write-Host "$GhExe api --method PUT $endpoint" -ForegroundColor Yellow
  Write-Host $json
  exit 0
}

$tempDir = [System.IO.Path]::GetTempPath()
$uniqueSuffix = [System.Guid]::NewGuid().ToString("N")
$jsonPath = Join-Path $tempDir "branch-protection-$Repo-$Branch-$uniqueSuffix.json"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($jsonPath, $json, $utf8NoBom)

try {
  $previousErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $ghOutput = & $GhExe api --method PUT $endpoint --input $jsonPath 2>&1 | Out-String
  $ghExitCode = $LASTEXITCODE
  $ErrorActionPreference = $previousErrorActionPreference

  if ($ghExitCode -ne 0) {
    throw "Failed to apply branch protection. Details: $ghOutput"
  }

  Write-Host "Branch protection applied successfully." -ForegroundColor Green
  Write-Host "Required checks:" -ForegroundColor Green
  Write-Host "- CI / Verify (Node 20)"
  Write-Host "- CI / Verify (Node 22)"
  Write-Host "- CI / Verify (Postgres strict health)"
} finally {
  if (Test-Path $jsonPath) {
    Remove-Item $jsonPath -Force
  }
}
