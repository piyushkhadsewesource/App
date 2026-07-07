// ─────────────────────────────────────────────────────────────────────────
// The Portal digest — composes the morning "state of us" for one recipient.
//
// Pure module on purpose: no firebase imports, so it can be executed and
// tested directly with plain node. The scheduled function in index.js feeds
// it raw docs; this decides what is worth saying. Quiet by default: if there
// is nothing real to say, it returns null and NO push is sent — the portal
// never nags.
// ─────────────────────────────────────────────────────────────────────────

const MOOD_PHRASE = {
  joyful: 'woke up joyful 😄',
  loved: 'was feeling loved 🥰',
  content: 'was feeling content 🙂',
  meh: 'was feeling meh 😐',
  tired: 'was running tired 🥱',
  stressed: 'was feeling stressed 😥',
  sad: 'was feeling low 😢',
  angry: 'was feeling frustrated 😤',
  sick: 'was feeling unwell 🤒',
  anxious: 'was feeling anxious 😟',
};

function minLabel(min) {
  const m = Math.max(0, Math.min(1439, Math.round(min)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** When the partner's last obligation of the day ends (same heuristic as the app). */
function freeAfter(items) {
  const iv = items
    .map((s) => ({
      start: s.startMin,
      end: s.endMin != null && s.endMin > s.startMin ? s.endMin : s.startMin + 60,
    }))
    .sort((a, b) => a.start - b.start);
  if (iv.length === 0) return null;
  return Math.min(1440, iv[iv.length - 1].end);
}

/**
 * Compose the digest for `recipientId`, or null when there's nothing real to
 * say. All inputs are plain doc arrays already filtered to this space.
 */
function composeDigest({
  recipientId,
  partnerId,
  partnerName,
  todayISO,
  yesterdayISO,
  nowMs,
  checkins = [],
  scheduleToday = [],
  canvasDoc = null,
  deckToday = [],
}) {
  const parts = [];

  // 1. How they were, most recently (today beats yesterday; skip if older).
  const recent = checkins
    .filter((c) => c.authorId === partnerId && (c.date === todayISO || c.date === yesterdayISO))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
  if (recent && MOOD_PHRASE[recent.mood]) {
    parts.push(`${partnerName} ${MOOD_PHRASE[recent.mood]}`);
  }

  // 2. When they come free today (only if they shared a day).
  const theirs = scheduleToday.filter((s) => s.authorId === partnerId && s.kind !== 'moment');
  const free = freeAfter(theirs);
  if (free != null && free < 1440) parts.push(`free after ${minLabel(free)}`);

  // 3. Something under the fog (they drew within the last ~20h).
  if (
    canvasDoc &&
    canvasDoc.updatedBy === partnerId &&
    typeof canvasDoc.updatedAt === 'number' &&
    nowMs - canvasDoc.updatedAt < 20 * 3600 * 1000
  ) {
    parts.push('something is waiting under the fog 🎨');
  }

  // 4. Tonight's Reveal: their answer is sealed, yours is missing.
  const theyAnswered = deckToday.some((d) => d.authorId === partnerId);
  const iAnswered = deckToday.some((d) => d.authorId === recipientId);
  if (theyAnswered && !iAnswered) parts.push('their sealed answer is waiting for yours ✉️');

  if (parts.length === 0) return null; // quiet by default — no empty nags

  return {
    title: 'Good morning 🤍',
    body: parts.slice(0, 3).join(' · '),
  };
}

module.exports = { composeDigest };
