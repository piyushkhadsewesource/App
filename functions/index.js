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
