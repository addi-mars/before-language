# Perception.psd: Phase 1 asset audit

Read with `psd-tools` 1.11 (1920×1080, RGB, 8-bit). I exported every layer at full canvas size and checked it by its pixels, not its name.
Index = position **from the bottom** of its group (0 = lowest). Opacity is shown as a percentage.
Preview sheets are in [`audit/`](audit/). Magenta in the sheets means transparent.

The file has three groups, matching what you described:

| Your name | PSD group | Visible in file | Contents |
|---|---|---|---|
| 1stPOV | `Scene 1` | yes | Wall, mirror, reflection, table, hands (complete) |
| Archway | `Scene 2` | hidden | Wall with an arched doorway; the opening is truly transparent |
| 3rdPOV | `Scene 3` | hidden | Complete rear-view room: character, chair, table, mirror |

**The rear-view scene exists and is fully painted.** Scene B is not blocked.

---

## 1stPOV: `Scene 1` → `scene-a/`

| # | PSD layer | Opacity / blend | What it is | Proposed asset | Depth plane |
|---|---|---|---|---|---|
| 0 | `New group` (hidden): Layer 7, From selection, Layer 12, Layer 15 | n/a | Line sketches: arch, hands, figure, **ivy** | not used | n/a |
| 1 | Layer 36 | 100% | Dark painted wall with an arch-shaped hole | `wall.png` | far |
| 2 | Layer 30 | 100% | Mirror glass base (blue-violet) | `glass-base.png` | mirror |
| 3 | Layer 34 | 100% | Glass shading + dark sill line | `glass-shade.png` | mirror |
| 4 | `Addi 1` group: Layers 24, 23, 25, 22, 23 | 100% | **Reflected character**: sweater, face, hair, line art | `reflection-character.png` (group flattened) | reflection (inside mask) |
| 5 | Layer 30 | 22% | Glass haze over the reflection | `glass-haze.png` | mirror |
| 6 | Layer 33 | Screen | White cloud/fog strokes on the glass | `glass-clouds.png` (keep Screen blend) | mirror |
| 7 | Layer 24 | 40% | Second, softer pass of the character | `reflection-character-glaze.png` | reflection |
| 8 | Layer 35 | 100% | Fine diagonal glass scratches/streaks | `glass-scratches.png` | mirror surface |
| 9 | Layer 29 | 100% | Brown arched mirror frame | `mirror-frame.png` | mirror |
| 10 | Layer 28 | 100% | Tabletop (fully painted, edge to edge) | `table.png` | mid |
| 11 | Layer 40 | 49%, clipped to table | Hand shadows on the table | `hand-shadows.png` | follows hands |
| 12 | Layer 27 | 100% | Arch + table-edge line art | merged into frame/table | n/a |
| 13 | Layer 38 | 100% | **Both hands** (one layer) | split → `hand-left.png`, `hand-right.png` | near |
| 14 | Layer 39 | clipped to hands | Green sleeves | merged into hands | near |
| 15 | Layer 37 | 100% | Hand line art | merged into hands | near |

Notes:
- The reflection is already **sandwiched between glass layers** (base, then character, then haze/clouds/scratches). It can move on its own inside the mirror opening, which is what we want.
- The reflection is painted about 100px **below** the table edge (the character ends at y≈867, the table top is at y≈766). That gives it vertical overlap to move into.
- **Problem:** the glass base (Layer 30, #2) is thinner where the character sits (about 20–30% alpha there, about 80% at the edges). If the reflection shifts more than a few pixels, a lighter ghost silhouette appears. Two options: keep reflection motion very small (planned), or you repaint the glass base as an even layer.
- The hands share one layer but don't touch, so I can split them cleanly by bounding box. Same for sleeves and line art.
- My composite of this group differs slightly from the PSD's saved preview (average difference about 6/255). I'll find and fix that in Phase 2.

## Archway: `Scene 2` → `archway/`

| # | PSD layer | What it is | Proposed asset |
|---|---|---|---|
| 0 | Layer 64 | Dark wall with a tall arched doorway; the opening is transparent | `wall.png` |
| 1 | Layer 63 | Brown arch frame | `frame.png` |
| 2 | Layer 62 | Frame line art | merged into frame |

The opening runs to the bottom of the canvas (x 495–1424, y 0–1080). It works as a portal: Scene 3 can be composited **behind it** and seen through the doorway.

## 3rdPOV: `Scene 3` → `scene-b/`

| # | PSD layer | Opacity | What it is | Proposed asset | Depth plane |
|---|---|---|---|---|---|
| 0 | Layer 51 | 100% | Full-canvas dark room plate (back wall, sides, floor in one painting) | `room.png` | far |
| 1 | Layer 54 | 100% | Dark shadow under the table | `shadow-table.png` | floor |
| 2 | Layer 52 | 14% | Floor tone | `floor.png` | floor |
| 3 | Layer 53 | 7% | Side-wall tone | `side-walls.png` | far |
| 4 | Layer 59 | 100% | Large soft shadow of character + chair on the floor | `shadow-figure.png` | floor |
| 5 | Layer 43 | 100% | Room perspective lines | merged into room | far |
| 6 | Layer 50 | 100% | Mirror glass (clouds only) | `mirror-glass.png` | far wall |
| 7 | Layer 60 | 100% | Glass streaks | `mirror-glass.png` | far wall |
| 8 | From selection | 100% | Mirror frame | `mirror-frame.png` | far wall |
| 9 | Layer 41 | 100% | Frame line art | merged | far wall |
| 10–11 | Layers 45, 42 | 100% | Table + line art | `table.png` | mid |
| 12 | Layer 49 | 100% | Chair | `chair.png` | near-mid |
| 13 | Layer 48 | 100% | Character base silhouette (white fill) | `character-back.png` (with 14–18) | near-mid |
| 14–17 | Layers 58, 57, 56, 55 | clipped to 48 | Shoes, trousers, sweater, hair | merged into character | near-mid |
| 18 | Layer 47 | 100% | Character + chair line art | merged | near-mid |

Notes:
- The character's base fill has **holes where the chair back covers it**: the body isn't painted behind the chair. Chair and character have to stay on one locked plane. That's fine; they belong together anyway.
- The room is mostly one painted plate (Layer 51), with low-opacity floor and wall tones on top. Back wall vs floor parallax will therefore be gentle, not truly 3D.
- The mirror in this view shows **clouds, no reflected face**. I'll leave it that way (it reads as quietly uncanny), but tell me if a reflection is meant to be there.

## Not used: hidden layers at the root

| Layer(s) | What it is |
|---|---|
| Background | Plain white |
| Layer 2, Layer 4, Layer 5, Layer 6 | The earlier concept mockups (curly hair, sketchbook, flowers, window). Excluded per the brief |
| Layer 3, Layer 3 copy, Layer 3 copy 2 | Blue rough sketches of the concepts |
| Layer 1 | Reference hands |
| Layer 8 | Reference photo + a pothos leaf clipping |
| Inserted Image | Ivy-on-brick reference photo |
| Line 1 copy 2, `New group` (Layer 46, 20, Line 1 copy 2) | Construction lines for the arch/table/room |

---

## Gaps and requests

1. **Edge bleed (all three scenes):** every wall/room plate stops exactly at the 1920×1080 edge. Parallax needs extra painted margin. Without it I have to scale everything up 4–6%, which crops your framing a little.
   *Ask:* extend `Scene 1` Layer 36 (wall), `Scene 2` Layer 64 (wall) and `Scene 3` Layer 51 (room) by **~120px on every side** (canvas 2160×1320), keeping the 1920×1080 area exactly as it is.
2. **Optional:** an evenly painted Scene 1 glass base (Layer 30 with no thin patch behind the character). That would allow more reflection movement.
3. Nothing else is missing for a first full build.

## Proposed sequence (to confirm)

1stPOV (inhabit, gentle parallax) → push toward the mirror until its opening fills the frame → match-cut/dissolve into the **Archway**, whose opening frames the 3rdPOV room beyond → push through the doorway → settle on the **3rdPOV** rear view. Return plays the same path backward.
