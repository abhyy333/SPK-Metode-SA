import { ExamSession, ExamOffering } from '../types';

export const INDONESIAN_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Format ISO date string "YYYY-MM-DD" into Indonesian formatted date e.g. "Senin, 12 Oktober 2026"
 */
export function formatIndonesianDate(dateStr: string | undefined | null, includeDayName: boolean = true): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dayName = INDONESIAN_DAYS[d.getDay()];
    const dateNum = d.getDate();
    const monthName = INDONESIAN_MONTHS[d.getMonth()];
    const year = d.getFullYear();

    if (includeDayName) {
      return `${dayName}, ${dateNum} ${monthName} ${year}`;
    }
    return `${dateNum} ${monthName} ${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calculate exam timing helper
 */
export function calculateExamTiming(
  session: ExamSession | undefined | null,
  durationMinutes?: number
): { startTime: string; endTime: string; timeRangeFormatted: string } {
  if (!session) {
    return { startTime: '-', endTime: '-', timeRangeFormatted: '-' };
  }

  const startTime = session.startTime || '08:00';
  let endTime = session.endTime || '09:30';

  if (durationMinutes && durationMinutes > 0) {
    const [h, m] = startTime.split(':').map((v) => parseInt(v, 10));
    if (!isNaN(h) && !isNaN(m)) {
      const totalStartMin = h * 60 + m;
      const totalEndMin = totalStartMin + durationMinutes;
      const endH = Math.floor(totalEndMin / 60);
      const endM = totalEndMin % 60;
      endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }
  }

  return {
    startTime,
    endTime,
    timeRangeFormatted: `${startTime} – ${endTime} WIB`,
  };
}
