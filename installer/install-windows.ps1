# OpenCode + Slides plugin one-click installer (Windows).
# Installs whatever is missing: Git, Node.js LTS, Python 3 (+ python-pptx, pymupdf), LibreOffice,
# OpenCode Desktop and the OpenCode CLI (latest release, matching this CPU), then the Slides plugin.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$PluginRepo = 'https://github.com/aswanthwuhan/opencode-slides-plugin'
$PluginDir  = Join-Path $env:USERPROFILE '.config\opencode\plugins\opencode-slides'
$ReleaseApi = 'https://api.github.com/repos/anomalyco/opencode/releases/latest'
$failed = @()

function Step($m) { Write-Host "`n==> $m" -ForegroundColor Cyan }
function Ok($m)   { Write-Host "    [ok] $m" -ForegroundColor Green }
function Warn($m) { Write-Host "    [!]  $m" -ForegroundColor Yellow }

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
}
function Has($cmd) { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
$haveWinget = Has 'winget'

# Returns $true when winget reports success (or "already installed").
function Winget-Install($id, $name) {
  if (-not $haveWinget) { Warn "winget not found - install $name manually."; return $false }
  Write-Host "    installing $name via winget (latest)..."
  # Out-Host keeps winget's output out of the function's return value.
  winget install --id $id -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
  $code = $LASTEXITCODE
  Refresh-Path
  # -1978335189 = APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE (already installed, no upgrade)
  return ($code -eq 0 -or $code -eq -1978335189)
}

function Find-Python {
  foreach ($c in @('py -3','python','python3')) {
    $parts = $c.Split(' ')
    if (Has $parts[0]) {
      $rest = @($parts | Select-Object -Skip 1)
      $out = & $parts[0] @rest --version 2>&1
      if ("$out" -match 'Python 3\.') { return ,$parts }
    }
  }
  return $null
}

# Use the 64-bit Program Files even if this shell happens to be 32-bit.
$ProgFiles = if ($env:ProgramW6432) { $env:ProgramW6432 } else { $env:ProgramFiles }

$arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { 'arm64' } else { 'x64' }
# CPUs without AVX2 need the "baseline" CLI build.
$cliVariant = $arch
if ($arch -eq 'x64') {
  try {
    Add-Type -Namespace OcInst -Name K32 -MemberDefinition '[DllImport("kernel32.dll")] public static extern bool IsProcessorFeaturePresent(int f);'
    if (-not [OcInst.K32]::IsProcessorFeaturePresent(40)) { $cliVariant = 'x64-baseline' }
  } catch { }
}

Write-Host "OpenCode + Slides plugin installer (Windows, $arch)" -ForegroundColor White

Step 'Git'
if (Has 'git') { Ok (git --version) }
elseif ((Winget-Install 'Git.Git' 'Git') -and (Has 'git')) { Ok 'Git installed' }
else { Warn 'Git missing'; $failed += 'Git' }

Step 'Node.js'
if (Has 'node') { Ok "node $(node --version)" }
elseif ((Winget-Install 'OpenJS.NodeJS.LTS' 'Node.js LTS') -and (Has 'node')) { Ok 'Node installed' }
else { Warn 'Node.js missing (only used for the self-test)'; $failed += 'Node.js' }

Step 'Python 3'
$py = Find-Python
if (-not $py) { [void](Winget-Install 'Python.Python.3.12' 'Python 3'); $py = Find-Python }
if ($py) {
  Ok "python found ($($py -join ' '))"
  $rest = @($py | Select-Object -Skip 1)
  & $py[0] @rest -m pip install --upgrade --quiet python-pptx pymupdf 2>$null
  if ($LASTEXITCODE -ne 0) { & $py[0] @rest -m pip install --upgrade --quiet --user python-pptx pymupdf }
  if ($LASTEXITCODE -eq 0) { Ok 'python-pptx, pymupdf installed' } else { Warn 'pip packages failed'; $failed += 'pip packages' }
} else { Warn 'Python 3 missing'; $failed += 'Python' }

Step 'LibreOffice'
$lo = @("$ProgFiles\LibreOffice\program\soffice.exe", "${env:ProgramFiles(x86)}\LibreOffice\program\soffice.exe")
$soffice = $lo | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $soffice) {
  [void](Winget-Install 'TheDocumentFoundation.LibreOffice' 'LibreOffice')
  $soffice = $lo | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if ($soffice) { Ok $soffice } else { Warn 'LibreOffice missing (only needed for screenshots when the panel is closed)'; $failed += 'LibreOffice' }

$rel = $null
try { $rel = Invoke-RestMethod $ReleaseApi -Headers @{ 'User-Agent'='opencode-installer' } }
catch { Warn "could not query the latest OpenCode release ($($_.Exception.Message)); will use winget" }

function Get-Asset($name) { if ($rel) { $rel.assets | Where-Object { $_.name -eq $name } | Select-Object -First 1 } }

Step 'OpenCode Desktop'
$ocPaths = @(
  "$env:LOCALAPPDATA\Programs\ai.opencode.desktop\OpenCode.exe",
  "$env:LOCALAPPDATA\Programs\OpenCode\OpenCode.exe",
  "$env:LOCALAPPDATA\Programs\opencode\OpenCode.exe",
  "$ProgFiles\OpenCode\OpenCode.exe"
)
$ocExisting = $ocPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($ocExisting) { Ok "already installed ($ocExisting)" } else {
  $done = $false
  $asset = Get-Asset "opencode-desktop-win-$arch.exe"
  if ($asset) {
    try {
      $tmp = Join-Path $env:TEMP $asset.name
      Write-Host "    downloading $($rel.tag_name) ($arch)..."
      Invoke-WebRequest $asset.browser_download_url -OutFile $tmp -UseBasicParsing
      Write-Host '    running OpenCode installer...'
      $p = Start-Process $tmp -ArgumentList '/S' -Wait -PassThru
      Remove-Item $tmp -Force -ErrorAction SilentlyContinue
      if ($p.ExitCode -eq 0) { $done = $true; Ok "OpenCode Desktop $($rel.tag_name) installed" }
      else { Warn "installer exit code $($p.ExitCode)" }
    } catch { Warn "direct download failed ($($_.Exception.Message))" }
  }
  if (-not $done) {
    if (Winget-Install 'SST.OpenCodeDesktop' 'OpenCode Desktop') { Ok 'OpenCode Desktop installed' }
    else { Warn 'OpenCode Desktop install failed - get it from https://opencode.ai'; $failed += 'OpenCode Desktop' }
  }
}

Step 'OpenCode CLI'
$bin = Join-Path $env:USERPROFILE '.opencode\bin'
if (Has 'opencode') { Ok "already installed ($((Get-Command opencode).Source))" }
elseif (Test-Path "$bin\opencode.exe") { Ok "already installed ($bin\opencode.exe)" }
else {
  $done = $false
  $zipAsset = Get-Asset "opencode-windows-$cliVariant.zip"
  if ($zipAsset) {
    try {
      $zip = Join-Path $env:TEMP $zipAsset.name
      Invoke-WebRequest $zipAsset.browser_download_url -OutFile $zip -UseBasicParsing
      New-Item -ItemType Directory -Force -Path $bin | Out-Null
      Expand-Archive $zip -DestinationPath $bin -Force
      Remove-Item $zip -Force -ErrorAction SilentlyContinue
      if (Test-Path "$bin\opencode.exe") { $done = $true }
    } catch { Warn "direct download failed ($($_.Exception.Message))" }
  }
  if ($done) {
    $up = [Environment]::GetEnvironmentVariable('Path','User')
    if (($up -split ';') -notcontains $bin) {
      $newPath = if ([string]::IsNullOrEmpty($up)) { $bin } else { "$($up.TrimEnd(';'));$bin" }
      [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
    }
    Refresh-Path
    Ok "opencode CLI $($rel.tag_name) ($cliVariant) installed to $bin"
  } elseif (Winget-Install 'SST.opencode' 'OpenCode CLI') { Ok 'opencode CLI installed' }
  else { Warn 'OpenCode CLI install failed'; $failed += 'OpenCode CLI' }
}

Step 'Slides plugin'
if (Has 'git') {
  if (Test-Path (Join-Path $PluginDir '.git')) {
    git -C $PluginDir pull --ff-only
    if ($LASTEXITCODE -eq 0) { Ok 'plugin updated' } else { Warn 'git pull failed (local changes?) - keeping the current copy' }
  } elseif ((Test-Path $PluginDir) -and (Get-ChildItem $PluginDir -Force | Select-Object -First 1)) {
    Warn "$PluginDir exists but is not a git clone - leaving it alone"
  } else {
    New-Item -ItemType Directory -Force -Path (Split-Path $PluginDir) | Out-Null
    git clone $PluginRepo $PluginDir
    if ($LASTEXITCODE -eq 0) { Ok "cloned to $PluginDir" } else { $failed += 'plugin clone' }
  }
  if ((Test-Path "$PluginDir\index.js") -and (Test-Path "$PluginDir\gui-experimental.cjs") -and (Test-Path "$PluginDir\dist\viewer.js")) {
    Ok 'plugin files verified'
    if (Has 'node') {
      Push-Location $PluginDir
      $last = node dev/main.test.mjs 2>&1 | Select-Object -Last 1
      Pop-Location
      if ("$last" -match 'ALL OK') { Ok 'self-test: ALL OK' } else { Warn "self-test: $last"; $failed += 'self-test' }
    }
  } else { Warn 'plugin files incomplete'; $failed += 'plugin files' }
} else { Warn 'git unavailable, cannot fetch plugin'; $failed += 'plugin' }

Write-Host ''
if ($failed.Count) { Write-Host "Finished with issues: $($failed -join ', ')" -ForegroundColor Yellow }
else { Write-Host 'All done!' -ForegroundColor Green }
Write-Host 'Fully quit and reopen OpenCode Desktop, then: side panel "+" > Slides > Open.'
Write-Host 'Open a new terminal to use the opencode CLI.'
Read-Host 'Press Enter to close'
