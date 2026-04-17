#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${DISPLAY:-:99}"

if [ "${SCRAPER_START_XVFB:-1}" = "1" ]; then
  Xvfb "$DISPLAY" \
    -screen 0 "${SCRAPER_XVFB_SCREEN:-1440x1200x24}" \
    -ac \
    +extension RANDR &
  xvfb_pid=$!

  cleanup() {
    kill "$xvfb_pid" 2>/dev/null || true
  }

  trap cleanup EXIT

  # Give Chromium a moment to attach to the virtual display.
  sleep "${SCRAPER_XVFB_STARTUP_DELAY_SECONDS:-1}"
fi

exec "$@"
