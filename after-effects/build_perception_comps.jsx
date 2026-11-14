/* Perception: build After Effects comps from the website's layers.
 *
 * In After Effects:  File > Scripts > Run Script File…  and choose this file.
 * It must stay in Perception/after-effects/ (it finds the art at
 * ../web/assets/png and the positions in ../web/assets/manifest.js).
 *
 * It creates, inside a "Perception" folder in your project:
 *
 *   RENDER (animate + export these)/
 *       scene-a__reflection, scene-b__figure, …   one comp per layer, cropped
 *       exactly to the size and position the website expects. Animate inside
 *       these, render them with alpha, and the site plays them in place.
 *
 *   PREVIEW/
 *       PREVIEW 1stPOV, PREVIEW archway, PREVIEW 3rdPOV
 *       full 1920×1080 assemblies of the RENDER comps in the right stacking
 *       order (mirror interior masked, clouds on Screen), so you can see your
 *       animation in context. Don't render these for the site.
 *
 * Nothing in your existing project is changed or deleted.
 */
(function () {
    var FPS = 30, SECONDS = 10;

    var root = $.global.PERCEPTION_ROOT ? new Folder($.global.PERCEPTION_ROOT) : File($.fileName).parent.parent;
    var pngRoot = root.fsName + "/web/assets/png/";
    var manFile = new File(root.fsName + "/web/assets/manifest.js");
    if (!manFile.exists) {
        alert("Couldn't find web/assets/manifest.js.\nKeep this script in the Perception/after-effects folder.");
        return;
    }
    manFile.encoding = "UTF-8";
    manFile.open("r");
    var txt = manFile.read();
    manFile.close();
    var man;
    try {
        man = eval("(" + txt.substring(txt.indexOf("=") + 1, txt.lastIndexOf(";")) + ")");
    } catch (e) {
        alert("Couldn't read manifest.js: " + e);
        return;
    }
    var A = man.assets;

    // bottom -> top, as in the PSD
    var SCENES = [
        { title: "PREVIEW 1stPOV", scene: "scene-a",
          layers: ["wall", "MIRROR", "mirror-frame", "table", "hand-left", "hand-right"] },
        { title: "PREVIEW archway", scene: "archway", layers: ["wall", "frame"] },
        { title: "PREVIEW 3rdPOV", scene: "scene-b",
          layers: ["room", "floor-shadows", "mirror", "table", "chair", "figure"] }
    ];
    // inside the mirror, clipped to the opening by mirror-mask
    var MIRROR = ["glass-base", "reflection", "glass-haze", "glass-clouds", "reflection-glaze", "glass-scratches"];
    var SCREEN = { "scene-a/glass-clouds": true };

    var proj = app.project || app.newProject();
    app.beginUndoGroup("Build Perception comps");

    var top = proj.items.addFolder("Perception");
    var fPng = proj.items.addFolder("PNG layers (from Perception.psd)");
    var fRender = proj.items.addFolder("RENDER (animate + export these)");
    var fPreview = proj.items.addFolder("PREVIEW");
    fPng.parentFolder = top; fRender.parentFolder = top; fPreview.parentFolder = top;

    var footageCache = {}, renderComps = {}, missing = [];

    function footage(key) {
        if (footageCache[key]) return footageCache[key];
        var f = new File(pngRoot + key + ".png");
        if (!f.exists) { missing.push(key); return null; }
        var io = new ImportOptions(f);
        io.importAs = ImportAsType.FOOTAGE;
        var item = proj.importFile(io);
        item.parentFolder = fPng;
        try { item.mainSource.alphaMode = AlphaMode.STRAIGHT; } catch (e) {}
        footageCache[key] = item;
        return item;
    }

    // a comp the exact size/position the website uses for this layer
    function renderComp(key) {
        if (renderComps[key]) return renderComps[key];
        var a = A[key], src = footage(key);
        if (!a || !src) return null;
        var comp = proj.items.addComp(key.replace("/", "__"), a.w, a.h, 1, SECONDS, FPS);
        comp.parentFolder = fRender;
        comp.bgColor = [0, 0, 0];
        var L = comp.layers.add(src);
        // the PNG is a full 1920x1080 canvas; shift it so this layer's box sits at 0,0
        L.property("Position").setValue([960 - a.x, 540 - a.y]);
        L.name = key + " (still from PSD)";
        renderComps[key] = comp;
        return comp;
    }

    function addPlaced(comp, key) {
        var rc = renderComp(key);
        if (!rc) return null;
        var a = A[key];
        var L = comp.layers.add(rc);
        L.property("Position").setValue([a.x + a.w / 2, a.y + a.h / 2]);
        if (SCREEN[key]) L.blendingMode = BlendingMode.SCREEN;
        return L;
    }

    function mirrorInterior() {
        var comp = proj.items.addComp("1stPOV mirror interior", 1920, 1080, 1, SECONDS, FPS);
        comp.parentFolder = fPreview;
        // the colour that shows through the translucent glass (matches the PSD preview)
        comp.layers.addSolid([129 / 255, 136 / 255, 157 / 255], "glass backing", 1920, 1080, 1, SECONDS);
        for (var i = 0; i < MIRROR.length; i++) addPlaced(comp, "scene-a/" + MIRROR[i]);
        return comp;
    }

    for (var s = 0; s < SCENES.length; s++) {
        var sc = SCENES[s];
        var comp = proj.items.addComp(sc.title, 1920, 1080, 1, SECONDS, FPS);
        comp.parentFolder = fPreview;
        for (var i = 0; i < sc.layers.length; i++) {
            var name = sc.layers[i];
            if (name === "MIRROR") {
                var interior = comp.layers.add(mirrorInterior());
                var maskSrc = footage("scene-a/mirror-mask");
                if (maskSrc) {
                    var matte = comp.layers.add(maskSrc);    // directly above the interior
                    matte.name = "mirror opening (matte)";
                    try { interior.setTrackMatte(matte, TrackMatteType.ALPHA); }
                    catch (e1) { try { interior.trackMatteType = TrackMatteType.ALPHA; } catch (e2) {} }
                }
            } else {
                addPlaced(comp, sc.scene + "/" + name);
            }
        }
    }

    app.endUndoGroup();

    var msg = "Done. Look in the Perception folder in your Project panel.\n\n" +
              "Animate inside RENDER comps (e.g. scene-a__reflection).\n" +
              "Check them in context with the PREVIEW comps.\n" +
              "Render RENDER comps as QuickTime, Apple ProRes 4444, RGB + Alpha.";
    if (missing.length) msg += "\n\nMissing PNGs (skipped):\n" + missing.join("\n");
    $.global.PERCEPTION_BUILD_RESULT = { missing: missing, folder: top };
    if (!$.global.PERCEPTION_SILENT) alert(msg);   // other scripts can run this without the pop-up
})();
