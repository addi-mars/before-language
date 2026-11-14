# Before Language — 01: Perception
## Instructions for Claude: Build the interactive parallax using my existing illustrations

I have already created the illustrations. **Your job is to build the experience using my actual artwork, not to redesign or generate replacement images.** The primary source is `Perception.psd`, which I will provide. If I also provide separately exported assets or additional scenes, use those as well.

## 1. What is actually in the supplied PSD

The current Photoshop document is **1920 × 1080**. Its visible composite shows:

- A dark, painterly background/wall.
- A large **arched, brown-framed mirror**, centered in the composition.
- A **front-facing, short-haired blond character in a green top**, visible in the mirror.
- A brown **tabletop** extending across the lower portion of the composition.
- Two **first-person hands and forearms** resting near the front of the table.
- Textured, hand-painted surfaces and restrained colors.

Preserve the character's actual design, the existing art style, and the composition. Do not substitute the earlier concept art showing a curly-haired character, sketchbook, flowers, glowing window, or cluttered studio. Those were exploratory mockups, **not the final assets**.

The PSD contains many Photoshop layers, but the layer names visible to a basic inspection are mostly generic (e.g. `Layer 1`, `Layer 2`, `Layer 3`, `From selection`, `Inserted Image`). **Do not infer the meaning of individual layers from those names.** Inspect layer thumbnails, visibility, transparency, and groups, and map the actual art before implementing. Do not assume a rear-view illustration or second scene exists until you have confirmed it in the files.

## 2. Creative objective

Create a polished, immersive **2.5D/parallax interactive experience** for *Before Language — 01: Perception*.

Core idea: **The difference between experiencing yourself from the inside and seeing yourself from outside.** The viewer begins in first person, facing a mirror that shows their actual reflection. The viewer can move toward and ultimately **through the mirror**. On the other side, the camera reveals the same scene from behind: the character is seated at the table, and the viewer can now see them as someone else might.

This shift in perspective should feel emotionally significant but understated. Avoid a fantasy portal full of particles, floating memories, glowing ribbons, or invented symbolic objects. The art and camera movement should carry the meaning.

## 3. Two distinct scenes / viewpoints

### Scene A — First-person, facing the mirror

- Match the supplied PSD composition faithfully at the initial/resting camera position.
- Foreground: left and right first-person hands, independently positionable and optionally subtly animated.
- Midground: tabletop; preserve its relationship to the hands.
- Farther away: mirror frame and mirror surface; the reflected character is visible **inside the mirror opening**, not pasted in front of the frame.
- Background: the dark wall/environment.
- The mirror initially reads as an **ordinary, physically plausible reflection**, not a portal. The reflection should correspond to the first-person body and viewpoint as closely as the illustrated perspective permits.
- Subtle pointer movement, drag, or device tilt may produce a small camera shift and different parallax speeds. Keep the original framing recognizable.

### Scene B — Beyond the mirror / rear view

- The viewer crosses the mirror plane and arrives in a **rear-view composition** showing the character sitting at the table from behind.
- The character is now an external subject rather than the viewer's first-person hands.
- This scene must be assembled from **my own rear-view character and environment illustrations if supplied**. Search all supplied assets before asking for anything new.
- **Do not fake a rear view by simply flipping the front-facing portrait.** If the rear-view character, chair, table underside, or necessary background are absent, identify exactly which assets are missing and ask me for them. A temporary labeled placeholder is acceptable for prototyping, but not as the finished art.
- Use parallax here too: rear-view character/chair, table, surrounding room, and distant background should occupy distinct planes where the artwork supports it.
- Ideally, the viewer can look back toward the mirror/threshold, but only implement this if the scene geometry and assets make it coherent.

### Transition — Passing through the mirror

- A user-initiated move toward the mirror: click/tap, scroll, drag, or a clearly signaled interaction.
- The camera approaches the glass. The reflection grows in scale as the mirror fills the viewport.
- Transition seamlessly (or with a carefully matched, art-directed dissolve) from Scene A to Scene B. The passage should feel like a **change of viewpoint**, not teleportation to an unrelated room.
- During the crossing, use the mirror's silhouette as a mask/portal aperture. The frame should pass out of view naturally.
- Avoid exposing empty edges, stretched image planes, transparent gaps, or incorrect mirror occlusion.
- Once across, settle into a clear, deliberate rear-view composition.
- Provide a way to return to Scene A; reversing the interaction should be understandable and smooth.

**Important geometry note:** A real mirror does not simply contain a room located behind its surface. If a physically accurate reflection cannot be reconstructed from flat paintings, use a **deliberately art-directed 2.5D illusion**: a masked reflection scene in Scene A, then a separate camera/scene transition at the threshold. Prioritize visual coherence over claiming physically exact 3D mirror optics.

## 4. Asset inspection and preparation — do this first

1. Inspect the entire PSD, including groups, hidden layers, bounds, transparency, and layer order.
2. Produce an **asset inventory**: original PSD layer/group, proposed semantic name, which scene it belongs to, whether it is transparent, and whether it needs further extraction.
3. Identify at minimum: `background`, `mirror_frame`, `mirror_surface/reflection_area`, `reflected_character`, `table`, `left_hand`, `right_hand`; also identify any shadows, highlights, glass scratches, or overlays that should be preserved.
4. Check whether the supplied files contain a **rear-view character**, chair, rear-view table, and rear-view room/background. These are **not confirmed** in the visible PSD composite.
5. Export actual assets as transparent PNGs or WebP images (with alpha) where possible, preserving source pixel dimensions, alignment, and visual fidelity. Maintain an unmodified master PSD.
6. When extracting artwork, preserve the painted edges and alpha. Avoid cutting off hands, mirror trim, shadows, or strokes. If an asset lacks painted content behind an occluder, flag it; do not invent major missing portions silently.
7. Do not flatten everything into one image: the depth effect depends on independently rendered planes.
8. Give me a clear mapping from each exported asset to its source layer(s). If you cannot reliably extract layers in your environment, explain the limitation and give me a precise Photoshop export checklist rather than pretending the extraction succeeded.

**Possible folder structure (adapt to the real assets):**

```text
public/assets/perception/
  scene-a/
    background.png
    mirror-frame.png
    mirror-glass.png
    reflection-character.png
    table.png
    hand-left.png
    hand-right.png
    [optional texture/shadow overlays]
  scene-b/
    background.png
    table.png
    chair.png
    character-back.png
    [optional other authentic assets]
```

These filenames are **proposed names**, not verified PSD layer names.

## 5. Parallax implementation

- Build a genuine layered composition, not a single image with a zoom animation.
- Maintain the exact original composition at the default camera pose.
- Use depth ordering appropriate to the actual image: hands nearest, table in front of mirror, mirror frame occluding reflection, background farthest. A reflected character should be masked within the mirror opening, not placed as an ordinary unmasked plane in front of the frame.
- Move layers at different rates in response to camera movement. Keep the motion subtle enough to avoid a cardboard cutout appearance.
- Use consistent coordinate systems and asset anchors so the hands, table, and mirror align exactly at the neutral camera position.
- Account for occlusion and reveal: parallax may expose areas that are not illustrated. Limit the camera range or request additional painted bleed where necessary.
- Separate scene cameras or carefully controlled camera states are fine. The two views do **not** need to be forced into one physically impossible flat stack.
- Preserve painted shadows and textures. If extra lighting or vignette is used, keep it extremely subtle and compatible with the source artwork.
- Do not animate all layers with identical transforms or simply scale the full composite.

## 6. Suggested interaction states

1. **Idle / inhabit** — Scene A matches the original PSD. Hands rest on the table; reflection appears natural. Very restrained idle motion if appropriate.
2. **Explore** — Gentle pointer/drag parallax reveals depth; camera motion remains limited and stable.
3. **Approach** — User initiates moving toward the mirror. The mirror becomes the dominant visual element.
4. **Cross** — Masked transition through the glass, without excessive magic effects.
5. **Observe** — Scene B: a composed rear view of the character seated at the table. Let the new viewpoint linger; avoid unnecessary UI clutter.
6. **Return** — A clear action returns through the threshold to the first-person composition.

The moment of recognition—**I am now looking at myself from behind**—should be the focal emotional event.

## 7. Technical expectations

If building for the browser, choose a stack you can implement reliably (e.g. HTML/CSS/JavaScript with layered transforms, or React plus a suitable rendering library). Explain why it suits the asset set. A true 3D engine is optional; **high-quality 2.5D with masks and controlled camera motion is preferable to unnecessary 3D complexity**.

- Target the artwork's **16:9, 1920 × 1080** framing, scaling responsively without distorting it.
- Provide mouse and touch interaction; include a non-drag alternative for entering/exiting the mirror.
- Keep the initial scene legible and functional without hover.
- Make transition timing adjustable, and support reduced-motion preferences.
- Preload images needed for the mirror transition so there is no flash or unloaded frame.
- Keep animation smooth, avoid unnecessary re-renders, and avoid camera jitter.
- Include clear but unobtrusive interaction affordances; don't overlay explanatory text on the artwork unless requested.
- Include a debug mode to display layer bounds, z-order, masks, camera position, and scene state while developing, and turn it off for presentation.

## 8. Build in stages and show evidence

**Phase 1 — Asset audit:** Inspect the actual PSD and supplied files; list what exists and what is missing. Confirm the real layer-to-asset mapping.

**Phase 2 — Scene A:** Render the original first-person scene as separate aligned layers. Compare its neutral frame to the PSD composite; correct all discrepancies.

**Phase 3 — Parallax:** Add restrained motion and correct occlusion. Show the neutral frame and two offset camera views.

**Phase 4 — Scene B:** Assemble the rear-view scene using provided artwork. If the rear-view assets aren't supplied, stop and request them rather than inventing a finished scene.

**Phase 5 — Mirror transition:** Implement and refine the crossing, masking, and reverse movement.

**Phase 6 — Polish:** Responsive behavior, accessibility, performance, subtle idle animation, and clean handoff.

At each stage, distinguish **implemented**, **placeholder**, **blocked by missing assets**, and **proposed**. Don't claim a functioning interactive experience until it has been run and checked.

## 9. What I want back

- A working, locally runnable interactive prototype, with source code and setup instructions.
- An asset inventory and transparent explanation of how my PSD layers were used.
- A short technical breakdown of Scene A, Scene B, parallax depth, mirror masking, and camera transition.
- A list of any illustrations I still need to make, with the required viewing angle, framing, transparent background needs, and recommended overlap/bleed.
- Screenshots or previews of both scene states, plus a brief demonstration of the crossing if your environment supports it.

## 10. Creative constraints — please respect these

- **Use my artwork. Do not regenerate, restyle, or replace it.**
- Keep the visual composition **uncluttered**, as in my latest illustration.
- Do not add generic symbols, memory ribbons, flowers, fantasy glow, or invented props.
- Preserve the existing character design (short blond hair, green clothing in the visible composite), mirror, tabletop, hands, and painterly textures.
- Don't confuse the mirror's initial normal reflection with the *later* rear-view scene.
- The rear-view reveal should feel quietly uncanny and human, not like a horror jump scare or video game portal.
- The project is about subjective experience and perception; **the camera perspective change is the storytelling device**.

**Start by inspecting `Perception.psd` and showing me the actual asset inventory and proposed layer mapping before writing the complete interaction. If you can't read PSD layers directly, tell me exactly what to export and how to name it.**
