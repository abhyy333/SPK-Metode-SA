import { ScheduleAssignment, Course, Room, Timeslot } from '../types';
import { isTimeslotValidForSks, calculateCourseTiming } from '../utils/sessionUtils';

export type NeighborMoveType = 'MOVE_TIMESLOT' | 'MOVE_ROOM' | 'MOVE_BOTH' | 'SWAP_SLOTS';

export interface NeighborResult {
  neighbor: ScheduleAssignment[];
  moveType: NeighborMoveType;
  modifiedCourseIds: string[];
}

/**
 * Generates a neighbor solution from current schedule.
 * Strategies:
 * 1. Move a course assignment to a new timeslot (respecting course SKS consecutive sessions)
 * 2. Move a course assignment to a new room (if room not locked)
 * 3. Move both timeslot and room (respecting lock flags & SKS duration)
 * 4. Swap timeslots between two unlocked assignments (valid for both SKS)
 */
export function generateNeighbor(
  currentAssignments: ScheduleAssignment[],
  courses: Course[],
  rooms: Room[],
  timeslots: Timeslot[],
  mutationRate: number = 0.2,
  conflictAssignmentIds?: string[],
  rng: () => number = Math.random
): NeighborResult {
  if (currentAssignments.length === 0) {
    return { neighbor: [], moveType: 'MOVE_TIMESLOT', modifiedCourseIds: [] };
  }

  // Deep clone assignments
  const neighbor: ScheduleAssignment[] = currentAssignments.map(a => ({ ...a }));
  const activeRooms = rooms.filter(r => r.isActive);
  const activeTimeslots = timeslots.filter(t => t.isActive);

  if (activeRooms.length === 0 || activeTimeslots.length === 0) {
    return { neighbor, moveType: 'MOVE_TIMESLOT', modifiedCourseIds: [] };
  }

  // Helper to check if timeslot is locked
  const isSlotLocked = (a: ScheduleAssignment) => {
    if (a.isFixed) return true;
    if (a.lockConfig?.full) return true;
    if (a.lockConfig?.time || a.lockConfig?.lockTimeslot) return true;
    if (a.isLocked && !a.lockConfig) return true;
    return false;
  };

  // Helper to check if room is locked
  const isRoomLockedFn = (a: ScheduleAssignment) => {
    if (a.isFixed) return true;
    if (a.lockConfig?.full) return true;
    if (a.lockConfig?.room || a.lockConfig?.lockRoom) return true;
    if (a.isLocked && !a.lockConfig) return true;
    return false;
  };

  // Identify unlocked candidate indices (has at least timeslot or room movable)
  const isFullyLocked = (a: ScheduleAssignment) => isSlotLocked(a) && isRoomLockedFn(a);

  const unlockedIndices: number[] = [];
  for (let idx = 0; idx < neighbor.length; idx++) {
    if (!isFullyLocked(neighbor[idx])) {
      unlockedIndices.push(idx);
    }
  }

  // If all assignments are locked, return unchanged neighbor
  if (unlockedIndices.length === 0) {
    return { neighbor, moveType: 'MOVE_TIMESLOT', modifiedCourseIds: [] };
  }

  // Selection: 65% chance to target an assignment that is in conflict if list provided
  let targetIndex: number;
  const conflictedUnlocked = conflictAssignmentIds && conflictAssignmentIds.length > 0
    ? unlockedIndices.filter(idx => conflictAssignmentIds.includes(neighbor[idx].id))
    : [];

  if (conflictedUnlocked.length > 0 && rng() < 0.65) {
    targetIndex = conflictedUnlocked[Math.floor(rng() * conflictedUnlocked.length)];
  } else {
    targetIndex = unlockedIndices[Math.floor(rng() * unlockedIndices.length)];
  }

  const targetAssignment = neighbor[targetIndex];
  const targetCourse = courses.find(c => c.id === targetAssignment.courseId);
  const targetSks = Math.max(
    1,
    Math.round(targetAssignment.sks || targetCourse?.sks || targetCourse?.credits || 2)
  );

  const isTimeslotLocked = isSlotLocked(targetAssignment);
  const isRoomLocked = isRoomLockedFn(targetAssignment);

  // Pick mutation operator based on random probability and lock constraints
  const rand = rng();
  let moveType: NeighborMoveType = 'MOVE_TIMESLOT';
  const modifiedCourseIds = [targetAssignment.courseId];

  // Filter timeslots valid for course SKS consecutive slots
  const validTimeslotsForSks = activeTimeslots.filter(t =>
    isTimeslotValidForSks(t, targetSks, activeTimeslots)
  );
  const candidateTimeslots = validTimeslotsForSks.length > 0 ? validTimeslotsForSks : activeTimeslots;

  if (!isTimeslotLocked && (rand < 0.40 || isRoomLocked)) {
    // Strategy 1: Change Timeslot
    moveType = 'MOVE_TIMESLOT';
    const otherTimeslots = candidateTimeslots.filter(t => t.id !== targetAssignment.timeslotId);
    if (otherTimeslots.length > 0) {
      const newSlot = otherTimeslots[Math.floor(rng() * otherTimeslots.length)];
      const timing = calculateCourseTiming(newSlot, targetSks, activeTimeslots);
      neighbor[targetIndex] = {
        ...targetAssignment,
        timeslotId: newSlot.id,
        sks: targetSks,
        durationMinutes: timing.durationMinutes,
        endTime: timing.endTime,
        occupiedSlotIds: timing.occupiedSlotIds,
      };
    }
  } else if (!isRoomLocked && (rand < 0.65 || isTimeslotLocked)) {
    // Strategy 2: Change Room
    moveType = 'MOVE_ROOM';
    const otherRooms = activeRooms.filter(r => r.id !== targetAssignment.roomId);
    if (otherRooms.length > 0) {
      let candidateRooms = otherRooms;
      if (targetCourse?.type === 'Praktikum') {
        const labs = otherRooms.filter(r => r.type === 'Laboratorium');
        if (labs.length > 0 && rng() < 0.8) {
          candidateRooms = labs;
        }
      }
      const newRoom = candidateRooms[Math.floor(rng() * candidateRooms.length)];
      neighbor[targetIndex] = {
        ...targetAssignment,
        roomId: newRoom.id,
      };
    }
  } else if (!isTimeslotLocked && !isRoomLocked && rand < 0.85) {
    // Strategy 3: Change both Room and Timeslot
    moveType = 'MOVE_BOTH';
    const otherTimeslots = candidateTimeslots.filter(t => t.id !== targetAssignment.timeslotId);
    const otherRooms = activeRooms.filter(r => r.id !== targetAssignment.roomId);

    const newSlot = otherTimeslots.length > 0
      ? otherTimeslots[Math.floor(rng() * otherTimeslots.length)]
      : candidateTimeslots[0];
    const newRoom = otherRooms.length > 0
      ? otherRooms[Math.floor(rng() * otherRooms.length)]
      : activeRooms[0];

    const timing = calculateCourseTiming(newSlot, targetSks, activeTimeslots);

    neighbor[targetIndex] = {
      ...targetAssignment,
      timeslotId: newSlot.id,
      roomId: newRoom.id,
      sks: targetSks,
      durationMinutes: timing.durationMinutes,
      endTime: timing.endTime,
      occupiedSlotIds: timing.occupiedSlotIds,
    };
  } else if (!isTimeslotLocked) {
    // Strategy 4: Swap timeslot with another assignment that also has unlocked timeslot
    moveType = 'SWAP_SLOTS';
    const otherUnlockedForSwap = unlockedIndices.filter(
      idx => idx !== targetIndex && !isSlotLocked(neighbor[idx])
    );

    // Prefer swaps where both courses fit in each other's start timeslot
    const timeslotMap = new Map(activeTimeslots.map(t => [t.id, t]));
    const validSwapIndices = otherUnlockedForSwap.filter(idx => {
      const otherA = neighbor[idx];
      const otherC = courses.find(c => c.id === otherA.courseId);
      const otherSks = Math.max(1, Math.round(otherA.sks || otherC?.sks || otherC?.credits || 2));
      const slotForTarget = timeslotMap.get(otherA.timeslotId);
      const slotForOther = timeslotMap.get(targetAssignment.timeslotId);
      return (
        isTimeslotValidForSks(slotForTarget, targetSks, activeTimeslots) &&
        isTimeslotValidForSks(slotForOther, otherSks, activeTimeslots)
      );
    });

    const pool = validSwapIndices.length > 0 ? validSwapIndices : otherUnlockedForSwap;

    if (pool.length > 0) {
      const swapIndex = pool[Math.floor(rng() * pool.length)];
      const otherAssignment = neighbor[swapIndex];
      const otherCourse = courses.find(c => c.id === otherAssignment.courseId);
      const otherSks = Math.max(1, Math.round(otherAssignment.sks || otherCourse?.sks || otherCourse?.credits || 2));

      modifiedCourseIds.push(otherAssignment.courseId);

      const tempSlot = targetAssignment.timeslotId;
      const targetSlotObj = timeslotMap.get(otherAssignment.timeslotId);
      const otherSlotObj = timeslotMap.get(tempSlot);

      const timingTarget = calculateCourseTiming(targetSlotObj, targetSks, activeTimeslots);
      const timingOther = calculateCourseTiming(otherSlotObj, otherSks, activeTimeslots);

      neighbor[targetIndex] = {
        ...targetAssignment,
        timeslotId: otherAssignment.timeslotId,
        sks: targetSks,
        durationMinutes: timingTarget.durationMinutes,
        endTime: timingTarget.endTime,
        occupiedSlotIds: timingTarget.occupiedSlotIds,
      };
      neighbor[swapIndex] = {
        ...otherAssignment,
        timeslotId: tempSlot,
        sks: otherSks,
        durationMinutes: timingOther.durationMinutes,
        endTime: timingOther.endTime,
        occupiedSlotIds: timingOther.occupiedSlotIds,
      };
    }
  }

  return {
    neighbor,
    moveType,
    modifiedCourseIds,
  };
}
