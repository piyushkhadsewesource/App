/* Tether launch site. No dependencies. */
(function () {
  'use strict';

  /* ── Mobile nav ─────────────────────────────────────────────────────── */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Staggered reveals ──────────────────────────────────────────────── */
  // Children of a [data-stagger] container fade in one after another; the
  // delay rides the CSS var --d so reduced-motion users never see it.
  document.querySelectorAll('[data-stagger]').forEach(function (parent) {
    var i = 0;
    parent.querySelectorAll('.reveal').forEach(function (el) {
      el.style.setProperty('--d', (i * 80) + 'ms');
      i += 1;
    });
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Nav elevation once the page is scrolled ────────────────────────── */
  var nav = document.querySelector('.nav');
  if (nav && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ── Hero: pointer-tracked tilt and glow (fine pointers only) ───────── */
  var hero = document.querySelector('.hero');
  var heroPhone = document.querySelector('.hero-phone');
  var heroGlow = document.querySelector('.hero-glow');
  if (hero && heroPhone && !reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      heroPhone.style.setProperty('--tx', (x * 7).toFixed(2) + 'deg');
      heroPhone.style.setProperty('--ty', (-y * 5).toFixed(2) + 'deg');
      if (heroGlow) {
        heroGlow.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
        heroGlow.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
      }
    });
    hero.addEventListener('pointerleave', function () {
      heroPhone.style.setProperty('--tx', '0deg');
      heroPhone.style.setProperty('--ty', '0deg');
    });
  }

  var revealed = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealed.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    revealed.forEach(function (el) { io.observe(el); });
  }
})();
