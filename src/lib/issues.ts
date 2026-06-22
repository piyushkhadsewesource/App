// ─────────────────────────────────────────────────────────────────────────
// Helpers for "Clear the air", the gentle grievance flow.
//
// One partner raises something that is sitting with them (a feeling + how much
// it weighs), the other takes it to heart, and together they add concrete steps
// to make it right. The raiser decides when it feels resolved.
// ─────────────────────────────────────────────────────────────────────────
import { Issue, IssueStep } from '../types/models';

/** A small palette of feeling words, each with a soft emoji. */
export const FEELINGS: { word: string; emoji: string }[] = [
  { word: 'hurt', emoji: '💔' },
  { word: 'unheard', emoji: '🙉' },
  { word: 'lonely', emoji: '🌧️' },
  { word: 'anxious', emoji: '😟' },
  { word: 'frustrated', emoji: '😤' },
  { word: 'sad', emoji: '😢' },
  { word: 'ignored', emoji: '😶' },
  { word: 'let down', emoji: '😞' },
  { word: 'distant', emoji: '🌫️' },
  { word: 'worried', emoji: '😰' },
];

/** The emoji for a feeling word, falling back to a dove for anything custom. */
export function feelingEmoji(word?: string): string {
  if (!word) return '🕊️';
  const hit = FEELINGS.find((f) => f.word.toLowerCase() === word.trim().toLowerCase());
  return hit?.emoji ?? '💭';
}

/** A short label for how heavily an issue sits (1..5). */
export function weightLabel(weight: number): string {
  switch (Math.max(1, Math.min(5, Math.round(weight)))) {
    case 1:
      return 'A small thing';
    case 2:
      return 'Bugging me';
    case 3:
      return 'Weighing on me';
    case 4:
      return 'Hurting';
    default:
      return 'Really hurting';
  }
}

export interface StepProgress {
  total: number;
  done: number;
  allDone: boolean;
}

/** How many of an issue's steps are done. */
export function stepProgress(steps: IssueStep[], issueId: string): StepProgress {
  const mine = steps.filter((s) => s.issueId === issueId);
  const done = mine.filter((s) => s.done).length;
  return { total: mine.length, done, allDone: mine.length > 0 && done === mine.length };
}

/** Steps for one issue, oldest first. */
export function stepsFor(steps: IssueStep[], issueId: string): IssueStep[] {
  return steps.filter((s) => s.issueId === issueId).sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Open issues first (heaviest, then most recent), resolved ones after (most
 * recently resolved first). Keeps the things that still need care up top.
 */
export function sortIssues(list: Issue[]): Issue[] {
  return [...list].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    if (a.status === 'open') {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return b.createdAt - a.createdAt;
    }
    return (b.resolvedAt ?? b.updatedAt) - (a.resolvedAt ?? a.updatedAt);
  });
}

/** The most pressing open issue the partner raised that you have not yet taken to heart. */
export function issueNeedingYou(list: Issue[], meId: string): Issue | null {
  const open = list
    .filter((i) => i.status === 'open' && i.authorId !== meId && !i.acknowledgedBy)
    .sort((a, b) => (b.weight - a.weight) || (b.createdAt - a.createdAt));
  return open[0] ?? null;
}

/** Count of all open issues. */
export function openCount(list: Issue[]): number {
  return list.filter((i) => i.status === 'open').length;
}
