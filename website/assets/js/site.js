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
