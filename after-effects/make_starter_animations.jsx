/* Perception: starter loop animations (optional).
 *
 * File > Scripts > Run Script File… > this file. It:
 *   1. runs build_perception_comps.jsx (RENDER + PREVIEW comps)
 *   2. adds gentle, seamlessly looping movement to three RENDER comps,
 *      using only your painted layers (no new art, no restyling):
 *        scene-a__glass-clouds     the fog on the mirror slowly breathes
 *        scene-a__reflection       the reflection is very slightly unsteady,
 *        scene-a__reflection-glaze   as if not quite solid (identical settings
 *                                    on both so they stay registered)
 *   3. renders them to after-effects/renders/ as ProRes 4444 + alpha
 *   4. saves the project as after-effects/Perception.aep
 *
 * Every animation is one effect (Turbulent Displace) on the layer. Select the
 * layer and press E to see it, change it, or delete it.
 */
(function () {
    var here = File($.fileName).parent;
    $.global.PERCEPTION_ROOT = here.parent.fsName;
    $.global.PERCEPTION_SILENT = true;
    if (!app.project) app.newProject();
    $.evalFile(new File(here.fsName + "/build_perception_comps.jsx"));

    var log = [];
    var RENDER_FOLDER = "RENDER (animate + export these)";

    function findComp(name) {
        var found = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === name && it.parentFolder && it.parentFolder.name === RENDER_FOLDER) found = it;
        }
        return found;   // the newest one if the script has been run before
    }

    function setIf(fx, names, value) {
        for (var i = 0; i < names.length; i++) {
            try { var p = fx.property(names[i]); if (p) { p.setValue(value); return true; } } catch (e) {}
        }
        log.push("  (couldn't set " + names[0] + ")");
        return false;
    }

    // A slow, looping displacement: Evolution turns once over the comp, with
    // Cycle Evolution on, so the last frame flows straight into the first.
    function shimmer(compName, amount, size, seed) {
        var comp = findComp(compName);
        if (!comp) { log.push("missing comp " + compName); return null; }
        var L = comp.layer(1);
        var fx = L.property("ADBE Effect Parade").addProperty("ADBE Turbulent Displace");
        fx.name = "Perception loop (" + compName + ")";
        setIf(fx, ["Amount"], amount);
        setIf(fx, ["Size"], size);
        setIf(fx, ["Complexity"], 1.2);
        setIf(fx, ["Pinning"], 3);                 // pin all edges: nothing tears at the comp border
        setIf(fx, ["Cycle Evolution"], 1);
        setIf(fx, ["Cycle (in Revolutions)"], 1);
        setIf(fx, ["Random Seed"], seed);
        setIf(fx, ["Antialiasing for Best Quality"], 2);
        var evo = fx.property("Evolution");
        evo.setValueAtTime(0, 0);
        evo.setValueAtTime(comp.duration, 360);
        for (var k = 1; k <= evo.numKeys; k++) evo.setInterpolationTypeAtKey(k, KeyframeInterpolationType.LINEAR);
        log.push(compName + ": Turbulent Displace amount " + amount + ", size " + size);
        return comp;
    }

    app.beginUndoGroup("Perception starter animations");
    var comps = [
        shimmer("scene-a__glass-clouds", 14, 160, 7),
        shimmer("scene-a__reflection", 4, 240, 3),
        shimmer("scene-a__reflection-glaze", 4, 240, 3)
    ];
    app.endUndoGroup();

    // render
    var outDir = new Folder(here.fsName + "/renders");
    if (!outDir.exists) outDir.create();
    var rq = app.project.renderQueue;
    for (var i = 1; i <= rq.numItems; i++) { try { rq.item(i).render = false; } catch (e) {} }
    for (var c = 0; c < comps.length; c++) {
        if (!comps[c]) continue;
        var item = rq.items.add(comps[c]);
        var om = item.outputModule(1);
        try { om.applyTemplate("High Quality with Alpha"); }
        catch (e) { log.push("output template 'High Quality with Alpha' not found: " + e); }
        // This preset writes premultiplied colour and AE won't let scripts change
        // it; the converter detects that and un-premultiplies, so it's fine.
        om.file = new File(outDir.fsName + "/" + comps[c].name + ".mov");
    }
    rq.render();
    log.push("rendered to " + outDir.fsName);

    app.project.save(new File(here.fsName + "/Perception.aep"));
    log.push("saved " + here.fsName + "/Perception.aep");
    $.global.PERCEPTION_LOG = log.join("\n");
})();
$.global.PERCEPTION_LOG;
