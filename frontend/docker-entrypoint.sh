#!/bin/sh
set -eu

API_URL="${REACT_APP_API_URL:-${VITE_API_URL:-}}"
SOCKET_URL="${REACT_APP_SOCKET_URL:-${VITE_SOCKET_URL:-}}"

if [ -z "$API_URL" ]; then
  API_URL="http://localhost:3001"
fi

if [ -z "$SOCKET_URL" ]; then
  SOCKET_URL="$API_URL"
fi

cat <<CONFIG > /usr/share/nginx/html/env-config.js
window.__ENV__ = {
  API_URL: "${API_URL}",
  SOCKET_URL: "${SOCKET_URL}"
};
CONFIG

exec "$@"
