/* Perception: the 3rdPOV figure almost turns around (run after pins exist).
 *
 * Pins on scene-b__figure (placed by hand with the Puppet Position Pin tool):
 *   anchors on the shoulders, collar, back, arm, legs and shoe (they stay put)
 *   3 on the head: crown, left side, right side/ear
 * Head pins are found by position (anything above the collar), so the order
 * they were clicked in doesn't matter.
 *
 * Over each 10 s loop: still for 3 s, then the head slowly begins to turn
 * toward its right, toward the camera, as if sensing someone behind it; it
 * holds, then settles back before the face is ever seen. Edit TURN below
 * (px for the left side, crown and ear) to make it stronger or fainter.
 */
(function () {
    var COMP = "scene-b__figure";
    var NECK_Y = 262;                         // canvas px: pins above this are on the head
    var TURN = { left: [1, 0.25], crown: [1.8, 0.25], ear: [3, 0.5] };
    var log = [];

    function findComp(name) {
        var f = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === name && it.parentFolder && it.parentFolder.name === "RENDER (animate + export these)") f = it;
        }
        return f;
    }
    function collect(group, match, out) {
        if (!group || !group.numProperties) return out;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (p.matchName === match) out.push(p);
            else if (p.propertyType !== PropertyType.PROPERTY) collect(p, match, out);
        }
        return out;
    }

    var comp = findComp(COMP);
    if (!comp) { log.push("comp not found"); }
    else {
        var positions = collect(comp.layer(1).property("ADBE Effect Parade"), "ADBE FreePin3 PosPin Position", []);
        var head = [];
        for (var i = 0; i < positions.length; i++) {
            var v = positions[i].valueAtTime(0, true);
            if (v[1] < NECK_Y) head.push({ prop: positions[i], x: v[0] });
            else positions[i].expression = "";
        }
        head.sort(function (a, b) { return a.x - b.x; });
        var roles = head.length === 3 ? ["left", "crown", "ear"] : [];
        app.beginUndoGroup("Figure almost turns");
        for (var h = 0; h < roles.length; h++) {
            var d = TURN[roles[h]];
            head[h].prop.expression =
                "// Perception: the head almost turns (seamless 10 s loop)\n" +
                "var u = (time % thisComp.duration) / thisComp.duration;\n" +
                "function s(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }\n" +
                "var e = u < 0.3 ? 0 : u < 0.55 ? s((u - 0.3) / 0.25) : u < 0.7 ? 1 : 1 - s((u - 0.7) / 0.3);\n" +
                "value + [" + d[0] + ", " + d[1] + "] * e;";
        }
        app.endUndoGroup();
        log.push(COMP + ": " + positions.length + " pins, " + head.length + " on the head" +
                 (roles.length ? " (animated)" : " (expected 3, nothing animated)"));
    }
    try {
        var f = new File(File($.fileName).parent.fsName + "/.last_script_log.txt");
        f.open("w"); f.write(log.join("\n")); f.close();
    } catch (e) {}
})();
