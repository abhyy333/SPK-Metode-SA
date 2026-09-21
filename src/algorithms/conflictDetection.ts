import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConflictItem,
  ConstraintWeights,
  CurriculumPackage,
  CourseOffering,
  ScheduleGroup,
} from '../types';
import {
  calculateCourseTiming,
  CourseTimingInfo,
  doTimeIntervalsOverlap,
} from '../utils/sessionUtils';

export interface ConflictDetectionResult {
  hardConflictsCount: number;
  softConflictsCount: number;
  totalConflictsCount: number;
  totalCost: number;
  items: ConflictItem[];
}

/**
 * DETEKSI KONFLIK PENJADWALAN MATA KULIAH TEKNIK ELEKTRO
 * Berdasarkan Multi-Session Interval Overlap (1 SKS = 50 Menit = 1 Sesi):
 * 1. Validasi Batas Sesi Hari (Hard: SKS tidak boleh melebihi sesi terakhir hari)
 * 2. Dosen Pengampu (Hard: Tidak boleh overlap di salah satu sesi yang ditempati)
 * 3. Penggunaan Ruangan (Hard: Ruangan tidak boleh overlap di salah satu sesi)
 * 4. Paket Semester & Schedule Group (Hard: MK satu paket tidak boleh bentrok)
 * 5. Kapasitas Ruangan vs Proyeksi Peserta (expectedEnrollment) (Hard)
 * 6. Ketersediaan Slot Waktu Dosen sepanjang durasi SKS (Hard)
 * 7. Kesesuaian Tipe & Fasilitas Ruangan (Hard)
 * 8. Distribusi Jadwal Dosen & Paket per Hari (Soft)
 * 9. Preferensi Waktu Dosen & Jam Kuliah Ideal (Soft)
 * 10. Minimasi Perpindahan Ruang Dosen (Soft)
 */
export function detectConflicts(
  assignments: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[] = [],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights,
  _students: any[] = [],
  _enrollments: any[] = [],
  curriculumPackages: CurriculumPackage[] = [],
  offerings: CourseOffering[] = []
): ConflictDetectionResult {
  // Pre-build O(1) entity lookup maps
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  courses.forEach(c => {
    if (c.code) courseMap.set(c.code, c);
  });

  const lecturerMap = new Map<string, Lecturer>(lecturers.map(l => [l.id, l]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const timeslotMap = new Map<string, Timeslot>(timeslots.map(t => [t.id, t]));
  const offeringMap = new Map<string, CourseOffering>(offerings.map(o => [o.id, o]));
  const packageMap = new Map<string, CurriculumPackage>(curriculumPackages.map(p => [p.id, p]));

  // Precompute CourseTimingInfo for each assignment
  interface AssignmentWithTiming {
    assignment: ScheduleAssignment;
    course: Course;
    startTimeslot: Timeslot;
    timing: CourseTimingInfo;
    offering?: CourseOffering;
    lecturerIds: string[];
    scheduleGroupKey: string | null;
  }

  const validAssignments: AssignmentWithTiming[] = [];
  const assignmentsByDay = new Map<string, AssignmentWithTiming[]>();
  const schedulesByLecturer = new Map<string, AssignmentWithTiming[]>();

  const conflicts: ConflictItem[] = [];
  let totalCost = 0;
  let hardCount = 0;
  let softCount = 0;

  const packageWeight = weights.packageConflictWeight ?? weights.curriculumConflictWeight ?? 100;
  const hardWeight = weights.hardConflictWeight ?? 100;
  const capacityWeight = weights.roomCapacityWeight ?? 80;
  const availabilityWeight = weights.availabilityWeight ?? 80;
  const roomTypeWeight = weights.roomTypeMismatchWeight ?? 70;
  const preferenceWeight = weights.preferenceWeight ?? 15;
  const densityWeight = weights.densityWeight ?? 10;

  // Helper to get Schedule Group or Package key for an offering / course
  const getOfferingScheduleGroupKey = (a: ScheduleAssignment, off?: CourseOffering, c?: Course): string | null => {
    if (off) {
      if (off.targetScheduleGroup) return off.targetScheduleGroup;
      if (off.semester) {
        const sem = off.semester;
        const kbk = off.kbkId ? `-${off.kbkId}` : '';
        const sec = off.section || off.sectionName || 'A';
        return `pkg-sem-${sem}${kbk}-sec-${sec}`;
      }
    }
    if (c && c.semester) {
      const kbk = c.kbkIds && c.kbkIds.length > 0 ? `-${c.kbkIds[0]}` : '';
      return `pkg-sem-${c.semester}${kbk}`;
    }
    return null;
  };

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const cObj = courseMap.get(a.courseId);
    if (
      cObj &&
      (cObj.isSchedulable === false ||
        (cObj as any).is_schedulable === false ||
        (cObj as any).dijadwalkanJurusan === false ||
        (cObj.name || '').trim().toUpperCase() === 'KKN')
    ) {
      continue;
    }

    const startTimeslot = timeslotMap.get(a.timeslotId);
    if (!startTimeslot || !cObj) continue;

    const off = a.courseOfferingId ? offeringMap.get(a.courseOfferingId) : undefined;
    const rawSks = a.sks || off?.sks || off?.credits || cObj.sks || cObj.credits || 2;
    const sks = Math.max(1, Math.round(rawSks));
    const timing = calculateCourseTiming(startTimeslot, sks, timeslots);

    const assignedLecIds =
      a.lecturerIds && a.lecturerIds.length > 0
        ? a.lecturerIds
        : a.lecturerId
        ? [a.lecturerId]
        : [];

    const groupKey = getOfferingScheduleGroupKey(a, off, cObj);

    const item: AssignmentWithTiming = {
      assignment: a,
      course: cObj,
      startTimeslot,
      timing,
      offering: off,
      lecturerIds: assignedLecIds,
      scheduleGroupKey: groupKey,
    };

    validAssignments.push(item);

    // Group by day
    const day = startTimeslot.day;
    let dayList = assignmentsByDay.get(day);
    if (!dayList) {
      dayList = [];
      assignmentsByDay.set(day, dayList);
    }
    dayList.push(item);

    // Group by lecturer
    for (const lid of assignedLecIds) {
      let lecList = schedulesByLecturer.get(lid);
      if (!lecList) {
        lecList = [];
        schedulesByLecturer.set(lid, lecList);
      }
      lecList.push(item);
    }

    // =========================================================================
    // CONSTRAINT C0: VALIDASI BATAS HARI (Day Boundary Exceeded)
    // =========================================================================
    if (!timing.isValidWithinDay) {
      hardCount++;
      totalCost += hardWeight * 2;
      conflicts.push({
        id: `c0-boundary-${a.id}`,
        category: 'DAY_BOUNDARY_EXCEEDED',
        categoryName: 'C0 — Batas Sesi Hari Terlampaui',
        isHardConstraint: true,
        severity: 'high',
        penalty: hardWeight * 2,
        title: `Durasi SKS Melampaui Hari: ${cObj.name}`,
        description: `Mata kuliah ${cObj.name} (${sks} SKS) dimulai pada ${startTimeslot.label} tetapi membutuhkan ${sks} sesi berurutan (sampai ${timing.endTime}) yang melebihi batas sesi perkuliahan aktif hari ${startTimeslot.day}.`,
        assignment1Id: a.id,
        course1Name: cObj.name,
        involvedEntities: {
          timeslotLabel: `${startTimeslot.day} ${timing.fullLabel}`,
          day: startTimeslot.day,
        },
      });
    }

    // =========================================================================
    // CONSTRAINT C4: ROOM CAPACITY vs EXPECTED ENROLLMENT
    // =========================================================================
    const room = roomMap.get(a.roomId);
    if (room) {
      const expectedStudents =
        off?.expectedEnrollment ??
        off?.capacity ??
        off?.studentCount ??
        cObj.studentCount ??
        35;

      if (room.capacity < expectedStudents) {
        const shortage = expectedStudents - room.capacity;
        hardCount++;
        totalCost += capacityWeight;
        conflicts.push({
          id: `c4-cap-${a.id}`,
          category: 'ROOM_CAPACITY',
          categoryName: 'C4 — Kapasitas Ruangan Tidak Cukup',
          isHardConstraint: true,
          severity: 'high',
          penalty: capacityWeight,
          title: `Kapasitas Ruang Kurang: ${room.code} (${room.capacity} kursi)`,
          description: `Mata kuliah ${cObj.name} memiliki proyeksi ${expectedStudents} peserta, namun ruangan ${room.name} (${room.code}) hanya berkapasitas ${room.capacity} kursi (kurang ${shortage} kursi).`,
          assignment1Id: a.id,
          course1Name: cObj.name,
          involvedEntities: {
            roomCode: room.code,
            studentCount: expectedStudents,
            timeslotLabel: `${startTimeslot.day} ${timing.fullLabel}`,
            day: startTimeslot.day,
          },
        });
      }
    }

    // =========================================================================
    // CONSTRAINT C5: LECTURER AVAILABILITY ACROSS ENTIRE DURATION
    // =========================================================================
    for (const lid of assignedLecIds) {
      const lecturer = lecturerMap.get(lid);
      if (!lecturer) continue;

      const isDayAvailable = lecturer.availableDays.includes(startTimeslot.day);
      const unavailableOccupied = timing.occupiedSlotIds.filter((slotId) =>
        lecturer.unavailableSlotIds?.includes(slotId)
      );

      if (!isDayAvailable || unavailableOccupied.length > 0) {
        hardCount++;
        totalCost += availabilityWeight;
        const conflictSessionLabel =
          unavailableOccupied.length > 0
            ? unavailableOccupied
                .map((sId) => timeslotMap.get(sId)?.label || sId)
                .join(', ')
            : startTimeslot.day;

        conflicts.push({
          id: `c5-avail-${a.id}-${lid}`,
          category: 'LECTURER_UNAVAILABLE',
          categoryName: 'C5 — Dosen Tidak Bersedia pada Waktu Ini',
          isHardConstraint: true,
          severity: 'high',
          penalty: availabilityWeight,
          title: `Dosen Tidak Tersedia: ${lecturer.name}`,
          description: `Dosen ${lecturer.name} tidak bersedia mengajar pada ${startTimeslot.day} (${timing.sessionRangeLabel}, ${conflictSessionLabel}) untuk mata kuliah ${cObj.name}.`,
          assignment1Id: a.id,
          course1Name: cObj.name,
          involvedEntities: {
            lecturerName: lecturer.name,
            timeslotLabel: `${startTimeslot.day} ${timing.fullLabel}`,
            day: startTimeslot.day,
          },
        });
      }

      // Soft: Lecturer Day Preferences
      if (lecturer.preferences) {
        const dayPref = lecturer.preferences.dayPreferences?.[startTimeslot.day];
        if (dayPref === 'avoid') {
          softCount++;
          totalCost += preferenceWeight;
          conflicts.push({
            id: `s-pref-day-${a.id}-${lid}`,
            category: 'LECTURER_PREFERENCE_DAY',
            categoryName: 'S1 — Di Luar Preferensi Hari Dosen',
            isHardConstraint: false,
            severity: 'low',
            penalty: preferenceWeight,
            title: `Preferensi Hari Dosen: ${lecturer.name}`,
            description: `Dosen ${lecturer.name} memilih untuk menghindari hari ${startTimeslot.day}.`,
            assignment1Id: a.id,
            course1Name: cObj.name,
            involvedEntities: {
              lecturerName: lecturer.name,
              day: startTimeslot.day,
            },
          });
        }
      }
    }

    // =========================================================================
    // CONSTRAINT C6: ROOM TYPE COMPATIBILITY
    // =========================================================================
    if (room) {
      const requiredType =
        off?.requiredRoomType || (cObj.type === 'Praktikum' ? 'Laboratorium' : 'Kelas');
      if (requiredType === 'Laboratorium' && room.type !== 'Laboratorium') {
        hardCount++;
        totalCost += roomTypeWeight;
        conflicts.push({
          id: `c6-type-${a.id}`,
          category: 'ROOM_TYPE_MISMATCH',
          categoryName: 'C6 — Ketidaksesuaian Tipe Ruangan',
          isHardConstraint: true,
          severity: 'medium',
          penalty: roomTypeWeight,
          title: `Tipe Ruang Tidak Sesuai: ${cObj.name}`,
          description: `Mata kuliah memerlukan ruang bertipe Laboratorium, namun dialokasikan di ${room.name} (${room.type}).`,
          assignment1Id: a.id,
          course1Name: cObj.name,
          involvedEntities: {
            roomCode: room.code,
            day: startTimeslot.day,
          },
        });
      }
    }

    // Soft: Undesirable Late Slot (berakhir setelah 17:00)
    if (timing.endTime > '17:00') {
      softCount++;
      totalCost += preferenceWeight * 0.5;
    }
  }

  // =========================================================================
  // MULTI-SESSION INTERVAL OVERLAP CHECKS PER DAY (Dosen, Ruangan, Paket, Kelas)
  // Evaluates every pair on the same day for session overlap
  // =========================================================================
  assignmentsByDay.forEach((dayItems, day) => {
    if (dayItems.length <= 1) return;

    for (let i = 0; i < dayItems.length; i++) {
      const item1 = dayItems[i];
      const a1 = item1.assignment;
      const c1 = item1.course;
      const t1 = item1.startTimeslot;
      const timing1 = item1.timing;
      const slots1 = timing1.occupiedSlotIds;

      for (let j = i + 1; j < dayItems.length; j++) {
        const item2 = dayItems[j];
        const a2 = item2.assignment;
        const c2 = item2.course;
        const t2 = item2.startTimeslot;
        const timing2 = item2.timing;
        const slots2 = timing2.occupiedSlotIds;

        // Check if the two multi-session intervals overlap
        const overlappingSlotIds = slots1.filter((id) => slots2.includes(id));
        const hasSessionOverlap =
          overlappingSlotIds.length > 0 ||
          doTimeIntervalsOverlap(
            timing1.startTime,
            timing1.endTime,
            timing2.startTime,
            timing2.endTime
          );

        if (!hasSessionOverlap) continue;

        // Format overlapping sessions for clear message
        const overlapSlots = overlappingSlotIds
          .map((id) => timeslotMap.get(id))
          .filter((t): t is Timeslot => Boolean(t));
        const overlapPeriodDesc =
          overlapSlots.length > 0
            ? overlapSlots.map((ts) => ts.sessionLabel || ts.label).join(', ')
            : `${Math.max(
                timing1.startSessionNumber,
                timing2.startSessionNumber
              )}–${Math.min(timing1.endSessionNumber, timing2.endSessionNumber)}`;

        // C1: Lecturer Overlap (Dosen mengajar 2 kelas/mata kuliah yang overlap sesinya)
        const commonLecturers = item1.lecturerIds.filter((lid) =>
          item2.lecturerIds.includes(lid)
        );

        for (const lid of commonLecturers) {
          const overlapLec = lecturerMap.get(lid);
          hardCount++;
          totalCost += hardWeight;
          conflicts.push({
            id: `c1-${a1.id}-${a2.id}-${lid}`,
            category: 'LECTURER_OVERLAP',
            categoryName: 'C1 — Bentrokan Dosen Pengampu',
            isHardConstraint: true,
            severity: 'high',
            penalty: hardWeight,
            title: `Dosen Bentrok: ${overlapLec?.name || 'Dosen'}`,
            description: `Dosen ${overlapLec?.name} dijadwalkan mengajar 2 kelas bersamaan yang saling bertabrakan: ${c1.name} [${timing1.sessionRangeLabel}, ${timing1.timeRangeLabel}] & ${c2.name} [${timing2.sessionRangeLabel}, ${timing2.timeRangeLabel}] pada ${day} (overlap di ${overlapPeriodDesc}).`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              lecturerName: overlapLec?.name,
              timeslotLabel: `${day} (${timing1.timeRangeLabel} vs ${timing2.timeRangeLabel})`,
              day: day as any,
            },
          });
        }

        // C2: Room Overlap (Ruangan yang sama dipakai bersamaan)
        if (a1.roomId === a2.roomId) {
          const rObj = roomMap.get(a1.roomId);
          hardCount++;
          totalCost += hardWeight;
          conflicts.push({
            id: `c2-${a1.id}-${a2.id}`,
            category: 'ROOM_OVERLAP',
            categoryName: 'C2 — Bentrokan Penggunaan Ruangan',
            isHardConstraint: true,
            severity: 'high',
            penalty: hardWeight,
            title: `Ruangan Bentrok: ${rObj?.code || 'Ruangan'}`,
            description: `Ruangan ${rObj?.name || rObj?.code} digunakan bersamaan oleh ${c1.name} [${timing1.sessionRangeLabel}] dan ${c2.name} [${timing2.sessionRangeLabel}] pada ${day} (overlap di ${overlapPeriodDesc}).`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              roomCode: rObj?.code,
              timeslotLabel: `${day} (${timing1.timeRangeLabel} vs ${timing2.timeRangeLabel})`,
              day: day as any,
            },
          });
        }

        // C3: Schedule Group / Package Overlap (Mata kuliah dalam paket semester sama bertabrakan)
        if (
          item1.scheduleGroupKey &&
          item2.scheduleGroupKey &&
          item1.scheduleGroupKey === item2.scheduleGroupKey &&
          a1.courseId !== a2.courseId
        ) {
          hardCount++;
          totalCost += packageWeight;
          conflicts.push({
            id: `c3-pkg-${a1.id}-${a2.id}`,
            category: 'PACKAGE_OVERLAP',
            categoryName: 'C3 — Bentrokan Paket Semester / Schedule Group',
            isHardConstraint: true,
            severity: 'high',
            penalty: packageWeight,
            title: `Bentrokan Paket Semester: ${c1.name} & ${c2.name}`,
            description: `Mata kuliah pada paket semester yang sama (${item1.scheduleGroupKey}) memiliki jadwal yang saling bertabrakan: ${c1.name} [${timing1.sessionRangeLabel}] dan ${c2.name} [${timing2.sessionRangeLabel}] pada ${day} (overlap di ${overlapPeriodDesc}).`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              packageName: item1.scheduleGroupKey,
              timeslotLabel: `${day} (${timing1.timeRangeLabel} vs ${timing2.timeRangeLabel})`,
              day: day as any,
            },
          });
        }

        // Class Overlap (Kelas yang sama dijadwalkan bersamaan)
        if (a1.classId && a2.classId && a1.classId === a2.classId && a1.courseId !== a2.courseId) {
          hardCount++;
          totalCost += hardWeight;
          conflicts.push({
            id: `c-class-${a1.id}-${a2.id}`,
            category: 'CLASS_OVERLAP',
            categoryName: 'C — Bentrokan Kelas Mahasiswa',
            isHardConstraint: true,
            severity: 'high',
            penalty: hardWeight,
            title: `Bentrokan Kelas: ${c1.name} & ${c2.name}`,
            description: `Rombongan kelas mahasiswa yang sama memiliki 2 perkuliahan yang bertabrakan pada hari ${day} (overlap di ${overlapPeriodDesc}).`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              timeslotLabel: `${day} (${timing1.timeRangeLabel} vs ${timing2.timeRangeLabel})`,
              day: day as any,
            },
          });
        }
      }
    }
  });

  // =========================================================================
  // SOFT CONSTRAINTS: LECTURER WORKLOAD DENSITY & ROOM HOPPING
  // =========================================================================
  schedulesByLecturer.forEach((lecItems, lecturerId) => {
    const lecturer = lecturerMap.get(lecturerId);
    if (!lecturer) return;

    // Group by day
    const dayAssignments = new Map<string, AssignmentWithTiming[]>();
    for (const it of lecItems) {
      const day = it.startTimeslot.day;
      let list = dayAssignments.get(day);
      if (!list) {
        list = [];
        dayAssignments.set(day, list);
      }
      list.push(it);
    }

    // Check overload per day (> 3 courses in 1 day)
    dayAssignments.forEach((dayList, day) => {
      if (dayList.length > 3) {
        softCount++;
        const penalty = densityWeight * (dayList.length - 3);
        totalCost += penalty;
        conflicts.push({
          id: `s-lec-density-${lecturerId}-${day}`,
          category: 'LECTURER_DENSITY',
          categoryName: 'S2 — Beban Mengajar Dosen Terlalu Padat dalam 1 Hari',
          isHardConstraint: false,
          severity: 'low',
          penalty,
          title: `Beban Dosen Padat: ${lecturer.name} (${dayList.length} kelas)`,
          description: `Dosen ${lecturer.name} mengajar ${dayList.length} mata kuliah perkuliahan pada hari ${day}.`,
          assignment1Id: dayList[0].assignment.id,
          involvedEntities: {
            lecturerName: lecturer.name,
            day: day as any,
          },
        });
      }

      // Check room hopping (different rooms on consecutive slots)
      const usedRooms = new Set(dayList.map((it) => it.assignment.roomId));
      if (usedRooms.size > 2 && dayList.length >= 3) {
        softCount++;
        totalCost += preferenceWeight * 0.5;
      }
    });
  });

  return {
    hardConflictsCount: hardCount,
    softConflictsCount: softCount,
    totalConflictsCount: conflicts.length,
    totalCost,
    items: conflicts,
  };
}
