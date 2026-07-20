$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot 'logs'
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$LogFile = Join-Path $LogDir "ppr-preliminar-$Timestamp.log"

New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
Set-Location -LiteralPath $ProjectRoot

"[$(Get-Date -Format o)] Inicio precarga preliminar PPR" | Out-File -FilePath $LogFile -Encoding utf8
& npm.cmd run ppr:preliminar -- --force 2>&1 | ForEach-Object {
  $_ | Out-File -FilePath $LogFile -Append -Encoding utf8
}
$ExitCode = if ($null -ne $LASTEXITCODE) { $LASTEXITCODE } else { 0 }
"[$(Get-Date -Format o)] Fin precarga preliminar PPR exitCode=$ExitCode" | Out-File -FilePath $LogFile -Append -Encoding utf8

exit $ExitCode
