#!/bin/bash
# Prints {"status": ..., "fetchedAt": ..., "data": <events.json or null>} for index.jsx.
# Keeps the last good copy so the widget still shows something offline or right after boot.

DIR="$HOME/.config/alita-schedule"
TOKEN_FILE="$DIR/token"
CACHE="$DIR/events.json"
STAMP="$DIR/fetched-at"
REPO="${SCHEDULE_REPO_API:-https://api.github.com/repos/Alita-xky/schedule}"

mkdir -p "$DIR"

get() {   # get <url> <outfile> -> prints the HTTP status, 000 if unreachable
  curl -sS -o "$2" -w '%{http_code}' --max-time 15 \
    -H "Authorization: Bearer $(cat "$TOKEN_FILE")" \
    -H "Accept: application/vnd.github.raw+json" \
    "$1" 2>/dev/null || true
}

if [ ! -s "$TOKEN_FILE" ]; then
  status=notoken
else
  tmp="$(mktemp)"
  status="$(get "$REPO/contents/events.json?ref=main" "$tmp")"
  if [ "$status" = 200 ]; then
    mv "$tmp" "$CACHE"
    date +%s > "$STAMP"
  elif [ "$status" = 404 ]; then
    # No events.json yet means an empty schedule, unless the repo itself is invisible.
    if [ "$(get "$REPO" /dev/null)" = 200 ]; then
      printf '{"version":1,"events":[]}\n' > "$CACHE"
      date +%s > "$STAMP"
      status=200
    else
      status=norepo
    fi
  fi
  rm -f "$tmp"
fi

printf '{"status":"%s","fetchedAt":%s,"data":' "${status:-000}" "$(cat "$STAMP" 2>/dev/null || echo null)"
if [ -s "$CACHE" ]; then cat "$CACHE"; else printf 'null'; fi
printf '}\n'
