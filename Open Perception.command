#!/bin/bash
# Double-click to view Perception in your web browser.
#
# Browsers block parts of the piece (eye tracking, the webcam) when the page
# is opened straight from its file, so this starts a small local web server
# for the "web" folder and opens it at http://localhost:8417.
# Leave this window open while you look at the piece; close it to stop.

cd "$(dirname "$0")/web" || exit 1
PORT=8417
URL="http://localhost:$PORT/"

if curl -s -o /dev/null "$URL"; then
  echo "Perception is already being served."
else
  echo "Starting Perception at $URL"
  # a tiny web server that tells the browser never to cache, so edits always show up
  /usr/bin/python3 -c '
import http.server, functools, sys
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), functools.partial(H, directory=sys.argv[2])).serve_forever()
' "$PORT" "$PWD" >/dev/null 2>&1 &
  SERVER=$!
  trap 'kill $SERVER 2>/dev/null' EXIT
  for _ in $(seq 1 20); do curl -s -o /dev/null "$URL" && break; sleep 0.25; done
fi

open "$URL"
echo
echo "Open in your browser: $URL"
echo "Keep this window open while viewing. Close it (or press Ctrl-C) to stop."
[ -n "$SERVER" ] && wait "$SERVER"
