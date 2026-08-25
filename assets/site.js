/* diffuse-systems.com
 *
 * First party, no dependencies, no tracking. Everything here is optional: the
 * pages read and work with scripting off, and every animation stops when the
 * visitor has asked for reduced motion.
 *
 * **One animation loop for the whole page.** The previous version ran four
 * independent requestAnimationFrame loops, each rebuilding its gradients every
 * frame. This one draws a single background canvas and lets CSS do the rest,
 * which is both faster and the reason the flow can continue past the hero. */

(function () {
  'use strict';

  var html = document.documentElement;
  html.classList.add('js');

  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Navigation ──────────────────────────────────────────────────────── */

  var nav = document.querySelector('.nav');
  if (nav) {
    var settle = function () { nav.classList.toggle('is-stuck', window.scrollY > 20); };
    window.addEventListener('scroll', settle, { passive: true });
    settle();
  }

  /* ── Reveal on arrival ───────────────────────────────────────────────────
     Everything marked `.reveal` on every page, with a stagger inside a group so
     a row of cards arrives as a row rather than all at once. */

  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if (calm || !('IntersectionObserver' in window)) {
      reveals.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var seen = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var delay = parseInt(el.dataset.delay || '0', 10);
          setTimeout(function () { el.classList.add('is-in'); }, delay);
          seen.unobserve(el);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      reveals.forEach(function (el) { seen.observe(el); });
    }
  }

  /* ── Pointer light ───────────────────────────────────────────────────────
     The script sets two custom properties; the stylesheet draws. That keeps the
     work on the compositor and the logic in three lines. */

  if (!calm) {
    document.querySelectorAll('.tile, .figure, .card, .dl__row').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      });
    });
  }

  /* ── Counters ────────────────────────────────────────────────────────── */

  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var counted = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        counted.unobserve(entry.target);
        var el = entry.target;
        var to = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        if (calm) { el.textContent = to + suffix; return; }
        var started = null;
        var step = function (now) {
          if (!started) started = now;
          var k = Math.min((now - started) / 1200, 1);
          var value = to * (1 - Math.pow(1 - k, 3));
          el.textContent = (to % 1 ? value.toFixed(1) : Math.round(value)) + suffix;
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { counted.observe(el); });
  }

  /* ── The ground ──────────────────────────────────────────────────────────
     Ribbons of light drifting across the whole page, with motes carried along
     them. Three things make it cheap enough to run under every page:

       * one loop, one canvas, one clear per frame;
       * gradients built once per resize rather than per frame, which was most
         of the cost before;
       * a scroll offset applied to the drawing rather than a second layer, so
         the flow moves with the page without a second surface to composite. */

  var canvas = document.querySelector('.ground canvas');
  if (!canvas || calm) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var ribbons = [];
  var motes = [];
  var w = 0;
  var h = 0;
  var raf = null;
  var t0 = 0;
  var scroll = 0;

  var PALETTE = [
    [53, 205, 240],
    [122, 162, 255],
    [70, 190, 220],
    [255, 196, 107]
  ];

  function build() {
    // One buffer pixel per CSS pixel, and not more.
    //
    // Measured rather than assumed, on this page, three ways: at devicePixelRatio
    // it costs 15 fps against the same page with the canvas removed; drawn at 60%
    // and stretched it costs *more*, because filtering the upscale every frame
    // beats what the smaller buffer saves; at 1:1 it costs the least. What
    // remains is compositing a fixed full-viewport layer with additive blending,
    // which is the effect itself.
    //
    // Those numbers come from a headless browser with no GPU compositor. On a
    // machine with one this is cheaper, and the honest statement is that this is
    // the floor rather than the typical case.
    var ratio = 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Fewer ribbons on a small viewport: the density that reads well at 1600px
    // is noise at 900.
    var count = w > 1400 ? 13 : w > 900 ? 9 : 6;
    ribbons = [];
    for (var i = 0; i < count; i++) {
      var k = i / count;
      var colour = PALETTE[i % PALETTE.length];
      // Warm is rare, the way one accent stays an accent.
      if (colour[0] === 255 && i % 7 !== 0) colour = PALETTE[0];
      ribbons.push({
        x0: (-0.25 + k * 0.2) * w,
        y0: (-0.25 + k * 0.5) * h,
        x1: (1.05 + k * 0.35) * w,
        y1: (0.35 + k * 1.1) * h,
        bow: (0.2 + k * 0.55) * h,
        phase: Math.random() * Math.PI * 2,
        speed: 0.1 + Math.random() * 0.22,
        width: 0.6 + Math.random() * 1.9,
        alpha: 0.1 + Math.random() * 0.3,
        c: colour,
        grad: null
      });
    }

    motes = [];
    var moteCount = Math.min(Math.round((w * h) / 22000), 70);
    for (var m = 0; m < moteCount; m++) {
      motes.push({
        r: Math.floor(Math.random() * ribbons.length),
        at: Math.random(),
        speed: 0.00012 + Math.random() * 0.00042,
        size: Math.random() * 1.3 + 0.3,
        warm: Math.random() < 0.18
      });
    }
  }

  function point(r, u, time) {
    var wob = Math.sin(time * r.speed + r.phase) * 0.15 + 1;
    var cx1 = r.x0 + (r.x1 - r.x0) * 0.32;
    var cy1 = r.y0 - r.bow * wob;
    var cx2 = r.x0 + (r.x1 - r.x0) * 0.7;
    var cy2 = r.y1 + r.bow * 0.3 * wob;
    var v = 1 - u;
    return {
      x: v * v * v * r.x0 + 3 * v * v * u * cx1 + 3 * v * u * u * cx2 + u * u * u * r.x1,
      y: v * v * v * r.y0 + 3 * v * v * u * cy1 + 3 * v * u * u * cy2 + u * u * u * r.y1
    };
  }

  function gradientFor(r) {
    if (r.grad) return r.grad;
    var a = point(r, 0, 0);
    var b = point(r, 1, 0);
    var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    var c = 'rgba(' + r.c[0] + ',' + r.c[1] + ',' + r.c[2] + ',';
    g.addColorStop(0, c + '0)');
    g.addColorStop(0.25, c + r.alpha + ')');
    g.addColorStop(0.65, c + r.alpha * 0.85 + ')');
    g.addColorStop(1, c + '0)');
    r.grad = g;
    return g;
  }

  function frame(now) {
    if (!t0) t0 = now;
    var time = (now - t0) / 1000;

    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // The flow drifts upward as the page goes down, at a fraction of the
    // scroll: the light lags behind the content rather than travelling with it.
    var lift = scroll * 0.06;

    for (var i = 0; i < ribbons.length; i++) {
      var r = ribbons[i];
      ctx.beginPath();
      for (var s = 0; s <= 18; s++) {
        var pt = point(r, s / 18, time);
        if (s === 0) ctx.moveTo(pt.x, pt.y - lift);
        else ctx.lineTo(pt.x, pt.y - lift);
      }
      ctx.strokeStyle = gradientFor(r);
      ctx.lineWidth = r.width;
      ctx.stroke();
    }

    for (var m = 0; m < motes.length; m++) {
      var mo = motes[m];
      mo.at += mo.speed;
      if (mo.at > 1) mo.at -= 1;
      var rb = ribbons[mo.r];
      if (!rb) continue;
      var pp = point(rb, mo.at, time);
      var fade = Math.sin(mo.at * Math.PI);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y - lift + Math.sin(mo.at * 20 + mo.r) * 8, mo.size, 0, Math.PI * 2);
      ctx.fillStyle = mo.warm
        ? 'rgba(255, 214, 150, ' + (0.45 * fade).toFixed(3) + ')'
        : 'rgba(190, 236, 255, ' + (0.55 * fade).toFixed(3) + ')';
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }

  build();
  raf = requestAnimationFrame(frame);

  var pendingScroll = false;
  window.addEventListener('scroll', function () {
    if (pendingScroll) return;
    pendingScroll = true;
    requestAnimationFrame(function () {
      scroll = window.scrollY;
      pendingScroll = false;
    });
  }, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  });

  // Nothing is drawn for a tab nobody is looking at.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      t0 = 0;
      raf = requestAnimationFrame(frame);
    }
  });
})();
