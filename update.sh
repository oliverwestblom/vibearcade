#!/usr/bin/env bash
set -euo pipefail

# Resolve paths relative to this script, regardless of the caller's directory.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if ! command -v git >/dev/null 2>&1; then
  echo 'Git saknas. Installera med: sudo apt install git' >&2
  exit 1
fi

if [[ ! -e .git ]] || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo 'Mappen är inte en Git-klon (till exempel om den packats upp från ZIP).' >&2
  echo 'Klona projektet till en ny mapp och kör skriptet där:' >&2
  echo 'git clone https://github.com/oliverwestblom/vibearcade.git ~/vibearcade' >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Uppdateringen avbröts: projektet innehåller lokala ändringar eller nya filer.' >&2
  echo 'Spara dem i Git eller flytta undan dem och kör skriptet igen.' >&2
  exit 1
fi

if [[ "$(git branch --show-current)" != main ]]; then
  echo 'Uppdateringen avbröts: byt till main med git switch main och försök igen.' >&2
  exit 1
fi

echo 'Hämtar senaste main från origin…'
if ! git pull --ff-only origin main; then
  echo 'Uppdateringen misslyckades. Se Git-meddelandet ovan.' >&2
  echo 'Kontrollera nätverk, GitHub-behörighet och om lokala commits skiljer sig från origin/main.' >&2
  exit 1
fi

echo 'Projektet är uppdaterat. Ladda om sidan i Chromium (Ctrl+Shift+R).'
