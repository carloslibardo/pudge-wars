# Headless e2e smoke: compile addon resources, launch Dota in -tools mode with
# the e2e harness engaged, let the fake-client Pudges hook each other until a
# team reaches the (overridden) kill target, then scan console.log for script
# errors and the [E2E] WIN marker. Best autonomous approximation of a playtest.
#
# The whole run is also screen-recorded to C:\pw-record.mp4 (ffmpeg gdigrab,
# archer-wars vm-smoke-record.ps1 pattern). Tools mode opens the Asset Browser
# ON TOP of the game window, so without intervention the recording (and the
# screenshots) show a file browser, not the match — the poll loop minimizes
# "Asset Browser" and pins the game window topmost every cycle. Window lookup
# is by TITLE with CharSet.Unicode (class lookup returns 0; ANSI marshaling
# silently breaks FindWindowW — both verified on archer-wars runs 5/6).
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
$video  = "C:\pw-record.mp4"

"smoke start $(Get-Date -Format o)" | Out-File $result -Encoding utf8

# fresh console log + old recording
if (Test-Path $log)   { Remove-Item $log -Force }
if (Test-Path $video) { Remove-Item $video -Force }

# 1) resource compile the addon (panorama/particles; no map of our own yet)
$rc = Join-Path $win64 "resourcecompiler.exe"
& $rc -a -i "$Dota\content\dota_addons\$Addon\*" 2>&1 | Select-Object -Last 10 | Out-String | Add-Content $result

# 2) start the screen recording BEFORE the game launches so load + match are
#    all captured. FRAGMENTED mp4 (frag_keyframe+empty_moov) on purpose: the
#    smoke early-exits the moment [E2E] WIN lands, and a plain mp4 killed
#    mid-write loses its trailer and is unplayable — a fragmented one survives
#    Stop-Process at any point. -t is the fallback bound if the run goes long.
#    ffmpeg is on PATH on the VM (installed for archer-wars recorded smokes).
$ff = $null
if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
  $recSeconds = $LoadSeconds + 30
  $ffArgs = @(
    "-y","-f","gdigrab","-framerate","15","-i","desktop",
    "-t","$recSeconds","-c:v","libx264","-preset","ultrafast","-crf","28",
    "-pix_fmt","yuv420p","-movflags","frag_keyframe+empty_moov",$video
  )
  $ff = Start-Process -FilePath "ffmpeg" -ArgumentList $ffArgs -PassThru -WindowStyle Hidden
  "recording pid $($ff.Id) for ${recSeconds}s -> $video" | Add-Content $result
} else {
  "ffmpeg NOT FOUND on PATH -- no recording this run" | Add-Content $result
}

# 3) launch tools mode, auto-load the custom game with the harness engaged and
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

# Window wrangling so the recording sees the GAME, not the Asset Browser.
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class PWWin {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  // CharSet.Unicode is REQUIRED: default ANSI marshaling silently breaks the
  // W-suffixed API (title never matches, returns 0).
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowW(string cls, string title);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int w, int h, uint flags);
}
"@
$HWND_TOPMOST = [IntPtr](-1)
$SWP_NOSIZE_NOMOVE = 0x0003
$SW_MINIMIZE = 6

$elapsed = 0
$winSeen = $false
while ($elapsed -lt $LoadSeconds) {
  Start-Sleep -Seconds 20
  $elapsed += 20
  # Every cycle: bury the Asset Browser, surface the game window. Tools mode
  # re-raises the browser on some reloads, so this is a loop, not a one-shot.
  $ab = [PWWin]::FindWindowW($null, "Asset Browser")
  if ($ab -ne [IntPtr]::Zero) { [PWWin]::ShowWindow($ab, $SW_MINIMIZE) | Out-Null }
  $game = [PWWin]::FindWindowW($null, "Dota 2")
  if ($game -eq [IntPtr]::Zero) {
    $p = Get-Process dota2 -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($p) { $game = $p.MainWindowHandle }
  }
  if ($game -ne [IntPtr]::Zero) {
    [PWWin]::SetWindowPos($game, $HWND_TOPMOST, 0, 0, 0, 0, $SWP_NOSIZE_NOMOVE) | Out-Null
    [PWWin]::SetForegroundWindow($game) | Out-Null
  }
  if ($elapsed -eq 60) { "window push t60: ab=$ab game=$game" | Add-Content $result }
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

# Close out the recording. Fragmented mp4 tolerates a hard stop; give ffmpeg a
# few seconds to flush the last fragment first.
if ($ff -and -not $ff.HasExited) {
  Start-Sleep -Seconds 5
  Stop-Process -Id $ff.Id -Force -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 2
}
if (Test-Path $video) {
  "recording done: $((Get-Item $video).Length) bytes" | Add-Content $result
} else {
  "NO recording produced" | Add-Content $result
}

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
  # Full-system gates (2026-07-27): a WIN off hooks alone previously passed
  # while Rot, Flesh Heap and the shop shipped with ZERO tier-2 evidence.
  elseif ($logText -notmatch "\[ROT\] tick")        { $fail = "no [ROT] tick -- Rot never damaged anyone" }
  elseif ($logText -notmatch "\[FLESH\] stack")     { $fail = "no [FLESH] stack -- Flesh Heap never grew" }
  elseif ($logText -notmatch "\[SHOP\] purchased")  { $fail = "no [SHOP] purchased -- bots never bought an item" }
  elseif (-not (Test-Path $video))                  { $fail = "no recording produced (ffmpeg missing or died)" }
} else {
  $fail = "NO console.log produced (launch may have failed)"
  $fail | Add-Content $result
}

if ($fail) { "SMOKE FAIL: $fail" | Add-Content $result }
else       { "SMOKE PASS: win marker present, zero script errors" | Add-Content $result }
"smoke done $(Get-Date -Format o)" | Add-Content $result
# End-of-run hard gate: fail (non-zero) only after all evidence is in $result.
if ($fail) { throw $fail }
