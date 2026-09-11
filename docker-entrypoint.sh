#!/bin/sh
set -e

mkdir -p /data

if [ "$(id -u)" = "0" ]; then
  chown -R uw:uw /data || true
  exec su-exec uw node dist/index.js
fi

exec node dist/index.js
