#!/usr/bin/env bash
# Pudge Wars control for the SHARED archer-wars-dev Windows GPU VM.
# Usage: scripts/vm.sh {start|stop|ip|tunnel|ssh|smoke}
#
# The VM, its IAP tunnel, its SSH key and its one Interactive scheduled task
# (aw_qgate -> C:\aw\vm-qgate.ps1, registered by hand over RDP for the archer
# wars rig) are all REUSED here -- pudge-wars stages its own script over that
# path rather than registering a second task. The two games coexist: this repo
# lives at C:\pw\pudge-wars, archer-wars at C:\aw\archer-wars, each junctioned
# into dota_addons under its own addon name.
set -euo pipefail
P="${PW_GCP_PROJECT:-${AW_GCP_PROJECT:?set AW_GCP_PROJECT (or PW_GCP_PROJECT) to the GCP project id}}"
Z="${AW_GCP_ZONE:-us-central1-a}"; VM=archer-wars-dev
KEY="${AW_VM_KEY:-$HOME/.ssh/aw_vm_key}"

case "${1:-}" in
  start) gcloud compute instances start "$VM" --project="$P" --zone="$Z" ;;
  stop)  gcloud compute instances stop  "$VM" --project="$P" --zone="$Z" ;;
  ip)    gcloud compute instances describe "$VM" --project="$P" --zone="$Z" \
           --format='get(networkInterfaces[0].accessConfigs[0].natIP)' ;;
  tunnel) exec gcloud compute start-iap-tunnel "$VM" 22 --local-host-port=localhost:2222 --project="$P" --zone="$Z" ;;
  ssh)   shift; ssh -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222 builder@localhost "$@" ;;
  smoke)
    # Full lifecycle: start VM if stopped -> tunnel -> bootstrap/sync the repo
    # -> build lua+panorama on the VM -> link the addon -> stage vm-smoke.ps1
    # over the aw_qgate Interactive task -> run -> poll C:\pw-smoke-result.txt
    # -> pull evidence to artifacts/smoke/<ts>/ -> stop VM. Mirrors the archer
    # wars scripts/vm.sh qgate case; see that file for the war stories behind
    # each step (token one-shot, session-1 task, rebuild-on-VM).
    SSH_OPTS=(-i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 2222)
    RVM='C:\pw\pudge-wars'

    STATUS="$(gcloud compute instances describe "$VM" --project="$P" --zone="$Z" --format='get(status)')"
    if [ "$STATUS" != "RUNNING" ]; then
      gcloud compute instances start "$VM" --project="$P" --zone="$Z"
    fi

    # The tunnel must be RETRIED, not just the ssh probe: right after a VM
    # start, gcloud's own connection check hits Windows before sshd is up,
    # start-iap-tunnel exits ("4003: failed to connect to backend"), and every
    # later ssh gets connection-refused against a dead tunnel (run 6).
    TUNNEL_PID=""
    READY=""
    trap '[ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null' EXIT
    for attempt in $(seq 1 10); do
      gcloud compute start-iap-tunnel "$VM" 22 --local-host-port=localhost:2222 --project="$P" --zone="$Z" &
      TUNNEL_PID=$!
      for i in $(seq 1 30); do
        kill -0 "$TUNNEL_PID" 2>/dev/null || break   # tunnel process died
        if ssh "${SSH_OPTS[@]}" builder@localhost "echo ready" >/dev/null 2>&1; then READY=1; break; fi
        sleep 2
      done
      [ -n "$READY" ] && break
      kill "$TUNNEL_PID" 2>/dev/null || true
      echo "tunnel/ssh not ready (attempt $attempt/10) -- retrying in 15s..."
      sleep 15
    done
    if [ -z "$READY" ]; then echo "FATAL: VM ssh never came up"; exit 1; fi

    # Bootstrap on first run: bare clone dir + git init. The token is minted
    # HERE (Mac gh keyring), passed one-shot into the fetch URL, never stored
    # VM-side, and scrubbed from echoed output.
    REF="${REF:-main}"
    echo "syncing $VM to $REF..."
    TOKEN="$(gh auth token)"
    ssh "${SSH_OPTS[@]}" builder@localhost \
      "if (-not (Test-Path $RVM)) { New-Item -ItemType Directory -Force -Path $RVM | Out-Null; cd $RVM; git init | Out-Null } else { cd $RVM }; git -c credential.helper= fetch \"https://x-access-token:${TOKEN}@github.com/carloslibardo/pudge-wars.git\" $REF; git reset --hard FETCH_HEAD" \
      | grep -v x-access-token
    unset TOKEN

    # First run also needs node_modules (tstl/tsc binaries) and the addon
    # junctions into the steamcmd Dota install. --ignore-scripts: the
    # postinstall (scripts/install.js) walks the Steam-client library index,
    # which a steamcmd-installed Dota does not have -- it throws ENOENT on
    # libraryfolders.vdf and aborts the whole install. Linking on the VM is
    # vm-link.ps1's job, so the postinstall is pure downside here.
    echo "ensuring node_modules + addon junctions..."
    ssh "${SSH_OPTS[@]}" builder@localhost \
      "cd $RVM; \$env:Path += \";\$env:USERPROFILE\\.bun\\bin\"; if (-not (Test-Path node_modules\\.bin\\tstl.exe)) { bun install --frozen-lockfile --ignore-scripts 2>&1 | Select-Object -Last 3 }"
    ssh "${SSH_OPTS[@]}" builder@localhost \
      "powershell.exe -NoProfile -ExecutionPolicy Bypass -File $RVM\\scripts\\vm-link.ps1"

    # Dota loads COMPILED Lua/JS (gitignored) -- rebuild on the VM or the run
    # uses whatever it built last time.
    echo "building lua on VM (tstl)..."
    ssh "${SSH_OPTS[@]}" builder@localhost \
      "cd $RVM; \$env:Path += \";\$env:USERPROFILE\\.bun\\bin\"; & node_modules\\.bin\\tstl.exe --project src\\vscripts\\tsconfig.json | Select-Object -Last 3; echo (\"TSTL_EXIT=\" + \$LASTEXITCODE)"
    echo "building panorama on VM (tsc)..."
    ssh "${SSH_OPTS[@]}" builder@localhost \
      "cd $RVM; & node_modules\\.bin\\tsc.exe --project src\\panorama\\tsconfig.json; echo (\"TSC_PANORAMA_EXIT=\" + \$LASTEXITCODE)"

    echo "staging vm-smoke.ps1 to C:\\aw\\vm-qgate.ps1 (reusing aw_qgate Interactive task)..."
    ssh "${SSH_OPTS[@]}" builder@localhost "Copy-Item $RVM\\scripts\\vm-smoke.ps1 C:\\aw\\vm-qgate.ps1 -Force"

    echo "running aw_qgate scheduled task..."
    ssh "${SSH_OPTS[@]}" builder@localhost "schtasks /run /tn aw_qgate"

    echo "polling C:\\pw-smoke-result.txt for completion (bounded run, ~6min)..."
    for i in $(seq 1 60); do
      sleep 30
      OUT="$(ssh "${SSH_OPTS[@]}" builder@localhost 'Get-Content C:\pw-smoke-result.txt' 2>/dev/null || true)"
      if echo "$OUT" | grep -q "smoke done"; then
        echo "smoke finished."
        break
      fi
    done

    TS="$(date -u +%Y%m%dT%H%M%SZ)"
    OUTDIR="artifacts/smoke/$TS"
    mkdir -p "$OUTDIR"
    scp -P 2222 -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      builder@localhost:C:/pw-smoke-result.txt "$OUTDIR/" 2>/dev/null || true
    scp -P 2222 -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      "builder@localhost:C:/steamcmd/steamapps/common/dota 2 beta/game/dota/console.log" "$OUTDIR/" 2>/dev/null || true
    scp -P 2222 -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      "builder@localhost:C:/pw-shots/*.png" "$OUTDIR/" 2>/dev/null || true
    # The match recording (tens of MB over the IAP tunnel — worth the wait).
    scp -P 2222 -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      builder@localhost:C:/pw-record.mp4 "$OUTDIR/" 2>/dev/null || true
    [ -f "$OUTDIR/pw-record.mp4" ] \
      && echo "recording: $OUTDIR/pw-record.mp4 ($(du -h "$OUTDIR/pw-record.mp4" | cut -f1))" \
      || echo "recording: NOT pulled"

    echo "--- SMOKE SUMMARY ($OUTDIR/pw-smoke-result.txt) ---"
    grep -E "SMOKE PASS|SMOKE FAIL|smoke done" "$OUTDIR/pw-smoke-result.txt" 2>/dev/null || echo "(result file not pulled)"
    echo "--- E2E / ERROR LINES ---"
    grep -E "\[E2E\]|Script Error" "$OUTDIR/pw-smoke-result.txt" 2>/dev/null | head -40 || true

    kill "$TUNNEL_PID" 2>/dev/null || true
    trap - EXIT
    gcloud compute instances stop "$VM" --project="$P" --zone="$Z"
    ;;
  *) echo "usage: $0 {start|stop|ip|tunnel|ssh|smoke}   (REF=<branch> overrides the git ref)"; exit 1 ;;
esac
