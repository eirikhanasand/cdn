#!/bin/sh
set -eu
# Both processes must be alive. A failed cache must restart the container too.
varnishd -F -a :8080 -f /etc/varnish/default.vcl -s malloc,128m -p thread_pool_min=20 -p thread_pool_max=500 &
cache=$!
bun src/index.ts &
api=$!
trap 'kill "$cache" "$api" 2>/dev/null || true' EXIT TERM INT
while kill -0 "$cache" 2>/dev/null && kill -0 "$api" 2>/dev/null; do sleep 2; done
exit 1
