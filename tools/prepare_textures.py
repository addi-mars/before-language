"""Turn texture photos (Pexels, Pixabay, your own scans) into overlay tiles.

    python3 web/tools/prepare_textures.py <folder of photos> web/assets

Each photo becomes a neutral-grey, colour-free, seamless 1024 px tile that
only carries surface (weave, tooth, brush marks), so laying it over the art in
soft-light/overlay never tints the painting. Name each photo with a prefix
saying which layer it belongs to:

    weave-*.jpg   canvas, linen, jute, fabric
    paper-*.jpg   paper, watercolour paper
    paint-*.jpg   brushstrokes, oil paint, gesso, plaster, grunge

Writes assets/texture/<name>.webp and rewrites assets/textures.js (the list
the site reads), keeping the generated textures that are already there.
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

SRC, ASSETS = sys.argv[1], sys.argv[2]
OUT = os.path.join(ASSETS, "texture")
N = 1024
os.makedirs(OUT, exist_ok=True)


def tile(path, seamless=True):
    """seamless=True: a repeating 1024 tile (fine, even weaves).
    seamless=False: one 1600 px sheet laid once over the whole frame (paper,
    paint: large marks that would show a seam if repeated)."""
    n = N if seamless else 1600
    im = Image.open(path).convert("L")
    # centre square, then to working size
    w, h = im.size
    s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((n, n), Image.LANCZOS)
    a = np.asarray(im).astype(np.float64)
    # keep only the surface: subtract the broad light/shadow (high-pass)
    low = np.asarray(im.filter(ImageFilter.GaussianBlur(28))).astype(np.float64)
    hp = a - low
    hp = hp / (hp.std() + 1e-6)
    if not seamless:
        return Image.fromarray(np.clip(128 + hp * 22, 0, 255).astype("uint8"))
    # seamless: cross-fade the tile with itself shifted by half, weighted so
    # each copy's seams sit where the other is strongest
    shifted = np.roll(np.roll(hp, N // 2, 0), N // 2, 1)
    y, x = np.mgrid[0:N, 0:N] / N
    wgt = (np.sin(np.pi * x) * np.sin(np.pi * y)) ** 0.5
    mix = (hp * wgt + shifted * (1 - wgt)) / np.sqrt(wgt ** 2 + (1 - wgt) ** 2)
    out = np.clip(128 + mix * 22, 0, 255).astype("uint8")
    return Image.fromarray(out)


entries = []
lst = os.path.join(ASSETS, "textures.js")
if os.path.exists(lst):
    txt = open(lst).read()
    entries = json.loads(txt[txt.index("["): txt.rindex("]") + 1])
names = {e["file"] for e in entries}

for path in sorted(glob.glob(os.path.join(SRC, "*.*"))):
    base = os.path.splitext(os.path.basename(path))[0]
    kind = base.split("-", 1)[0]
    if kind not in ("weave", "paper", "paint"):
        print("skip (name must start weave-/paper-/paint-):", base)
        continue
    seamless = kind == "weave"
    tile(path, seamless).save(os.path.join(OUT, base + ".webp"), quality=86)
    entry = {"file": base, "kind": kind, "mode": "repeat" if seamless else "cover"}
    entries = [e for e in entries if e["file"] != base] + [entry]
    names.add(base)
    print("ok", base)

with open(lst, "w") as f:
    f.write("// Overlay textures: tools/prepare_textures.py writes this. kind = weave | paper | paint\n")
    f.write("window.PERCEPTION_TEXTURES = " + json.dumps(entries, indent=1) + ";\n")
print(len(entries), "textures listed")
