import { Course, Lecturer, ClassGroup, Room, Timeslot, ScheduleAssignment, CourseOffering } from '../types';

/**
 * Generates an initial schedule assignment array.
 * If offerings are provided, each CourseOffering is assigned a room and timeslot.
 * Uses lecturerId from the offering (null if not yet assigned).
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

  // Group rooms for varied assignment
  const lectureRooms = activeRooms.filter(r => r.type === 'Kelas');
  const labRooms = activeRooms.filter(r => r.type === 'Laboratorium');
  const availableGeneralRooms = lectureRooms.length > 0 ? lectureRooms : activeRooms;

  if (offerings && offerings.length > 0) {
    offerings.forEach((off, index) => {
      const course = courses.find(c => c.id === off.courseId || c.code === off.courseId);
      let chosenRoom: Room;
      let chosenTimeslot: Timeslot;

      if (forceConflictDensity === 'realistic') {
        const isRandomClash = Math.random() < 0.45;
        if (isRandomClash && assignments.length > 0) {
          const previousTarget = assignments[Math.floor(Math.random() * assignments.length)];
          const prevSlot = activeTimeslots.find(t => t.id === previousTarget.timeslotId);
          chosenTimeslot = prevSlot || activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
        } else {
          chosenTimeslot = activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
        }

        const isLab = course?.type === 'Praktikum' || (course?.name || off.courseName || '').toLowerCase().includes('praktikum');
        if (isLab && Math.random() > 0.35 && labRooms.length > 0) {
          chosenRoom = Math.random() > 0.5
            ? labRooms[Math.floor(Math.random() * labRooms.length)]
            : availableGeneralRooms[Math.floor(Math.random() * availableGeneralRooms.length)];
        } else {
          chosenRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
        }
      } else {
        chosenRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
        chosenTimeslot = activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
      }

      const assignedLecs = (off.lecturerIds && off.lecturerIds.length > 0)
        ? off.lecturerIds
        : (off.lecturerId ? [off.lecturerId] : []);

      assignments.push({
        id: `assign-${off.id}-${index}-${Date.now().toString(36)}`,
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
    courses.forEach((course, index) => {
      let chosenRoom: Room;
      let chosenTimeslot: Timeslot;

      if (forceConflictDensity === 'realistic') {
        const isRandomClash = Math.random() < 0.45;
        if (isRandomClash && assignments.length > 0) {
          const previousTarget = assignments[Math.floor(Math.random() * assignments.length)];
          const prevSlot = activeTimeslots.find(t => t.id === previousTarget.timeslotId);
          chosenTimeslot = prevSlot || activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
        } else {
          chosenTimeslot = activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
        }

        if (course.type === 'Praktikum' && Math.random() > 0.35 && labRooms.length > 0) {
          chosenRoom = Math.random() > 0.5
            ? labRooms[Math.floor(Math.random() * labRooms.length)]
            : availableGeneralRooms[Math.floor(Math.random() * availableGeneralRooms.length)];
        } else {
          chosenRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
        }
      } else {
        chosenRoom = activeRooms[Math.floor(Math.random() * activeRooms.length)];
        chosenTimeslot = activeTimeslots[Math.floor(Math.random() * activeTimeslots.length)];
      }

      assignments.push({
        id: `assign-${course.id}-${index}-${Date.now().toString(36)}`,
        courseId: course.id,
        lecturerId: null, // Master Mata Kuliah tidak menyimpan dosen
        classId: course.classId || 'cls-1a',
        roomId: chosenRoom.id,
        timeslotId: chosenTimeslot.id,
      });
    });
  }

  return assignments;
}
