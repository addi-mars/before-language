/* Perception: animate the Puppet pins on the hands (run after pins exist).
 *
 * The pins were placed by hand with the Puppet Position Pin tool, 7 per hand,
 * in this order:  1-2 wrist (anchors), 3 back of hand, 4 index knuckle,
 *                 5 thumb base, 6 index fingertip, 7 thumb tip.
 *
 * Each pin gets an expression that eases it out and back over the 10 s comp,
 * so the loop is seamless. Edit the numbers below (px) to change the motion,
 * or delete an expression (Alt/Option-click its stopwatch) to free a pin.
 *
 *   left hand:  the index finger slowly lifts off the thumb (a grip loosening)
 *   right hand: the ring of finger and thumb slowly tightens, half a cycle later
 */
(function () {
    var MOVES = {
        "scene-a__hand-left":  { phase: 0.0, pins: [[0, 0], [0, 0], [0, -0.5], [-0.6, -1.2], [0.6, 0.6], [-1.8, -4.2], [1.2, 1.8]] },
        "scene-a__hand-right": { phase: 0.5, pins: [[0, 0], [0, 0], [0, 0.4], [0.5, 0.9], [0.4, -0.5], [-1.5, 2.1], [1.5, -1.2]] }
    };
    var done = [];
    function findComp(name) {
        var f = null;
        for (var i = 1; i <= app.project.numItems; i++) {
            var it = app.project.item(i);
            if (it instanceof CompItem && it.name === name && it.parentFolder && it.parentFolder.name === "RENDER (animate + export these)") f = it;
        }
        return f;
    }
    // the pins live a few groups deep (Puppet > Mesh > Mesh 1 > Deform); find them by internal name
    function findByMatch(group, match) {
        if (!group || !group.numProperties) return null;
        for (var i = 1; i <= group.numProperties; i++) {
            var p = group.property(i);
            if (p.matchName === match) return p;
            if (p.propertyType !== PropertyType.PROPERTY) {
                var hit = findByMatch(p, match);
                if (hit) return hit;
            }
        }
        return null;
    }
    function pinGroup(layer) {
        var puppet = findByMatch(layer.property("ADBE Effect Parade"), "ADBE FreePin3");
        return puppet ? findByMatch(puppet, "ADBE FreePin3 PosPins") : null;
    }
    app.beginUndoGroup("Animate hand pins");
    for (var name in MOVES) {
        var comp = findComp(name);
        if (!comp) { done.push(name + ": comp not found"); continue; }
        var pins = pinGroup(comp.layer(1));
        if (!pins) { done.push(name + ": no Puppet pins"); continue; }
        var m = MOVES[name];
        for (var p = 1; p <= pins.numProperties && p <= m.pins.length; p++) {
            var d = m.pins[p - 1];
            var pos = findByMatch(pins.property(p), "ADBE FreePin3 PosPin Position");
            if (d[0] === 0 && d[1] === 0) { pos.expression = ""; continue; }
            pos.expression =
                "// Perception: ease out and back once per comp length (seamless loop)\n" +
                "var e = (1 - Math.cos(2 * Math.PI * (time / thisComp.duration + " + m.phase + "))) / 2;\n" +
                "value + [" + d[0] + ", " + d[1] + "] * e;";
        }
        done.push(name + ": " + pins.numProperties + " pins animated");
    }
    app.endUndoGroup();
    $.global.PERCEPTION_LOG = done.join("\n");
    try {   // leave a note next to this script (AE doesn't return script output to other apps)
        var f = new File(File($.fileName).parent.fsName + "/.last_script_log.txt");
        f.open("w"); f.write(done.join("\n")); f.close();
    } catch (e) {}
})();
