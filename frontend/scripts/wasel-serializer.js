/* eslint-disable */
/**
 * Wasel Egypt — in-page DOM → SVG serializer (Figma-editable vector export).
 * Injected via page.addScriptTag; exposes window.__waselSerialize().
 *
 * Emits real vector primitives:
 *  - <path>/<rect>  for element boxes (bg, gradients, borders, radii, shadows approx)
 *  - <text>         per text line, positioned from Range word rects (RTL-aware)
 *  - nested <svg>   for inline icons/diagrams (lucide, map canvas) with resolved colors
 *  - <clipPath>     for overflow-hidden containers
 * Paint order approximates CSS stacking (z<0 → flow+inline → positioned auto → z>0).
 */
(function () {
  "use strict";

  window.__waselSerialize = function __waselSerialize(opts) {
    var W = document.documentElement.clientWidth;
    var VH = window.innerHeight;
    var H = Math.max(document.documentElement.scrollHeight, VH);
    if (opts && opts.maxHeight) H = Math.min(H, opts.maxHeight);

    var NS = "http://www.w3.org/2000/svg";
    var doc = document.implementation.createDocument(NS, "svg", null);
    var svg = doc.documentElement;
    svg.setAttribute("width", String(Math.round(W)));
    svg.setAttribute("height", String(Math.round(H)));
    svg.setAttribute("viewBox", "0 0 " + Math.round(W) + " " + Math.round(H));
    svg.setAttribute("fill", "none");
    var defs = doc.createElementNS(NS, "defs");
    svg.appendChild(defs);

    var uid = 0;
    var nodeBudget = 26000;
    var aborted = false;

    /* ------------------------------ helpers ------------------------------ */

    function el(name, attrs, parent) {
      var n = doc.createElementNS(NS, name);
      if (attrs) for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(n);
      return n;
    }
    function r1(v) { return Math.round(v * 10) / 10; }
    function r3(v) { return Math.round(v * 1000) / 1000; }

    var AR_RE = /[\u0600-\u06FF]/;
    var FONTS_AR = [["cairo", "Cairo"], ["tajawal", "Tajawal"]];
    var FONTS_LAT = [["jetbrains", "JetBrains Mono"], ["jakarta", "Plus Jakarta Sans"], ["inter", "Inter"]];
    function pickFont(familyStr, sample) {
      var s = (familyStr || "").toLowerCase();
      var isAr = AR_RE.test(sample);
      var list = isAr ? FONTS_AR : FONTS_LAT;
      for (var i = 0; i < list.length; i++) if (s.indexOf(list[i][0]) !== -1) return list[i][1];
      return isAr ? "Tajawal" : "Inter";
    }

    function parseColor(str) {
      str = (str || "").trim();
      if (!str || str === "transparent" || str === "none") return null;
      if (str.charAt(0) === "#") {
        var h = str.slice(1);
        if (h.length === 3 || h.length === 4) h = h.split("").map(function (c) { return c + c; }).join("");
        var a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
        return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: a };
      }
      var m = str.match(/rgba?\(([^)]+)\)/);
      if (m) {
        var p = m[1].split(/[,\/\s]+/).filter(Boolean).map(Number);
        if (p.length >= 3) return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] };
      }
      return null;
    }
    function rgbStr(c) { return "rgb(" + Math.round(c.r) + "," + Math.round(c.g) + "," + Math.round(c.b) + ")"; }

    function splitTop(s) {
      var parts = [], depth = 0, cur = "";
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i);
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (ch === "," && depth === 0) { parts.push(cur); cur = ""; }
        else cur += ch;
      }
      if (cur.trim()) parts.push(cur);
      return parts.map(function (p) { return p.trim(); });
    }

    function radiiOf(cs, w, h) {
      function pv(v) {
        var mm = (v || "0px").split(/\s+/)[0];
        if (mm.indexOf("%") !== -1) return Math.min(w, h) * parseFloat(mm) / 100;
        return parseFloat(mm) || 0;
      }
      return [pv(cs.borderTopLeftRadius), pv(cs.borderTopRightRadius), pv(cs.borderBottomRightRadius), pv(cs.borderBottomLeftRadius)];
    }

    function clampR(r, w, h) {
      var mx = Math.min(w, h) / 2;
      return r.map(function (v) { return Math.max(0, Math.min(v, mx)); });
    }

    function rrectPath(x, y, w, h, r) {
      r = clampR(r, w, h);
      var tl = r[0], tr = r[1], br = r[2], bl = r[3];
      if (tl === 0 && tr === 0 && br === 0 && bl === 0) {
        return "M" + r1(x) + "," + r1(y) + "h" + r1(w) + "v" + r1(h) + "h" + r1(-w) + "Z";
      }
      function A(rr, dx, dy) { return "a" + r1(rr) + "," + r1(rr) + " 0 0 1 " + r1(dx) + "," + r1(dy); }
      return "M" + r1(x + tl) + "," + r1(y) +
        "H" + r1(x + w - tr) + (tr ? A(tr, tr, tr) : "") +
        "V" + r1(y + h - br) + (br ? A(br, -br, br) : "") +
        "H" + r1(x + bl) + (bl ? A(bl, -bl, -bl) : "") +
        "V" + r1(y + tl) + (tl ? A(tl, tl, -tl) : "") + "Z";
    }

    function gradientDef(imgStr, rect, key) {
      var inner = imgStr.slice(imgStr.indexOf("(") + 1, imgStr.lastIndexOf(")"));
      var parts = splitTop(inner);
      if (parts.length < 2) return null;
      var v = null;
      var first = parts[0].trim();
      if (/^to\s/.test(first)) {
        var dirs = first.replace(/^to\s+/, "").split(/\s+/);
        var MAP = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };
        if (dirs.length === 1 && MAP[dirs[0]]) v = MAP[dirs[0]];
        else {
          var vx = dirs.indexOf("right") !== -1 ? rect.width : dirs.indexOf("left") !== -1 ? -rect.width : 0;
          var vy = dirs.indexOf("bottom") !== -1 ? rect.height : dirs.indexOf("top") !== -1 ? -rect.height : 0;
          var len = Math.hypot(vx, vy) || 1;
          v = [vx / len, vy / len];
        }
        parts = parts.slice(1);
      } else if (/^-?[\d.]+deg$/.test(first)) {
        var th = parseFloat(first) * Math.PI / 180;
        v = [Math.sin(th), -Math.cos(th)];
        parts = parts.slice(1);
      } else {
        v = [0, 1];
      }
      var stops = [];
      for (var i = 0; i < parts.length; i++) {
        var sp = splitStop(parts[i]);
        if (!sp) return null;
        stops.push(sp);
      }
      if (stops.length < 2) return null;
      var missing = stops.filter(function (s) { return s.off === null; }).length;
      if (missing > 0) {
        var base = 1 / (stops.length - 1);
        var cursor = 0;
        for (var j = 0; j < stops.length; j++) {
          if (stops[j].off === null) { stops[j].off = cursor + base; }
          cursor = stops[j].off;
        }
      }
      var cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
      var L = Math.abs(rect.width * v[0]) + Math.abs(rect.height * v[1]);
      if (L <= 0) return null;
      var gid = "grad" + (++uid) + (key ? "_" + key : "");
      var lg = el("linearGradient", {
        id: gid, gradientUnits: "userSpaceOnUse",
        x1: r1(cx - v[0] * L / 2), y1: r1(cy - v[1] * L / 2),
        x2: r1(cx + v[0] * L / 2), y2: r1(cy + v[1] * L / 2)
      }, defs);
      for (var k = 0; k < stops.length; k++) {
        var st = stops[k];
        el("stop", { offset: r3(st.off), "stop-color": rgbStr(st.c), "stop-opacity": st.c.a < 1 ? r3(st.c.a) : null }, lg);
      }
      return { id: gid };
    }
    function splitStop(s) {
      var m = s.match(/^(rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}|\w+)(?:\s+([\d.]+)%?)?$/);
      if (!m) return null;
      var c = parseColor(m[1]);
      if (!c) return null;
      return { c: c, off: m[2] === undefined ? null : parseFloat(m[2]) };
    }

    function parseFirstShadow(bs) {
      if (!bs || bs === "none") return null;
      var first = splitTop(bs)[0].trim();
      if (first.indexOf("inset") === 0) return null;
      var m = first.match(/(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?(?:\s+(-?[\d.]+)px)?/);
      if (!m) return null;
      var c = parseColor(m[1]) || { r: 0, g: 0, b: 0, a: 0.08 };
      return { c: c, ox: parseFloat(m[2]), oy: parseFloat(m[3]), blur: m[4] ? parseFloat(m[4]) : 0, spread: m[5] ? parseFloat(m[5]) : 0 };
    }

    /* -------------------------- main traversal --------------------------- */

    function visit(node, parentDom, clip, dyIn, opIn) {
      if (aborted) return;
      if (node.nodeType !== 1) return;
      var tag = node.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "LINK" || tag === "META" || tag === "NOSCRIPT" || tag === "TEMPLATE" || tag === "HEAD") return;

      var cs = getComputedStyle(node);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.visibility === "collapse") return;
      var ownOp = parseFloat(cs.opacity);
      if (!isFinite(ownOp)) ownOp = 1;
      if (ownOp === 0) return;
      var op = ownOp * opIn;
      if (node.classList && node.classList.contains("sr-only")) return;

      var rect = node.getBoundingClientRect();
      var myDy = dyIn;
      if (cs.position === "fixed" && H > VH + 2 && (rect.bottom > VH * 0.55 || rect.top > VH * 0.55)) myDy = H - VH;
      var ry = rect.top + myDy;
      if (rect.width < 0.5 || rect.height < 0.5) return;
      if (rect.bottom + myDy < -80 || ry > H + 80) return;

      if (nodeBudget-- < 0) { aborted = true; return; }

      /* inline <svg> → nested svg (icons, diagrams) */
      if (tag.toLowerCase() === "svg") { emitNestedSvg(node, cs, rect, myDy, op, clip, parentDom); return; }
      if (tag === "IMG") {
        var ph = el("rect", { x: r1(rect.left), y: r1(ry), width: r1(rect.width), height: r1(rect.height), rx: r1(clampR(radiiOf(cs, rect.width, rect.height), rect.width, rect.height)[0]), fill: "#E8E8E8" }, parentDom);
        if (clip) ph.setAttribute("clip-path", "url(#" + clip + ")");
        return;
      }

      var gSelf = el("g", {}, parentDom);
      if (op < 0.999) gSelf.setAttribute("opacity", r3(op));
      if (clip) gSelf.setAttribute("clip-path", "url(#" + clip + ")");

      /* transform (rotation only) */
      var tr = cs.transform;
      if (tr && tr !== "none" && tr.indexOf("matrix") === 0) {
        var mm = tr.match(/matrix\(([^)]+)\)/);
        if (mm) {
          var mv = mm[1].split(",").map(parseFloat);
          var ang = Math.atan2(mv[1], mv[0]) * 180 / Math.PI;
          if (Math.abs(ang) > 0.5 && Math.abs(ang) < 180 && Math.abs(mv[0]) > 0.9) {
            gSelf.setAttribute("transform", "rotate(" + r1(ang) + " " + r1(rect.left + rect.width / 2) + " " + r1(ry + rect.height / 2) + ")");
          }
        }
      }

      var radii = clampR(radiiOf(cs, rect.width, rect.height), rect.width, rect.height);
      var x = rect.left, y = ry, w = rect.width, h = rect.height;

      /* box-shadow approximation (flat, soft-ish) */
      var sh = parseFirstShadow(cs.boxShadow);
      if (sh && sh.c.a > 0.01) {
        var pad = sh.blur * 0.7 + sh.spread;
        var sa = sh.c.a * 0.65;
        el("path", {
          d: rrectPath(x - pad + sh.ox, y - pad + sh.oy, w + pad * 2, h + pad * 2, radii.map(function (r) { return r + pad; })),
          fill: rgbStr(sh.c), "fill-opacity": r3(sa)
        }, gSelf);
      }

      /* conic-border ring approximation */
      if (node.classList && node.classList.contains("conic-border")) {
        var oR = radii.map(function (r) { return r + 2; });
        var outer = rrectPath(x - 2, y - 2, w + 4, h + 4, oR);
        var inner = rrectPath(x, y, w, h, radii);
        var cg = gradientDef("linear-gradient(90deg, #7d5be7 0%, #fa24ce 30%, #fd9a46 55%, #0091ff 100%)", { x: x, y: y, width: w, height: h }, "conic");
        if (cg) {
          var ring = el("path", { d: outer + " " + inner, fill: "url(#" + cg.id + ")", "fill-rule": "evenodd" }, gSelf);
        } else {
          el("path", { d: outer + " " + inner, fill: "#6647F0", "fill-rule": "evenodd" }, gSelf);
        }
      }

      /* background */
      var bgc = parseColor(cs.backgroundColor);
      if (bgc && bgc.a > 0.001) {
        el("path", { d: rrectPath(x, y, w, h, radii), fill: rgbStr(bgc), "fill-opacity": bgc.a < 1 ? r3(bgc.a) : null }, gSelf);
      }
      var bgi = cs.backgroundImage;
      if (bgi && bgi !== "none") {
        if (bgi.indexOf("linear-gradient") === 0) {
          var gd = gradientDef(bgi, { x: x, y: y, width: w, height: h }, "bg");
          if (gd) el("path", { d: rrectPath(x, y, w, h, radii), fill: "url(#" + gd.id + ")" }, gSelf);
        } else if (bgi.indexOf("conic-gradient") !== -1 && !node.classList.contains("conic-border")) {
          var gd2 = gradientDef("linear-gradient(90deg, #6647F0 0%, #0091FF 100%)", { x: x, y: y, width: w, height: h }, "bgc");
          if (gd2) el("path", { d: rrectPath(x, y, w, h, radii), fill: "url(#" + gd2.id + ")", "fill-opacity": 0.9 }, gSelf);
        }
      }

      /* borders */
      var bw = [parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderRightWidth) || 0, parseFloat(cs.borderBottomWidth) || 0, parseFloat(cs.borderLeftWidth) || 0];
      var bstyles = [cs.borderTopStyle, cs.borderRightStyle, cs.borderBottomStyle, cs.borderLeftStyle];
      var bcolors = [parseColor(cs.borderTopColor), parseColor(cs.borderRightColor), parseColor(cs.borderBottomColor), parseColor(cs.borderLeftColor)];
      var uniform = bw[0] > 0 && bw[0] === bw[1] && bw[1] === bw[2] && bw[2] === bw[3] &&
        bstyles[0] === bstyles[1] && bstyles[1] === bstyles[2] && bstyles[2] === bstyles[3] &&
        bcolors[0] && bcolors[1] && bcolors[2] && bcolors[3] &&
        rgbStr(bcolors[0]) === rgbStr(bcolors[1]) && rgbStr(bcolors[1]) === rgbStr(bcolors[2]) && rgbStr(bcolors[2]) === rgbStr(bcolors[3]);
      if (uniform && (bstyles[0] === "solid" || bstyles[0] === "dashed" || bstyles[0] === "dotted")) {
        var inset = bw[0] / 2;
        var bp = {
          d: rrectPath(x + inset, y + inset, w - bw[0], h - bw[0], radii.map(function (r) { return Math.max(0, r - inset); })),
          fill: "none", stroke: rgbStr(bcolors[0]), "stroke-width": r1(bw[0])
        };
        if (bcolors[0].a < 1) bp["stroke-opacity"] = r3(bcolors[0].a);
        if (bstyles[0] === "dashed") bp["stroke-dasharray"] = "6 4";
        if (bstyles[0] === "dotted") bp["stroke-dasharray"] = "1.5 3";
        el("path", bp, gSelf);
      } else {
        var sides = [
          { i: 0, px: x, py: y, pw: w, ph: bw[0] },
          { i: 2, px: x, py: y + h - bw[2], pw: w, ph: bw[2] },
          { i: 3, px: x, py: y, pw: bw[3], ph: h },
          { i: 1, px: x + w - bw[1], py: y, pw: bw[1], ph: h }
        ];
        for (var si = 0; si < sides.length; si++) {
          var S = sides[si];
          if (S.ph > 0 && S.pw > 0 && bcolors[S.i] && (bstyles[S.i] === "solid" || bstyles[S.i] === "dashed")) {
            var sa2 = { d: rrectPath(S.px, S.py, S.pw, S.ph, [0, 0, 0, 0]), fill: rgbStr(bcolors[S.i]) };
            if (bcolors[S.i].a < 1) sa2["fill-opacity"] = r3(bcolors[S.i].a);
            el("path", sa2, gSelf);
          }
        }
      }

      /* pseudo-elements (absolute-positioned decorative only) */
      emitPseudo(node, cs, rect, myDy, "::before", gSelf, clip, op);
      var afterAnchor = gSelf; // ::after appended after children below via late call

      /* children */
      var kidClip = clip;
      var ovX = cs.overflowX, ovY = cs.overflowY;
      if (ovX === "hidden" || ovX === "clip" || ovX === "auto" || ovX === "scroll" ||
          ovY === "hidden" || ovY === "clip" || ovY === "auto" || ovY === "scroll") {
        var cid = "clip" + (++uid);
        var cp = el("clipPath", { id: cid }, defs);
        el("path", { d: rrectPath(x, y, w, h, radii) }, cp);
        kidClip = cid;
      }
      var gKids = el("g", kidClip ? { "clip-path": "url(#" + kidClip + ")" } : {}, gSelf);

      var neg = [], auto = [], pos = [];
      var cn = node.childNodes;
      for (var i2 = 0; i2 < cn.length; i2++) {
        var ch = cn[i2];
        if (ch.nodeType === 3) {
          if (ch.nodeValue && /\S/.test(ch.nodeValue)) emitText(ch, node, cs, gKids, kidClip, myDy, op);
          continue;
        }
        if (ch.nodeType !== 1) continue;
        var kcs;
        try { kcs = getComputedStyle(ch); } catch (e) { continue; }
        if (kcs.display === "none" || kcs.visibility === "hidden") continue;
        var kp = kcs.position;
        if (kp === "absolute" || kp === "fixed") {
          var kz = parseInt(kcs.zIndex);
          if (kz < 0) neg.push(ch);
          else if (kz > 0) pos.push([kz, ch]);
          else auto.push(ch);
        } else {
          visit(ch, gKids, kidClip, myDy, op);
        }
      }
      var i3;
      for (i3 = 0; i3 < neg.length; i3++) visit(neg[i3], gSelf, kidClip, myDy, op);
      for (i3 = 0; i3 < auto.length; i3++) visit(auto[i3], gKids, kidClip, myDy, op);
      pos.sort(function (a, b) { return a[0] - b[0]; });
      for (i3 = 0; i3 < pos.length; i3++) visit(pos[i3][1], gKids, kidClip, myDy, op);

      /* form values */
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") emitFormValue(node, cs, rect, myDy, op, gKids, kidClip);

      emitPseudo(node, cs, rect, myDy, "::after", gSelf, clip, op);
    }

    /* --------------------------- pseudo elements -------------------------- */

    function emitPseudo(node, cs, rect, dy, which, parentDom, clip, op) {
      if (node.classList && node.classList.contains("conic-border") && which === "::before") return;
      var pcs;
      try { pcs = getComputedStyle(node, which); } catch (e) { return; }
      var content = pcs.content;
      if (!content || content === "none" || content === "normal" || content === '""' || content === "''") return;
      if (pcs.display === "none" || pcs.visibility === "hidden") return;
      if (pcs.position !== "absolute") return;

      var bt = parseFloat(cs.borderTopWidth) || 0, bl = parseFloat(cs.borderLeftWidth) || 0;
      var brW = parseFloat(cs.borderRightWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      var innerX = rect.left + bl, innerY = rect.top + dy + bt;
      var innerW = rect.width - bl - brW, innerH = rect.height - bt - bb;
      function pv(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
      var pw = pv(pcs.width), ph = pv(pcs.height);
      if (pw === null || ph === null || pw <= 0 || ph <= 0) return;
      var L = pv(pcs.left), T = pv(pcs.top), R = pv(pcs.right), B = pv(pcs.bottom);
      var px, py;
      if (L !== null) px = innerX + L; else if (R !== null) px = innerX + innerW - R - pw; else return;
      if (T !== null) py = innerY + T; else if (B !== null) py = innerY + innerH - B - ph; else return;

      var pradii = clampR(radiiOf(pcs, pw, ph), pw, ph);
      var pc = parseColor(pcs.backgroundColor);
      if (pc && pc.a > 0.001) {
        el("path", { d: rrectPath(px, py, pw, ph, pradii), fill: rgbStr(pc), "fill-opacity": pc.a < 1 ? r3(pc.a) : null }, parentDom);
      }
      var pbg = pcs.backgroundImage;
      if (pbg && pbg.indexOf("linear-gradient") === 0) {
        var gd = gradientDef(pbg, { x: px, y: py, width: pw, height: ph }, "ps");
        if (gd) el("path", { d: rrectPath(px, py, pw, ph, pradii), fill: "url(#" + gd.id + ")" }, parentDom);
      }
      var pbw = parseFloat(pcs.borderTopWidth) || 0;
      if (pbw > 0 && pcs.borderTopStyle !== "none") {
        var pbc = parseColor(pcs.borderTopColor);
        if (pbc) el("path", { d: rrectPath(px + pbw / 2, py + pbw / 2, pw - pbw, ph - pbw, pradii.map(function (r) { return Math.max(0, r - pbw / 2); })), fill: "none", stroke: rgbStr(pbc), "stroke-width": r1(pbw) }, parentDom);
      }
      var txtM = content.match(/^["'](.*)["']$/);
      if (txtM && txtM[1].trim()) {
        var size = parseFloat(pcs.fontSize) || 12;
        var tcol = parseColor(pcs.color) || { r: 32, g: 32, b: 32, a: 1 };
        var isAr = AR_RE.test(txtM[1]);
        el("text", {
          x: r1(px + pw / 2), y: r1(py + ph / 2 + size * 0.34),
          "font-family": pickFont(pcs.fontFamily, txtM[1]),
          "font-size": r1(size), "font-weight": pcs.fontWeight,
          fill: rgbStr(tcol), "fill-opacity": tcol.a < 1 ? r3(tcol.a * op) : null,
          "text-anchor": "middle", "dominant-baseline": "middle"
        }, parentDom).textContent = txtM[1];
      }
    }

    /* ------------------------------- text -------------------------------- */

    function emitText(textNode, parentEl, pcs, parentDom, clip, dy, op) {
      if (nodeBudget-- < 0) { aborted = true; return; }
      var raw = textNode.nodeValue;
      if (!raw || !/\S/.test(raw)) return;
      var ptag = parentEl.tagName;
      if (ptag === "SVG" || ptag === "svg") return;

      var cs = pcs;
      var words = [];
      var re = /\S+/g, m;
      while ((m = re.exec(raw))) {
        var rg = document.createRange();
        try { rg.setStart(textNode, m.index); rg.setEnd(textNode, m.index + m[0].length); } catch (e) { continue; }
        var rects = rg.getClientRects();
        if (!rects.length) continue;
        var L = Infinity, R = -Infinity, T = Infinity, B = -Infinity;
        for (var i = 0; i < rects.length; i++) {
          var q = rects[i];
          if (q.width < 0.2 || q.height < 2) continue;
          if (q.left < L) L = q.left; if (q.right > R) R = q.right;
          if (q.top < T) T = q.top; if (q.bottom > B) B = q.bottom;
        }
        if (R - L < 0.3) continue;
        words.push({ text: m[0], left: L, right: R, top: T, bottom: B });
      }
      if (!words.length) return;

      var size = parseFloat(cs.fontSize) || 14;
      words.sort(function (a, b) { return a.top - b.top; });
      var lines = [];
      for (var i2 = 0; i2 < words.length; i2++) {
        var wd = words[i2];
        var line = null;
        for (var j = 0; j < lines.length; j++) {
          if (Math.abs(lines[j].top - wd.top) < Math.max(3, size * 0.45)) { line = lines[j]; break; }
        }
        if (line) { line.words.push(wd); if (wd.bottom > line.bottom) line.bottom = wd.bottom; }
        else lines.push({ top: wd.top, bottom: wd.bottom, words: [wd] });
      }

      var dir = cs.direction || "rtl";
      var isArSample = AR_RE.test(raw);
      var family = pickFont(cs.fontFamily, raw);
      var weight = cs.fontWeight || "400";
      var color = parseColor(cs.color) || { r: 32, g: 32, b: 32, a: 1 };
      var ls = cs.letterSpacing && cs.letterSpacing !== "normal" ? parseFloat(cs.letterSpacing) : null;
      var deco = cs.textDecorationLine || "none";
      var tstyle = cs.fontStyle;
      var tt = cs.textTransform;

      for (var li = 0; li < lines.length; li++) {
        var ln = lines[li];
        var str = ln.words.map(function (w) { return w.text; }).join(" ");
        if (tt === "uppercase") str = str.toUpperCase();
        else if (tt === "lowercase") str = str.toLowerCase();
        else if (tt === "capitalize") str = str.replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
        var baseline = (ln.top + ln.bottom) / 2 + dy + size * 0.345;
        var anchorX, anchor;
        if (dir === "rtl") {
          /* middle anchor is immune to start/end flip semantics across renderers
             (browser honors direction:rtl where anchor end = LEFT edge — the bug) */
          var mn2 = Infinity, mx2 = -Infinity;
          for (var k = 0; k < ln.words.length; k++) {
            if (ln.words[k].right > mx2) mx2 = ln.words[k].right;
            if (ln.words[k].left < mn2) mn2 = ln.words[k].left;
          }
          anchorX = (mn2 + mx2) / 2; anchor = "middle";
        } else {
          var mn = Infinity;
          for (var k2 = 0; k2 < ln.words.length; k2++) if (ln.words[k2].left < mn) mn = ln.words[k2].left;
          anchorX = mn; anchor = "start";
        }
        var attrs = {
          x: r1(anchorX), y: r1(baseline),
          "font-family": family, "font-size": r1(size),
          fill: rgbStr(color),
          "text-anchor": anchor,
          "xml:space": "preserve"
        };
        if (weight !== "400") attrs["font-weight"] = String(weight);
        if (color.a < 1) attrs["fill-opacity"] = r3(color.a * op);
        if (ls !== null && Math.abs(ls) > 0.01) attrs["letter-spacing"] = r1(ls);
        if (deco.indexOf("underline") !== -1) attrs["text-decoration"] = "underline";
        else if (deco.indexOf("line-through") !== -1) attrs["text-decoration"] = "line-through";
        if (tstyle === "italic") attrs["font-style"] = "italic";
        if (dir === "rtl") attrs["direction"] = "rtl";
        var t = el("text", attrs, parentDom);
        t.textContent = str;
      }
    }

    /* ---------------------------- form controls --------------------------- */

    function emitFormValue(node, cs, rect, dy, op, parentDom, clip) {
      var val = "";
      var isPlaceholder = false;
      if (node.tagName === "SELECT") {
        val = node.selectedIndex >= 0 && node.options[node.selectedIndex] ? node.options[node.selectedIndex].text : "";
      } else {
        val = node.value || "";
        if (!val && node.placeholder) { val = node.placeholder; isPlaceholder = true; }
      }
      if (!val) return;
      if (node.type === "password") val = "\u2022".repeat(Math.min(val.length, 12));
      var size = parseFloat(cs.fontSize) || 14;
      var color;
      if (isPlaceholder) {
        try { color = parseColor(getComputedStyle(node, "::placeholder").color) || { r: 179, g: 179, b: 179, a: 1 }; } catch (e) { color = { r: 179, g: 179, b: 179, a: 1 }; }
      } else {
        color = parseColor(cs.color) || { r: 32, g: 32, b: 32, a: 1 };
      }
      var pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
      var blw = parseFloat(cs.borderLeftWidth) || 0, brw = parseFloat(cs.borderRightWidth) || 0;
      var dir = cs.direction || "rtl";
      var align = cs.textAlign || "start";
      var anchor = "start", ax;
      if (align === "center") { ax = rect.left + rect.width / 2; anchor = "middle"; }
      else if (dir === "rtl") {
        /* no direction attr here: ltr base keeps anchor=end = right edge in every renderer */
        ax = rect.right - brw - pr; anchor = "end";
        if (align === "left") { ax = rect.left + blw + pl; anchor = "start"; }
      } else {
        ax = rect.left + blw + pl; anchor = "start";
        if (align === "right") { ax = rect.right - brw - pr; anchor = "end"; }
      }
      var family = pickFont(cs.fontFamily, val);
      var lines = node.tagName === "TEXTAREA" ? val.split("\n") : [val];
      var lh = parseFloat(cs.lineHeight);
      if (!isFinite(lh) || lh < size) lh = size * 1.4;
      var startY = rect.top + dy + rect.height / 2 - (lines.length - 1) * lh / 2;
      for (var i = 0; i < lines.length; i++) {
        var t = el("text", {
          x: r1(ax), y: r1(startY + i * lh + size * 0.345),
          "font-family": family, "font-size": r1(size),
          "font-weight": cs.fontWeight === "400" ? null : cs.fontWeight,
          fill: rgbStr(color), "text-anchor": anchor,
          "fill-opacity": color.a < 1 ? r3(color.a * op) : null
        }, parentDom);
        t.textContent = lines[i];
      }
    }

    /* ---------------------------- nested <svg> ---------------------------- */

    function emitNestedSvg(svgEl, cs, rect, dy, op, clip, parentDom) {
      var clone = svgEl.cloneNode(true);
      var bad = clone.querySelectorAll("animate, animateTransform, animateMotion, set, script");
      for (var i = 0; i < bad.length; i++) bad[i].parentNode.removeChild(bad[i]);

      var all = [clone].concat([].slice.call(clone.querySelectorAll("*")));
      for (var j = 0; j < all.length; j++) {
        var n = all[j];
        if (n.removeAttribute) {
          n.removeAttribute("class");
          n.removeAttribute("style");
        }
        var cc;
        try { cc = getComputedStyle(n); } catch (e) { continue; }
        if (!cc) continue;
        var col = parseColor(cc.color) || { r: 32, g: 32, b: 32, a: 1 };
        if (n.getAttribute) {
          if (n.getAttribute("stroke") === "currentColor") n.setAttribute("stroke", rgbStr(col));
          if (n.getAttribute("fill") === "currentColor") n.setAttribute("fill", rgbStr(col));
          if (!n.getAttribute("fill")) {
            var f = cc.fill;
            if (f && f !== "none") n.setAttribute("fill", rgbStr(parseColor(f) || { r: 0, g: 0, b: 0, a: 1 }));
            else if (f === "none" && n.tagName.toLowerCase() !== "svg" && n.tagName.toLowerCase() !== "g" && n.tagName.toLowerCase() !== "defs" && n.tagName.toLowerCase() !== "clippath" && n.tagName.toLowerCase() !== "lineargradient") n.setAttribute("fill", "none");
          }
          if (!n.getAttribute("stroke")) {
            var s = cc.stroke;
            if (s && s !== "none") {
              n.setAttribute("stroke", rgbStr(parseColor(s) || { r: 0, g: 0, b: 0, a: 1 }));
              var sw = parseFloat(cc.strokeWidth);
              if (sw && sw > 0 && !n.getAttribute("stroke-width")) n.setAttribute("stroke-width", r1(sw));
              if (cc.strokeLinecap && cc.strokeLinecap !== "butt") n.setAttribute("stroke-linecap", cc.strokeLinecap);
              if (cc.strokeLinejoin && cc.strokeLinejoin !== "miter") n.setAttribute("stroke-linejoin", cc.strokeLinejoin);
            }
          }
          var da = cc.strokeDasharray;
          if (da && da !== "none" && !n.getAttribute("stroke-dasharray")) n.setAttribute("stroke-dasharray", da.replace(/,/g, " "));
        }
      }
      clone.removeAttribute("id");
      var defsIn = clone.querySelector("defs");
      /* hoist inner defs ids to avoid collisions */
      if (defsIn) {
        var innerIds = defsIn.querySelectorAll("[id]");
        for (var k = 0; k < innerIds.length; k++) {
          var oldId = innerIds[k].getAttribute("id");
          var newId = "is" + (++uid) + "_" + oldId;
          innerIds[k].setAttribute("id", newId);
          var uses = clone.querySelectorAll('[fill="url(#' + oldId + ')"], [stroke="url(#' + oldId + ')"], [clip-path="url(#' + oldId + ')"], [mask="url(#' + oldId + ')"]');
          for (var u = 0; u < uses.length; u++) {
            var uu = uses[u];
            ["fill", "stroke", "clip-path", "mask"].forEach(function (att) {
              var val = uu.getAttribute(att);
              if (val && val.indexOf("url(#" + oldId + ")") !== -1) uu.setAttribute(att, val.replace("url(#" + oldId + ")", "url(#" + newId + ")"));
            });
          }
          if (svgEl.querySelector('[href="#' + oldId + '"], [xlink\\:href="#' + oldId + '"]')) {
            /* keep href refs consistent */
            var hrefs = clone.querySelectorAll('[href="#' + oldId + '"]');
            for (var h2 = 0; h2 < hrefs.length; h2++) hrefs[h2].setAttribute("href", "#" + newId);
          }
        }
      }

      clone.setAttribute("x", r1(rect.left));
      clone.setAttribute("y", r1(rect.top + dy));
      clone.setAttribute("width", r1(rect.width));
      clone.setAttribute("height", r1(rect.height));
      if (!clone.getAttribute("viewBox")) clone.setAttribute("viewBox", "0 0 " + r1(rect.width) + " " + r1(rect.height));

      var g = el("g", {}, parentDom);
      if (op < 0.999) g.setAttribute("opacity", r3(op));
      if (clip) g.setAttribute("clip-path", "url(#" + clip + ")");
      var imported = doc.importNode(clone, true);
      g.appendChild(imported);
    }

    /* ------------------------------- start -------------------------------- */

    var bodyBG = parseColor(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    var htmlBG = parseColor(getComputedStyle(document.documentElement).backgroundColor);
    if (htmlBG && htmlBG.a > 0.9 && (bodyBG.a < 0.9)) bodyBG = htmlBG;
    el("rect", { x: 0, y: 0, width: Math.round(W), height: Math.round(H), fill: rgbStr(bodyBG) }, svg);

    var kids = [].slice.call(document.body.childNodes);
    var neg = [], auto = [], pos = [], flow = [];
    for (var i = 0; i < kids.length; i++) {
      var n = kids[i];
      if (n.nodeType === 3) { if (n.nodeValue && /\S/.test(n.nodeValue)) flow.push(n); continue; }
      if (n.nodeType !== 1) continue;
      var kcs;
      try { kcs = getComputedStyle(n); } catch (e) { continue; }
      if (kcs.display === "none" || kcs.visibility === "hidden") continue;
      if (kcs.position === "absolute" || kcs.position === "fixed") {
        var z = parseInt(kcs.zIndex);
        if (z < 0) neg.push(n); else if (z > 0) pos.push([z, n]); else auto.push(n);
      } else flow.push(n);
    }
    function visitTextTop(tn) {
      var parent = tn.parentElement;
      if (!parent) return;
      visit(parent.nodeType === 1 ? parent : document.body, svg, null, 0, 1);
    }
    for (var f = 0; f < flow.length; f++) {
      if (flow[f].nodeType === 3) {
        /* top-level stray text — wrap via its parent (body) is already covered; skip */
        continue;
      }
      visit(flow[f], svg, null, 0, 1);
    }
    for (var a = 0; a < neg.length; a++) visit(neg[a], svg, null, 0, 1);
    for (var au = 0; au < auto.length; au++) visit(auto[au], svg, null, 0, 1);
    pos.sort(function (x, y) { return x[0] - y[0]; });
    for (var p = 0; p < pos.length; p++) visit(pos[p][1], svg, null, 0, 1);

    var xml = new XMLSerializer().serializeToString(svg);
    return { xml: xml, width: Math.round(W), height: Math.round(H), aborted: aborted, nodes: uid };
  };
})();
