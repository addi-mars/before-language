"""Export Perception.psd into the layered assets the web build uses.

Usage (from the project folder, with psd-tools installed):
    python3 web/tools/export_assets.py Perception.psd web/assets

Each asset is a composite of specific PSD layers (addressed by index from the
bottom of each group, since the layer names are generic). Clipping layers,
opacity and blend modes are honoured by psd-tools; the one Screen layer is
exported on its own so the browser can apply the blend live.

Writes:
  assets/<scene>/<name>.webp   web copy, cropped to its alpha bounds
  assets/png/<scene>/<name>.png lossless full-canvas master (After Effects-ready)
  assets/manifest.js           offsets/sizes + source-layer mapping
  assets/reference/*.png       PSD composites used to check alignment
"""
import json
import logging
import os
import sys
import warnings

warnings.filterwarnings("ignore")
logging.disable(logging.CRITICAL)

from PIL import Image  # noqa: E402
from psd_tools import PSDImage  # noqa: E402

PSD_PATH, OUT = sys.argv[1], sys.argv[2]
psd = PSDImage.open(PSD_PATH)
W, H = psd.size


def group(name):
    for layer in psd:
        if layer.is_group() and layer.name == name:
            return layer
    raise SystemExit(f"group {name!r} not found")


S1, S2, S3 = group("Scene 1"), group("Scene 2"), group("Scene 3")
# Scene 2/3 are hidden in the file; psd-tools skips hidden groups when
# compositing, so switch them on in memory (the PSD on disk is untouched).
for _g in (S2, S3):
    _g.visible = True


def descendants(layer):
    out = {id(layer)}
    if layer.is_group():
        for child in layer:
            out |= descendants(child)
    return out


def composite(grp, indices):
    """Composite only grp[i] for i in indices (plus their clipped layers)."""
    keep = {id(grp)}
    for i in indices:
        keep |= descendants(grp[i])
    # A clipping layer only renders through its base, so include clip layers
    # whose base was requested.
    layers = list(grp)
    for i, layer in enumerate(layers):
        if getattr(layer, "clipping", False):
            j = i - 1
            while j >= 0 and getattr(layers[j], "clipping", False):
                j -= 1
            if j in indices:
                keep |= descendants(layer)
    # Hidden groups report an empty bbox, so always composite the full canvas.
    img = grp.composite(viewport=(0, 0, W, H), layer_filter=lambda l: id(l) in keep)
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    if img is not None:
        canvas.paste(img.convert("RGBA"), (0, 0))
    return canvas


def raw(layer):
    """A single layer's own pixels (no blend), opacity baked into alpha."""
    img = layer.topil().convert("RGBA")
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    canvas.paste(img, (layer.left, layer.top))
    if layer.opacity < 255:
        a = canvas.getchannel("A").point(lambda v: v * layer.opacity // 255)
        canvas.putalpha(a)
    return canvas


def crop_rows(img, y0, y1):
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.crop((0, y0, W, y1)), (0, y0))
    return out


def crop_cols(img, x0, x1):
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.crop((x0, 0, x1, H)), (x0, 0))
    return out


manifest = {"canvas": [W, H], "assets": {}}


def save(scene, name, img, sources, blend="normal"):
    os.makedirs(f"{OUT}/{scene}", exist_ok=True)
    os.makedirs(f"{OUT}/png/{scene}", exist_ok=True)
    img.save(f"{OUT}/png/{scene}/{name}.png")
    bbox = img.getchannel("A").getbbox() or (0, 0, 1, 1)
    # 2px safety margin keeps soft painted edges intact after cropping.
    x0, y0 = max(0, bbox[0] - 2), max(0, bbox[1] - 2)
    x1, y1 = min(W, bbox[2] + 2), min(H, bbox[3] + 2)
    img.crop((x0, y0, x1, y1)).save(f"{OUT}/{scene}/{name}.webp", quality=92, method=6)
    manifest["assets"][f"{scene}/{name}"] = {
        "src": f"assets/{scene}/{name}.webp",
        "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0,
        "blend": blend, "sources": sources,
    }
    print(f"{scene}/{name:24} {x1 - x0}x{y1 - y0} @({x0},{y0})  <- {sources}")


TABLE_EDGE = 762  # first row of the table edge line in Scene 1 line art (Layer 27)
HAND_SPLIT = 960  # hands never cross the centre column

# ---- Scene 1: first person -------------------------------------------------
s1 = lambda *i: composite(S1, list(i))  # noqa: E731
save("scene-a", "wall", s1(1), "Scene 1 / Layer 36")
save("scene-a", "glass-base", s1(2, 3), "Scene 1 / Layer 30 + Layer 34")
save("scene-a", "reflection", s1(4), "Scene 1 / group 'Addi 1' (Layers 24, 23, 25, 22, 23)")
save("scene-a", "glass-haze", raw(S1[5]), "Scene 1 / Layer 30 (22%)")
save("scene-a", "glass-clouds", raw(S1[6]), "Scene 1 / Layer 33 (Screen)", blend="screen")
save("scene-a", "reflection-glaze", raw(S1[7]), "Scene 1 / Layer 24 (40%)")
save("scene-a", "glass-scratches", raw(S1[8]), "Scene 1 / Layer 35")
lineart = s1(12)
frame = s1(9)
frame.alpha_composite(crop_rows(lineart, 0, TABLE_EDGE))
save("scene-a", "mirror-frame", frame, "Scene 1 / Layer 29 + Layer 27 (rows above table)")
table = s1(10)  # Layer 28 + clipped Layer 40 hand shadows
table.alpha_composite(crop_rows(lineart, TABLE_EDGE, H))
save("scene-a", "table", table, "Scene 1 / Layer 28 + Layer 40 (clipped) + Layer 27 (table edge)")
hands = s1(13, 15)  # Layer 38 + clipped Layer 39 sleeves + Layer 37 line art
save("scene-a", "hand-left", crop_cols(hands, 0, HAND_SPLIT), "Scene 1 / Layers 38+39+37, x<960")
save("scene-a", "hand-right", crop_cols(hands, HAND_SPLIT, W), "Scene 1 / Layers 38+39+37, x>=960")

# Mirror opening mask: wherever the wall is see-through inside the frame area.
wall_a = S1[1].topil().convert("RGBA").getchannel("A")
mask = Image.new("L", (W, H), 0)
fb = S1[9].topil().getchannel("A").getbbox()
mpx, wpx = mask.load(), wall_a.load()
for y in range(0, min(H, 980)):
    for x in range(fb[0], fb[2]):
        if wpx[x, y] < 200:
            mpx[x, y] = 255
mimg = Image.new("RGBA", (W, H), (255, 255, 255, 0))
mimg.putalpha(mask)
save("scene-a", "mirror-mask", mimg, "derived: transparent area of Layer 36 inside the frame")

# ---- Scene 2: archway --------------------------------------------------------
save("archway", "wall", composite(S2, [0]), "Scene 2 / Layer 64")
save("archway", "frame", composite(S2, [1, 2]), "Scene 2 / Layer 63 + Layer 62")

# ---- Scene 3: third person ---------------------------------------------------
s3 = lambda *i: composite(S3, list(i))  # noqa: E731
save("scene-b", "room", s3(0, 2, 3, 5), "Scene 3 / Layers 51, 52 (14%), 53 (7%), 43")
save("scene-b", "floor-shadows", s3(1, 4), "Scene 3 / Layers 54, 59")
save("scene-b", "mirror", s3(6, 7, 8, 9), "Scene 3 / Layers 50, 60, From selection, 41")
save("scene-b", "table", s3(10, 11), "Scene 3 / Layers 45, 42")
# Chair and body are separate so the body can breathe while the chair stays put.
# The body fill (48) has holes where the chair back covers it, so the chair is
# drawn first and shows through them, exactly as in the PSD order.
save("scene-b", "chair", s3(12), "Scene 3 / Layer 49")
save("scene-b", "figure", s3(13, 18), "Scene 3 / Layer 48 + clipped 58/57/56/55, Layer 47 (line art)")

# ---- references ----------------------------------------------------------------
os.makedirs(f"{OUT}/reference", exist_ok=True)
for name, grp in [("scene1", S1), ("scene2", S2), ("scene3", S3)]:
    composite(grp, [i for i, l in enumerate(grp) if l.visible]).save(f"{OUT}/reference/{name}.png")
psd.topil().save(f"{OUT}/reference/psd_saved_preview.png")

with open(f"{OUT}/manifest.js", "w") as f:
    f.write("// Generated by tools/export_assets.py. Do not edit by hand.\n")
    f.write("window.PERCEPTION_MANIFEST = " + json.dumps(manifest, indent=1) + ";\n")
print("done")
