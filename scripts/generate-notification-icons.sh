#!/bin/bash
# Regenera PNG de push desde SVG (requiere npx).
set -e
cd "$(dirname "$0")/../public"
npx --yes @resvg/resvg-js-cli notification-badge.svg notification-badge-72.png --fit-width 72 --fit-height 72
npx --yes @resvg/resvg-js-cli notification-icon.svg notification-icon-192.png --fit-width 192 --fit-height 192
echo "OK: notification-badge-72.png, notification-icon-192.png"
