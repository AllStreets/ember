#!/bin/bash
# EMBER launcher — double-click this file to run the console locally.
# Serves the folder on http://localhost:8787 and opens it in your browser.
# Works fully offline: it only serves these local files (plus your local Ollama).
cd "$(dirname "$0")" || exit 1
PORT=8787
# free the port if something is already holding it (a previous run, etc.)
lsof -nP -iTCP:$PORT -sTCP:LISTEN -t 2>/dev/null | xargs -r kill 2>/dev/null
sleep 0.4
echo "EMBER — serving on http://localhost:$PORT   (leave this window open; close it to stop)"
# open the browser shortly after the server starts
( sleep 1; open "http://localhost:$PORT/" ) &
# python3 ships with macOS; fall back to python if needed
if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT"
else
  exec python -m SimpleHTTPServer "$PORT"
fi
