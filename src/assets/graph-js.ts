export const GRAPH_JS = `(function () {
  var dataEl = document.getElementById("graph-data");
  var canvas = document.getElementById("kennisweb") || document.getElementById("graaf");
  var empty = document.getElementById("kennisweb-leeg") || document.getElementById("graaf-leeg");
  if (!dataEl || !canvas || !canvas.getContext) return;
  var data = JSON.parse(dataEl.textContent || '{"nodes":[],"edges":[]}');
  var nodes = data.nodes || [];
  var edges = data.edges || [];
  if (!nodes.length) {
    if (empty) empty.hidden = false;
    canvas.hidden = true;
    return;
  }

  var params = new URLSearchParams(location.search);
  var focus = params.get("focus") || "";
  var filterType = params.get("type") || "all";
  var ctx = canvas.getContext("2d");
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var W = 0, H = 0;
  var scale = 1, panX = 0, panY = 0;
  var drag = null;
  var panning = null;
  var hover = null;

  var colors = {
    bg: "#f8f9fa",
    line: "#dadce0",
    lime: "#188038",
    white: "#202124",
    mid: "#5f6368",
    lo: "#80868b",
    surface: "#ffffff",
    dim: "rgba(24,128,56,0.12)"
  };

  function visible(node) {
    if (filterType === "all") return true;
    return node.type === filterType || node.type === "article";
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(320, rect.width);
    H = Math.max(280, rect.height || 420);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  nodes.forEach(function (n, i) {
    var a = (i / nodes.length) * Math.PI * 2;
    n.x = Math.cos(a) * 180;
    n.y = Math.sin(a) * 140;
    n.vx = 0;
    n.vy = 0;
  });

  var byId = {};
  nodes.forEach(function (n) { byId[n.id] = n; });

  function radius(n) {
    if (n.type === "dienst") return 10;
    if (n.type === "article") return 7;
    return 5;
  }

  function step() {
    var i, j, a, b, dx, dy, dist, f;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        dx = a.x - b.x;
        dy = a.y - b.y;
        dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
        f = 900 / (dist * dist);
        a.vx += (dx / dist) * f;
        a.vy += (dy / dist) * f;
        b.vx -= (dx / dist) * f;
        b.vy -= (dy / dist) * f;
      }
    }
    for (i = 0; i < edges.length; i++) {
      var e = edges[i];
      a = byId[e.source];
      b = byId[e.target];
      if (!a || !b) continue;
      dx = b.x - a.x;
      dy = b.y - a.y;
      dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      f = (dist - 90) * 0.01;
      a.vx += (dx / dist) * f;
      a.vy += (dy / dist) * f;
      b.vx -= (dx / dist) * f;
      b.vy -= (dy / dist) * f;
    }
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      if (drag && drag.id === a.id) continue;
      a.vx = (a.vx - a.x * 0.002) * 0.86;
      a.vy = (a.vy - a.y * 0.002) * 0.86;
      a.x += a.vx;
      a.y += a.vy;
    }
  }

  function toWorld(mx, my) {
    return { x: (mx - W / 2 - panX) / scale, y: (my - H / 2 - panY) / scale };
  }

  function hit(mx, my) {
    var p = toWorld(mx, my);
    var best = null, bestD = 16;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!visible(n)) continue;
      var dx = n.x - p.x, dy = n.y - p.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < radius(n) + 6 && d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
  }

  function draw() {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2 + panX, H / 2 + panY);
    ctx.scale(scale, scale);

    var fi = focus ? "article:" + focus : "";
    var neighbors = {};
    if (fi) {
      neighbors[fi] = true;
      edges.forEach(function (e) {
        if (e.source === fi) neighbors[e.target] = true;
        if (e.target === fi) neighbors[e.source] = true;
      });
    }

    edges.forEach(function (e) {
      var a = byId[e.source], b = byId[e.target];
      if (!a || !b || !visible(a) || !visible(b)) return;
      var hot = !fi || neighbors[e.source] || neighbors[e.target];
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = hot && (e.type === "wikilink" || (fi && hot)) ? colors.lime : colors.line;
      ctx.globalAlpha = fi && !hot ? 0.18 : 0.9;
      ctx.lineWidth = e.type === "wikilink" ? 1.5 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    nodes.forEach(function (n) {
      if (!visible(n)) return;
      var hot = !fi || neighbors[n.id] || n.id === fi;
      ctx.globalAlpha = fi && !hot ? 0.2 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, radius(n), 0, Math.PI * 2);
      if (n.type === "tag") {
        ctx.fillStyle = colors.lime;
        ctx.strokeStyle = colors.lime;
      } else if (n.type === "dienst") {
        ctx.fillStyle = colors.bg;
        ctx.strokeStyle = colors.lime;
      } else if (n.type === "category") {
        ctx.fillStyle = colors.surface;
        ctx.strokeStyle = colors.lo;
      } else {
        ctx.fillStyle = n.id === fi || n === hover ? colors.lime : colors.surface;
        ctx.strokeStyle = n.id === fi || n === hover ? colors.lime : colors.white;
      }
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = n.type === "tag" || n.id === fi || n === hover ? "#ffffff" : colors.mid;
      if (n.type === "dienst") ctx.fillStyle = colors.lime;
      if (n.type === "tag") ctx.fillStyle = "#188038";
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(n.label.length > 28 ? n.label.slice(0, 26) + "…" : n.label, n.x, n.y + radius(n) + 12);
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  function loop() {
    for (var i = 0; i < 2; i++) step();
    draw();
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointerdown", function (ev) {
    var n = hit(ev.offsetX, ev.offsetY);
    if (n) {
      drag = n;
      canvas.setPointerCapture(ev.pointerId);
    } else {
      panning = { x: ev.offsetX - panX, y: ev.offsetY - panY };
    }
  });
  canvas.addEventListener("pointermove", function (ev) {
    if (drag) {
      var p = toWorld(ev.offsetX, ev.offsetY);
      drag.x = p.x;
      drag.y = p.y;
      drag.vx = 0;
      drag.vy = 0;
    } else if (panning) {
      panX = ev.offsetX - panning.x;
      panY = ev.offsetY - panning.y;
    } else {
      hover = hit(ev.offsetX, ev.offsetY);
      canvas.style.cursor = hover ? "pointer" : "grab";
    }
  });
  canvas.addEventListener("pointerup", function (ev) {
    if (drag && hover && hover.id === drag.id) {
      if (drag.href) location.href = drag.href;
    }
    drag = null;
    panning = null;
  });
  canvas.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    scale = Math.min(2.4, Math.max(0.4, scale * (ev.deltaY > 0 ? 0.92 : 1.08)));
  }, { passive: false });

  window.addEventListener("resize", resize);
  document.querySelectorAll("details").forEach(function (el) {
    el.addEventListener("toggle", function () {
      if (el.open) resize();
    });
  });
  resize();
  loop();
})();
`;
