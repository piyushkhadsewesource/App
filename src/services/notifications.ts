// ─────────────────────────────────────────────────────────────────────────
// Smart, customizable daily photo reminders (local notifications).
//
// Each phone reminds its own owner to share a photo. Times are user-chosen.
// "Smart": we schedule a rolling window of one-off reminders and skip any day
// the user has already posted, so you are not nagged once you have shared.
// The window is re-scheduled on launch and whenever your posted days change.
// ─────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ensureNotificationPermission, hasNotificationPermission } from './permission';
import { nextOccurrence } from '../lib/occasions';

const CONFIG_KEY = '@tether/reminders.v2';
const LEGACY_KEY = '@tether/reminders';
const CHANNEL_ID = 'daily-moments';
const WINDOW_DAYS = 8;
const supported = Platform.OS !== 'web';

// iOS silently caps an app at 64 pending local notifications and drops the
// overflow. With up to 6 photo times over an 8-day window (48), plus plan
// reminders, occasions and letters, a normal config can blow past it. Keep a
// safe ceiling and let each scheduler claim only the budget still free, so the
// newest reminders never vanish without a trace.
const MAX_PENDING = 58;

/** How many notifications we currently have scheduled (0 on any failure). */
async function pendingCount(): Promise<number> {
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}

/** Remaining headroom under the ceiling for a scheduler about to run. */
async function remainingBudget(): Promise<number> {
  return Math.max(0, MAX_PENDING - (await pendingCount()));
}

// Daily "plan your day" reminders for the shared timetable.
const PLAN_CHANNEL = 'daily-plan';
const PLAN_KEY = '@tether/planReminder'; // legacy on/off flag (migrated)
const PLAN_CONFIG_KEY = '@tether/planReminder.v2';

export interface ReminderTime {
  hour: number;
  minute: number;
}
export interface ReminderConfig {
  enabled: boolean;
  times: ReminderTime[];
}

export const DEFAULT_TIMES: ReminderTime[] = [
  { hour: 9, minute: 0 },
  { hour: 14, minute: 0 },
  { hour: 20, minute: 0 },
];

export const remindersSupported = supported;

export function formatTime(t: ReminderTime): string {
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const ampm = t.hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(t.minute).padStart(2, '0')} ${ampm}`;
}

if (supported) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.warn('[tether] notification handler setup failed', e);
  }
}

export async function getReminderConfig(): Promise<ReminderConfig> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      if (Array.isArray(c.times) && c.times.length) {
        return { enabled: !!c.enabled, times: c.times };
      }
    }
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy === '1') return { enabled: true, times: DEFAULT_TIMES };
  } catch {
    /* ignore */
  }
  // On by default: the moment reminders are part of the core experience.
  return { enabled: true, times: DEFAULT_TIMES };
}

async function saveConfig(cfg: ReminderConfig) {
  await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

async function ensureChannel(id: string = CHANNEL_ID, name: string = 'Daily moments') {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(id, {
      name,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function reminderBody(who: string, seed: number): string {
  const lines = [
    `Snap today's moment and share it with ${who}.`,
    `${who} would love a glimpse of your day. Share a photo.`,
    `One photo keeps your shared gallery and your streak alive.`,
    `What does your world look like right now? Show ${who}.`,
    `A picture says what texts can't. Send ${who} a moment.`,
    `Capture something small and ordinary for ${who} today.`,
    `${who} is out there missing you. Send a photo.`,
    `Your day through your eyes, ${who} would treasure it.`,
    `Even a photo of your coffee counts. Share it.`,
    `Give ${who} a little window into today.`,
    `One moment, one tap, and ${who} will smile.`,
    `What made you pause today? Photograph it for ${who}.`,
    `Keep the distance small. Share a photo with ${who}.`,
    `${who} wants the boring beautiful details. Send one.`,
    `A year from now you'll be glad you captured today.`,
    `Show ${who} the sky where you are right now.`,
    `Tiny daily photo, big daily closeness. Share it.`,
    `Let ${who} see what you're up to.`,
    `Don't let today go undocumented. Snap it for ${who}.`,
    `Your face, your street, your lunch, ${who} wants all of it.`,
    `Send ${who} proof that you thought of them today.`,
    `A photo is a little "wish you were here." Send it.`,
    `Make ${who}'s day with one quick picture.`,
    `What's in front of you right now? ${who} would love to know.`,
    `Keep your streak glowing, share today's moment.`,
    `${who} checks the gallery for you. Give them something.`,
    `Capture the light wherever you are, for ${who}.`,
    `One snapshot of your today, for the two of you.`,
    `The smallest moment shared beats the best one kept.`,
    `Photograph the thing that made you think of ${who}.`,
    `${who} is only a photo away from your day.`,
    `Add today to your shared story with one picture.`,
    `Show ${who} something they'd never see otherwise.`,
    `A quiet moment? Capture it and send it to ${who}.`,
    `Your day deserves a place in the gallery. Share it.`,
    `${who} would love to see your smile right now.`,
    `Bring ${who} along for a second, snap a photo.`,
    `Distance shrinks one shared photo at a time.`,
    `What's the view from where you're sitting? Send it.`,
    `Give ${who} a reason to grin at their phone today.`,
    `Today only happens once. Save a piece for ${who}.`,
    `A photo now keeps ${who} close tonight.`,
    `Let your day speak to ${who} in pictures.`,
    `Even the ordinary is special when ${who} sees it.`,
    `Snap it before the moment passes, ${who} is waiting.`,
    `Your little corner of the world, shared with ${who}.`,
    `Make today findable later, capture it for ${who}.`,
    `One tap to feel close to ${who}. Share a photo.`,
  ];
  return lines[((seed % lines.length) + lines.length) % lines.length];
}

/** Cancel only the scheduled notifications we tagged with a given kind. */
async function cancelKind(kind: string) {
  try {
    const all = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      all
        .filter((n) => (n.content?.data as Record<string, unknown> | undefined)?.kind === kind)
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    /* ignore */
  }
}

async function scheduleSmart(cfg: ReminderConfig, postedDates: string[], partnerName?: string) {
  await cancelKind('moment');
  if (!cfg.enabled || cfg.times.length === 0) return;
  await ensureChannel();

  const who = partnerName?.trim() || 'your partner';
  const posted = new Set(postedDates);
  const base = new Date();
  let budget = await remainingBudget();

  for (let d = 0; d < WINDOW_DAYS; d += 1) {
    if (budget <= 0) break;
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
    if (posted.has(isoOf(day))) continue; // smart skip: already shared that day
    const epochDay = Math.floor(day.getTime() / 86_400_000);
    for (let si = 0; si < cfg.times.length; si += 1) {
      if (budget <= 0) break;
      const t = cfg.times[si];
      const when = new Date(day.getFullYear(), day.getMonth(), day.getDate(), t.hour, t.minute, 0, 0);
      if (when.getTime() <= Date.now() + 1000) continue; // skip times already passed
      budget -= 1;
      await Notifications.scheduleNotificationAsync({
        // Deterministic per day+slot so each reminder differs and they rotate.
        content: { title: '📸 Tether', body: reminderBody(who, epochDay * 10 + si), data: { kind: 'moment' } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          channelId: CHANNEL_ID,
        },
      });
    }
  }
}

/** Re-schedule the reminder window (call on launch and when posted days change). */
export async function refreshReminders(postedDates: string[], partnerName?: string): Promise<void> {
  if (!supported) return;
  try {
    const cfg = await getReminderConfig();
    if (!cfg.enabled) return;
    // Launch path: never prompt here (the in-app card asks in context). Only
    // schedule if permission is already granted.
    if (await hasNotificationPermission()) await scheduleSmart(cfg, postedDates, partnerName);
  } catch {
    /* notifications unavailable */
  }
}

// ── The Golden Hour lantern ────────────────────────────────────────────────
const LANTERN_CHANNEL = 'golden-hour';

/**
 * Keep exactly one local notification pointed at today's lantern minute (the
 * moment the shared free window opens). Re-run whenever the schedule changes;
 * pass null to clear it (window gone, day no longer shared, already burning).
 * Never prompts: it only schedules when permission is already granted.
 */
export async function refreshLanternNotification(startMin: number | null, partnerName?: string): Promise<void> {
  if (!supported) return;
  try {
    await cancelKind('lantern');
    if (startMin == null) return;
    if (!(await hasNotificationPermission())) return;
    const base = new Date();
    const when = new Date(
      base.getFullYear(),
      base.getMonth(),
      base.getDate(),
      Math.floor(startMin / 60),
      startMin % 60,
      0,
      0,
    );
    if (when.getTime() <= Date.now() + 1000) return; // already burning or passed
    if ((await remainingBudget()) <= 0) return;
    await ensureChannel(LANTERN_CHANNEL, 'Golden hour');
    const who = partnerName?.trim() || 'your love';
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🏮 The lantern is lit',
        body: `You and ${who} are both free now. Come sit together for a minute.`,
        data: { kind: 'lantern' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: LANTERN_CHANNEL,
      },
    });
  } catch {
    /* notifications unavailable */
  }
}

// ── Daily plan reminders: "plan today" (morning) + "plan tomorrow" (evening) ──
export interface PlanConfig {
  enabled: boolean;
  morningTime: ReminderTime; // nudge to plan today
  eveningEnabled: boolean; // also nudge to plan tomorrow
  eveningTime: ReminderTime; // nudge to plan tomorrow
}

export const DEFAULT_PLAN: PlanConfig = {
  enabled: true,
  morningTime: { hour: 8, minute: 30 },
  eveningEnabled: true,
  eveningTime: { hour: 20, minute: 0 },
};

export async function getPlanConfig(): Promise<PlanConfig> {
  try {
    const raw = await AsyncStorage.getItem(PLAN_CONFIG_KEY);
    if (raw) {
      const c = JSON.parse(raw);
      return {
        enabled: !!c.enabled,
        morningTime: c.morningTime ?? DEFAULT_PLAN.morningTime,
        eveningEnabled: !!c.eveningEnabled,
        eveningTime: c.eveningTime ?? DEFAULT_PLAN.eveningTime,
      };
    }
    // Migrate the old on/off-only flag, if present.
    const legacy = await AsyncStorage.getItem(PLAN_KEY);
    if (legacy === '0') return { ...DEFAULT_PLAN, enabled: false };
  } catch {
    /* ignore */
  }
  return DEFAULT_PLAN;
}

async function savePlanConfig(c: PlanConfig) {
  try {
    await AsyncStorage.setItem(PLAN_CONFIG_KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

function planBody(who: string, seed: number, tomorrow: boolean): string {
  const today = [
    `Add today's plan so ${who} knows when you're free.`,
    `What does your day look like? Share it with ${who}.`,
    `Map out today so you two can find time together.`,
    `A quick plan keeps you in sync with ${who} today.`,
    `Jot down today's schedule for ${who} to see.`,
  ];
  const tom = [
    `Sketch out tomorrow so ${who} can plan around it.`,
    `What's tomorrow looking like? Add it for ${who}.`,
    `Plan tomorrow tonight, ${who} will see it in the morning.`,
    `Give ${who} a peek at tomorrow, add your plan.`,
    `A minute now: map tomorrow for ${who}.`,
  ];
  const lines = tomorrow ? tom : today;
  return lines[((seed % lines.length) + lines.length) % lines.length];
}

async function schedulePlan(plannedDates: string[], who: string) {
  await cancelKind('plan');
  const cfg = await getPlanConfig();
  if (!cfg.enabled) return;
  await ensureChannel(PLAN_CHANNEL, 'Daily plan');
  const planned = new Set(plannedDates);
  const base = new Date();
  let budget = await remainingBudget();
  const fire = async (when: Date, title: string, body: string) => {
    if (budget <= 0) return;
    if (when.getTime() <= Date.now() + 1000) return;
    budget -= 1;
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { kind: 'plan' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: PLAN_CHANNEL },
    });
  };
  for (let d = 0; d < WINDOW_DAYS; d += 1) {
    const day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + d);
    const epochDay = Math.floor(day.getTime() / 86_400_000);
    // Morning: plan today (skip if today is already planned).
    if (!planned.has(isoOf(day))) {
      await fire(
        new Date(day.getFullYear(), day.getMonth(), day.getDate(), cfg.morningTime.hour, cfg.morningTime.minute, 0, 0),
        '🗓️ Plan your day',
        planBody(who, epochDay, false),
      );
    }
    // Evening: plan tomorrow (skip if tomorrow is already planned).
    if (cfg.eveningEnabled) {
      const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
      if (!planned.has(isoOf(tomorrow))) {
        await fire(
          new Date(day.getFullYear(), day.getMonth(), day.getDate(), cfg.eveningTime.hour, cfg.eveningTime.minute, 0, 0),
          '🌙 Plan tomorrow',
          planBody(who, epochDay + 1, true),
        );
      }
    }
  }
}

/** Re-schedule the daily plan reminders (call on launch and when your plans change). */
export async function refreshPlanReminders(plannedDates: string[], partnerName?: string): Promise<void> {
  if (!supported) return;
  try {
    const cfg = await getPlanConfig();
    if (!cfg.enabled) {
      await cancelKind('plan');
      return;
    }
    // Launch path: never prompt here; only schedule if already granted.
    if (await hasNotificationPermission()) await schedulePlan(plannedDates, partnerName?.trim() || 'your partner');
  } catch {
    /* notifications unavailable */
  }
}

/** Save the plan reminder config and reschedule. Returns true only if now active. */
export async function setPlanConfig(
  cfg: PlanConfig,
  plannedDates: string[],
  partnerName?: string,
): Promise<boolean> {
  await savePlanConfig(cfg);
  if (!supported || !cfg.enabled) {
    if (!cfg.enabled) await cancelKind('plan');
    return false;
  }
  if (!(await ensureNotificationPermission())) return false;
  await schedulePlan(plannedDates, partnerName?.trim() || 'your partner');
  return true;
}

/** Turn reminders on/off. Returns true only if now active (permission granted). */
export async function setRemindersEnabled(
  enabled: boolean,
  postedDates: string[],
  partnerName?: string,
): Promise<boolean> {
  const cfg = await getReminderConfig();
  if (!supported) {
    await saveConfig({ ...cfg, enabled });
    return false;
  }
  if (!enabled) {
    await cancelKind('moment');
    await saveConfig({ ...cfg, enabled: false });
    return false;
  }
  if (!(await ensureNotificationPermission())) {
    await saveConfig({ ...cfg, enabled: false });
    return false;
  }
  const next = { ...cfg, enabled: true };
  await saveConfig(next);
  await scheduleSmart(next, postedDates, partnerName);
  return true;
}

// ── Anniversaries & recurring dates ──────────────────────────────────────
const OCC_CHANNEL = 'occasions';

export interface OccasionLite {
  id: string;
  title: string;
  date: string; // ISODate
  recurrence: 'yearly' | 'monthly' | 'once';
  remindDaysBefore: number;
  icon?: string;
}

async function ensureOccasionChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(OCC_CHANNEL, {
      name: 'Anniversaries & dates',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

async function scheduleOccasion(o: OccasionLite) {
  const remind = Math.max(0, Math.min(60, Math.round(o.remindDaysBefore || 0)));
  const icon = o.icon || '💗';
  const when = remind === 0 ? 'today' : remind === 1 ? 'tomorrow' : `in ${remind} days`;
  const content = {
    title: `${icon} ${o.title}`,
    body: remind === 0 ? `${o.title} is today! 🎉` : `${o.title} is ${when}.`,
    data: { kind: 'occasion', id: o.id },
  };

  // Fire on exactly the date the app displays — nextOccurrence(), minus the
  // reminder lead, at 9am — as a one-shot that syncOccasionReminders re-arms on
  // each launch. The old recurring YEARLY/MONTHLY triggers clamped month-end and
  // Feb-29 dates to the 28th, so the reminder fired on a different day than the
  // card showed; routing both through nextOccurrence keeps them in agreement.
  const occ = nextOccurrence(o);
  const fire = new Date(occ.getFullYear(), occ.getMonth(), occ.getDate() - remind, 9, 0, 0, 0);
  if (fire.getTime() > Date.now() + 1000) {
    await Notifications.scheduleNotificationAsync({
      content,
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire, channelId: OCC_CHANNEL },
    });
  }
}

/** Re-schedule local reminders for the couple's saved occasions. */
export async function syncOccasionReminders(occasions: OccasionLite[]): Promise<void> {
  if (!supported) return;
  try {
    // Don't prompt for permission solely to sync occasions; only schedule if
    // permission is already granted (the launch flow handles the one request).
    if (!(await hasNotificationPermission())) return;
    await ensureOccasionChannel();
    await cancelKind('occasion');
    let budget = await remainingBudget();
    for (const o of occasions) {
      if (budget <= 0) break;
      budget -= 1;
      await scheduleOccasion(o);
    }
  } catch {
    /* notifications unavailable */
  }
}

// ── Love letters: notify the recipient when a sealed letter comes due ────────
const LETTER_CHANNEL = 'letters';

export interface LetterLite {
  id: string;
  title: string;
  deliverAt: number;
  openedAt?: number | null;
}

async function ensureLetterChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(LETTER_CHANNEL, {
      name: 'Love letters',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

/**
 * Arm a delivery nudge for each sealed letter addressed to me. The author can't
 * schedule this (a local notification fires on the device that set it), so the
 * recipient's device arms them as letters sync in. Pass only letters written by
 * the partner; already-opened and past-due ones are skipped.
 */
export async function scheduleLetterDeliveries(letters: LetterLite[], fromName?: string): Promise<void> {
  if (!supported) return;
  try {
    if (!(await hasNotificationPermission())) return;
    await ensureLetterChannel();
    await cancelKind('letter');
    const who = fromName?.trim() || 'your partner';
    const due = letters
      .filter((l) => !l.openedAt && l.deliverAt > Date.now() + 1000)
      .sort((a, b) => a.deliverAt - b.deliverAt);
    let budget = await remainingBudget();
    for (const l of due) {
      if (budget <= 0) break;
      budget -= 1;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💌 A letter just opened',
          body: `${who}'s letter is ready to read: ${l.title}`,
          data: { kind: 'letter', id: l.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(l.deliverAt),
          channelId: LETTER_CHANNEL,
        },
      });
    }
  } catch {
    /* notifications unavailable */
  }
}

/** Save new reminder times and reschedule. */
export async function setReminderTimes(
  times: ReminderTime[],
  postedDates: string[],
  partnerName?: string,
): Promise<void> {
  const cfg = await getReminderConfig();
  const sorted = [...times].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  const next: ReminderConfig = { enabled: cfg.enabled, times: sorted.length ? sorted : DEFAULT_TIMES };
  await saveConfig(next);
  if (supported && next.enabled) {
    if (await hasNotificationPermission()) await scheduleSmart(next, postedDates, partnerName);
  }
}
