# Headless e2e smoke: compile addon resources, launch Dota in -tools mode with
# the e2e harness engaged, let the fake-client Pudges hook each other until a
# team reaches the (overridden) kill target, then scan console.log for script
# errors and the [E2E] WIN marker. Best autonomous approximation of a playtest.
#
# MAP: the repo ships no pudge_wars.vmap yet (Hammer-only artifact, see
# content/maps/README.md), so the smoke launches on the STOCK "dota" map.
# Spawns/river are pure coordinates in config.ts, so the game logic runs fine
# there; lane creeps and towers exist as background noise, which is why the
# kill threshold stays small and the verdict greps only [E2E] markers.
#
# Must run INSIDE the active console session (session 1) so the datacenter GPU
# initializes a DX11 device -- drive it via a scheduled task with an Interactive
# principal, not directly over SSH (session 0 has no display head).
param(
  [string]$Dota   = "C:\steamcmd\steamapps\common\dota 2 beta",
  [string]$Addon  = "pudge_wars",
  [string]$Map    = "dota",   # stock map until pudge_wars.vmap exists
  [int]$Kills     = 3,        # e2e win-threshold override (bounded smoke run)
  [int]$LoadSeconds = 480     # GPU/asset warmup (~2min) + time for bots to reach $Kills
                              # (measured 2026-07-26: first kill lands ~t+215s, then ~1 per 20-25s)
)
$ErrorActionPreference = "Continue"
$win64  = Join-Path $Dota "game\bin\win64"
$log    = Join-Path $Dota "game\dota\console.log"
$result = "C:\pw-smoke-result.txt"

"smoke start $(Get-Date -Format o)" | Out-File $result -Encoding utf8

# fresh console log
if (Test-Path $log) { Remove-Item $log -Force }

# 1) resource compile the addon (panorama/particles; no map of our own yet)
$rc = Join-Path $win64 "resourcecompiler.exe"
& $rc -a -i "$Dota\content\dota_addons\$Addon\*" 2>&1 | Select-Object -Last 10 | Out-String | Add-Content $result

# 2) launch tools mode, auto-load the custom game with the harness engaged and
#    a bounded win threshold.
$args = @(
  "-novid","-tools","-addon",$Addon,"-condebug","-nominidumps","-nocrashdialog",
  "-windowed","-w","1280","-h","720",
  "+pudge_wars_e2e","1","+pudge_wars_e2e_kills","$Kills",
  "+dota_launch_custom_game","$Addon","$Map"
)
$proc = Start-Process -FilePath (Join-Path $win64 "dota2.exe") -ArgumentList $args -PassThru

# Visual evidence: capture a full-screen PNG every 20s while the game runs.
# Requires the interactive session (same reason the whole script does).
$shots = "C:\pw-shots"
New-Item -ItemType Directory -Force -Path $shots | Out-Null
Remove-Item "$shots\*.png" -Force -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$elapsed = 0
$winSeen = $false
while ($elapsed -lt $LoadSeconds) {
  Start-Sleep -Seconds 20
  $elapsed += 20
  try {
    $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
    $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
    $gfx = [System.Drawing.Graphics]::FromImage($bmp)
    $gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bmp.Save((Join-Path $shots ("shot_{0:d3}s.png" -f $elapsed)))
    $gfx.Dispose(); $bmp.Dispose()
  } catch { "screenshot failed at ${elapsed}s: $_" | Add-Content $result }
  # Early exit once the win marker lands -- no reason to bill for the rest.
  if ((Test-Path $log) -and (Select-String -Path $log -Pattern "\[E2E\] WIN" -Quiet)) {
    "win marker seen at ${elapsed}s -- stopping early" | Add-Content $result
    $winSeen = $true
    Start-Sleep -Seconds 10   # let the post-win lines flush to the log
    break
  }
}
"screenshots: $((Get-ChildItem $shots -Filter *.png).Count)" | Add-Content $result
"process alive at kill: $(-not $proc.HasExited)" | Add-Content $result
if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }

# 3) scan console log against the marker contract (docs/specs/MARKERS.md)
$fail = $null
if (Test-Path $log) {
  $lines = Get-Content $log
  "console.log lines: $($lines.Count)" | Add-Content $result

  "--- SCRIPT ERRORS ---" | Add-Content $result
  $errors = $lines | Select-String -Pattern "Script Error|attempt to|nil value|stack traceback" | ForEach-Object { $_.Line }
  $errors | Add-Content $result

  "--- E2E MARKERS ---" | Add-Content $result
  ($lines | Select-String -Pattern "\[E2E\]" | ForEach-Object { $_.Line }) | Add-Content $result

  "--- HOOK / GAME MARKERS ---" | Add-Content $result
  ($lines | Select-String -Pattern "\[HOOK\]|\[ROT\]|\[RIVER\]|\[SHOP\]|\[MATCH\]" | ForEach-Object { $_.Line } | Select-Object -First 60) | Add-Content $result

  "--- GAMERULES STATE ---" | Add-Content $result
  ($lines | Select-String -Pattern "entering state 'DOTA_GAMERULES" | ForEach-Object { $_.Line }) | Add-Content $result

  $logText = $lines -join "`n"
  if ($errors.Count -gt 0)                { $fail = "script errors in console.log ($($errors.Count) lines)" }
  elseif ($logText -notmatch "\[E2E\] harness engaged") { $fail = "harness never engaged (convar/addon load problem)" }
  elseif ($logText -notmatch "\[E2E\] WIN")             { $fail = "no [E2E] WIN marker -- bots never reached $Kills kills" }
} else {
  $fail = "NO console.log produced (launch may have failed)"
  $fail | Add-Content $result
}

if ($fail) { "SMOKE FAIL: $fail" | Add-Content $result }
else       { "SMOKE PASS: win marker present, zero script errors" | Add-Content $result }
"smoke done $(Get-Date -Format o)" | Add-Content $result
# End-of-run hard gate: fail (non-zero) only after all evidence is in $result.
if ($fail) { throw $fail }
