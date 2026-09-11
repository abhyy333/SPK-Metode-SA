import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConflictItem,
  ConstraintWeights,
  Student,
  StudentEnrollment,
  CurriculumPackage,
} from '../types';

export interface ConflictDetectionResult {
  hardConflictsCount: number;
  softConflictsCount: number;
  totalConflictsCount: number;
  totalCost: number;
  items: ConflictItem[];
}

export function detectConflicts(
  assignments: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights,
  students: Student[] = [],
  enrollments: StudentEnrollment[] = [],
  curriculumPackages: CurriculumPackage[] = []
): ConflictDetectionResult {
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  const timerLabel = `conflictDetection_${Math.random().toString(36).substring(2, 6)}`;
  
  if (isDev && typeof console !== 'undefined' && console.time) {
    console.time('conflictDetection');
  }

  // Pre-build O(1) entity lookup maps
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const lecturerMap = new Map<string, Lecturer>(lecturers.map(l => [l.id, l]));
  const classMap = new Map<string, ClassGroup>(classes.map(cl => [cl.id, cl]));
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const timeslotMap = new Map<string, Timeslot>(timeslots.map(t => [t.id, t]));
  const studentMap = new Map<string, Student>(students.map(s => [s.id, s]));

  // Build indexed lookups:
  // 1. schedulesByTimeslot
  // 2. schedulesByLecturer
  // 3. schedulesByRoom
  // 4. schedulesByClass
  // 5. enrollmentsByStudent
  const schedulesByTimeslot = new Map<string, ScheduleAssignment[]>();
  const schedulesByLecturer = new Map<string, ScheduleAssignment[]>();
  const schedulesByRoom = new Map<string, ScheduleAssignment[]>();
  const schedulesByClass = new Map<string, ScheduleAssignment[]>();

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

    // Group by class
    let cList = schedulesByClass.get(a.classId);
    if (!cList) {
      cList = [];
      schedulesByClass.set(a.classId, cList);
    }
    cList.push(a);
  }

  // Index enrollments by student
  const enrollmentsByStudent = new Map<string, StudentEnrollment[]>();
  for (let i = 0; i < enrollments.length; i++) {
    const e = enrollments[i];
    let list = enrollmentsByStudent.get(e.studentId);
    if (!list) {
      list = [];
      enrollmentsByStudent.set(e.studentId, list);
    }
    list.push(e);
  }

  // Build mapping of courseId -> Set of studentIds
  const courseStudentsMap = new Map<string, Set<string>>();
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    if (s.enrolledCourseIds) {
      for (let j = 0; j < s.enrolledCourseIds.length; j++) {
        const cId = s.enrolledCourseIds[j];
        let set = courseStudentsMap.get(cId);
        if (!set) {
          set = new Set();
          courseStudentsMap.set(cId, set);
        }
        set.add(s.id);
      }
    }
  }

  for (let i = 0; i < enrollments.length; i++) {
    const e = enrollments[i];
    if (e.status === 'enrolled') {
      let set = courseStudentsMap.get(e.courseId);
      if (!set) {
        set = new Set();
        courseStudentsMap.set(e.courseId, set);
      }
      set.add(e.studentId);
    }
  }

  const conflicts: ConflictItem[] = [];
  let totalCost = 0;
  let hardCount = 0;
  let softCount = 0;

  // 1. Indexed Timeslot Collision Checks (O(Σ k_slot^2) instead of O(N^2))
  schedulesByTimeslot.forEach((slotAssignments, timeslotId) => {
    const t1 = timeslotMap.get(timeslotId);
    if (!t1 || slotAssignments.length <= 1) return;

    for (let i = 0; i < slotAssignments.length; i++) {
      const a1 = slotAssignments[i];
      const c1 = courseMap.get(a1.courseId);
      const l1 = a1.lecturerId ? lecturerMap.get(a1.lecturerId) : undefined;
      const cl1 = classMap.get(a1.classId);
      const r1 = roomMap.get(a1.roomId);

      if (!c1) continue;

      for (let j = i + 1; j < slotAssignments.length; j++) {
        const a2 = slotAssignments[j];
        const c2 = courseMap.get(a2.courseId);
        const cl2 = classMap.get(a2.classId);
        const r2 = roomMap.get(a2.roomId);

        if (!c2) continue;

        // C1: Lecturer Overlap (Dosen mengajar 2 matkul sekaligus di slot sama)
        const lecs1 = (a1.lecturerIds && a1.lecturerIds.length > 0)
          ? a1.lecturerIds
          : (a1.lecturerId ? [a1.lecturerId] : []);
        const lecs2 = (a2.lecturerIds && a2.lecturerIds.length > 0)
          ? a2.lecturerIds
          : (a2.lecturerId ? [a2.lecturerId] : []);

        for (const lid of lecs1) {
          if (lecs2.includes(lid)) {
            const overlapLec = lecturerMap.get(lid);
            const penalty = weights.hardConflictWeight;
            hardCount++;
            totalCost += penalty;
            conflicts.push({
              id: `c1-${a1.id}-${a2.id}-${lid}`,
              category: 'LECTURER_OVERLAP',
              categoryName: 'C1 — Konflik Dosen Pengampu',
              isHardConstraint: true,
              severity: 'high',
              penalty,
              title: `Bentrokan Dosen: ${overlapLec?.name || 'Dosen'}`,
              description: `Dosen dijadwalkan mengajar 2 mata kuliah bersamaan (${c1.name} & ${c2.name}) pada ${t1.day}, pukul ${t1.label}.`,
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

        // C2: Room Overlap (Ruangan dipakai 2 matkul sekaligus di slot sama)
        if (a1.roomId === a2.roomId) {
          const penalty = weights.hardConflictWeight;
          hardCount++;
          totalCost += penalty;
          conflicts.push({
            id: `c2-${a1.id}-${a2.id}`,
            category: 'ROOM_OVERLAP',
            categoryName: 'C2 — Konflik Penggunaan Ruangan',
            isHardConstraint: true,
            severity: 'high',
            penalty,
            title: `Bentrokan Ruangan: ${r1?.code || 'Ruangan'}`,
            description: `Ruangan ${r1?.name || r1?.code} digunakan sekaligus oleh ${c1.name} (${cl1?.code}) dan ${c2.name} (${cl2?.code}) pada ${t1.day}, pukul ${t1.label}.`,
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

        // C3: Class Overlap (Kelas mengikuti 2 matkul sekaligus di slot sama)
        if (a1.classId === a2.classId) {
          const penalty = weights.hardConflictWeight;
          hardCount++;
          totalCost += penalty;
          conflicts.push({
            id: `c3-${a1.id}-${a2.id}`,
            category: 'CLASS_OVERLAP',
            categoryName: 'C3 — Konflik Jadwal Kelas',
            isHardConstraint: true,
            severity: 'high',
            penalty,
            title: `Bentrokan Kelas: ${cl1?.code || 'Kelas'}`,
            description: `Rombel kelas ${cl1?.code} memiliki 2 jadwal kuliah bersamaan (${c1.name} & ${c2.name}) pada ${t1.day}, pukul ${t1.label}.`,
            assignment1Id: a1.id,
            assignment2Id: a2.id,
            course1Name: c1.name,
            course2Name: c2.name,
            involvedEntities: {
              className: cl1?.name || cl1?.code,
              timeslotLabel: `${t1.day} ${t1.label}`,
              day: t1.day,
            },
          });
        }

        // C4: Student Overlap (Mahasiswa mengambil 2 mata kuliah bersamaan)
        const stdSet1 = courseStudentsMap.get(a1.courseId);
        const stdSet2 = courseStudentsMap.get(a2.courseId);
        if (stdSet1 && stdSet2) {
          const overlappingStudentIds: string[] = [];
          stdSet1.forEach(sId => {
            if (stdSet2.has(sId)) overlappingStudentIds.push(sId);
          });

          if (overlappingStudentIds.length > 0) {
            const penalty = (weights.studentConflictWeight || 100) * overlappingStudentIds.length;
            hardCount += overlappingStudentIds.length;
            totalCost += penalty;
            const sampleNames = overlappingStudentIds
              .slice(0, 3)
              .map(id => studentMap.get(id)?.name || id)
              .join(', ');
            const moreText = overlappingStudentIds.length > 3 ? ` dan ${overlappingStudentIds.length - 3} lainnya` : '';
            
            const retakeCount = overlappingStudentIds.filter(sId => {
              return enrollments.some(e => e.studentId === sId && (e.courseId === a1.courseId || e.courseId === a2.courseId) && (e.isRetake || e.status === 'retake'));
            }).length;

            const retakeInfo = retakeCount > 0 ? ` [Termasuk ${retakeCount} mahasiswa mengulang/retake]` : '';

            conflicts.push({
              id: `c-std-${a1.id}-${a2.id}`,
              category: 'STUDENT_OVERLAP',
              categoryName: retakeCount > 0 ? 'C4 — Konflik Mahasiswa & Retake (Bentrokan KRS)' : 'C4 — Konflik Mahasiswa (Bentrokan KRS)',
              isHardConstraint: true,
              severity: 'high',
              penalty,
              title: `Bentrokan Jadwal Mahasiswa (${overlappingStudentIds.length} Mahasiswa${retakeInfo})`,
              description: `${overlappingStudentIds.length} mahasiswa (${sampleNames}${moreText})${retakeCount > 0 ? ` (dengan ${retakeCount} mahasiswa mengulang)` : ''} mengambil mata kuliah ${c1.name} dan ${c2.name} yang dijadwalkan bersamaan pada ${t1.day} (${t1.label}).`,
              assignment1Id: a1.id,
              assignment2Id: a2.id,
              course1Name: c1.name,
              course2Name: c2.name,
              involvedEntities: {
                studentCount: overlappingStudentIds.length,
                timeslotLabel: `${t1.day} ${t1.label}`,
                day: t1.day,
              },
            });
          }
        }

        // C5: Curriculum Package Conflict
        if (curriculumPackages.length > 0) {
          for (let pIdx = 0; pIdx < curriculumPackages.length; pIdx++) {
            const pkg = curriculumPackages[pIdx];
            const inPkg1 = pkg.courseIds.includes(c1.id) || pkg.courseIds.includes(c1.code);
            const inPkg2 = pkg.courseIds.includes(c2.id) || pkg.courseIds.includes(c2.code);
            if (inPkg1 && inPkg2) {
              const penalty = weights.curriculumConflictWeight || 70;
              softCount++;
              totalCost += penalty;
              conflicts.push({
                id: `c-curric-${pkg.id}-${a1.id}-${a2.id}`,
                category: 'CURRICULUM_CONFLICT',
                categoryName: 'C5 — Konflik Paket Kurikulum / KBK',
                isHardConstraint: false,
                severity: 'high',
                penalty,
                title: `Bentrokan Paket Kurikulum: ${pkg.name}`,
                description: `Mata kuliah ${c1.name} dan ${c2.name} berada pada paket kurikulum yang sama (${pkg.name}), sehingga mahasiswa peminatan ini tidak dapat mengambil keduanya.`,
                assignment1Id: a1.id,
                assignment2Id: a2.id,
                course1Name: c1.name,
                course2Name: c2.name,
                involvedEntities: {
                  packageName: pkg.name,
                  timeslotLabel: `${t1.day} ${t1.label}`,
                  day: t1.day,
                },
              });
            }
          }
        }
      }
    }
  });

  // 2. Individual Single Assignment Constraints (O(N) linear pass)
  for (let i = 0; i < assignments.length; i++) {
    const a1 = assignments[i];
    const c1 = courseMap.get(a1.courseId);
    const l1 = a1.lecturerId ? lecturerMap.get(a1.lecturerId) : undefined;
    const cl1 = classMap.get(a1.classId);
    const r1 = roomMap.get(a1.roomId);
    const t1 = timeslotMap.get(a1.timeslotId);

    if (!c1 || !t1) continue;

    // C6: Kapasitas Ruangan (Mahasiswa > Kapasitas Ruang)
    if (r1 && c1.studentCount > r1.capacity) {
      const penalty = weights.roomCapacityWeight;
      hardCount++;
      totalCost += penalty;
      conflicts.push({
        id: `c6-${a1.id}`,
        category: 'ROOM_CAPACITY',
        categoryName: 'C6 — Kapasitas Ruangan Terlampaui',
        isHardConstraint: true,
        severity: 'high',
        penalty,
        title: `Kelebihan Kapasitas: ${r1.code} (${r1.capacity} Kursi)`,
        description: `Mata kuliah ${c1.name} dengan ${c1.studentCount} mahasiswa ditempatkan di ${r1.name} yang hanya berkapasitas ${r1.capacity} mahasiswa (Kekurangan ${c1.studentCount - r1.capacity} kursi).`,
        assignment1Id: a1.id,
        course1Name: c1.name,
        involvedEntities: {
          roomCode: r1.code,
          className: cl1?.code,
          timeslotLabel: `${t1?.day} ${t1?.label}`,
        },
      });
    }

    // C7: Ketersediaan Dosen (Hari tidak tersedia atau slot ditandai tidak tersedia)
    const assignedLecIds = (a1.lecturerIds && a1.lecturerIds.length > 0)
      ? a1.lecturerIds
      : (a1.lecturerId ? [a1.lecturerId] : []);

    for (const lid of assignedLecIds) {
      const lec = lecturerMap.get(lid);
      if (lec) {
        const isDayUnavailable = !lec.availableDays.includes(t1.day);
        const isSlotUnavailable = Boolean(lec.unavailableSlotIds && lec.unavailableSlotIds.includes(t1.id));
        
        if (isDayUnavailable || isSlotUnavailable) {
          const penalty = weights.availabilityWeight;
          hardCount++;
          totalCost += penalty;
          const reasonDetail = isSlotUnavailable
            ? `${lec.name} telah menandai slot waktu ${t1.day} (${t1.label}) sebagai TIDAK TERSEDIA.`
            : `${lec.name} tidak bersedia mengajar pada hari ${t1.day}. (Hari tersedia: ${lec.availableDays.join(', ')}).`;
          conflicts.push({
            id: `c7-${a1.id}-${lid}`,
            category: 'LECTURER_UNAVAILABLE',
            categoryName: 'C7 — Di Luar Ketersediaan Dosen',
            isHardConstraint: true,
            severity: 'high',
            penalty,
            title: `Ketidaksediaan Dosen: ${lec.name}`,
            description: `${reasonDetail} Mata kuliah: ${c1.name}.`,
            assignment1Id: a1.id,
            course1Name: c1.name,
            involvedEntities: {
              lecturerName: lec.name,
              timeslotLabel: `${t1.day} ${t1.label}`,
              day: t1.day,
            },
          });
        }
      }
    }

    // Soft Constraint S1: Kesesuaian Tipe Ruangan (Praktikum vs Kelas)
    if (r1) {
      if (c1.type === 'Praktikum' && r1.type !== 'Laboratorium') {
        const penalty = weights.roomTypeMismatchWeight;
        softCount++;
        totalCost += penalty;
        conflicts.push({
          id: `s1-${a1.id}`,
          category: 'ROOM_TYPE_MISMATCH',
          categoryName: 'S1 — Ketidaksesuaian Fasilitas Laboratorium',
          isHardConstraint: false,
          severity: 'medium',
          penalty,
          title: `Mata Kuliah Praktikum di Ruang Teori`,
          description: `Mata kuliah praktikum ${c1.name} ditempatkan di ${r1.name} (${r1.type}), seharusnya di Laboratorium.`,
          assignment1Id: a1.id,
          course1Name: c1.name,
          involvedEntities: {
            roomCode: r1.code,
            timeslotLabel: `${t1?.day} ${t1?.label}`,
          },
        });
      }
    }

    // Soft Constraint S2: Preferensi Hari Mata Kuliah / Dosen
    const courseDayMismatch = c1.preferredDay && c1.preferredDay !== 'Bebas' && c1.preferredDay !== t1.day;
    let anyLecAvoidDay = false;
    let avoidLecName = '';
    for (const lid of assignedLecIds) {
      const lec = lecturerMap.get(lid);
      if (lec?.preferences?.dayPreferences && lec.preferences.dayPreferences[t1.day] === 'avoid') {
        anyLecAvoidDay = true;
        avoidLecName = lec.name;
        break;
      }
    }
    
    if (courseDayMismatch || anyLecAvoidDay) {
      const penalty = weights.preferenceWeight;
      softCount++;
      totalCost += penalty;
      const desc = anyLecAvoidDay
        ? `${avoidLecName} memiliki preferensi HINDARI untuk hari ${t1?.day} pada mata kuliah ${c1.name}.`
        : `Mata kuliah ${c1.name} memiliki preferensi hari ${c1.preferredDay}, tetapi dijadwalkan pada hari ${t1?.day}.`;
      conflicts.push({
        id: `s2-${a1.id}`,
        category: 'LECTURER_PREFERENCE_DAY',
        categoryName: 'S2 — Preferensi Hari Tidak Terpenuhi',
        isHardConstraint: false,
        severity: 'low',
        penalty,
        title: `Preferensi Hari Tidak Sesuai`,
        description: desc,
        assignment1Id: a1.id,
        course1Name: c1.name,
        involvedEntities: {
          day: t1?.day,
          timeslotLabel: `${t1?.day} ${t1?.label}`,
        },
      });
    }

    // Soft Constraint S3: Preferensi Waktu (Pagi / Siang / Sore)
    if (c1.preferredTime && c1.preferredTime !== 'Fleksibel') {
      const slotHour = parseInt(t1.startTime.split(':')[0], 10);
      let timeCategory: 'Pagi' | 'Siang' | 'Sore' = 'Pagi';
      if (slotHour >= 12 && slotHour < 15) timeCategory = 'Siang';
      else if (slotHour >= 15) timeCategory = 'Sore';

      if (timeCategory !== c1.preferredTime) {
        const penalty = weights.preferenceWeight;
        softCount++;
        totalCost += penalty;
        conflicts.push({
          id: `s3-${a1.id}`,
          category: 'LECTURER_PREFERENCE_TIME',
          categoryName: 'S3 — Preferensi Waktu Tidak Terpenuhi',
          isHardConstraint: false,
          severity: 'low',
          penalty,
          title: `Preferensi Waktu Tidak Sesuai`,
          description: `Mata kuliah ${c1.name} menginginkan slot ${c1.preferredTime}, namun dialokasikan pada ${timeCategory} (${t1.startTime} - ${t1.endTime}).`,
          assignment1Id: a1.id,
          course1Name: c1.name,
          involvedEntities: {
            timeslotLabel: `${t1.day} ${t1.label}`,
          },
        });
      }
    }
  }

  // 3. Density / Fatigue Checks (Dosen mengajar > 3 slot berturut-turut pada hari yang sama)
  const lecturerDaySlots = new Map<string, number[]>();
  for (let i = 0; i < assignments.length; i++) {
    const a = assignments[i];
    const t = timeslotMap.get(a.timeslotId);
    if (t) {
      const assignedLecIds = (a.lecturerIds && a.lecturerIds.length > 0)
        ? a.lecturerIds
        : (a.lecturerId ? [a.lecturerId] : []);
      for (const lid of assignedLecIds) {
        const key = `${lid}_${t.day}`;
        let list = lecturerDaySlots.get(key);
        if (!list) {
          list = [];
          lecturerDaySlots.set(key, list);
        }
        list.push(t.slotIndex);
      }
    }
  }

  lecturerDaySlots.forEach((slots, key) => {
    const [lecId, day] = key.split('_');
    const lec = lecturerMap.get(lecId);
    const sorted = [...slots].sort((a, b) => a - b);
    let consecutive = 1;
    let maxConsecutive = 1;

    for (let k = 1; k < sorted.length; k++) {
      if (sorted[k] === sorted[k - 1] + 1) {
        consecutive++;
        if (consecutive > maxConsecutive) maxConsecutive = consecutive;
      } else if (sorted[k] !== sorted[k - 1]) {
        consecutive = 1;
      }
    }

    if (maxConsecutive >= 4) {
      const penalty = weights.densityWeight * (maxConsecutive - 3);
      softCount++;
      totalCost += penalty;
      conflicts.push({
        id: `s4-${key}`,
        category: 'SCHEDULE_DENSITY',
        categoryName: 'S4 — Kepadatan Jadwal Berlebih',
        isHardConstraint: false,
        severity: 'medium',
        penalty,
        title: `Kelelahan Mengajar: ${lec?.name || 'Dosen'}`,
        description: `Dosen ${lec?.name} mengajar ${maxConsecutive} slot berturut-turut pada hari ${day}.`,
        assignment1Id: '',
        involvedEntities: {
          lecturerName: lec?.name,
          day: day as any,
        },
      });
    }
  });

  if (isDev && typeof console !== 'undefined' && console.timeEnd) {
    console.timeEnd('conflictDetection');
  }

  return {
    hardConflictsCount: hardCount,
    softConflictsCount: softCount,
    totalConflictsCount: hardCount + softCount,
    totalCost,
    items: conflicts,
  };
}
