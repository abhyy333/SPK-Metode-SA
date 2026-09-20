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

export interface ConflictDetectionResult {
  hardConflictsCount: number;
  softConflictsCount: number;
  totalConflictsCount: number;
  totalCost: number;
  items: ConflictItem[];
}

/**
 * DETEKSI KONFLIK PENJADWALAN MATA KULIAH TEKNIK ELEKTRO
 * Berdasarkan:
 * 1. Dosen Pengampu (Hard)
 * 2. Penggunaan Ruangan (Hard)
 * 3. Paket Semester & Schedule Group (Hard: MK satu paket tidak boleh bentrok)
 * 4. Kapasitas Ruangan vs Proyeksi Peserta (expectedEnrollment) (Hard)
 * 5. Ketersediaan Slot Waktu Dosen (Hard)
 * 6. Kesesuaian Tipe & Fasilitas Ruangan (Hard)
 * 7. Distribusi Jadwal Dosen & Paket per Hari (Soft)
 * 8. Preferensi Waktu Dosen & Jam Kuliah Ideal (Soft)
 * 9. Minimasi Perpindahan Ruang Dosen (Soft)
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

  // Index assignments by timeslot, lecturer, room, and scheduleGroup/package
  const schedulesByTimeslot = new Map<string, ScheduleAssignment[]>();
  const schedulesByLecturer = new Map<string, ScheduleAssignment[]>();
  const schedulesByRoom = new Map<string, ScheduleAssignment[]>();

  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    
    // Group by timeslot
    let tsList = schedulesByTimeslot.get(a.timeslotId);
    if (!tsList) {
      tsList = [];
      schedulesByTimeslot.set(a.timeslotId, tsList);
    }
    tsList.push(a);

    // Group by lecturer (support multiple lecturers)
    const assignedLecIds = (a.lecturerIds && a.lecturerIds.length > 0)
      ? a.lecturerIds
      : (a.lecturerId ? [a.lecturerId] : []);

    for (const lid of assignedLecIds) {
      let lecList = schedulesByLecturer.get(lid);
      if (!lecList) {
        lecList = [];
        schedulesByLecturer.set(lid, lecList);
      }
      lecList.push(a);
    }

    // Group by room
    let rList = schedulesByRoom.get(a.roomId);
    if (!rList) {
      rList = [];
      schedulesByRoom.set(a.roomId, rList);
    }
    rList.push(a);
  }

  const conflicts: ConflictItem[] = [];
  let totalCost = 0;
  let hardCount = 0;
  let softCount = 0;

  // Helper to get Schedule Group or Package key for an offering / course
  const getOfferingScheduleGroupKey = (a: ScheduleAssignment): string | null => {
    const off = a.courseOfferingId ? offeringMap.get(a.courseOfferingId) : undefined;
    if (off) {
      if (off.targetScheduleGroup) return off.targetScheduleGroup;
      if (off.semester) {
        const sem = off.semester;
        const kbk = off.kbkId ? `-${off.kbkId}` : '';
        const sec = off.section || off.sectionName || 'A';
        // Semester 1-4 separated by section if specified, else same group
        return `pkg-sem-${sem}${kbk}-sec-${sec}`;
      }
    }
    const c = courseMap.get(a.courseId);
    if (c && c.semester) {
      const kbk = c.kbkIds && c.kbkIds.length > 0 ? `-${c.kbkIds[0]}` : '';
      return `pkg-sem-${c.semester}${kbk}`;
    }
    return null;
  };

  const packageWeight = weights.packageConflictWeight ?? weights.curriculumConflictWeight ?? 100;
  const hardWeight = weights.hardConflictWeight ?? 100;
  const capacityWeight = weights.roomCapacityWeight ?? 80;
  const availabilityWeight = weights.availabilityWeight ?? 80;
  const roomTypeWeight = weights.roomTypeMismatchWeight ?? 70;
  const preferenceWeight = weights.preferenceWeight ?? 15;
  const densityWeight = weights.densityWeight ?? 10;

  // =========================================================================
  // 1. TIMESLOT COLLISION CHECKS (O(k^2) per slot)
  // =========================================================================
  schedulesByTimeslot.forEach((slotAssignments, timeslotId) => {
    const t1 = timeslotMap.get(timeslotId);
    if (!t1 || slotAssignments.length <= 1) return;

    for (let i = 0; i < slotAssignments.length; i++) {
      const a1 = slotAssignments[i];
      const c1 = courseMap.get(a1.courseId);
      const r1 = roomMap.get(a1.roomId);
      const off1 = a1.courseOfferingId ? offeringMap.get(a1.courseOfferingId) : undefined;
      const groupKey1 = getOfferingScheduleGroupKey(a1);

      if (!c1) continue;

      for (let j = i + 1; j < slotAssignments.length; j++) {
        const a2 = slotAssignments[j];
        const c2 = courseMap.get(a2.courseId);
        const r2 = roomMap.get(a2.roomId);
        const off2 = a2.courseOfferingId ? offeringMap.get(a2.courseOfferingId) : undefined;
        const groupKey2 = getOfferingScheduleGroupKey(a2);

        if (!c2) continue;

        // C1: Lecturer Overlap (Dosen mengajar 2 mata kuliah/kelas sekaligus pada slot yang sama)
        const lecs1 = (a1.lecturerIds && a1.lecturerIds.length > 0)
          ? a1.lecturerIds
          : (a1.lecturerId ? [a1.lecturerId] : []);
        const lecs2 = (a2.lecturerIds && a2.lecturerIds.length > 0)
          ? a2.lecturerIds
          : (a2.lecturerId ? [a2.lecturerId] : []);

        for (const lid of lecs1) {
          if (lecs2.includes(lid)) {
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
              description: `Dosen dijadwalkan mengajar 2 kelas bersamaan (${c1.name} [${off1?.section || 'A'}] & ${c2.name} [${off2?.section || 'A'}]) pada ${t1.day}, pukul ${t1.label}.`,
              assignment1Id: a1.id,
              assignment2Id: a2.id,
              course1Name: c1.name,
              course2Name: c2.name,
              involvedEntities: {
                lecturerName: overlapLec?.name,
                timeslotLabel: `${t1.day} ${t1.label}`,
                day: t1.day,
              },
            });
          }
        }

        // C2: Room Overlap (Ruangan dipakai 2 mata kuliah sekaligus di slot sama)
        if (a1.roomId === a2.roomId) {
          hardCount++;
          totalCost += hardWeight;
          conflicts.push({
            id: `c2-${a1.id}-${a2.id}`,
            category: 'ROOM_OVERLAP',
            categoryName: 'C2 — Bentrokan Penggunaan Ruangan',
            isHardConstraint: true,
            severity: 'high',
            penalty: hardWeight,
            title: `Ruangan Bentrok: ${r1?.code || 'Ruangan'}`,
            description: `Ruangan ${r1?.name || r1?.code} digunakan sekaligus oleh ${c1.name} dan ${c2.name} pada ${t1.day}, pukul ${t1.label}.`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              roomCode: r1?.code,
              timeslotLabel: `${t1.day} ${t1.label}`,
              day: t1.day,
            },
          });
        }

        // C3: Schedule Group / Package Overlap (Mata kuliah dalam paket semester yang sama bentrok pada waktu yang sama)
        if (groupKey1 && groupKey2 && groupKey1 === groupKey2 && a1.courseId !== a2.courseId) {
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
            description: `Mata kuliah pada kelompok paket semester yang sama (${groupKey1}) dijadwalkan pada waktu yang bersamaan (${t1.day}, ${t1.label}).`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              packageName: groupKey1,
              timeslotLabel: `${t1.day} ${t1.label}`,
              day: t1.day,
            },
          });
        }
      }
    }
  });

  // =========================================================================
  // 2. ASSIGNMENT-LEVEL CONSTRAINTS (Kapasitas, Ketersediaan Dosen, Tipe Ruang)
  // =========================================================================
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const course = courseMap.get(a.courseId);
    const room = roomMap.get(a.roomId);
    const timeslot = timeslotMap.get(a.timeslotId);
    const off = a.courseOfferingId ? offeringMap.get(a.courseOfferingId) : undefined;

    if (!course || !room || !timeslot) continue;

    // Projected / Expected Enrollment
    const expectedStudents = off?.expectedEnrollment ?? off?.capacity ?? off?.studentCount ?? course.studentCount ?? 35;

    // C4: Room Capacity vs Expected Enrollment (Hard/High Penalty)
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
        description: `Mata kuliah ${course.name} memiliki proyeksi ${expectedStudents} peserta, namun ruangan ${room.name} (${room.code}) hanya berkapasitas ${room.capacity} kursi (kurang ${shortage} kursi). Rekomendasi: Gunakan ruang lebih besar atau pecah menjadi Section B.`,
        assignment1Id: a.id,
        course1Name: course.name,
        involvedEntities: {
          roomCode: room.code,
          studentCount: expectedStudents,
          timeslotLabel: `${timeslot.day} ${timeslot.label}`,
          day: timeslot.day,
        },
      });
    }

    // C5: Lecturer Availability (Hard)
    const assignedLecIds = (a.lecturerIds && a.lecturerIds.length > 0)
      ? a.lecturerIds
      : (a.lecturerId ? [a.lecturerId] : []);

    for (const lid of assignedLecIds) {
      const lecturer = lecturerMap.get(lid);
      if (!lecturer) continue;

      const isDayAvailable = lecturer.availableDays.includes(timeslot.day);
      const isSlotBlocked = lecturer.unavailableSlotIds?.includes(timeslot.id) || false;

      if (!isDayAvailable || isSlotBlocked) {
        hardCount++;
        totalCost += availabilityWeight;
        conflicts.push({
          id: `c5-avail-${a.id}-${lid}`,
          category: 'LECTURER_UNAVAILABLE',
          categoryName: 'C5 — Dosen Tidak Bersedia pada Waktu Ini',
          isHardConstraint: true,
          severity: 'high',
          penalty: availabilityWeight,
          title: `Dosen Tidak Tersedia: ${lecturer.name}`,
          description: `Dosen ${lecturer.name} tidak bersedia mengajar pada hari ${timeslot.day} (${timeslot.label}) untuk mata kuliah ${course.name}.`,
          assignment1Id: a.id,
          course1Name: course.name,
          involvedEntities: {
            lecturerName: lecturer.name,
            timeslotLabel: `${timeslot.day} ${timeslot.label}`,
            day: timeslot.day,
          },
        });
      }

      // Soft: Lecturer Preferences (Day / Time preference)
      if (lecturer.preferences) {
        const dayPref = lecturer.preferences.dayPreferences?.[timeslot.day];
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
            description: `Dosen ${lecturer.name} memilih untuk menghindari hari ${timeslot.day}.`,
            assignment1Id: a.id,
            course1Name: course.name,
            involvedEntities: {
              lecturerName: lecturer.name,
              day: timeslot.day,
            },
          });
        }
      }
    }

    // C6: Room Type & Equipment Compatibility (Hard)
    const requiredType = off?.requiredRoomType || (course.type === 'Praktikum' ? 'Laboratorium' : 'Kelas');
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
        title: `Tipe Ruang Tidak Sesuai: ${course.name}`,
        description: `Mata kuliah memerlukan ruang bertipe Laboratorium, namun dijadwalkan di ${room.name} (${room.type}).`,
        assignment1Id: a.id,
        course1Name: course.name,
        involvedEntities: {
          roomCode: room.code,
          day: timeslot.day,
        },
      });
    }

    // Soft: Undesirable Late Slot (slot 5, jam sore/malam)
    if (timeslot.slotIndex >= 5) {
      softCount++;
      totalCost += preferenceWeight * 0.5;
    }
  }

  // =========================================================================
  // 3. SOFT CONSTRAINTS: LECTURER WORKLOAD DENSITY & ROOM HOPPING
  // =========================================================================
  schedulesByLecturer.forEach((lecAssignments, lecturerId) => {
    const lecturer = lecturerMap.get(lecturerId);
    if (!lecturer) return;

    // Group by day
    const dayAssignments = new Map<string, ScheduleAssignment[]>();
    for (const a of lecAssignments) {
      const ts = timeslotMap.get(a.timeslotId);
      if (!ts) continue;
      let list = dayAssignments.get(ts.day);
      if (!list) {
        list = [];
        dayAssignments.set(ts.day, list);
      }
      list.push(a);
    }

    // Check overload per day (> 3 assignments in 1 day)
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
          description: `Dosen ${lecturer.name} mengajar ${dayList.length} sesi perkuliahan pada hari ${day}.`,
          assignment1Id: dayList[0].id,
          involvedEntities: {
            lecturerName: lecturer.name,
            day: day as any,
          },
        });
      }

      // Check room hopping (different rooms on consecutive slots)
      const usedRooms = new Set(dayList.map(a => a.roomId));
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
