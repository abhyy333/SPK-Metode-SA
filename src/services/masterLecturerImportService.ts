import {
  MasterLecturerAssignment,
  MasterLecturerImportBatch,
  AcademicPeriod,
} from '../types/masterLecturer';
import { CourseOffering, Lecturer } from '../types';
import { StorageService } from './storageService';
import { MasterLecturerService } from './masterLecturerService';
import { resolveLecturerFromMaster } from '../data/masterLecturerDataset';

export interface ImportExecutionResult {
  success: boolean;
  batchId: string;
  totalImported: number;
  newDatasetCount: number;
  message: string;
}

export interface SyncOfferingsResult {
  totalOfferings: number;
  updatedCount: number;
  unchangedCount: number;
  updatedOfferings: {
    offeringId: string;
    courseName: string;
    section?: string;
    previousLecturers: string[];
    newLecturers: string[];
  }[];
}

export class MasterLecturerImportService {
  /**
   * Executes transactional batch import into Master Lecturer Assignments.
   * Guarantees atomic operation with snapshot rollback capability.
   */
  public static executeImport(
    batch: Omit<MasterLecturerImportBatch, 'previousSnapshot'>,
    rowsToImport: MasterLecturerAssignment[],
    mode: 'append' | 'upsert' = 'append'
  ): ImportExecutionResult {
    const currentData = StorageService.getMasterLecturerAssignments();
    const previousSnapshot = JSON.parse(JSON.stringify(currentData)) as MasterLecturerAssignment[];

    try {
      const generatedBatchId = batch.id || `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      // Stamp batch ID and verbatim attributes on each row
      const stampedRows: MasterLecturerAssignment[] = rowsToImport.map((row, idx) => ({
        ...row,
        source_row_id: row.source_row_id || `imp-${generatedBatchId}-${idx + 1}`,
        import_batch_id: generatedBatchId,
        raw_lecturer_name: row.raw_lecturer_name || row.rawLecturerName || '',
        rawLecturerName: row.raw_lecturer_name || row.rawLecturerName || '',
        dataSource: 'imported',
      }));

      let updatedData: MasterLecturerAssignment[] = [];

      if (mode === 'append') {
        // Append mode: Append all rows directly without destructive replacement
        updatedData = [...currentData, ...stampedRows];
      } else {
        // Upsert mode: update existing if key matches, otherwise append
        const rowMap = new Map<string, MasterLecturerAssignment>();
        currentData.forEach((row) => {
          const key = `${row.academic_period}|${row.raw_course_name.trim().toLowerCase()}|${row.raw_lecturer_name.trim().toLowerCase()}`;
          rowMap.set(key, row);
        });

        stampedRows.forEach((row) => {
          const key = `${row.academic_period}|${row.raw_course_name.trim().toLowerCase()}|${row.raw_lecturer_name.trim().toLowerCase()}`;
          rowMap.set(key, row);
        });

        updatedData = Array.from(rowMap.values());
      }

      // Persist the new master dataset
      StorageService.saveMasterLecturerAssignments(updatedData);

      // Save batch history record with status 'IMPORTED'
      const completeBatch: MasterLecturerImportBatch = {
        ...batch,
        id: generatedBatchId,
        status: 'IMPORTED',
        totalRows: rowsToImport.length,
        rows: stampedRows,
        previousSnapshot,
      };

      const existingBatches = StorageService.getMasterLecturerImportBatches();
      StorageService.saveMasterLecturerImportBatches([completeBatch, ...existingBatches]);

      // Record audit log
      try {
        StorageService.addAuditLog({
          id: `audit-imp-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userId: 'admin',
          userName: batch.importedBy || 'Administrator',
          action: 'create',
          entityType: 'Lecturer',
          entityId: generatedBatchId,
          details: `Import Excel Master Dosen: ${batch.fileName} (${rowsToImport.length} baris, mode: ${mode})`,
          method: 'import',
        });
      } catch (err) {
        console.warn('Failed to write audit log:', err);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('master-lecturer-updated'));
      }

      return {
        success: true,
        batchId: generatedBatchId,
        totalImported: rowsToImport.length,
        newDatasetCount: updatedData.length,
        message: `Berhasil mengimport ${rowsToImport.length} baris master dosen pengampu dari file "${batch.fileName}".`,
      };
    } catch (error: any) {
      // Transaction Rollback: restore previous snapshot immediately
      console.error('Import transaction failed, rolling back to previous state:', error);
      StorageService.saveMasterLecturerAssignments(previousSnapshot);

      throw new Error(`Gagal memproses import data: ${error.message || 'Terjadi kesalahan sistem'}. Dataset telah di-rollback secara aman.`);
    }
  }

  /**
   * Safely rolls back a specific import batch and restores state.
   * Mode = Append: Deletes ONLY records matching the selected batchId.
   * Mode = Upsert: Restores previous snapshot of modified records.
   * Updates history status to 'ROLLED BACK'.
   */
  public static rollbackBatch(
    batchId: string,
    currentUser?: { id?: string; name?: string }
  ): { success: boolean; message: string; restoredCount: number } {
    const batches = StorageService.getMasterLecturerImportBatches();
    const batchIndex = batches.findIndex((b) => b.id === batchId);

    if (batchIndex === -1) {
      throw new Error(`Batch import ID "${batchId}" tidak ditemukan dalam riwayat.`);
    }

    const targetBatch = batches[batchIndex];

    if (targetBatch.status === 'ROLLED BACK') {
      throw new Error(`Batch "${targetBatch.fileName}" sudah dibatalkan/di-rollback sebelumnya.`);
    }

    const currentData = StorageService.getMasterLecturerAssignments();
    let updatedData: MasterLecturerAssignment[] = [];

    if (targetBatch.mode === 'append') {
      // Append mode: Delete ONLY records with this import_batch_id
      // Preserves other batches, manual data, and default dataset intact
      updatedData = currentData.filter((r) => r.import_batch_id !== batchId);
    } else {
      // Upsert mode: Restore previous snapshot if available, or fallback to filter
      if (targetBatch.previousSnapshot && Array.isArray(targetBatch.previousSnapshot)) {
        updatedData = targetBatch.previousSnapshot;
      } else {
        updatedData = currentData.filter((r) => r.import_batch_id !== batchId);
      }
    }

    // Persist updated master dataset
    StorageService.saveMasterLecturerAssignments(updatedData);

    // Update batch history status to ROLLED BACK
    const updatedBatches = [...batches];
    updatedBatches[batchIndex] = {
      ...targetBatch,
      status: 'ROLLED BACK',
      rolledBackAt: new Date().toISOString(),
      rolledBackBy: currentUser?.name || 'Administrator',
    };
    StorageService.saveMasterLecturerImportBatches(updatedBatches);

    // Audit log
    try {
      StorageService.addAuditLog({
        id: `audit-rb-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: currentUser?.id || 'admin',
        userName: currentUser?.name || 'Administrator',
        action: 'delete',
        entityType: 'Lecturer',
        entityId: batchId,
        details: `Rollback Batch Import: ${targetBatch.fileName} (${targetBatch.totalRows} baris, status: ROLLED BACK)`,
        method: 'import',
      });
    } catch (e) {
      console.warn('Audit log error:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('master-lecturer-updated'));
    }

    return {
      success: true,
      message: `Batch import "${targetBatch.fileName}" (${targetBatch.totalRows} baris) berhasil di-rollback.`,
      restoredCount: updatedData.length,
    };
  }

  /**
   * Synchronizes active CourseOfferings with Master Lecturer Assignments.
   * Matches by Academic Period, Semester, Course Name, and Section.
   * Properly handles multiple lecturers (Team Teaching).
   */
  public static syncToCourseOfferings(period: AcademicPeriod): SyncOfferingsResult {
    const offerings = StorageService.getCourseOfferings();
    const masterData = StorageService.getMasterLecturerAssignments().filter(
      (d) => !period || (d.academic_period || d.academicPeriod)?.toUpperCase() === period?.toUpperCase()
    );
    const lecturers = StorageService.getLecturers();

    const updatedDetails: SyncOfferingsResult['updatedOfferings'] = [];
    let updatedCount = 0;
    let unchangedCount = 0;

    const updatedOfferings = offerings.map((offering) => {
      if (offering.manualOverride) {
        unchangedCount++;
        return offering;
      }

      // Extract section
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

      const matchedRows = MasterLecturerService.findLecturerAssignments(
        {
          academicPeriod: period,
          semester: offering.semester,
          courseName: offering.courseName || offering.courseCode,
          section: sec || null,
        },
        masterData
      );

      if (matchedRows.length === 0) {
        unchangedCount++;
        return offering;
      }

      const matchedLecturerIds: string[] = [];
      const matchedLecturerNames: string[] = [];
      const matchedLecturerCodes: string[] = [];

      matchedRows.forEach((row) => {
        let lecId = row.lecturer_id || row.lecturerId;
        let lecName = row.raw_lecturer_name || row.rawLecturerName || '';
        let lecCode = row.lecturer_code;

        if (!lecId && lecName) {
          const resolved = resolveLecturerFromMaster(lecName);
          lecId = resolved.lecturerId;
          lecCode = resolved.lecturerCode;
          if (resolved.canonicalName) lecName = resolved.canonicalName;
        }

        if (lecId && !matchedLecturerIds.includes(lecId)) {
          matchedLecturerIds.push(lecId);
          const lecObj = lecturers.find((l) => l.id === lecId);
          if (lecObj) {
            matchedLecturerNames.push(lecObj.name);
            if (lecObj.code) matchedLecturerCodes.push(lecObj.code);
          } else if (lecName) {
            matchedLecturerNames.push(lecName);
          }
        } else if (lecName && !matchedLecturerNames.includes(lecName)) {
          matchedLecturerNames.push(lecName);
        }
      });

      if (matchedLecturerIds.length > 0 || matchedLecturerNames.length > 0) {
        const prevLecNames = offering.lecturerNames || (offering.lecturerId ? [offering.lecturerId] : []);
        const isSame = JSON.stringify(offering.lecturerIds || []) === JSON.stringify(matchedLecturerIds);

        if (!isSame || !offering.lecturerIds || offering.lecturerIds.length === 0) {
          updatedCount++;
          updatedDetails.push({
            offeringId: offering.id,
            courseName: offering.courseName || offering.courseCode || 'Mata Kuliah',
            section: sec || offering.section,
            previousLecturers: prevLecNames,
            newLecturers: matchedLecturerNames,
          });

          return {
            ...offering,
            section: sec || offering.section,
            lecturerIds: matchedLecturerIds,
            lecturerId: matchedLecturerIds[0] || null,
            assignedLecturerId: matchedLecturerIds[0] || null,
            assignedLecturerIds: matchedLecturerIds,
            lecturerNames: matchedLecturerNames,
            lecturerName: matchedLecturerNames[0] || null,
            lecturerCodes: matchedLecturerCodes,
            lecturerCode: matchedLecturerCodes[0] || null,
            status: 'ready' as const,
          };
        }
      }

      unchangedCount++;
      return offering;
    });

    if (updatedCount > 0) {
      StorageService.saveCourseOfferings(updatedOfferings);
    }

    return {
      totalOfferings: offerings.length,
      updatedCount,
      unchangedCount,
      updatedOfferings: updatedDetails,
    };
  }
}
