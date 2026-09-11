import { ScheduleAssignment, Course, Room, Timeslot } from '../types';

export type NeighborMoveType = 'MOVE_TIMESLOT' | 'MOVE_ROOM' | 'MOVE_BOTH' | 'SWAP_SLOTS';

export interface NeighborResult {
  neighbor: ScheduleAssignment[];
  moveType: NeighborMoveType;
  modifiedCourseIds: string[];
}

/**
 * Generates a neighbor solution from current schedule.
 * Strategies:
 * 1. Move a course assignment to a new timeslot
 * 2. Move a course assignment to a new room
 * 3. Move both timeslot and room
 * 4. Swap timeslots between two assignments
 */
export function generateNeighbor(
  currentAssignments: ScheduleAssignment[],
  courses: Course[],
  rooms: Room[],
  timeslots: Timeslot[],
  mutationRate: number = 0.2,
  conflictAssignmentIds?: string[]
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

  // Selection: 60% chance to target an assignment that is in conflict if list provided
  let targetIndex: number;
  if (conflictAssignmentIds && conflictAssignmentIds.length > 0 && Math.random() < 0.65) {
    const conflictedId = conflictAssignmentIds[Math.floor(Math.random() * conflictAssignmentIds.length)];
    const foundIdx = neighbor.findIndex(a => a.id === conflictedId);
    targetIndex = foundIdx !== -1 ? foundIdx : Math.floor(Math.random() * neighbor.length);
  } else {
    targetIndex = Math.floor(Math.random() * neighbor.length);
  }

  const targetAssignment = neighbor[targetIndex];
  const targetCourse = courses.find(c => c.id === targetAssignment.courseId);

  // Pick mutation operator based on random probability
  const rand = Math.random();
  let moveType: NeighborMoveType;
  const modifiedCourseIds = [targetAssignment.courseId];

  if (rand < 0.40) {
    // Strategy 1: Change Timeslot
    moveType = 'MOVE_TIMESLOT';
    const otherTimeslots = activeTimeslots.filter(t => t.id !== targetAssignment.timeslotId);
    if (otherTimeslots.length > 0) {
      const newSlot = otherTimeslots[Math.floor(Math.random() * otherTimeslots.length)];
      neighbor[targetIndex] = {
        ...targetAssignment,
        timeslotId: newSlot.id,
      };
    }
  } else if (rand < 0.65) {
    // Strategy 2: Change Room
    moveType = 'MOVE_ROOM';
    const otherRooms = activeRooms.filter(r => r.id !== targetAssignment.roomId);
    if (otherRooms.length > 0) {
      // If course is practical, prefer labs
      let candidateRooms = otherRooms;
      if (targetCourse?.type === 'Praktikum') {
        const labs = otherRooms.filter(r => r.type === 'Laboratorium');
        if (labs.length > 0 && Math.random() < 0.8) {
          candidateRooms = labs;
        }
      }
      const newRoom = candidateRooms[Math.floor(Math.random() * candidateRooms.length)];
      neighbor[targetIndex] = {
        ...targetAssignment,
        roomId: newRoom.id,
      };
    }
  } else if (rand < 0.85) {
    // Strategy 3: Change both Room and Timeslot
    moveType = 'MOVE_BOTH';
    const otherTimeslots = activeTimeslots.filter(t => t.id !== targetAssignment.timeslotId);
    const otherRooms = activeRooms.filter(r => r.id !== targetAssignment.roomId);

    const newSlot = otherTimeslots.length > 0
      ? otherTimeslots[Math.floor(Math.random() * otherTimeslots.length)]
      : activeTimeslots[0];
    const newRoom = otherRooms.length > 0
      ? otherRooms[Math.floor(Math.random() * otherRooms.length)]
      : activeRooms[0];

    neighbor[targetIndex] = {
      ...targetAssignment,
      timeslotId: newSlot.id,
      roomId: newRoom.id,
    };
  } else {
    // Strategy 4: Swap timeslot with another assignment
    moveType = 'SWAP_SLOTS';
    let swapIndex = Math.floor(Math.random() * neighbor.length);
    while (swapIndex === targetIndex && neighbor.length > 1) {
      swapIndex = Math.floor(Math.random() * neighbor.length);
    }

    const otherAssignment = neighbor[swapIndex];
    modifiedCourseIds.push(otherAssignment.courseId);

    const tempSlot = targetAssignment.timeslotId;
    neighbor[targetIndex] = {
      ...targetAssignment,
      timeslotId: otherAssignment.timeslotId,
    };
    neighbor[swapIndex] = {
      ...otherAssignment,
      timeslotId: tempSlot,
    };
  }

  return {
    neighbor,
    moveType,
    modifiedCourseIds,
  };
}
