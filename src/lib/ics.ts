// ─────────────────────────────────────────────────────────────────────────
// Minimal ICS (iCalendar) reader for the calendar-link import.
//
// Scope is deliberately small: timed VEVENTs inside a short window (we import
// a week of busy blocks, not a calendar archive). Honest limitations, stated:
//   · All-day events (VALUE=DATE) are skipped — they aren't call-blocking busy
//     time in the sense Our Day cares about.
//   · TZID-stamped times are read as the phone's local wall-clock time. For a
//     couple importing their OWN calendar on their OWN phone (same tz as their
//     meetings), this is right in practice; cross-tz edge cases may drift.
//   · Recurrence: FREQ=DAILY and FREQ=WEEKLY (with INTERVAL / BYDAY / UNTIL /
//     COUNT approximated, EXDATE honoured) — the shapes work calendars are
//     made of. Exotic RRULEs (monthly-by-position etc.) import their first
//     occurrence only if it falls in the window.
// ─────────────────────────────────────────────────────────────────────────

export interface IcsBusyBlock {
  date: string; // YYYY-MM-DD (local)
  startMin: number;
  endMin: number;
  title: string;
  extId: string; // uid + occurrence start, stable across re-imports
}

const DAY_MS = 86_400_000;
const WD = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** RFC 5545 line unfolding: a line starting with space/tab continues the previous. */
function unfold(text: string): string[] {
  const raw = text.split(/\r\n|\n|\r/);
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Parse an ICS date-time. Returns null for all-day (VALUE=DATE) values. */
function parseWhen(value: string, params: string): Date | null {
  if (/VALUE=DATE(;|$)/.test(params) || /^\d{8}$/.test(value)) return null; // all-day
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (z === 'Z') return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  // TZID or floating: read as local wall-clock (see header note).
  return new Date(+y, +mo - 1, +d, +h, +mi, +s);
}

function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface RawEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date | null;
  rrule: string | null;
  exdates: Set<string>; // time-keys of excluded occurrences
}

function timeKey(d: Date): string {
  return `${isoLocal(d)}T${d.getHours()}:${d.getMinutes()}`;
}

function parseEvents(text: string): RawEvent[] {
  const lines = unfold(text);
  const events: RawEvent[] = [];
  let cur: Partial<RawEvent> & { exdates: Set<string> } = { exdates: new Set() };
  let inEvent = false;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      cur = { exdates: new Set() };
      continue;
    }
    if (line === 'END:VEVENT') {
      inEvent = false;
      if (cur.start) {
        events.push({
          uid: cur.uid ?? `noid-${cur.start.getTime()}`,
          summary: cur.summary ?? 'Busy',
          start: cur.start,
          end: cur.end ?? null,
          rrule: cur.rrule ?? null,
          exdates: cur.exdates,
        });
      }
      continue;
    }
    if (!inEvent) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const head = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [prop, ...paramParts] = head.split(';');
    const params = paramParts.join(';');
    switch (prop) {
      case 'UID':
        cur.uid = value.trim();
        break;
      case 'SUMMARY':
        cur.summary = value.replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\n/g, ' ').trim();
        break;
      case 'DTSTART':
        cur.start = parseWhen(value.trim(), params) ?? undefined;
        break;
      case 'DTEND':
        cur.end = parseWhen(value.trim(), params);
        break;
      case 'RRULE':
        cur.rrule = value.trim();
        break;
      case 'EXDATE':
        for (const v of value.split(',')) {
          const d = parseWhen(v.trim(), params);
          if (d) cur.exdates.add(timeKey(d));
        }
        break;
    }
  }
  return events;
}

/** Expand one event's occurrence STARTS inside [from, to]. */
function occurrences(ev: RawEvent, from: Date, to: Date): Date[] {
  if (!ev.rrule) {
    return ev.start >= from && ev.start <= to ? [ev.start] : [];
  }
  const rule: Record<string, string> = {};
  for (const part of ev.rrule.split(';')) {
    const [k, v] = part.split('=');
    if (k && v) rule[k.toUpperCase()] = v.toUpperCase();
  }
  const freq = rule.FREQ;
  const interval = Math.max(1, parseInt(rule.INTERVAL ?? '1', 10) || 1);
  const until = rule.UNTIL ? parseWhen(rule.UNTIL, '') : null;
  const count = rule.COUNT ? parseInt(rule.COUNT, 10) : null;
  const hardEnd = until && until < to ? until : to;

  const out: Date[] = [];
  const push = (d: Date) => {
    if (d >= from && d <= hardEnd && !ev.exdates.has(timeKey(d))) out.push(d);
  };

  if (freq === 'DAILY') {
    let n = 0;
    for (let t = ev.start.getTime(); t <= hardEnd.getTime(); t += interval * DAY_MS) {
      n++;
      if (count && n > count) break;
      push(new Date(t));
      if (out.length > 60) break; // runaway guard
    }
    return out;
  }
  if (freq === 'WEEKLY') {
    const byday = (rule.BYDAY ? rule.BYDAY.split(',') : [WD[ev.start.getDay()]])
      .map((d) => WD.indexOf(d.replace(/^[+-]?\d+/, '')))
      .filter((i) => i >= 0);
    // Walk week by week from the event's start week (COUNT approximated: each
    // listed weekday inside a counted week consumes one occurrence).
    let produced = 0;
    const startWeek = new Date(ev.start);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay()); // its Sunday
    for (let w = 0; ; w += interval) {
      const weekStart = new Date(startWeek.getTime() + w * 7 * DAY_MS);
      if (weekStart.getTime() > hardEnd.getTime()) break;
      for (const dow of byday) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + dow);
        d.setHours(ev.start.getHours(), ev.start.getMinutes(), ev.start.getSeconds(), 0);
        if (d < ev.start) continue;
        produced++;
        if (count && produced > count) return out;
        push(d);
        if (out.length > 60) return out;
      }
    }
    return out;
  }
  // Unsupported FREQ: keep the seed occurrence if it lands in the window.
  return ev.start >= from && ev.start <= to ? [ev.start] : [];
}

/**
 * The one public entry point: ICS text → busy blocks for [fromDate..toDate]
 * (local ISO dates, inclusive), sorted, capped, multi-day events clipped to
 * their first day (a red-eye flight blocks the evening it starts).
 */
export function icsToBusyBlocks(text: string, fromISO: string, toISO: string): IcsBusyBlock[] {
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T23:59:59`);
  const blocks: IcsBusyBlock[] = [];
  for (const ev of parseEvents(text)) {
    const durMs = ev.end && ev.end > ev.start ? ev.end.getTime() - ev.start.getTime() : 3600_000;
    for (const occ of occurrences(ev, from, to)) {
      const end = new Date(occ.getTime() + durMs);
      const startMin = occ.getHours() * 60 + occ.getMinutes();
      const sameDay = isoLocal(end) === isoLocal(occ);
      const endMin = sameDay ? end.getHours() * 60 + end.getMinutes() : 1439;
      if (endMin <= startMin) continue;
      blocks.push({
        date: isoLocal(occ),
        startMin,
        endMin,
        title: ev.summary,
        extId: `${ev.uid}@${occ.getTime()}`,
      });
    }
  }
  blocks.sort((a, b) => (a.date === b.date ? a.startMin - b.startMin : a.date < b.date ? -1 : 1));
  return blocks.slice(0, 120);
}
