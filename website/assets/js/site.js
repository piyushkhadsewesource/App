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

  /* ── Reveal on scroll ───────────────────────────────────────────────── */
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

  /* ── Waitlist ───────────────────────────────────────────────────────── */
  // Writes straight into the project's own Firestore over REST; the security
  // rules only allow validated create on /waitlist (see firestore.rules).
  var FIRESTORE_URL =
    'https://firestore.googleapis.com/v1/projects/tether-aee5d/databases/(default)/documents/waitlist' +
    '?key=AIzaSyCB8dbWzupXELEPxW0xLbDdbCdvR6_gAXk';
  var FALLBACK_EMAIL = 'riyaray.we@gmail.com';

  var form = document.getElementById('wl-form');
  var success = document.getElementById('wl-success');
  var errorBox = document.getElementById('wl-error');
  var submitBtn = document.getElementById('wl-submit');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.style.display = 'none';

    var email = form.email.value.trim();
    var cities = form.cities.value.trim();
    if (form.website.value) return; // honeypot: silently drop bots
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      showError('That email doesn’t look right. One more try?');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding you…';

    var fields = {
      email: { stringValue: email },
      source: { stringValue: 'launch-site' },
      createdAt: { timestampValue: new Date().toISOString() }
    };
    if (cities) fields.cities = { stringValue: cities.slice(0, 120) };

    fetch(FIRESTORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: fields })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.style.display = 'none';
        success.style.display = 'block';
        success.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      })
      .catch(function () {
        var subject = encodeURIComponent('Tether waitlist');
        var body = encodeURIComponent(
          'Hi Piyush and Riya, please add us to the Tether waitlist.\n\nEmail: ' +
          email + (cities ? '\nOur two cities: ' + cities : '')
        );
        showError(
          'We couldn’t reach the list just now. ' +
          '<a href="mailto:' + FALLBACK_EMAIL + '?subject=' + subject + '&body=' + body +
          '">Email us instead</a> and we’ll add you by hand.'
        );
        submitBtn.disabled = false;
        submitBtn.textContent = 'Join the waitlist';
      });
  });

  function showError(html) {
    errorBox.innerHTML = html;
    errorBox.style.display = 'block';
  }
})();
