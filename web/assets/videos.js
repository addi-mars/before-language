/* After Effects video layers.
 *
 * List a layer here to play a looping transparent video in place of its still
 * image. It keeps the same position, depth, parallax and masking.
 *
 * Put the files at   assets/video/<layer name>.webm   (Chrome, Firefox, Edge)
 *              and   assets/video/<layer name>.mov    (Safari: HEVC with alpha)
 * e.g. assets/video/scene-a/reflection.webm + assets/video/scene-a/reflection.mov
 *
 * Options per layer:
 *   true                       use the default file names above
 *   { puppet: false }          turn off the site's own breathing/lean on this layer
 *                              (use this if the AE animation already moves the body;
 *                               leave it on to keep the reflection/figure responding to you)
 *   { webm: '…', hevc: '…' }   custom file paths
 *
 * Layer names you can use (exactly as written):
 *   scene-a/wall  scene-a/glass-base  scene-a/reflection  scene-a/glass-haze
 *   scene-a/glass-clouds  scene-a/reflection-glaze  scene-a/glass-scratches
 *   scene-a/mirror-frame  scene-a/table  scene-a/hand-left  scene-a/hand-right
 *   archway/wall  archway/frame
 *   scene-b/room  scene-b/floor-shadows  scene-b/mirror  scene-b/table
 *   scene-b/chair  scene-b/figure
 *
 * If a file is missing or the browser can't play it, the still image is used.
 */
window.PERCEPTION_VIDEOS = {
  'scene-b/figure': true,
  'scene-a/hand-right': true,
  'scene-a/hand-left': true,
  'scene-a/glass-clouds': true,
  // 'scene-a/reflection': true,
  // 'scene-b/figure': { puppet: true },
};
