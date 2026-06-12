#!/usr/bin/env bash
# Generate a simple colored square icon for development.
# Requires ImageMagick: brew install imagemagick
set -e

ICON_DIR="$(dirname "$0")/../src-tauri/icons"
mkdir -p "$ICON_DIR"

# Create a 1024x1024 dark icon with a fuel-gauge style symbol
convert -size 1024x1024 xc:"#0e0e12" \
  -fill "#4ade80" \
  -draw "roundrectangle 100,100 924,924 80,80" \
  -fill "#0e0e12" \
  -pointsize 600 -gravity Center \
  -annotate 0 "⛽" \
  "$ICON_DIR/source.png" 2>/dev/null || \
  convert -size 1024x1024 xc:"#0e0e12" \
    -fill "#4ade80" \
    -draw "roundrectangle 100,100 924,924 80,80" \
    "$ICON_DIR/source.png"

echo "Source icon created at $ICON_DIR/source.png"
echo "Now run: npm run tauri icon $ICON_DIR/source.png"
