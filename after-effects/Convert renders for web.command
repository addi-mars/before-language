#!/bin/bash
# Perception: turn After Effects renders into web video layers.
#
# Double-click this file (in Finder). It takes every .mov in after-effects/renders/
# named like  scene-a__reflection.mov  (that's the RENDER comp name) and makes:
#   web/assets/video/scene-a/reflection.webm   (Chrome, Firefox, Edge)
#   web/assets/video/scene-a/reflection.mov    (Safari)
# Both keep transparency. It then switches that layer on in web/assets/videos.js.
#
# Needs ffmpeg (once, in Terminal: brew install ffmpeg).

cd "$(dirname "$0")" || exit 1
IN="${1:-renders}"
OUT="../web/assets/video"
CFG="../web/assets/videos.js"

if ! command -v ffmpeg >/dev/null 2>&1; then
  for p in /opt/homebrew/bin /usr/local/bin; do [ -x "$p/ffmpeg" ] && PATH="$p:$PATH"; done
fi
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg isn't installed. In Terminal run:  brew install ffmpeg   then try again."
  read -r -p "Press Return to close."; exit 1
fi

mkdir -p "$IN"
shopt -s nullglob nocaseglob
files=("$IN"/*.mov "$IN"/*.mp4)
if [ ${#files[@]} -eq 0 ]; then
  echo "No renders found. Put your AE renders in: $(cd "$IN" && pwd)"
  read -r -p "Press Return to close."; exit 0
fi

for f in "${files[@]}"; do
  base=$(basename "$f"); name="${base%.*}"
  if [[ "$name" != *__* ]]; then
    echo "Skipping $base: name it after its RENDER comp, e.g. scene-a__reflection.mov"; continue
  fi
  scene="${name%%__*}"; layer="${name#*__}"; key="$scene/$layer"
  mkdir -p "$OUT/$scene"
  echo "Converting $base -> $key"
  # AE's "with Alpha" presets write premultiplied colour, which would darken every
  # soft brush edge. In a premultiplied frame no colour value exceeds its alpha;
  # in straight painted art many do. Detect it and un-premultiply if needed.
  premult=$(ffmpeg -v error -i "$f" -frames:v 1 -f rawvideo -pix_fmt rgba - | /usr/bin/python3 -c '
import sys
d = sys.stdin.buffer.read(); n = over = 0
for i in range(0, len(d) - 3, 4 * 5):
    a = d[i + 3]
    if 8 < a < 250:
        n += 1
        if max(d[i], d[i + 1], d[i + 2]) > a + 2: over += 1
print("yes" if n > 200 and over / n < 0.005 else "no")')
  VF="format=rgba"
  if [ "$premult" = "yes" ]; then
    # colour / alpha, per pixel (ffmpeg's own unpremultiply filter is a no-op on these files)
    U="if(gt(alpha(X,Y),0),min(255,%s(X,Y)*255/alpha(X,Y)),0)"
    VF="format=rgba,geq=r='$(printf "$U" r)':g='$(printf "$U" g)':b='$(printf "$U" b)':a='alpha(X,Y)'"
    echo "  premultiplied render: correcting to straight alpha"
  fi
  # big, soft layers (fog, walls) are encoded at half size; the site scales them back up
  px=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$f" | head -1)
  w=${px%x*}; h=${px#*x}
  if [ $((w * h)) -gt 800000 ]; then VF="$VF,scale=trunc(iw/4)*2:trunc(ih/4)*2"; echo "  large layer: encoding at half size"; fi
  ffmpeg -y -loglevel error -i "$f" -an -vf "$VF" \
    -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 33 -row-mt 1 -auto-alt-ref 0 \
    "$OUT/$scene/$layer.webm" || { echo "  WebM failed"; continue; }
  ffmpeg -y -loglevel error -i "$f" -an -vf "$VF" \
    -c:v hevc_videotoolbox -allow_sw 1 -alpha_quality 0.75 -b:v 4M -pix_fmt bgra -tag:v hvc1 \
    "$OUT/$scene/$layer.mov" || echo "  Safari .mov failed (the site will use the still image in Safari)"
  # switch the layer on in videos.js if it isn't already
  if ! grep -q "^[[:space:]]*'$key'" "$CFG"; then
    KEY="$key" perl -0pi -e 's/window\.PERCEPTION_VIDEOS = \{\n/window.PERCEPTION_VIDEOS = {\n  \x27$ENV{KEY}\x27: true,\n/' "$CFG" \
      && echo "  switched on in videos.js"
  fi
done

echo
echo "Done. Reload the website to see the animated layers."
[ -t 0 ] && read -r -p "Press Return to close."
exit 0
