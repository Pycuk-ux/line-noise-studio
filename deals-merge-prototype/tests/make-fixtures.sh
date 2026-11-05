#!/usr/bin/env bash
# Creates test images for tests/e2e.js (needs ImageMagick).
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p fixtures out && cd fixtures
for i in $(seq 1 12); do convert -size 640x480 "xc:hsl($((i*30)),60%,55%)" -gravity center -pointsize 120 -fill white -annotate 0 "$i" "photo$i.jpg"; done
python3 -c "d=open('photo1.jpg','rb').read(); open('huge.jpg','wb').write(d+b'\0'*(21*1024*1024))"   # > 20MB
echo "not an image" > notes.txt
