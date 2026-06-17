// Minimal month-grid helper for the photo calendar (no external library).
import { ISODate } from '../types/models';
import { toISODate } from './date';

export interface DayCell {
  date: ISODate | null;
  day: number | null;
}

export const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthTitle(year: number, month0: number): string {
  return `${MONTHS_LONG[month0]} ${year}`;
}

/** Weeks (rows) of day cells for a given month; leading/trailing blanks padded. */
export function monthMatrix(year: number, month0: number): DayCell[][] {
  const startWeekday = new Date(year, month0, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const cells: DayCell[] = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push({ date: toISODate(new Date(year, month0, d)), day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });

  const weeks: DayCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Step a (year, month0) pair by whole months. */
export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}
