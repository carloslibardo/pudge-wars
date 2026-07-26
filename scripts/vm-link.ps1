# Link the pudge_wars addon into a steamcmd-installed Dota 2, bypassing the
# ModDota find-steam-app resolver (which only sees Steam-client libraries).
# Junctions point Dota -> the repo, so the repo stays canonical.
param(
  [string]$Dota = "C:\steamcmd\steamapps\common\dota 2 beta",
  [string]$Repo = "C:\pw\pudge-wars",
  [string]$Addon = "pudge_wars"
)
$ErrorActionPreference = "Stop"

$win64 = Join-Path $Dota "game\bin\win64"
foreach ($bin in @("dota2.exe","resourcecompiler.exe")) {
  $p = Join-Path $win64 $bin
  if (Test-Path $p) { "present: $bin" } else { "MISSING: $bin  ($p)" }
}

foreach ($d in @("game","content")) {
  $target = Join-Path $Repo $d
  $linkParent = Join-Path $Dota "$d\dota_addons"
  if (-not (Test-Path $linkParent)) { New-Item -ItemType Directory -Force -Path $linkParent | Out-Null }
  $link = Join-Path $linkParent $Addon
  if (Test-Path $link) {
    "already linked: $link"
  } else {
    New-Item -ItemType Junction -Path $link -Target $target | Out-Null
    "linked $link -> $target"
  }
}
