# scripts/vm-buildmap.ps1 -- regenerate + compile pudge_wars.vmap from arena.json.
# Runs over SSH (no GUI needed -- resourcecompiler works headless for maps).
# Ported from archer-wars vm-buildmap.ps1; same 3-step pipeline:
# genmap (python, kv2 text) -> dmxconvert (binary vmap) -> resourcecompiler (vpk).
param(
  [string]$Dota  = "C:\steamcmd\steamapps\common\dota 2 beta",
  [string]$Repo  = "C:\pw\pudge-wars",
  [string]$MapName = "pudge_wars"
)
# Continue, not Stop: under Stop any stderr line from the native tools becomes
# a terminating NativeCommandError before the $LASTEXITCODE gates run.
$ErrorActionPreference = "Continue"
$win64   = Join-Path $Dota "game\bin\win64"
$result  = "C:\pw-buildmap-result.txt"
$mapsDir = Join-Path $Repo "content\maps"
$seedTxt = Join-Path $Repo "mapgen\seed\seed.vmap.txt"
$outTxt  = Join-Path $Repo "mapgen\out_pudge_wars.vmap.txt"
"buildmap start $(Get-Date -Format o)" | Out-File $result -Encoding utf8

New-Item -ItemType Directory -Force -Path $mapsDir | Out-Null

# 1) court + river + spawn rows from arena.json
python (Join-Path $Repo "mapgen\genmap.py") --seed $seedTxt --out $outTxt `
  --arena (Join-Path $Repo "mapgen\arena.json") 2>&1 | Add-Content $result
if ($LASTEXITCODE -ne 0) { throw "genmap failed" }

# 2) kv2 text -> binary vmap (the map source in content/maps, junction-linked
#    into the Dota content dir by vm-link.ps1)
$vmap = Join-Path $mapsDir "$MapName.vmap"
& "$win64\dmxconvert.exe" -i $outTxt -o $vmap -oe binary 2>&1 | Add-Content $result
if ($LASTEXITCODE -ne 0) { throw "dmxconvert failed" }

# 3) compile to vpk
$contentVmap = Join-Path $Dota "content\dota_addons\pudge_wars\maps\$MapName.vmap"
& "$win64\resourcecompiler.exe" -i $contentVmap 2>&1 |
  Select-Object -Last 8 | Add-Content $result
if ($LASTEXITCODE -ne 0) { throw "resourcecompiler failed" }

$vpk = Join-Path $Dota "game\dota_addons\pudge_wars\maps\$MapName.vpk"
$vpkItem = Get-Item $vpk
"vpk: $($vpkItem.Length) bytes, $($vpkItem.LastWriteTime)" | Add-Content $result
"buildmap done $(Get-Date -Format o)" | Add-Content $result
