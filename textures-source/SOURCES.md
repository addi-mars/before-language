# Texture sources

Downloaded 2026-11-10 for the overlay textures. All are free to use, including commercially, with no attribution required:
- Pexels License: https://www.pexels.com/license/
- Pixabay Content License: https://pixabay.com/service/license-summary/

The originals are kept here; `web/tools/prepare_textures.py` turns them into the grey tiles in `web/assets/texture/`.

| File | Source page |
|---|---|
| weave-pexels-fabric-36346049.jpg | https://www.pexels.com/photo/close-up-of-natural-fabric-texture-36346049/ |
| weave-pexels-canvas-7533979.jpg | https://www.pexels.com/photo/white-canvas-fabric-7533979/ |
| weave-pexels-jute-36346077.jpg | https://www.pexels.com/photo/high-resolution-jute-fabric-texture-36346077/ |
| weave-pexels-linen-7794365.jpg | https://www.pexels.com/photo/close-up-of-a-linen-texture-7794365/ |
| weave-pexels-woven-7598537.jpg | https://www.pexels.com/photo/a-texture-of-a-fabric-7598537/ |
| weave-pixabay-textile-1251716.jpg | https://pixabay.com/photos/textile-textures-background-fabric-1251716/ |
| weave-pixabay-jute-2918844.jpg | https://pixabay.com/photos/textile-jute-brown-fabric-texture-2918844/ |
| paper-pexels-watercolour-9176032.jpg | https://www.pexels.com/photo/abstract-painting-on-white-canvas-9176032/ |
| paper-pexels-page-15067862.jpg | https://www.pexels.com/photo/paper-page-texture-light-colour-15067862/ |
| paper-pexels-ink-9175904.jpg | https://www.pexels.com/photo/white-and-gray-abstract-photo-of-dissolved-ink-on-paper-9175904/ |
| paper-pixabay-watercolour-255615.jpg | https://pixabay.com/photos/watercolor-painting-technique-255615/ |
| paint-pexels-brushstrokes-7233320.jpg | https://www.pexels.com/photo/light-beige-brushstrokes-on-canvas-7233320/ |
| paint-pexels-rough-canvas-25949753.jpg | https://www.pexels.com/photo/rough-texture-of-canvas-in-pink-paint-25949753/ |
| paint-pexels-oil-1047525.jpg | https://www.pexels.com/photo/tilt-shift-photography-of-gray-surface-1047525/ |
| paint-pexels-gesso-1843717.jpg | https://www.pexels.com/photo/textured-white-abstract-surface-close-up-1843717/ |
| paint-pixabay-grunge-2937278.jpg | https://pixabay.com/photos/grunge-dark-texture-gray-texture-2937278/ |

To add more: drop photos in this folder named `weave-…`, `paper-…` or `paint-…`, then run
`python3 web/tools/prepare_textures.py textures-source web/assets` (or ask Claude).
