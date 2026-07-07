// ─────────────────────────────────────────────────────────────────────────
// Tether web-push sender (Firebase Cloud Messaging).
//
// The app writes pings / SOS alerts / moments straight to Firestore. Native
// phones are notified client-side via Expo push (see src/services/push.ts).
// Browsers can't be sent to from the client (that needs a server key), so these
// Firestore-triggered functions do it: on each new doc, send a data-only web
// push to the OTHER partner's browser tokens (kind === 'fcm').
//
// Deploy:  firebase deploy --only functions
// (Requires the Blaze plan; Cloud Messaging itself is free.)
// ─────────────────────────────────────────────────────────────────────────
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();
setGlobalOptions({ maxInstances: 5 });

/**
 * Deliver a data-only web push to the partner's browser tokens, skipping the
 * author's own devices, and prune any tokens FCM reports as permanently dead.
 */
async function notifyPartner(spaceId, fromId, title, body, type) {
  if (!spaceId || !fromId) return;

  const db = getFirestore();
  const snap = await db.collection('spaces').doc(spaceId).collection('tokens').get();

  const targets = []; // { token, ref }
  snap.forEach((doc) => {
    const t = doc.data() || {};
    const owner = t.owner || doc.id; // legacy native docs have no `owner`
    if (t.kind === 'fcm' && typeof t.token === 'string' && t.token && owner !== fromId) {
      targets.push({ token: t.token, ref: doc.ref });
    }
  });
  if (targets.length === 0) return;

  // Data-only (no `notification` key) so the service worker renders exactly one
  // notification; a notification payload would show a second, duplicate one.
  const res = await getMessaging().sendEachForMulticast({
    tokens: targets.map((x) => x.token),
    data: { title: String(title), body: String(body), type: String(type || 'ping') },
    webpush: { headers: { Urgency: type === 'sos' ? 'high' : 'normal', TTL: '600' } },
  });

  const cleanups = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error && r.error.code;
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token' ||
      code === 'messaging/invalid-argument'
    ) {
      cleanups.push(targets[i].ref.delete().catch(() => {}));
    }
  });
  await Promise.all(cleanups);
}

const PING_TEXT = {
  hug: 'Sent you a hug 🤗',
  kiss: 'Sent you a kiss 💋',
  miss: 'Misses you 🥺',
  thinking: 'Is thinking of you 💭',
};

exports.onPing = onDocumentCreated('spaces/{spaceId}/pings/{pingId}', async (event) => {
  const d = event.data && event.data.data();
  if (!d) return;
  await notifyPartner(event.params.spaceId, d.fromId, 'Tether', PING_TEXT[d.type] || 'Is thinking of you 💭', 'ping');
});

exports.onAlert = onDocumentCreated('spaces/{spaceId}/alerts/{alertId}', async (event) => {
  const d = event.data && event.data.data();
  if (!d) return;
  const msg = d.message && String(d.message).trim();
  await notifyPartner(event.params.spaceId, d.fromId, '🆘 Emergency', msg || 'needs you right now.', 'sos');
});

exports.onMoment = onDocumentCreated('spaces/{spaceId}/moments/{momentId}', async (event) => {
  const d = event.data && event.data.data();
  if (!d) return;
  await notifyPartner(event.params.spaceId, d.authorId, 'Tether', 'Shared a new moment 📸', 'moment');
});

// ─── Calendar-link fetcher (ICS proxy) ──────────────────────────────────────
// Google/Apple "secret address" ICS feeds don't send CORS headers, so the web
// app can't read them directly. This tiny GET proxy fetches the feed server-
// side and hands the text back. Locked to https calendar hosts (no arbitrary
// URL fetching), response capped at 1 MB. v1 https function on purpose: it
// keeps the predictable URL shape the client builds from the project id.
const functionsV1 = require('firebase-functions/v1');

const ICS_HOST_ALLOW = [
  'calendar.google.com',
  'www.google.com',
  'p12-caldav.icloud.com',
  'caldav.icloud.com',
  'ical.icloud.com',
  'outlook.live.com',
  'outlook.office365.com',
];

exports.icsFetch = functionsV1.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  try {
    const raw = String(req.query.url || '');
    let url;
    try {
      url = new URL(raw);
    } catch {
      return res.status(400).send('bad url');
    }
    const hostOk =
      url.protocol === 'https:' &&
      ICS_HOST_ALLOW.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));
    if (!hostOk) return res.status(400).send('host not allowed');

    const upstream = await fetch(url.toString(), { redirect: 'follow' });
    if (!upstream.ok) return res.status(502).send('calendar fetch failed');
    const text = await upstream.text();
    if (text.length > 1_000_000) return res.status(413).send('calendar too large');
    if (!text.includes('BEGIN:VCALENDAR')) return res.status(422).send('not an ICS feed');
    res.set('Content-Type', 'text/calendar; charset=utf-8');
    return res.status(200).send(text);
  } catch (e) {
    console.error('[icsFetch]', e);
    return res.status(500).send('error');
  }
});

// ─── The Portal: morning "state of us" digest (zero-tap engagement) ─────────
// Every morning (08:00 IST), each partner's lock screen gets one warm line
// about the other: how they were feeling, when they come free today, whether
// something waits under the fog or a sealed answer waits for theirs. Composed
// by digest.js (pure, tested); quiet by default — nothing to say, no push.
// Browsers get FCM (via the existing service worker); Android gets Expo push.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { composeDigest } = require('./digest');

function istISO(offsetDays = 0) {
  // Date maths pinned to Asia/Kolkata regardless of function region.
  const ist = new Date(Date.now() + (5.5 * 60 + offsetDays * 24 * 60) * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

async function sendExpoPush(messages) {
  if (messages.length === 0) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch (e) {
    console.warn('[portal] expo push failed', e);
  }
}

exports.morningPortal = onSchedule(
  { schedule: '0 8 * * *', timeZone: 'Asia/Kolkata', maxInstances: 1 },
  async () => {
    const db = getFirestore();
    const today = istISO(0);
    const yesterday = istISO(-1);
    const nowMs = Date.now();

    // Find every space that can actually receive a push, via its token docs.
    const tokenSnap = await db.collectionGroup('tokens').get();
    const spaces = new Map(); // spaceId → [{ owner, kind, token }]
    tokenSnap.forEach((doc) => {
      const spaceId = doc.ref.parent.parent && doc.ref.parent.parent.id;
      if (!spaceId) return;
      const t = doc.data() || {};
      const owner = t.owner || doc.id;
      if (typeof t.token !== 'string' || !t.token) return;
      if (!spaces.has(spaceId)) spaces.set(spaceId, []);
      spaces.get(spaceId).push({ owner, kind: t.kind || 'expo', token: t.token });
    });

    for (const [spaceId, tokens] of spaces) {
      try {
        const ref = db.collection('spaces').doc(spaceId);
        const [checkinsSnap, scheduleSnap, canvasSnap, deckSnap, profilesSnap] = await Promise.all([
          ref.collection('checkins').where('date', '>=', yesterday).get(),
          ref.collection('schedule').where('date', '==', today).get(),
          ref.collection('canvas').doc('current').get(),
          ref.collection('deck').where('promptId', '==', `daily-${today}`).get(),
          ref.collection('profiles').get(),
        ]);
        const checkins = checkinsSnap.docs.map((d) => d.data());
        const scheduleToday = scheduleSnap.docs.map((d) => d.data());
        const canvasDoc = canvasSnap.exists ? canvasSnap.data() : null;
        const deckToday = deckSnap.docs.map((d) => d.data());

        // Members: everyone who owns a token, plus authors seen in data.
        const members = new Set(tokens.map((t) => t.owner));
        for (const c of checkins) if (c.authorId) members.add(c.authorId);
        for (const s of scheduleToday) if (s.authorId) members.add(s.authorId);

        const expoBatch = [];
        for (const recipient of new Set(tokens.map((t) => t.owner))) {
          const partnerId = [...members].find((m) => m !== recipient);
          if (!partnerId) continue; // a space of one: nothing to say yet
          const msg = composeDigest({
            recipientId: recipient,
            partnerId,
            // We deliberately don't know display names server-side (identity is
            // on-device); "Your love" keeps the voice without leaking anything.
            partnerName: 'Your love',
            todayISO: today,
            yesterdayISO: yesterday,
            nowMs,
            checkins,
            scheduleToday,
            canvasDoc,
            deckToday,
          });
          if (!msg) continue;
          for (const t of tokens.filter((t) => t.owner === recipient)) {
            if (t.kind === 'fcm') {
              try {
                await getMessaging().send({
                  token: t.token,
                  data: { title: msg.title, body: msg.body, type: 'digest' },
                });
              } catch (e) {
                console.warn('[portal] fcm send failed', e && e.code);
              }
            } else if (t.token.startsWith('ExponentPushToken')) {
              expoBatch.push({ to: t.token, title: msg.title, body: msg.body, data: { type: 'digest' }, sound: 'default' });
            }
          }
        }
        await sendExpoPush(expoBatch);
      } catch (e) {
        console.warn(`[portal] space ${spaceId} failed`, e);
      }
    }
  },
);
