import { Timeslot, DayOfWeek } from '../types';

export const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

const DAY_ORDER: Record<DayOfWeek, number> = {
  Senin: 1,
  Selasa: 2,
  Rabu: 3,
  Kamis: 4,
  Jumat: 5,
  Sabtu: 6,
  Minggu: 7,
};

/**
 * Calculate duration in minutes between start and end time (format HH:mm)
 */
export function calculateSessionDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  return Math.max(0, endTotal - startTotal);
}

/**
 * Automatically sorts all timeslots by Day and then by startTime ascending.
 * Assigns dynamic Sesi numbering (Sesi 1, Sesi 2, ...) per day.
 * Ensures stable IDs (timeslotId) are preserved while display numbers/labels are strictly synchronized.
 */
export function sortAndReindexSessions(timeslots: Timeslot[]): Timeslot[] {
  if (!timeslots || timeslots.length === 0) return [];

  // Group by day
  const dayGroups = new Map<DayOfWeek, Timeslot[]>();
  ALL_DAYS.forEach(day => dayGroups.set(day, []));

  timeslots.forEach(ts => {
    const list = dayGroups.get(ts.day) || [];
    list.push(ts);
    dayGroups.set(ts.day, list);
  });

  const reindexedList: Timeslot[] = [];

  ALL_DAYS.forEach(day => {
    const list = dayGroups.get(day) || [];
    // Sort strictly by startTime ascending, then endTime
    list.sort((a, b) => {
      const cmp = a.startTime.localeCompare(b.startTime);
      if (cmp !== 0) return cmp;
      return a.endTime.localeCompare(b.endTime);
    });

    // Reindex Sesi per day
    list.forEach((ts, idx) => {
      const sessionNum = idx + 1;
      const duration = ts.durationMinutes || calculateSessionDuration(ts.startTime, ts.endTime) || 100;
      const sessionLabel = `Sesi ${sessionNum}`;
      const label = `${sessionLabel} (${ts.startTime} - ${ts.endTime})`;

      reindexedList.push({
        ...ts,
        slotIndex: sessionNum,
        sessionNumber: sessionNum,
        sessionLabel,
        durationMinutes: duration,
        label,
      });
    });
  });

  return reindexedList;
}

/**
 * Checks for overlapping sessions on the same day
 */
export function getOverlappingSessions(
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  allTimeslots: Timeslot[],
  excludeId?: string
): Timeslot[] {
  if (!startTime || !endTime) return [];
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  const newStart = sH * 60 + sM;
  const newEnd = eH * 60 + eM;

  return allTimeslots.filter(ts => {
    if (ts.day !== day || ts.id === excludeId) return false;
    const [tsSH, tsSM] = ts.startTime.split(':').map(Number);
    const [tsEH, tsEM] = ts.endTime.split(':').map(Number);
    const tsStart = tsSH * 60 + tsSM;
    const tsEnd = tsEH * 60 + tsEM;

    // Overlap condition: start < otherEnd AND end > otherStart
    return newStart < tsEnd && newEnd > tsStart;
  });
}

/**
 * Formats a timeslot for display with "Sesi X" notation
 */
export function formatSessionName(timeslot?: Timeslot | null): string {
  if (!timeslot) return '-';
  const num = timeslot.sessionNumber || timeslot.slotIndex || 1;
  return `Sesi ${num} (${timeslot.startTime} - ${timeslot.endTime})`;
}

/**
 * Returns "Sesi X" label
 */
export function getSessionShortLabel(timeslot?: Timeslot | null): string {
  if (!timeslot) return '-';
  const num = timeslot.sessionNumber || timeslot.slotIndex || 1;
  return `Sesi ${num}`;
}
