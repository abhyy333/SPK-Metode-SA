/**
 * Utilities for extracting clean course section letters and formatting schedule card titles.
 * Examples:
 * - formatCourseSectionName('Probabilitas dan Statistik', 'A') => 'Probabilitas dan Statistik-A'
 * - formatCourseSectionName('Rangkaian Logika', 'B') => 'Rangkaian Logika-B'
 * - formatCourseSectionName('Fisika Mekanika', 'Kelas C') => 'Fisika Mekanika-C'
 */

export function extractCleanSectionLetter(
  section?: string | null,
  classGroupCode?: string | null,
  classGroupName?: string | null,
  classId?: string | null
): string {
  // 1. Direct section string check (e.g. "A", "B", "Kelas A", "Kelas B")
  if (section && section.trim()) {
    const trimmed = section.trim();
    // Check if ends with a letter like "Kelas A" -> "A"
    const matchEndLetter = trimmed.match(/\b([A-Z])\b/i) || trimmed.match(/([A-Z])$/i);
    if (matchEndLetter) {
      return matchEndLetter[1].toUpperCase();
    }
    // If it's a short string (e.g. "A1" or "1")
    return trimmed.toUpperCase();
  }

  // 2. ClassGroup code check (e.g. "ELK-3A", "TE-1B", "3A", "1B")
  if (classGroupCode && classGroupCode.trim()) {
    const matchCode = classGroupCode.trim().match(/([A-Z])$/i);
    if (matchCode) {
      return matchCode[1].toUpperCase();
    }
  }

  // 3. ClassGroup name check (e.g. "Teknik Elektro 3A (Smtr 3)" -> "A")
  if (classGroupName && classGroupName.trim()) {
    const matchName = classGroupName.match(/\b\d*([A-Z])\b/i) || classGroupName.match(/([A-Z])\s*\(/i);
    if (matchName) {
      return matchName[1].toUpperCase();
    }
  }

  // 4. Class ID check (e.g. "cls-3a", "cls-1b")
  if (classId && classId.trim()) {
    const matchId = classId.match(/([a-z])$/i);
    if (matchId) {
      return matchId[1].toUpperCase();
    }
  }

  return 'A';
}

export function formatCourseSectionTitle(
  courseName: string,
  section?: string | null,
  classGroupCode?: string | null,
  classGroupName?: string | null,
  classId?: string | null
): string {
  const cleanCourse = (courseName || 'Mata Kuliah').trim();
  const letter = extractCleanSectionLetter(section, classGroupCode, classGroupName, classId);
  
  // If the course name already ends with "-A" or "-B", avoid duplicate
  if (new RegExp(`-${letter}$`, 'i').test(cleanCourse)) {
    return cleanCourse;
  }
  
  return `${cleanCourse}-${letter}`;
}
