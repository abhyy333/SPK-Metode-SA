import { MasterLecturerAssignment, MasterLecturerValidationReport, AcademicPeriod } from '../types/masterLecturer';
import {
  INITIAL_MASTER_LECTURER_ASSIGNMENTS,
  validateMasterLecturerDataset,
  extractSectionAndBaseName,
  resolveLecturerFromMaster,
} from '../data/masterLecturerDataset';
import { CourseOffering, Lecturer } from '../types';
import { StorageService } from './storageService';

const STORAGE_KEY_MASTER_LECTURERS = 'elektro_sched_master_lecturers_v2';

export function normalizeCourseNameForMatch(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/[–—]/g, '-')
    .replace(/[\(\)\-\_\,\.\s]/g, '')
    .replace(/\/\d{4}$/, '') // Strip year like /2026 or /2022
    .trim();
}

const COURSE_NORM_ALIASES: Record<string, string[]> = {
  [normalizeCourseNameForMatch('Agama')]: [
    normalizeCourseNameForMatch('Agama Islam'),
    normalizeCourseNameForMatch('Pendidikan Agama Islam'),
  ],
  [normalizeCourseNameForMatch('Agama Islam')]: [
    normalizeCourseNameForMatch('Agama'),
    normalizeCourseNameForMatch('Pendidikan Agama Islam'),
  ],
  [normalizeCourseNameForMatch('Fisika Listrik dan Magnet')]: [
    normalizeCourseNameForMatch('Fisika Listrik & Magnet'),
  ],
  [normalizeCourseNameForMatch('Fisika Listrik & Magnet')]: [
    normalizeCourseNameForMatch('Fisika Listrik dan Magnet'),
  ],
  [normalizeCourseNameForMatch('Dasar Integral dan Differensial')]: [
    normalizeCourseNameForMatch('Dasar Integral & Differensial'),
  ],
  [normalizeCourseNameForMatch('Dasar Integral & Differensial')]: [
    normalizeCourseNameForMatch('Dasar Integral dan Differensial'),
  ],
  [normalizeCourseNameForMatch('Pengukuran dan Instrumentasi')]: [
    normalizeCourseNameForMatch('Pengukuran & Instrumentasi'),
  ],
  [normalizeCourseNameForMatch('Pengukuran & Instrumentasi')]: [
    normalizeCourseNameForMatch('Pengukuran dan Instrumentasi'),
  ],
};

export class MasterLecturerService {
  private static cachedData: MasterLecturerAssignment[] | null = null;

  /**
   * Loads all Master Lecturer Assignments from persistent storage or default dataset.
   * Auto-validates that storage holds the rebuilt 392 source-of-truth records.
   */
  public static getAll(): MasterLecturerAssignment[] {
    if (this.cachedData && this.cachedData.length === 392 && this.cachedData[0]?.raw_course_name === 'Agama Islam - A') {
      return this.cachedData;
    }

    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_MASTER_LECTURERS);
        if (stored !== null) {
          const parsed = JSON.parse(stored) as MasterLecturerAssignment[];
          if (Array.isArray(parsed) && parsed.length === 392 && parsed[0]?.raw_course_name === 'Agama Islam - A') {
            this.cachedData = parsed;
            return this.cachedData;
          }
        }
      } catch (err) {
        console.warn('Failed to load master lecturers from storage, falling back to initial dataset:', err);
      }
    }

    // Force rebuild if storage was empty, old, or invalid
    this.cachedData = INITIAL_MASTER_LECTURER_ASSIGNMENTS;
    this.save(this.cachedData);
    return this.cachedData;
  }

  /**
   * Saves master assignments to persistent storage.
   */
  public static save(data: MasterLecturerAssignment[]): void {
    this.cachedData = data;
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_MASTER_LECTURERS, JSON.stringify(data));
      } catch (err) {
        console.error('Failed to save master lecturers to storage:', err);
      }
    }
  }

  /**
   * Clears all assignments (Hapus Semua Master Dosen Pengampu).
   */
  public static clearAll(): void {
    this.cachedData = [];
    this.save([]);
  }

  /**
   * Rebuilds total Master Dosen Pengampu from the pristine raw source dataset (392 rows),
   * persists to storage, and immediately synchronizes active CourseOfferings.
   */
  public static rebuildTotalMaster(period: AcademicPeriod = 'GANJIL'): {
    masterCount: number;
    ganjilCount: number;
    genapCount: number;
    syncResult: ReturnType<typeof MasterLecturerService.syncExistingCourseOfferingsFromMaster>;
  } {
    // 1. Wipe old assignment records
    this.clearAll();

    // 2. Rebuild pristine 392 rows
    const pristine = INITIAL_MASTER_LECTURER_ASSIGNMENTS;
    this.save(pristine);

    // 3. Immediately synchronize CourseOfferings
    const syncResult = this.syncExistingCourseOfferingsFromMaster(period);

    return {
      masterCount: pristine.length,
      ganjilCount: pristine.filter((d) => d.academic_period === 'GANJIL').length,
      genapCount: pristine.filter((d) => d.academic_period === 'GENAP').length,
      syncResult,
    };
  }

  /**
   * Adds or replaces multiple assignment rows (e.g. for team teaching or manual input).
   */
  public static saveManualAssignments(
    newRows: MasterLecturerAssignment[],
    replacedSourceRowIds: string[] = []
  ): void {
    const current = this.getAll();
    const replacedSet = new Set(replacedSourceRowIds);
    const filtered = current.filter((item) => !replacedSet.has(item.source_row_id));
    const combined = [...filtered, ...newRows];
    this.save(combined);
  }

  /**
   * Deletes a single master assignment by source_row_id.
   */
  public static deleteById(sourceRowId: string): void {
    const current = this.getAll();
    const filtered = current.filter((item) => item.source_row_id !== sourceRowId);
    this.save(filtered);
  }

  /**
   * Resets to initial default raw dataset (392 rows).
   */
  public static resetToDefault(): MasterLecturerAssignment[] {
    this.cachedData = INITIAL_MASTER_LECTURER_ASSIGNMENTS;
    this.save(this.cachedData);
    return this.cachedData;
  }

  /**
   * Runs complete validation report against all 392 records.
   */
  public static getValidationReport(data?: MasterLecturerAssignment[]): MasterLecturerValidationReport {
    const list = data || this.getAll();
    return validateMasterLecturerDataset(list);
  }

  /**
   * Filter master assignments by period ('GANJIL' | 'GENAP')
   */
  public static getByPeriod(period: AcademicPeriod): MasterLecturerAssignment[] {
    const all = this.getAll();
    return all.filter((d) => (d.academic_period || d.academicPeriod)?.toUpperCase() === period.toUpperCase());
  }

  /**
   * Helper to normalize a course name for fuzzy/exact matching
   */
  public static normalizeCourseName(name: string): string {
    return normalizeCourseNameForMatch(name);
  }

  /**
   * Finds matching Master Lecturer Assignments for a given course offering query.
   * Priority: Section-Specific match -> Generic course assignment -> empty array
   * Supports Team Teaching (returns all matching rows).
   */
  public static findLecturerAssignments(query: {
    academicPeriod?: AcademicPeriod;
    semester?: number;
    courseName?: string;
    section?: string | null;
  }, masterData?: MasterLecturerAssignment[]): MasterLecturerAssignment[] {
    const allMaster = masterData || this.getAll();
    const targetPeriod = (query.academicPeriod || 'GANJIL').toUpperCase() as AcademicPeriod;
    const periodData = allMaster.filter(
      (d) => (d.academic_period || d.academicPeriod)?.toUpperCase() === targetPeriod
    );

    const rawCourse = query.courseName || '';
    const { baseName: queryBase, section: parsedSecFromCourse } = extractSectionAndBaseName(rawCourse);
    const targetSec = (query.section || parsedSecFromCourse || '').trim().toUpperCase();

    const normQuery = normalizeCourseNameForMatch(queryBase);
    const aliases = COURSE_NORM_ALIASES[normQuery] || [];
    const candidates = [normQuery, ...aliases];

    // Priority 1: Section-specific match
    if (targetSec) {
      const sectionMatches = periodData.filter((m) => {
        const mBaseNorm = normalizeCourseNameForMatch(m.base_course_name || m.raw_course_name);
        const mSec = (m.section || '').trim().toUpperCase();
        if (mSec !== targetSec) return false;

        const isCourseMatch = candidates.includes(mBaseNorm) || candidates.some((c) => mBaseNorm.includes(c) || c.includes(mBaseNorm));
        return isCourseMatch;
      });

      if (sectionMatches.length > 0) {
        return sectionMatches;
      }
    }

    // Priority 2: Generic course assignment (where m.section is empty/null)
    const genericMatches = periodData.filter((m) => {
      const mBaseNorm = normalizeCourseNameForMatch(m.base_course_name || m.raw_course_name);
      if (m.section && m.section.trim()) return false;

      const isCourseMatch = candidates.includes(mBaseNorm) || candidates.some((c) => mBaseNorm.includes(c) || c.includes(mBaseNorm));
      return isCourseMatch;
    });

    if (genericMatches.length > 0) {
      return genericMatches;
    }

    // Priority 3: Fallback match by semester if provided and course name matches
    if (query.semester) {
      const semMatches = periodData.filter((m) => {
        if (m.semester_num && m.semester_num !== query.semester) return false;
        const mBaseNorm = normalizeCourseNameForMatch(m.base_course_name || m.raw_course_name);
        return candidates.includes(mBaseNorm) || candidates.some((c) => mBaseNorm.includes(c) || c.includes(mBaseNorm));
      });
      if (targetSec) {
        const secFiltered = semMatches.filter((m) => (m.section || '').trim().toUpperCase() === targetSec);
        if (secFiltered.length > 0) return secFiltered;
      }
      if (semMatches.length > 0) return semMatches;
    }

    return [];
  }

  /**
   * Auto-assigns lecturers to CourseOfferings from the Master Lecturer dataset.
   * - Preserves offerings with manualOverride === true
   * - Captures Team Teaching (multiple lecturerIds)
   * - Updates lecturerIds, lecturerId, lecturerNames, lecturerCodes, status
   */
  public static autoAssignLecturersToOfferings(
    offerings: CourseOffering[],
    period: AcademicPeriod = 'GANJIL'
  ): {
    updatedOfferings: CourseOffering[];
    totalChecked: number;
    autoAssignedCount: number;
    teamTeachingCount: number;
    unmatchedCount: number;
  } {
    const masterData = this.getAll();
    const lecturers = StorageService.getLecturers();
    let autoAssignedCount = 0;
    let teamTeachingCount = 0;
    let unmatchedCount = 0;

    const updatedOfferings = offerings.map((offering) => {
      if (offering.manualOverride === true) {
        return offering;
      }

      // Extract section from offering.section, offering.code, offering.classCode, or className
      let sec = (offering.section || '').trim().toUpperCase();
      if (!sec) {
        if (offering.code) {
          const parts = offering.code.split('-');
          if (parts.length > 1) {
            const lastPart = parts[parts.length - 1].trim();
            const m = lastPart.match(/^[0-9]*([A-Za-z]+)$/);
            if (m) sec = m[1].toUpperCase();
          }
        }
        if (!sec && offering.classCode) {
          const m = offering.classCode.match(/^[0-9A-Za-z]+-([A-Za-z]+)$/);
          if (m) sec = m[1].toUpperCase();
        }
        if (!sec && offering.className) {
          const m = offering.className.match(/\b([1-8])([A-Za-z])\b/);
          if (m) sec = m[2].toUpperCase();
        }
      }

      const matches = this.findLecturerAssignments(
        {
          academicPeriod: period,
          semester: offering.semester,
          courseName: offering.courseName || offering.courseCode,
          section: sec || null,
        },
        masterData
      );

      if (matches.length === 0) {
        unmatchedCount++;
        return {
          ...offering,
          section: sec || offering.section,
        };
      }

      const matchedLecIds: string[] = [];
      const matchedLecNames: string[] = [];
      const matchedLecCodes: string[] = [];

      matches.forEach((m) => {
        let lecId = m.lecturer_id || m.lecturerId;
        let lecName = m.raw_lecturer_name || m.rawLecturerName || '';
        let lecCode = m.lecturer_code;

        if (!lecId && lecName) {
          const resolved = resolveLecturerFromMaster(lecName);
          lecId = resolved.lecturerId;
          lecCode = resolved.lecturerCode;
          if (resolved.canonicalName) lecName = resolved.canonicalName;
        }

        if (lecId && !matchedLecIds.includes(lecId)) {
          matchedLecIds.push(lecId);
          const lObj = lecturers.find((l) => l.id === lecId);
          matchedLecNames.push(lObj?.name || lecName);
          if (lObj?.code || lecCode) matchedLecCodes.push((lObj?.code || lecCode)!);
        } else if (lecName && !matchedLecNames.includes(lecName)) {
          matchedLecNames.push(lecName);
        }
      });

      if (matchedLecIds.length > 1) {
        teamTeachingCount++;
      }
      if (matchedLecIds.length > 0) {
        autoAssignedCount++;
      }

      const primaryLecId = matchedLecIds[0] || null;
      const primaryLecName = matchedLecNames[0] || null;
      const primaryLecCode = matchedLecCodes[0] || null;

      return {
        ...offering,
        section: sec || offering.section,
        lecturerIds: matchedLecIds,
        lecturerId: primaryLecId,
        assignedLecturerId: primaryLecId,
        assignedLecturerIds: matchedLecIds,
        lecturerNames: matchedLecNames,
        lecturerName: primaryLecName,
        lecturerCodes: matchedLecCodes,
        lecturerCode: primaryLecCode,
        status: (matchedLecIds.length > 0 ? 'ready' : offering.status) as any,
      };
    });

    return {
      updatedOfferings,
      totalChecked: offerings.length,
      autoAssignedCount,
      teamTeachingCount,
      unmatchedCount,
    };
  }

  /**
   * Synchronizes active CourseOfferings directly from Master Lecturer Assignments
   * and persists them to StorageService.
   */
  public static syncExistingCourseOfferingsFromMaster(period: AcademicPeriod = 'GANJIL') {
    const current = StorageService.getCourseOfferings();
    const result = this.autoAssignLecturersToOfferings(current, period);
    StorageService.saveCourseOfferings(result.updatedOfferings);
    return result;
  }

  /**
   * Legacy lookup compatibility
   */
  public static lookupLecturers(
    period: AcademicPeriod,
    courseName: string,
    section?: string | null,
    semester?: number,
    courseCode?: string
  ) {
    const matchedRows = this.findLecturerAssignments({
      academicPeriod: period,
      semester,
      courseName,
      section,
    });

    const assignedLecturerNames: string[] = [];
    const isCoordinatorMap: Record<string, boolean> = {};

    matchedRows.forEach((r) => {
      const name = r.normalized_lecturer_name || r.raw_lecturer_name;
      if (name && !assignedLecturerNames.includes(name)) {
        assignedLecturerNames.push(name);
      }
      if (r.is_coordinator) {
        isCoordinatorMap[name] = true;
      }
    });

    const isKkn = matchedRows.some((r) => r.is_kkn) || (courseName || '').trim().toUpperCase() === 'KKN';

    return {
      assignedLecturerNames,
      isCoordinatorMap,
      sourceRows: matchedRows,
      isKkn,
      rawWCode: matchedRows[0]?.raw_w_code,
      effectiveSks: matchedRows[0]?.effective_sks,
    };
  }
}
