import { Course, Room, Timeslot, ScheduleAssignment, CourseOffering } from '../types';

/**
 * Generates an initial schedule assignment array.
 * Strictly schedules ALL active theory CourseOfferings (excluding practicum and closed electives).
 * Preserves lecturer assignments (lecturerIds and primary lecturerId) from CourseOffering.
 * Dosen tidak pernah otomatis dipilih secara random.
 */
export function generateInitialSchedule(
  courses: Course[],
  rooms: Room[],
  timeslots: Timeslot[],
  forceConflictDensity: 'realistic' | 'random' = 'realistic',
  offerings?: CourseOffering[]
): ScheduleAssignment[] {
  const activeRooms = rooms.filter(r => r.isActive);
  const activeTimeslots = timeslots.filter(t => t.isActive);

  if (activeRooms.length === 0 || activeTimeslots.length === 0) {
    throw new Error('Tidak ada ruangan atau slot waktu aktif yang tersedia.');
  }

  const assignments: ScheduleAssignment[] = [];
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  courses.forEach(c => {
    if (c.code) courseMap.set(c.code, c);
  });

  // Group rooms for varied assignment
  const lectureRooms = activeRooms.filter(r => r.type === 'Kelas');
  const availableGeneralRooms = lectureRooms.length > 0 ? lectureRooms : activeRooms;

  if (offerings && offerings.length > 0) {
    // Strictly filter for active theory offerings (exclude practicum, closed electives, and unschedulable courses like KKN)
    const activeTheoryOfferings = offerings.filter(off => {
      if (off.isPracticum) return false;
      if ((off.status as any) === 'closed_low_enrollment') return false;
      const c = courseMap.get(off.courseId) || (off.courseCode ? courseMap.get(off.courseCode) : null);
      if (c) {
        if (c.isSchedulable === false || (c as any).is_schedulable === false || (c as any).dijadwalkanJurusan === false || (c as any).isLppmManaged) {
          return false;
        }
        if (c.type === 'Praktikum' || (c.name || '').toLowerCase().includes('praktikum')) {
          return false;
        }
        if ((c.name || '').trim().toUpperCase() === 'KKN') {
          return false;
        }
      }
      return true;
    });

    activeTheoryOfferings.forEach((off, index) => {
      let chosenRoom: Room;
      let chosenTimeslot: Timeslot;

      if (forceConflictDensity === 'realistic') {
        const isRandomClash = Math.random() < 0.35;
        if (isRandomClash && assignments.length > 0) {
          const previousTarget = assignments[Math.floor(Math.random() * assignments.length)];
          const prevSlot = activeTimeslots.find(t => t.id === previousTarget.timeslotId);
          chosenTimeslot = prevSlot || activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
        } else {
          chosenTimeslot = activeTimeslots[index % activeTimeslots.length];
        }
        chosenRoom = availableGeneralRooms[index % availableGeneralRooms.length];
      } else {
        chosenRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
        chosenTimeslot = activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
      }

      const assignedLecs = (off.lecturerIds && off.lecturerIds.length > 0)
        ? off.lecturerIds
        : (off.lecturerId ? [off.lecturerId] : []);

      assignments.push({
        id: `assign-${off.id}`,
        courseId: off.courseId,
        courseOfferingId: off.id,
        lecturerId: assignedLecs.length > 0 ? assignedLecs[0] : null,
        lecturerIds: assignedLecs,
        classId: off.classId || 'cls-1a',
        roomId: chosenRoom.id,
        timeslotId: chosenTimeslot.id,
      });
    });
  } else {
    // Fallback if no offerings: only schedule non-practicum and schedulable courses
    const nonPracticumCourses = courses.filter(
      c => c.type !== 'Praktikum' &&
           !(c.name || '').toLowerCase().includes('praktikum') &&
           c.isSchedulable !== false &&
           (c as any).is_schedulable !== false &&
           (c as any).dijadwalkanJurusan !== false &&
           (c.name || '').trim().toUpperCase() !== 'KKN'
    );

    nonPracticumCourses.forEach((course, index) => {
      let chosenRoom: Room;
      let chosenTimeslot: Timeslot;

      if (forceConflictDensity === 'realistic') {
        chosenTimeslot = activeTimeslots[index % activeTimeslots.length];
        chosenRoom = availableGeneralRooms[index % availableGeneralRooms.length];
      } else {
        chosenRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
        chosenTimeslot = activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
      }

      assignments.push({
        id: `assign-crs-${course.id}-${index}`,
        courseId: course.id,
        lecturerId: course.lecturerId || null,
        lecturerIds: course.lecturerId ? [course.lecturerId] : [],
        classId: course.classId || 'cls-1a',
        roomId: chosenRoom.id,
        timeslotId: chosenTimeslot.id,
      });
    });
  }

  return assignments;
}
