# scripts/publish-prod.ps1 -- one-shot Workshop publish for Pudge Wars on the VM.
# Compiles TS->Lua + panorama, bakes the map + minimap, cooks the addon, and
# uploads via steamcmd. WorkshopId 0 (the default, first publish) CREATES the
# item and prints its ID — record it in workshop/pudge_wars.vdf afterwards;
# pass -WorkshopId <id> on every later run to UPDATE instead.
#
# Ported from archer-wars publish-prod.ps1 and keeps its hard-won rules:
# Dota lives under C:\steamcmd (not Program Files); run-p is broken on the VM
# (per-script bun run instead); steamcmd is NOT on PATH — a bare `steamcmd`
# silently no-ops with a false PUBLISH OK, so the resolved exe is invoked.
#
# Run FOREGROUND over the IAP tunnel as builder (build+cook ~30s):
#   powershell -NoProfile -ExecutionPolicy Bypass `
#     -File C:\pw\pudge-wars\scripts\publish-prod.ps1 -SteamUser <steam-user>
param(
  [string]$Dota       = "C:\steamcmd\steamapps\common\dota 2 beta",
  [string]$Repo       = "C:\pw\pudge-wars",
  [string]$Addon      = "pudge_wars",
  [long]  $WorkshopId = 0,
  [Parameter(Mandatory=$true)]
  [string]$SteamUser,
  [string]$SteamCmd   = "C:\steamcmd\steamcmd.exe"
)
$ErrorActionPreference = "Continue"
$result = "C:\pw-publish-result.txt"
function Log($m) { "$((Get-Date -Format o))  $m" | Tee-Object -FilePath $result -Append | Out-Null; Write-Host $m }
"publish-prod start $(Get-Date -Format o)" | Out-File $result -Encoding utf8

$win64      = Join-Path $Dota "game\bin\win64"
$rc         = Join-Path $win64 "resourcecompiler.exe"
$contentSrc = Join-Path $Dota "content\dota_addons\$Addon"
$gameOut    = Join-Path $Dota "game\dota_addons\$Addon"

foreach ($p in @($Dota, $rc, $contentSrc, $gameOut, $Repo, $SteamCmd)) {
  if (-not (Test-Path $p)) { Log "FATAL missing: $p"; "PUBLISH FAIL: missing $p" | Add-Content $result; exit 2 }
}

Set-Location $Repo
Log "HEAD: $(git rev-parse --short HEAD)"

# 1) TS -> Lua
Log "== build:vscripts (tstl)"
& bun run build:vscripts 2>&1 | Select-Object -Last 6 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) { Log "FATAL tstl exit=$LASTEXITCODE"; exit 3 }

# 2) Panorama TS -> JS
Log "== build:panorama (tsc)"
& bun run build:panorama 2>&1 | Select-Object -Last 6 | ForEach-Object { Log $_ }
if ($LASTEXITCODE -ne 0) { Log "FATAL tsc exit=$LASTEXITCODE"; exit 4 }

# 3) Bake the map + minimap overview. Must precede the cook or the item
#    ships whatever vmap/overview is sitting in content/.
Log "== buildmap (map + minimap bake)"
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Repo "scripts\vm-buildmap.ps1") 2>&1 | Select-Object -Last 6 | ForEach-Object { Log $_ }
if (-not (Test-Path (Join-Path $gameOut "maps\$Addon.vpk"))) { Log "FATAL no map vpk after buildmap"; exit 6 }

# 4) Cook the whole addon into game/
Log "== cook (resourcecompiler -r full addon)"
& $rc -game (Join-Path $Dota "game\dota") -i "$contentSrc\*" -r 2>&1 | Select-Object -Last 12 | ForEach-Object { Log $_ }
Log "cook exit=$LASTEXITCODE"

# 5) Resolve the vdf. First publish (id 0): CREATE hidden, with the preview.
#    Updates (id != 0): keep the item's current visibility/preview untouched.
$content = ($gameOut -replace '\\', '\\')
$subject = (git log -1 --pretty=%s).Trim()
$note    = "build $(git rev-parse --short HEAD) -- $subject"
$preview = Join-Path $Repo "workshop\preview.jpg"
if ($WorkshopId -eq 0) {
  $previewLine = "`t`"previewfile`"     `"$(($preview -replace '\\', '\\'))`"`n"
  $visLine     = "`t`"visibility`"      `"2`"`n"
} else {
  $previewLine = ""
  $visLine     = ""
}
$vdf = @"
"workshopitem"
{
	"appid"           "570"
	"publishedfileid" "$WorkshopId"
	"contentfolder"   "$content"
$previewLine$visLine	"title"           "Pudge Wars"
	"description"     "Everyone is Pudge. 5v5 across the river on a tight court - a landed hook IS a kill: the victim is dragged home on a visible chain and executed. Hook the drifting river chest for gold, heals, items, haste, or a shield that eats the next enemy hook. First team to 10 kills wins."
	"changenote"      "$note"
}
"@
$vdfPath = Join-Path $Repo "pudge_wars_publish.vdf"
Set-Content -Path $vdfPath -Value $vdf -Encoding ASCII
Log "vdf written -> $vdfPath (id=$WorkshopId)"

# 6) Upload. Cached Steam-Guard login for $SteamUser already approved on this VM.
Log "== steamcmd workshop_build_item"
& $SteamCmd +login $SteamUser +workshop_build_item $vdfPath +quit 2>&1 | ForEach-Object { Log $_ }
$up = $LASTEXITCODE
Log "steamcmd exit=$up"
if ($up -ne 0) { "PUBLISH FAIL: steamcmd exit=$up" | Add-Content $result; exit 7 }

Log "PUBLISH OK (id=$WorkshopId; if 0, the NEW item id is in the steamcmd output above)"
"PUBLISH DONE $(Get-Date -Format o)" | Add-Content $result
