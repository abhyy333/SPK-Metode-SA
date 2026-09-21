import { Timeslot, DayOfWeek } from '../types';

export const ALL_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const DEFAULT_ACTIVE_DAYS: DayOfWeek[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

/**
 * 12 Default Sessions: 07:50 - 17:50 (50 minutes each, consecutive)
 */
export const DEFAULT_STANDARD_PERIODS = [
  { startTime: '07:50', endTime: '08:40' },
  { startTime: '08:40', endTime: '09:30' },
  { startTime: '09:30', endTime: '10:20' },
  { startTime: '10:20', endTime: '11:10' },
  { startTime: '11:10', endTime: '12:00' },
  { startTime: '12:00', endTime: '12:50' },
  { startTime: '12:50', endTime: '13:40' },
  { startTime: '13:40', endTime: '14:30' },
  { startTime: '14:30', endTime: '15:20' },
  { startTime: '15:20', endTime: '16:10' },
  { startTime: '16:10', endTime: '17:00' },
  { startTime: '17:00', endTime: '17:50' },
] as const;

/**
 * Generates the default standard 12 sessions for active days (Senin - Jumat)
 */
export function generateDefaultStandardTimeslots(): Timeslot[] {
  const result: Timeslot[] = [];
  DEFAULT_ACTIVE_DAYS.forEach((day) => {
    const daySlug = day.toLowerCase();
    DEFAULT_STANDARD_PERIODS.forEach((period, idx) => {
      const sessionNum = idx + 1;
      const startSlug = period.startTime.replace(':', '');
      result.push({
        id: `ts-${daySlug}-${startSlug}`,
        day,
        startTime: period.startTime,
        endTime: period.endTime,
        durationMinutes: 50,
        isActive: true,
        slotIndex: sessionNum,
        sessionNumber: sessionNum,
        sessionLabel: `Sesi ${sessionNum}`,
        label: `Sesi ${sessionNum} (${period.startTime} - ${period.endTime})`,
      });
    });
  });
  return result;
}

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
 * Adds minutes to an HH:mm string, returning HH:mm
 */
export function addMinutesToTime(time: string, minutes: number = 50): string {
  if (!time) return '08:40';
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '08:40';
  const total = h * 60 + m + minutes;
  const newH = Math.floor((total / 60) % 24);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Automatically sorts all timeslots by Day and then strictly by startTime ascending.
 * Assigns dynamic Sesi numbering (Sesi 1, Sesi 2, ...) per day based on startTime.
 * Ensures stable IDs (primary keys) are preserved while display numbers/labels are strictly synchronized.
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
      const calculated = calculateSessionDuration(ts.startTime, ts.endTime);
      const duration = calculated > 0 ? calculated : (ts.durationMinutes || 50);
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

// ==========================================
// SKS-BASED DURATION & MULTI-SESSION UTILITIES
// 1 SKS = 50 Minutes = 1 Session
// ==========================================

export interface CourseTimingInfo {
  sks: number;
  durationMinutes: number;
  startSessionNumber: number;
  endSessionNumber: number;
  sessionRangeLabel: string; // e.g. "Sesi 1–3" or "Sesi 1"
  startTime: string; // e.g. "07:50"
  endTime: string; // e.g. "10:20"
  timeRangeLabel: string; // e.g. "07:50 – 10:20"
  fullLabel: string; // e.g. "Sesi 1–3 (07:50 – 10:20)"
  summaryLabel: string; // e.g. "Sesi 1–3 (07:50 – 10:20) • 150 menit • 3 SKS"
  occupiedTimeslots: Timeslot[];
  occupiedSlotIds: string[];
  occupiedSessionNumbers: number[];
  isValidWithinDay: boolean; // false if course extends past the day's final available session
}

/**
 * Calculates occupied sessions, duration, and time intervals for a course offering given its SKS and start timeslot.
 * Strictly adheres to academic rule:
 * duration_minutes = sks * 50
 * end_time = start_time + duration_minutes
 * occupied_sessions = sks consecutive sessions on the same day
 */
export function calculateCourseTiming(
  startTimeslot: Timeslot | null | undefined,
  rawSks: number = 2,
  allTimeslots: Timeslot[] = []
): CourseTimingInfo {
  const sks = Math.max(1, Math.round(rawSks || 1));
  const durationMinutes = sks * 50;

  if (!startTimeslot) {
    return {
      sks,
      durationMinutes,
      startSessionNumber: 1,
      endSessionNumber: sks,
      sessionRangeLabel: sks > 1 ? `Sesi 1–${sks}` : 'Sesi 1',
      startTime: '07:50',
      endTime: addMinutesToTime('07:50', durationMinutes),
      timeRangeLabel: `07:50 – ${addMinutesToTime('07:50', durationMinutes)}`,
      fullLabel: `Sesi ${sks > 1 ? `1–${sks}` : '1'} (07:50 – ${addMinutesToTime('07:50', durationMinutes)})`,
      summaryLabel: `Sesi ${sks > 1 ? `1–${sks}` : '1'} • ${durationMinutes} menit • ${sks} SKS`,
      occupiedTimeslots: [],
      occupiedSlotIds: [],
      occupiedSessionNumbers: Array.from({ length: sks }, (_, i) => i + 1),
      isValidWithinDay: false,
    };
  }

  // Filter active timeslots on the same day and sort chronologically
  const daySlots = allTimeslots
    .filter((t) => t.day === startTimeslot.day && t.isActive !== false)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Find index of start timeslot
  let startIdx = daySlots.findIndex((t) => t.id === startTimeslot.id);
  if (startIdx === -1) {
    startIdx = daySlots.findIndex((t) => t.startTime === startTimeslot.startTime);
  }

  // If startTimeslot is not part of daySlots, treat startTimeslot as standalone
  if (startIdx === -1) {
    const calculatedEnd = addMinutesToTime(startTimeslot.startTime, durationMinutes);
    const startNum = startTimeslot.sessionNumber || startTimeslot.slotIndex || 1;
    const endNum = startNum + sks - 1;
    const sessionRangeLabel = sks > 1 ? `Sesi ${startNum}–${endNum}` : `Sesi ${startNum}`;
    const timeRangeLabel = `${startTimeslot.startTime} – ${calculatedEnd}`;

    return {
      sks,
      durationMinutes,
      startSessionNumber: startNum,
      endSessionNumber: endNum,
      sessionRangeLabel,
      startTime: startTimeslot.startTime,
      endTime: calculatedEnd,
      timeRangeLabel,
      fullLabel: `${sessionRangeLabel} (${timeRangeLabel})`,
      summaryLabel: `${sessionRangeLabel} (${timeRangeLabel}) • ${durationMinutes} menit • ${sks} SKS`,
      occupiedTimeslots: [startTimeslot],
      occupiedSlotIds: [startTimeslot.id],
      occupiedSessionNumbers: [startNum],
      isValidWithinDay: false,
    };
  }

  const isValidWithinDay = startIdx + sks <= daySlots.length;
  const occupiedTimeslots = daySlots.slice(startIdx, startIdx + sks);
  const occupiedSlotIds = occupiedTimeslots.map((t) => t.id);
  const occupiedSessionNumbers = occupiedTimeslots.map(
    (t, idx) => t.sessionNumber || startIdx + idx + 1
  );

  const startSessionNumber =
    occupiedTimeslots[0]?.sessionNumber || startIdx + 1;
  const endSessionNumber =
    occupiedTimeslots[occupiedTimeslots.length - 1]?.sessionNumber ||
    startIdx + occupiedTimeslots.length;

  const startTime = occupiedTimeslots[0]?.startTime || startTimeslot.startTime;
  const endTime =
    isValidWithinDay && occupiedTimeslots.length === sks
      ? occupiedTimeslots[occupiedTimeslots.length - 1].endTime
      : addMinutesToTime(startTime, durationMinutes);

  const sessionRangeLabel =
    startSessionNumber === endSessionNumber
      ? `Sesi ${startSessionNumber}`
      : `Sesi ${startSessionNumber}–${endSessionNumber}`;

  const timeRangeLabel = `${startTime} – ${endTime}`;
  const fullLabel = `${sessionRangeLabel} (${timeRangeLabel})`;
  const summaryLabel = `${sessionRangeLabel} (${timeRangeLabel}) • ${durationMinutes} menit • ${sks} SKS`;

  return {
    sks,
    durationMinutes,
    startSessionNumber,
    endSessionNumber,
    sessionRangeLabel,
    startTime,
    endTime,
    timeRangeLabel,
    fullLabel,
    summaryLabel,
    occupiedTimeslots,
    occupiedSlotIds,
    occupiedSessionNumbers,
    isValidWithinDay,
  };
}

/**
 * Checks if a proposed start timeslot has enough consecutive active sessions within the day for a given SKS.
 */
export function isTimeslotValidForSks(
  startTimeslot: Timeslot | null | undefined,
  sks: number,
  allTimeslots: Timeslot[]
): boolean {
  if (!startTimeslot) return false;
  const timing = calculateCourseTiming(startTimeslot, sks, allTimeslots);
  return timing.isValidWithinDay && timing.occupiedSlotIds.length === Math.max(1, Math.round(sks));
}

/**
 * Checks if two time intervals overlap on the same day.
 * Standard interval overlap condition: max(startA, startB) < min(endA, endB)
 */
export function doTimeIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  if (!startA || !endA || !startB || !endB) return false;
  const [sAH, sAM] = startA.split(':').map(Number);
  const [eAH, eAM] = endA.split(':').map(Number);
  const [sBH, sBM] = startB.split(':').map(Number);
  const [eBH, eBM] = endB.split(':').map(Number);

  const startAMin = sAH * 60 + sAM;
  const endAMin = eAH * 60 + eAM;
  const startBMin = sBH * 60 + sBM;
  const endBMin = eBH * 60 + eBM;

  return Math.max(startAMin, startBMin) < Math.min(endAMin, endBMin);
}
