#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

: "${MONGODB_URI:=mongodb://127.0.0.1:27017/laundry_buddy}"
: "${PORT:=3000}"

echo "===== Laundry Buddy Backend ====="
echo "Using MONGODB_URI: $MONGODB_URI"
echo "Using PORT: $PORT"

echo
echo "Installing dependencies..."
npm install

echo
echo "Freeing port $PORT if needed..."
PID=$(lsof -ti tcp:$PORT || true)
if [ -n "$PID" ]; then
  echo "Killing process $PID on port $PORT..."
  kill -9 "$PID" || true
fi

echo
echo "Starting server..."
npm start
