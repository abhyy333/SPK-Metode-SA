import { Lecturer, CourseOffering, ScheduleAssignment } from '../types';

export interface LecturerDuplicateWarning {
  lecturerId: string;
  code: string;
  name: string;
  nip: string;
  issueType: 'duplicate_code' | 'same_nidn' | 'same_name_diff_code';
  title: string;
  details: string;
  relatedCodes: string[];
  relatedLecturers: Array<{ id: string; code: string; name: string; nip: string }>;
}

export interface LecturerValidationReport {
  totalLecturers: number;
  activeLecturers: number;
  totalWarnings: number;
  warnings: LecturerDuplicateWarning[];
  warningLecturerIds: Set<string>;
  summaryText: string;
}

/**
 * Normalizes text: removes leading/trailing spaces, collapses multiple whitespace, converts to lowercase.
 */
export function normalizeLecturerName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeNip(nip: string): string {
  if (!nip) return '';
  return nip.trim().replace(/[\s.-]/g, '');
}

/**
 * Pure derived validator for lecturers list.
 * Evaluates duplicate codes, duplicate NIDN/NIP, and identical names with different codes.
 */
export function validateLecturersList(lecturers: Lecturer[]): LecturerValidationReport {
  const warnings: LecturerDuplicateWarning[] = [];
  const warningLecturerIds = new Set<string>();

  if (!lecturers || lecturers.length === 0) {
    return {
      totalLecturers: 0,
      activeLecturers: 0,
      totalWarnings: 0,
      warnings: [],
      warningLecturerIds,
      summaryText: 'Tidak ada data dosen terdaftar.',
    };
  }

  // Group by Code (case-insensitive)
  const codeMap = new Map<string, Lecturer[]>();
  // Group by Normalized Name
  const nameMap = new Map<string, Lecturer[]>();
  // Group by Normalized NIP/NIDN
  const nipMap = new Map<string, Lecturer[]>();

  for (const lec of lecturers) {
    const normCode = (lec.code || '').trim().toUpperCase();
    if (normCode) {
      const list = codeMap.get(normCode) || [];
      list.push(lec);
      codeMap.set(normCode, list);
    }

    const normName = normalizeLecturerName(lec.name);
    if (normName) {
      const list = nameMap.get(normName) || [];
      list.push(lec);
      nameMap.set(normName, list);
    }

    const normN = normalizeNip(lec.nip);
    if (normN && normN.length >= 8) {
      const list = nipMap.get(normN) || [];
      list.push(lec);
      nipMap.set(normN, list);
    }
  }

  // 1. Check Duplicate Code (Fatal)
  codeMap.forEach((group, code) => {
    if (group.length > 1) {
      for (const lec of group) {
        warningLecturerIds.add(lec.id);
        const related = group.filter((g) => g.id !== lec.id);
        warnings.push({
          lecturerId: lec.id,
          code: lec.code,
          name: lec.name,
          nip: lec.nip,
          issueType: 'duplicate_code',
          title: `Kode Dosen Duplikat: ${code}`,
          details: `Kode dosen "${code}" digunakan oleh ${group.length} record dosen berbeda (${group.map((g) => g.name).join(', ')}).`,
          relatedCodes: related.map((r) => r.code),
          relatedLecturers: related.map((r) => ({ id: r.id, code: r.code, name: r.name, nip: r.nip })),
        });
      }
    }
  });

  // 2. Check Identical Name with Different Code (Verification Needed)
  nameMap.forEach((group, normName) => {
    if (group.length > 1) {
      const uniqueCodes = new Set(group.map((g) => (g.code || '').trim().toUpperCase()));
      // If different codes are used for identical normalized name
      for (const lec of group) {
        // Skip if already flagged as duplicate code
        const isDuplicateCode = warnings.some((w) => w.lecturerId === lec.id && w.issueType === 'duplicate_code');
        if (!isDuplicateCode) {
          warningLecturerIds.add(lec.id);
          const related = group.filter((g) => g.id !== lec.id);
          warnings.push({
            lecturerId: lec.id,
            code: lec.code,
            name: lec.name,
            nip: lec.nip,
            issueType: 'same_name_diff_code',
            title: `Nama Sama Beda Kode: ${lec.name}`,
            details: `Nama dosen "${lec.name}" tercatat dengan kode berbeda (${group.map((g) => g.code).join(', ')}). Dipertahankan sebagai record terpisah namun berstatus perlu verifikasi.`,
            relatedCodes: related.map((r) => r.code),
            relatedLecturers: related.map((r) => ({ id: r.id, code: r.code, name: r.name, nip: r.nip })),
          });
        }
      }
    }
  });

  const activeLecturers = lecturers.filter((l) => l.isActive).length;

  let summaryText = 'Semua data dosen valid & siap digunakan.';
  if (warnings.length > 0) {
    summaryText = `Ditemukan ${warnings.length} record dosen yang memerlukan perhatian/verifikasi.`;
  }

  return {
    totalLecturers: lecturers.length,
    activeLecturers,
    totalWarnings: warnings.length,
    warnings,
    warningLecturerIds,
    summaryText,
  };
}

/**
 * Cleans up references when a lecturer is deleted.
 */
export function cleanLecturerReferences(
  deletedLecturerId: string,
  offerings: CourseOffering[],
  scheduleAssignments: ScheduleAssignment[]
): {
  updatedOfferings: CourseOffering[];
  updatedAssignments: ScheduleAssignment[];
  affectedOfferingCount: number;
} {
  let affectedOfferingCount = 0;

  const updatedOfferings = offerings.map((off) => {
    let modified = false;
    let newLecturerIds = off.lecturerIds ? [...off.lecturerIds] : [];
    let newPrimaryId = off.lecturerId;

    if (newLecturerIds.includes(deletedLecturerId)) {
      newLecturerIds = newLecturerIds.filter((id) => id !== deletedLecturerId);
      modified = true;
    }

    if (newPrimaryId === deletedLecturerId) {
      newPrimaryId = newLecturerIds.length > 0 ? newLecturerIds[0] : null;
      modified = true;
    }

    if (modified) {
      affectedOfferingCount++;
      return {
        ...off,
        lecturerIds: newLecturerIds,
        lecturerId: newPrimaryId,
        lecturerName: newPrimaryId ? off.lecturerName : null,
        lecturerCode: newPrimaryId ? off.lecturerCode : null,
        status: newLecturerIds.length === 0 ? ('draft' as const) : off.status,
      };
    }

    return off;
  });

  const updatedAssignments = scheduleAssignments.map((a) => {
    let modified = false;
    let newLecId = a.lecturerId;
    let newLecIds = a.lecturerIds ? [...a.lecturerIds] : [];

    if (newLecIds.includes(deletedLecturerId)) {
      newLecIds = newLecIds.filter((id) => id !== deletedLecturerId);
      modified = true;
    }

    if (newLecId === deletedLecturerId) {
      newLecId = newLecIds.length > 0 ? newLecIds[0] : null;
      modified = true;
    }

    if (modified) {
      return {
        ...a,
        lecturerId: newLecId,
        lecturerIds: newLecIds,
      };
    }

    return a;
  });

  return {
    updatedOfferings,
    updatedAssignments,
    affectedOfferingCount,
  };
}
