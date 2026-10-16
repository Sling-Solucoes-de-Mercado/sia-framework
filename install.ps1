# Instalador de uma linha do SIA (Windows / PowerShell).
#   irm https://raw.githubusercontent.com/Sling-Solucoes-de-Mercado/sia-framework/main/install.ps1 | iex
# Baixa o executável sia.exe da última versão, guarda em %LOCALAPPDATA%\sia\bin e instala o SIA na pasta atual.
# Variáveis opcionais: $env:SIA_VERSION (ex.: v1.0.0), $env:SIA_INSTALL_DIR, $env:SIA_SKIP_PROJECT = "1".
$ErrorActionPreference = "Stop"

$Repo = "Sling-Solucoes-de-Mercado/sia-framework"
$Version = if ($env:SIA_VERSION) { $env:SIA_VERSION } else { "latest" }
$InstallDir = if ($env:SIA_INSTALL_DIR) { $env:SIA_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA "sia\bin" }
$Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
$Name = "sia-windows-$Arch"
$Base = if ($Version -eq "latest") { "https://github.com/$Repo/releases/latest/download" } else { "https://github.com/$Repo/releases/download/$Version" }

$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("sia-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
  Write-Host "SIA: baixando $Name ($Version)..."
  $Zip = Join-Path $Tmp "$Name.zip"
  Invoke-WebRequest -Uri "$Base/$Name.zip" -OutFile $Zip -UseBasicParsing
  try {
    $Sums = (Invoke-WebRequest -Uri "$Base/SHA256SUMS" -UseBasicParsing).Content
    $Line = ($Sums -split "`n") | Where-Object { $_ -match " $Name\.zip$" } | Select-Object -First 1
    if ($Line) {
      $Expected = ($Line -split " ")[0]
      $Actual = (Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower()
      if ($Expected -ne $Actual) { throw "Checksum não confere para $Name.zip." }
    }
  } catch [System.Net.WebException] { }

  Expand-Archive -Path $Zip -DestinationPath $Tmp -Force
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  Move-Item -Force (Join-Path $Tmp "$Name.exe") (Join-Path $InstallDir "sia.exe")
  Write-Host "SIA: executável em $InstallDir\sia.exe"

  $UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not ($UserPath -split ";" | Where-Object { $_ -eq $InstallDir })) {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    Write-Host "SIA: $InstallDir adicionado ao PATH do usuário (abra um novo terminal para usar 'sia')."
  }

  if ($env:SIA_SKIP_PROJECT -ne "1") {
    & (Join-Path $InstallDir "sia.exe") install @args
  }
} finally {
  Remove-Item -Recurse -Force $Tmp -ErrorAction SilentlyContinue
}
