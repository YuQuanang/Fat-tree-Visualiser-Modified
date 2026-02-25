$(document).ready(docMain);

var conf = new Object();
conf['depth'] = 5;
conf['width'] = 16;
conf['abCount'] = 8;
conf['coreCount'] = 8;
conf['splitSpan'] = 2;
conf['linkSpeed'] = 400;
conf['railLayout'] = 0;
conf['rails'] = 8;

var controlVisible = true;

function docMain() {
    formInit();
    redraw();
    $(document).keypress(kpress);
}

function kpress(e) {
    if (e.which == 104) { // 'h'
        if (controlVisible) {
            controlVisible = false;
            $("div.control").hide();
        } else {
            controlVisible = true;
            $("div.control").show();
        }
    }
}

function redraw() {
    drawJupiter(conf);
}

function drawJupiter(settings) {
    d3.select("svg.main").remove();

    var model = buildJupiterModel(settings);
    if (model.nodes.length == 0) {
        return;
    }

    var layout = settings['railLayout'] ? layoutRail(model, settings) : layoutClassic(model, settings);
    var w = layout.w;
    var h = layout.h;

    var svg = d3.select("body").append("svg")
        .attr("width", w)
        .attr("height", h)
        .attr("class", "main")
        .append("g")
        .attr("transform", "translate(" + w / 2 + "," + 40 + ")");

    if (settings['railLayout']) {
        for (var r = 0; r < layout.rails.length; r++) {
            svg.append("line")
                .attr("class", "rail")
                .attr("x1", layout.rails[r].x)
                .attr("y1", 0)
                .attr("x2", layout.rails[r].x)
                .attr("y2", h - 80);

            svg.append("text")
                .attr("class", "rail-label")
                .attr("x", layout.rails[r].x)
                .attr("y", -8)
                .text("Rail " + (r + 1));
        }
    }

    for (var b = 0; b < model.blocks.length; b++) {
        var block = model.blocks[b];
        if (layout.blocks[block.id]) {
            var rect = layout.blocks[block.id];
            svg.append("rect")
                .attr("class", "ab")
                .attr("x", rect.x)
                .attr("y", rect.y)
                .attr("width", rect.w)
                .attr("height", rect.h);
            svg.append("text")
                .attr("class", "ab-label")
                .attr("x", rect.x + rect.w / 2)
                .attr("y", rect.y - 4)
                .text(block.label);
        }
    }

    for (var i = 0; i < model.links.length; i++) {
        var link = model.links[i];
        var src = layout.positions[link.source];
        var dst = layout.positions[link.target];
        if (!src || !dst) {
            continue;
        }
        svg.append("line")
            .attr("class", link.type == "agg-core" ? "core-cable" : "cable")
            .attr("x1", src.x)
            .attr("y1", src.y)
            .attr("x2", dst.x)
            .attr("y2", dst.y);
    }

    for (var n = 0; n < model.nodes.length; n++) {
        var node = model.nodes[n];
        var pos = layout.positions[node.id];
        if (!pos) {
            continue;
        }
        if (node.kind == "host") {
            svg.append("circle")
                .attr("class", "host")
                .attr("cx", pos.x)
                .attr("cy", pos.y)
                .attr("r", 1.6);
        } else {
            svg.append("rect")
                .attr("class", node.kind == "core" ? "core" : "pod")
                .attr("x", pos.x - 4)
                .attr("y", pos.y - 4)
                .attr("width", 8)
                .attr("height", 8);
        }
    }
}

function buildJupiterModel(settings) {
    var k = Math.max(2, parseInt(settings['width']) || 16);
    var abCount = Math.max(2, parseInt(settings['abCount']) || 8);
    var coreCount = Math.max(2, parseInt(settings['coreCount']) || 8);
    var edgePerAB = Math.max(1, Math.floor(k / 2));
    var aggPerAB = Math.max(1, Math.floor(k / 2));
    var hostsPerEdge = Math.max(1, Math.floor(k / 2));
    var splitSpan = Math.max(1, Math.min(coreCount, parseInt(settings['splitSpan']) || 2));

    var model = {
        nodes: [],
        links: [],
        blocks: [],
        edgePerAB: edgePerAB,
        aggPerAB: aggPerAB,
        hostsPerEdge: hostsPerEdge,
        coreCount: coreCount,
        abCount: abCount
    };

    for (var c = 0; c < coreCount; c++) {
        model.nodes.push({ id: "S" + c, label: "S" + (c + 1), kind: "core", coreIndex: c });
    }

    for (var ab = 0; ab < abCount; ab++) {
        var block = { id: "AB" + ab, label: "AB" + (ab + 1), edge: [], agg: [] };

        for (var e = 0; e < edgePerAB; e++) {
            var edgeId = "E" + ab + "_" + e;
            model.nodes.push({ id: edgeId, kind: "edge", ab: ab, edgeIndex: e });
            block.edge.push(edgeId);

            for (var h = 0; h < hostsPerEdge; h++) {
                var hostId = "H" + ab + "_" + e + "_" + h;
                model.nodes.push({ id: hostId, kind: "host", ab: ab });
                model.links.push({ source: edgeId, target: hostId, type: "edge-host" });
            }
        }

        for (var a = 0; a < aggPerAB; a++) {
            var aggId = "A" + ab + "_" + a;
            model.nodes.push({ id: aggId, kind: "agg", ab: ab, aggIndex: a });
            block.agg.push(aggId);
        }

        for (var e2 = 0; e2 < block.edge.length; e2++) {
            for (var a2 = 0; a2 < block.agg.length; a2++) {
                model.links.push({ source: block.edge[e2], target: block.agg[a2], type: "edge-agg" });
            }
        }

        for (var a3 = 0; a3 < block.agg.length; a3++) {
            var offset = (a3 * splitSpan) % coreCount;
            for (var s = 0; s < splitSpan; s++) {
                var coreIndex = (offset + s) % coreCount;
                model.links.push({
                    source: block.agg[a3],
                    target: "S" + coreIndex,
                    type: "agg-core",
                    coreIndex: coreIndex
                });
            }
        }

        model.blocks.push(block);
    }

    return model;
}

function layoutClassic(model, settings) {
    var positions = {};
    var blocks = {};

    var abGap = 170;
    var aggGap = 14;
    var edgeGap = 14;
    var hostGap = 3;
    var coreGap = 28;

    var totalABW = (model.abCount - 1) * abGap;
    var coreW = (model.coreCount - 1) * coreGap;
    var w = Math.max(1000, Math.max(totalABW, coreW) + 360);
    var h = 530;

    for (var c = 0; c < model.coreCount; c++) {
        positions["S" + c] = { x: -coreW / 2 + c * coreGap, y: 20 };
    }

    for (var ab = 0; ab < model.abCount; ab++) {
        var cx = -totalABW / 2 + ab * abGap;
        var blockLeft = cx - Math.max((model.aggPerAB - 1) * aggGap, (model.edgePerAB - 1) * edgeGap) / 2 - 12;
        var blockW = Math.max((model.aggPerAB - 1) * aggGap, (model.edgePerAB - 1) * edgeGap) + 24;
        blocks["AB" + ab] = { x: blockLeft, y: 68, w: blockW, h: 180 };

        for (var a = 0; a < model.aggPerAB; a++) {
            var ax = cx - (model.aggPerAB - 1) * aggGap / 2 + a * aggGap;
            positions["A" + ab + "_" + a] = { x: ax, y: 96 };
        }

        for (var e = 0; e < model.edgePerAB; e++) {
            var ex = cx - (model.edgePerAB - 1) * edgeGap / 2 + e * edgeGap;
            var edgeId = "E" + ab + "_" + e;
            positions[edgeId] = { x: ex, y: 146 };

            for (var hs = 0; hs < model.hostsPerEdge; hs++) {
                var hx = ex - (model.hostsPerEdge - 1) * hostGap / 2 + hs * hostGap;
                positions["H" + ab + "_" + e + "_" + hs] = { x: hx, y: 214 };
            }
        }
    }

    return { positions: positions, blocks: blocks, w: w, h: h, rails: [] };
}

function layoutRail(model, settings) {
    var positions = {};
    var blocks = {};

    var rails = Math.max(1, parseInt(settings['rails']) || 8);
    var railGap = 60;
    var abGapY = 76;
    var edgeGap = 12;
    var hostGap = 3;

    var railW = (rails - 1) * railGap;
    var w = Math.max(1000, railW + 360);
    var h = Math.max(520, 150 + model.abCount * abGapY);

    var railInfo = [];
    for (var r = 0; r < rails; r++) {
        railInfo.push({ x: -railW / 2 + r * railGap });
    }

    for (var c = 0; c < model.coreCount; c++) {
        var cr = c % rails;
        var layer = Math.floor(c / rails);
        positions["S" + c] = { x: railInfo[cr].x, y: 18 - layer * 16 };
    }

    for (var ab = 0; ab < model.abCount; ab++) {
        var baseY = 95 + ab * abGapY;
        blocks["AB" + ab] = { x: -railW / 2 - 24, y: baseY - 24, w: railW + 48, h: 64 };

        for (var a = 0; a < model.aggPerAB; a++) {
            var ar = a % rails;
            positions["A" + ab + "_" + a] = { x: railInfo[ar].x, y: baseY };
        }

        for (var e = 0; e < model.edgePerAB; e++) {
            var ex = -(model.edgePerAB - 1) * edgeGap / 2 + e * edgeGap;
            var edgeId = "E" + ab + "_" + e;
            positions[edgeId] = { x: ex, y: baseY + 26 };

            for (var hs = 0; hs < model.hostsPerEdge; hs++) {
                var hx = ex - (model.hostsPerEdge - 1) * hostGap / 2 + hs * hostGap;
                positions["H" + ab + "_" + e + "_" + hs] = { x: hx, y: baseY + 48 };
            }
        }
    }

    return { positions: positions, blocks: blocks, w: w, h: h, rails: railInfo };
}

function updateStat() {
    var model = buildJupiterModel(conf);
    var linkSpeed = Math.max(1, parseInt(conf['linkSpeed']) || 400);
    if (model.nodes.length == 0) {
        d3.select("#nhost").html("&nbsp;");
        d3.select("#nswitch").html("&nbsp;");
        d3.select("#ncable").html("&nbsp;");
        d3.select("#ntx").html("&nbsp;");
        d3.select("#nswtx").html("&nbsp;");
        d3.select("#nab").html("&nbsp;");
        d3.select("#nstage").html("&nbsp;");
        d3.select("#nbisect").html("&nbsp;");
        return;
    }

    var nhost = 0;
    var nswitch = 0;
    for (var i = 0; i < model.nodes.length; i++) {
        if (model.nodes[i].kind == "host") nhost++;
        if (model.nodes[i].kind != "host") nswitch++;
    }
    var ncable = model.links.length;
    var ntx = 2 * ncable;
    var nswtx = ntx - nhost;
    var bisection = calcBisection(model, linkSpeed);

    d3.select("#nhost").html(formatNum(nhost));
    d3.select("#nswitch").html(formatNum(nswitch));
    d3.select("#ncable").html(formatNum(ncable));
    d3.select("#ntx").html(formatNum(ntx));
    d3.select("#nswtx").html(formatNum(nswtx));
    d3.select("#nab").html(formatNum(model.abCount));
    d3.select("#nstage").html("5-stage Clos");
    d3.select("#nbisect").html(formatNum(bisection) + " Gbps");
}

function calcBisection(model, linkSpeed) {
    var split = Math.floor(model.abCount / 2);
    var perCoreLeft = {};
    var perCoreRight = {};

    for (var i = 0; i < model.links.length; i++) {
        var link = model.links[i];
        if (link.type != "agg-core") {
            continue;
        }

        var sourceId = link.source;
        var abIdx = parseInt(sourceId.substring(1, sourceId.indexOf("_")), 10);
        if (isNaN(abIdx)) {
            continue;
        }

        var core = link.target;
        if (abIdx < split) {
            perCoreLeft[core] = (perCoreLeft[core] || 0) + 1;
        } else {
            perCoreRight[core] = (perCoreRight[core] || 0) + 1;
        }
    }

    var bisectionLinks = 0;
    for (var c = 0; c < model.coreCount; c++) {
        var id = "S" + c;
        var l = perCoreLeft[id] || 0;
        var r = perCoreRight[id] || 0;
        bisectionLinks += Math.min(l, r);
    }

    return bisectionLinks * linkSpeed;
}

function formatNum(x) {
    x = x.toString();
    var pattern = /(-?\d+)(\d{3})/;
    while (pattern.test(x))
        x = x.replace(pattern, "$1,$2");
    return x;
}

function formInit() {
    var form = d3.select("form");

    function confInt() { 
        conf[this.name] = parseInt(this.value);
        updateStat();
        redraw();
    }

    function confCheck() {
        conf[this.name] = this.checked ? 1 : 0;
        updateStat();
        redraw();
    }

    function hook(name, func) {
        var fields = form.selectAll("[name=" + name + "]");
        fields.on("change", func);
        fields.each(func);
    }

    hook("width", confInt);
    hook("abCount", confInt);
    hook("coreCount", confInt);
    hook("splitSpan", confInt);
    hook("linkSpeed", confInt);
    hook("rails", confInt);
    hook("railLayout", confCheck);
}

