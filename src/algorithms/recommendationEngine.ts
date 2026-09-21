import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConstraintWeights,
  ConflictItem,
} from '../types';
import { detectConflicts, ConflictDetectionResult } from './conflictDetection';
import { evaluateSchedule } from './fitness';
import { calculateCourseTiming, isTimeslotValidForSks } from '../utils/sessionUtils';

export interface MoveEvaluation {
  targetTimeslotId: string;
  targetRoomId: string;
  timeslot: Timeslot;
  room: Room;
  isValidWithoutHardConflict: boolean;
  simulatedTotalConflicts: number;
  simulatedHardConflicts: number;
  simulatedSoftConflicts: number;
  simulatedCost: number;
  conflictDiff: number; // positive = conflict reduced
  improvementPercentage: number;
  score: number; // lower is better
  reasons: string[];
  conflictsInvolvingTarget: ConflictItem[];
  simulatedSchedule: ScheduleAssignment[];
}

export interface SwapEvaluation {
  assignment1Id: string;
  assignment2Id: string;
  assignment1: ScheduleAssignment;
  assignment2: ScheduleAssignment;
  course1: Course;
  course2: Course;
  lecturer1?: Lecturer;
  lecturer2?: Lecturer;
  class1?: ClassGroup;
  class2?: ClassGroup;
  timeslot1: Timeslot;
  timeslot2: Timeslot;
  room1: Room;
  room2: Room;
  isValidWithoutHardConflict: boolean;
  simulatedTotalConflicts: number;
  simulatedHardConflicts: number;
  simulatedSoftConflicts: number;
  simulatedCost: number;
  conflictDiff: number; // positive = conflict reduced
  improvementPercentage: number;
  score: number; // lower is better
  isBetter: boolean;
  reasons: string[];
  simulatedSchedule: ScheduleAssignment[];
}

/**
 * Evaluates the impact of moving an individual schedule assignment to a target timeslot and room.
 */
export function evaluateMove(
  assignmentId: string,
  targetTimeslotId: string,
  targetRoomId: string,
  currentSchedule: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights
): MoveEvaluation {
  const currentAssignment = currentSchedule.find(a => a.id === assignmentId);
  const targetTimeslot = timeslots.find(t => t.id === targetTimeslotId);
  const targetRoom = rooms.find(r => r.id === targetRoomId);

  if (!currentAssignment || !targetTimeslot || !targetRoom) {
    throw new Error('Penetapan jadwal, slot waktu, atau ruangan tidak ditemukan.');
  }

  const course = courses.find(c => c.id === currentAssignment.courseId);
  const lecturer = lecturers.find(l => l.id === currentAssignment.lecturerId);
  const classGroup = classes.find(cl => cl.id === currentAssignment.classId);

  // Baseline evaluation
  const baseEval = evaluateSchedule(
    currentSchedule,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights
  );

  const courseSks = Math.max(1, Math.round(currentAssignment.sks || course?.sks || course?.credits || 2));
  const timing = calculateCourseTiming(targetTimeslot, courseSks, timeslots);

  // Simulated schedule after move
  const simulatedSchedule = currentSchedule.map(a =>
    a.id === assignmentId
      ? {
          ...a,
          timeslotId: targetTimeslotId,
          roomId: targetRoomId,
          sks: courseSks,
          durationMinutes: timing.durationMinutes,
          endTime: timing.endTime,
          occupiedSlotIds: timing.occupiedSlotIds,
        }
      : a
  );

  const simEval = evaluateSchedule(
    simulatedSchedule,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights
  );

  // Identify specific conflicts involving this moved assignment
  const targetConflicts = simEval.conflictDetails.items.filter(
    c => c.assignment1Id === assignmentId || c.assignment2Id === assignmentId
  );

  const hardTargetConflicts = targetConflicts.filter(c => c.isHardConstraint);
  const softTargetConflicts = targetConflicts.filter(c => !c.isHardConstraint);

  const isValidWithoutHardConflict = hardTargetConflicts.length === 0;
  const conflictDiff = baseEval.totalConflicts - simEval.totalConflicts;
  const improvementPercentage =
    baseEval.totalConflicts > 0
      ? Math.max(-100, Math.round((conflictDiff / baseEval.totalConflicts) * 100))
      : 0;

  // Build descriptive reasons
  const reasons: string[] = [];

  // Check Lecturer Availability & Clashes
  const lecturerClash = hardTargetConflicts.find(c => c.category === 'LECTURER_OVERLAP');
  const lecturerUnavail = hardTargetConflicts.find(c => c.category === 'LECTURER_UNAVAILABLE');
  if (lecturerClash) {
    reasons.push(`⚠ Dosen ${lecturer?.name || ''} bentrok dengan jadwal lain`);
  } else if (lecturerUnavail) {
    reasons.push(`⚠ Dosen tidak bersedia mengajar pada hari ${targetTimeslot.day}`);
  } else {
    reasons.push(`✓ Dosen tersedia pada hari ${targetTimeslot.day} (${targetTimeslot.label})`);
  }

  // Check Room Clashes
  const roomClash = hardTargetConflicts.find(c => c.category === 'ROOM_OVERLAP');
  if (roomClash) {
    reasons.push(`⚠ Ruangan ${targetRoom.code} sudah dipakai mata kuliah lain`);
  } else {
    reasons.push(`✓ Ruangan ${targetRoom.code} kosong dan tersedia`);
  }

  // Check Room Capacity
  const roomCapConflict = hardTargetConflicts.find(c => c.category === 'ROOM_CAPACITY');
  const studentCount = course?.studentCount || classGroup?.studentCount || 0;
  if (roomCapConflict || targetRoom.capacity < studentCount) {
    reasons.push(
      `⚠ Kapasitas ruangan tidak mencukupi (${targetRoom.capacity} kursi vs ${studentCount} mhs)`
    );
  } else {
    reasons.push(
      `✓ Kapasitas ruangan mencukupi (${targetRoom.capacity} kursi untuk ${studentCount} mhs)`
    );
  }

  // Check Class Group Clashes
  const classClash = hardTargetConflicts.find(c => c.category === 'CLASS_OVERLAP');
  if (classClash) {
    reasons.push(`⚠ Kelas ${classGroup?.code || ''} bentrok dengan mata kuliah lain`);
  } else {
    reasons.push(`✓ Kelas ${classGroup?.code || ''} bebas dari bentrokan jadwal`);
  }

  // Check Room Type for Practical Courses
  if (course?.type === 'Praktikum') {
    if (targetRoom.type === 'Laboratorium') {
      reasons.push(`✓ Sesuai jenis mata kuliah Praktikum (Ruang Laboratorium)`);
    } else {
      reasons.push(`⚠ Praktikum sebaiknya dialokasikan di Ruang Laboratorium`);
    }
  }

  // Check Lecturer Time Preference
  if (lecturer?.timePreference && lecturer.timePreference !== 'Fleksibel') {
    const isMorning = targetTimeslot.startTime < '11:00';
    const isAfternoon = targetTimeslot.startTime >= '11:00' && targetTimeslot.startTime < '14:30';
    const isEvening = targetTimeslot.startTime >= '14:30';

    if (
      (lecturer.timePreference === 'Pagi' && isMorning) ||
      (lecturer.timePreference === 'Siang' && isAfternoon) ||
      (lecturer.timePreference === 'Sore' && isEvening)
    ) {
      reasons.push(`✓ Sesuai preferensi waktu dosen (${lecturer.timePreference})`);
    } else {
      reasons.push(`⚠ Preferensi waktu dosen (${lecturer.timePreference}) kurang sesuai`);
    }
  }

  return {
    targetTimeslotId,
    targetRoomId,
    timeslot: targetTimeslot,
    room: targetRoom,
    isValidWithoutHardConflict,
    simulatedTotalConflicts: simEval.totalConflicts,
    simulatedHardConflicts: simEval.hardConflicts,
    simulatedSoftConflicts: simEval.softConflicts,
    simulatedCost: simEval.cost,
    conflictDiff,
    improvementPercentage,
    score: simEval.cost,
    reasons,
    conflictsInvolvingTarget: targetConflicts,
    simulatedSchedule,
  };
}

/**
 * Searches and ranks the best alternative (timeslot + room) combinations for a given schedule assignment.
 */
export function getScheduleRecommendations(
  assignmentId: string,
  currentSchedule: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights,
  maxResults: number = 5
): MoveEvaluation[] {
  const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  if (isDev && typeof console !== 'undefined' && console.time) {
    console.time('recommendationEngine');
  }

  const currentAssignment = currentSchedule.find(a => a.id === assignmentId);
  if (!currentAssignment) return [];

  const course = courses.find(c => c.id === currentAssignment.courseId);
  const lecturer = currentAssignment.lecturerId ? lecturers.find(l => l.id === currentAssignment.lecturerId) : undefined;

  let activeTimeslots = timeslots.filter(t => t.isActive);
  let activeRooms = rooms.filter(r => r.isActive);

  // Pruning: filter rooms that match practical/theory requirement
  if (course) {
    if (course.type === 'Praktikum') {
      const labs = activeRooms.filter(r => r.type === 'Laboratorium');
      if (labs.length > 0) activeRooms = labs;
    }
  }

  // Pruning: prefer lecturer available days
  if (lecturer && lecturer.availableDays.length > 0) {
    const availableSlots = activeTimeslots.filter(
      t => lecturer.availableDays.includes(t.day) && !lecturer.unavailableSlotIds?.includes(t.id)
    );
    if (availableSlots.length > 0) activeTimeslots = availableSlots;
  }

  // Filter slots where this course's SKS fits within the day's consecutive sessions
  const courseSks = Math.max(1, Math.round(currentAssignment.sks || course?.sks || course?.credits || 2));
  const validForSks = activeTimeslots.filter(t => isTimeslotValidForSks(t, courseSks, timeslots));
  if (validForSks.length > 0) {
    activeTimeslots = validForSks;
  }

  const candidates: MoveEvaluation[] = [];

  for (const slot of activeTimeslots) {
    for (const room of activeRooms) {
      // Skip current exact placement
      if (
        slot.id === currentAssignment.timeslotId &&
        room.id === currentAssignment.roomId
      ) {
        continue;
      }

      try {
        const evalResult = evaluateMove(
          assignmentId,
          slot.id,
          room.id,
          currentSchedule,
          courses,
          lecturers,
          classes,
          rooms,
          timeslots,
          weights
        );

        candidates.push(evalResult);
      } catch {
        // Ignore invalid evaluation combinations
      }
    }
  }

  // Ranking Strategy:
  // 1. Zero hard conflicts first (isValidWithoutHardConflict === true)
  // 2. Lower simulated cost
  // 3. Lower total conflicts
  // 4. Higher improvement percentage
  candidates.sort((a, b) => {
    if (a.isValidWithoutHardConflict && !b.isValidWithoutHardConflict) return -1;
    if (!a.isValidWithoutHardConflict && b.isValidWithoutHardConflict) return 1;
    if (a.simulatedCost !== b.simulatedCost) return a.simulatedCost - b.simulatedCost;
    if (a.simulatedTotalConflicts !== b.simulatedTotalConflicts) {
      return a.simulatedTotalConflicts - b.simulatedTotalConflicts;
    }
    return b.conflictDiff - a.conflictDiff;
  });

  if (isDev && typeof console !== 'undefined' && console.timeEnd) {
    console.timeEnd('recommendationEngine');
  }

  return candidates.slice(0, Math.min(maxResults, 5));
}

/**
 * Evaluates the impact of swapping timeslots (and optionally rooms) between two schedule assignments.
 */
export function evaluateSwap(
  assignment1Id: string,
  assignment2Id: string,
  currentSchedule: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights,
  swapRooms: boolean = true
): SwapEvaluation {
  const a1 = currentSchedule.find(a => a.id === assignment1Id);
  const a2 = currentSchedule.find(a => a.id === assignment2Id);

  if (!a1 || !a2) {
    throw new Error('Salah satu penugasan jadwal tidak ditemukan.');
  }

  const course1 = courses.find(c => c.id === a1.courseId || c.code === a1.courseId);
  const course2 = courses.find(c => c.id === a2.courseId || c.code === a2.courseId);
  const lecturer1 = a1.lecturerId ? lecturers.find(l => l.id === a1.lecturerId) : undefined;
  const lecturer2 = a2.lecturerId ? lecturers.find(l => l.id === a2.lecturerId) : undefined;
  const class1 = a1.classId ? classes.find(cl => cl.id === a1.classId) : undefined;
  const class2 = a2.classId ? classes.find(cl => cl.id === a2.classId) : undefined;
  const timeslot1 = timeslots.find(t => t.id === a1.timeslotId);
  const timeslot2 = timeslots.find(t => t.id === a2.timeslotId);
  const room1 = rooms.find(r => r.id === a1.roomId);
  const room2 = rooms.find(r => r.id === a2.roomId);

  if (!course1 || !course2 || !timeslot1 || !timeslot2 || !room1 || !room2) {
    throw new Error('Penugasan jadwal tidak lengkap atau entitas relasi tidak ditemukan.');
  }

  const baseEval = evaluateSchedule(
    currentSchedule,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights
  );

  const sks1 = Math.max(1, Math.round(a1.sks || course1.sks || course1.credits || 2));
  const sks2 = Math.max(1, Math.round(a2.sks || course2.sks || course2.credits || 2));
  const timing1 = calculateCourseTiming(timeslot2, sks1, timeslots);
  const timing2 = calculateCourseTiming(timeslot1, sks2, timeslots);

  // Simulated schedule after swap
  const simulatedSchedule = currentSchedule.map(a => {
    if (a.id === assignment1Id) {
      return {
        ...a,
        timeslotId: a2.timeslotId,
        roomId: swapRooms ? a2.roomId : a.roomId,
        sks: sks1,
        durationMinutes: timing1.durationMinutes,
        endTime: timing1.endTime,
        occupiedSlotIds: timing1.occupiedSlotIds,
      };
    }
    if (a.id === assignment2Id) {
      return {
        ...a,
        timeslotId: a1.timeslotId,
        roomId: swapRooms ? a1.roomId : a.roomId,
        sks: sks2,
        durationMinutes: timing2.durationMinutes,
        endTime: timing2.endTime,
        occupiedSlotIds: timing2.occupiedSlotIds,
      };
    }
    return a;
  });

  const simEval = evaluateSchedule(
    simulatedSchedule,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights
  );

  const conflictDiff = baseEval.totalConflicts - simEval.totalConflicts;
  const improvementPercentage =
    baseEval.totalConflicts > 0
      ? Math.max(-100, Math.round((conflictDiff / baseEval.totalConflicts) * 100))
      : 0;

  const isBetter = simEval.cost < baseEval.cost || simEval.totalConflicts < baseEval.totalConflicts;
  const isValidWithoutHardConflict = simEval.hardConflicts === 0;

  const reasons: string[] = [];
  if (conflictDiff > 0) {
    reasons.push(`✓ Mengurangi ${conflictDiff} konflik secara keseluruhan`);
  } else if (conflictDiff === 0 && simEval.cost < baseEval.cost) {
    reasons.push(`✓ Memperbaiki preferensi kualitas jadwal dosen/ruangan`);
  } else if (conflictDiff === 0) {
    reasons.push(`• Jumlah konflik tetap sama (${simEval.totalConflicts})`);
  } else {
    reasons.push(`⚠ Meningkatkan potensi konflik baru`);
  }

  if (isValidWithoutHardConflict) {
    reasons.push(`✓ Tidak ada hard constraint yang terlanggar`);
  } else {
    reasons.push(`⚠ Masih terdapat ${simEval.hardConflicts} hard conflict`);
  }

  return {
    assignment1Id,
    assignment2Id,
    assignment1: a1,
    assignment2: a2,
    course1,
    course2,
    lecturer1,
    lecturer2,
    class1,
    class2,
    timeslot1,
    timeslot2,
    room1,
    room2,
    isValidWithoutHardConflict,
    simulatedTotalConflicts: simEval.totalConflicts,
    simulatedHardConflicts: simEval.hardConflicts,
    simulatedSoftConflicts: simEval.softConflicts,
    simulatedCost: simEval.cost,
    conflictDiff,
    improvementPercentage,
    score: simEval.cost,
    isBetter,
    reasons,
    simulatedSchedule,
  };
}

/**
 * Searches and ranks the best pairwise swap recommendations for a given schedule assignment.
 */
export function getSwapRecommendations(
  assignmentId: string,
  currentSchedule: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights,
  maxResults: number = 4
): SwapEvaluation[] {
  const currentAssignment = currentSchedule.find(a => a.id === assignmentId);
  if (!currentAssignment) return [];

  const candidates: SwapEvaluation[] = [];

  for (const otherAssignment of currentSchedule) {
    if (otherAssignment.id === assignmentId) continue;
    // Don't swap if they already occupy the exact same timeslot and room
    if (
      otherAssignment.timeslotId === currentAssignment.timeslotId &&
      otherAssignment.roomId === currentAssignment.roomId
    ) {
      continue;
    }

    try {
      const evalResult = evaluateSwap(
        assignmentId,
        otherAssignment.id,
        currentSchedule,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights
      );

      // We only want swaps that either improve the schedule or keep it zero/valid
      if (evalResult.isBetter || (evalResult.isValidWithoutHardConflict && evalResult.conflictDiff >= 0)) {
        candidates.push(evalResult);
      }
    } catch {
      // Ignore errors
    }
  }

  // Sort by improvement diff descending, then by lower cost
  candidates.sort((a, b) => {
    if (b.conflictDiff !== a.conflictDiff) return b.conflictDiff - a.conflictDiff;
    return a.simulatedCost - b.simulatedCost;
  });

  return candidates.slice(0, maxResults);
}
