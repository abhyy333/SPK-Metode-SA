import {
  ExamOffering,
  ExamSession,
  Room,
  Lecturer,
  ExamConflictItem,
} from '../types';

export interface ExamOptimizationProgress {
  iteration: number;
  maxIterations: number;
  temperature: number;
  currentCost: number;
  bestCost: number;
  conflictCount: number;
  status: 'running' | 'completed' | 'stopped';
}

export interface ExamOptimizationOptions {
  availableDates: string[]; // List of YYYY-MM-DD
  maxIterations?: number;
  initialTemperature?: number;
  coolingRate?: number;
  keepParallelSectionsTogether?: boolean; // Section A & B of same course at same date & session
}

/**
 * Detect all conflicts in an exam schedule.
 * Hard constraints:
 * 1. Room overlap: same room, same date, same session.
 * 2. Supervisor overlap: same supervisor, same date, same session.
 * 3. Room capacity: studentCount > room.capacity.
 * 4. Unassigned warnings: missing room or session.
 * 5. Semester warning: two different courses of the same semester/KBK at the same date and session.
 */
export function detectExamConflicts(
  offerings: ExamOffering[],
  rooms: Room[],
  sessions: ExamSession[],
  lecturers: Lecturer[]
): ExamConflictItem[] {
  const conflicts: ExamConflictItem[] = [];
  const roomMap = new Map<string, Room>(rooms.map(r => [r.id, r]));
  const sessionMap = new Map<string, ExamSession>(sessions.map(s => [s.id, s]));
  const lecturerMap = new Map<string, Lecturer>(lecturers.map(l => [l.id, l]));

  // Index scheduled offerings by [date][sessionId]
  const slotMap = new Map<string, ExamOffering[]>();

  for (const offering of offerings) {
    // Check room capacity
    if (offering.roomIds && offering.roomIds.length > 0) {
      const assignedRooms = offering.roomIds
        .map(id => roomMap.get(id))
        .filter((r): r is Room => Boolean(r));

      const totalCapacity = assignedRooms.reduce((sum, r) => sum + r.capacity, 0);
      if (offering.studentCount > totalCapacity) {
        const roomNames = assignedRooms.map(r => `${r.name} (${r.capacity} kursi)`).join(', ');
        conflicts.push({
          id: `cap-${offering.id}`,
          type: 'ROOM_CAPACITY',
          severity: 'high',
          title: `Kapasitas Ruang Kurang: ${offering.courseName} ${offering.sectionName || ''}`,
          description: `Jumlah peserta ${offering.studentCount} melebihi total kapasitas ruangan (${totalCapacity} kursi di ${roomNames || 'tidak ada ruang valid'}).`,
          examOfferingIds: [offering.id],
          date: offering.examDate,
          sessionId: offering.examSessionId,
        });
      }
    } else if (offering.examDate && offering.examSessionId) {
      conflicts.push({
        id: `unassigned-room-${offering.id}`,
        type: 'UNASSIGNED_ROOM',
        severity: 'medium',
        title: `Ruang Belum Ditentukan: ${offering.courseName} ${offering.sectionName || ''}`,
        description: `Ujian telah dijadwalkan pada sesi tertentu tetapi belum dialokasikan ruangan.`,
        examOfferingIds: [offering.id],
        date: offering.examDate,
        sessionId: offering.examSessionId,
      });
    }

    // Check supervisor presence & complete count (Default requirement: 2 Pengawas)
    // Pengawas 1 otomatis dari Dosen Pengampu, Pengawas 2 manual oleh Admin
    const sup1Id = offering.supervisor1Id || offering.supervisorLecturerIds?.[0];
    const sup2Id = offering.supervisor2Id || (offering.supervisorLecturerIds?.[1] && offering.supervisorLecturerIds[1] !== sup1Id ? offering.supervisorLecturerIds[1] : null);

    if (offering.examDate && offering.examSessionId) {
      if (!sup1Id) {
        conflicts.push({
          id: `unassigned-sup1-${offering.id}`,
          type: 'UNASSIGNED_SUPERVISOR',
          severity: 'low', // Strictly WARNING! BUKAN HARD CONFLICT
          title: `Pengawas 1 Belum Ada: ${offering.courseName} ${offering.sectionName || ''}`,
          description: `Dosen pengampu belum ditentukan pada jadwal kuliah sehingga Pengawas 1 masih kosong.`,
          examOfferingIds: [offering.id],
          date: offering.examDate,
          sessionId: offering.examSessionId,
        });
      }
      if (!sup2Id) {
        conflicts.push({
          id: `unassigned-sup2-${offering.id}`,
          type: 'UNASSIGNED_SUPERVISOR',
          severity: 'low', // Strictly WARNING! BUKAN HARD CONFLICT
          title: `Pengawas 2 Belum Diisi: ${offering.courseName} ${offering.sectionName || ''}`,
          description: `Pengawas 2 belum ditentukan oleh Admin.`,
          examOfferingIds: [offering.id],
          date: offering.examDate,
          sessionId: offering.examSessionId,
        });
      }
    }

    // Group for slot-based overlap checks
    if (offering.examDate && offering.examSessionId) {
      const slotKey = `${offering.examDate}__${offering.examSessionId}`;
      const existing = slotMap.get(slotKey) || [];
      existing.push(offering);
      slotMap.set(slotKey, existing);
    }
  }

  // Check slot-based overlaps (Room & Supervisor & Semester Warning)
  slotMap.forEach((slotOfferings, slotKey) => {
    const [date, sessionId] = slotKey.split('__');
    const sessionName = sessionMap.get(sessionId)?.name || sessionId;

    // 1. Room Overlap
    const roomUsage = new Map<string, ExamOffering[]>();
    for (const off of slotOfferings) {
      for (const roomId of off.roomIds) {
        if (!roomId) continue;
        const list = roomUsage.get(roomId) || [];
        list.push(off);
        roomUsage.set(roomId, list);
      }
    }

    roomUsage.forEach((usedOfferings, roomId) => {
      if (usedOfferings.length > 1) {
        const room = roomMap.get(roomId);
        const roomName = room ? room.name : roomId;
        const courseNames = usedOfferings.map(o => `${o.courseName} (${o.sectionName || 'Utama'})`).join(' vs ');
        conflicts.push({
          id: `room-overlap-${roomId}-${date}-${sessionId}`,
          type: 'ROOM_OVERLAP',
          severity: 'high',
          title: `Bentrok Ruangan: ${roomName}`,
          description: `Ruang ${roomName} digunakan bersamaan oleh ${usedOfferings.length} ujian (${courseNames}) pada ${date}, ${sessionName}.`,
          examOfferingIds: usedOfferings.map(o => o.id),
          date,
          sessionId,
          roomId,
        });
      }
    });

    // 2. Supervisor Overlap
    const supervisorUsage = new Map<string, ExamOffering[]>();
    for (const off of slotOfferings) {
      for (const supId of off.supervisorLecturerIds || []) {
        if (!supId) continue;
        const list = supervisorUsage.get(supId) || [];
        list.push(off);
        supervisorUsage.set(supId, list);
      }
    }

    supervisorUsage.forEach((usedOfferings, supId) => {
      if (usedOfferings.length > 1) {
        const lecturer = lecturerMap.get(supId);
        const lecturerName = lecturer ? lecturer.name : supId;
        const courses = usedOfferings.map(o => `${o.courseName} (${o.sectionName || 'Utama'})`).join(' dan ');
        conflicts.push({
          id: `sup-overlap-${supId}-${date}-${sessionId}`,
          type: 'SUPERVISOR_OVERLAP',
          severity: 'high',
          title: `Bentrok Pengawas: ${lecturerName}`,
          description: `Dosen pengawas ${lecturerName} dijadwalkan mengawas ${usedOfferings.length} ujian bersamaan (${courses}) pada ${date}, ${sessionName}.`,
          examOfferingIds: usedOfferings.map(o => o.id),
          date,
          sessionId,
          supervisorId: supId,
        });
      }
    });

    // 3. Semester Warning (different courses with same semester & KBK on same session)
    const semesterMap = new Map<number, ExamOffering[]>();
    for (const off of slotOfferings) {
      const list = semesterMap.get(off.semester) || [];
      list.push(off);
      semesterMap.set(off.semester, list);
    }

    semesterMap.forEach((semOfferings, sem) => {
      // Find distinct course IDs (parallel sections of the same course are fine!)
      const uniqueCourses = new Map<string, ExamOffering[]>();
      for (const off of semOfferings) {
        const list = uniqueCourses.get(off.courseId) || [];
        list.push(off);
        uniqueCourses.set(off.courseId, list);
      }

      if (uniqueCourses.size > 1) {
        const distinctNames = Array.from(uniqueCourses.values()).map(arr => arr[0].courseName).join(', ');
        conflicts.push({
          id: `sem-conflict-${sem}-${date}-${sessionId}`,
          type: 'SEMESTER_POTENTIAL_CONFLICT',
          severity: 'medium',
          title: `Potensi Konflik Kelompok Mahasiswa Semester ${sem}`,
          description: `Mata kuliah ${distinctNames} dijadwalkan pada waktu yang sama (${date}, ${sessionName}). Mahasiswa semester ${sem} berpotensi memiliki jadwal ujian bentrok.`,
          examOfferingIds: semOfferings.map(o => o.id),
          date,
          sessionId,
        });
      }
    });
  });

  return conflicts;
}

/**
 * Generate initial greedy schedule for exam offerings
 */
export function generateInitialExamSchedule(
  offerings: ExamOffering[],
  rooms: Room[],
  sessions: ExamSession[],
  availableDates: string[]
): ExamOffering[] {
  if (offerings.length === 0 || availableDates.length === 0 || sessions.length === 0) {
    return offerings;
  }

  const activeRooms = rooms.filter(r => r.isActive);
  const activeSessions = sessions.filter(s => s.isActive);
  if (activeRooms.length === 0 || activeSessions.length === 0) {
    return offerings;
  }

  // Sort rooms descending by capacity
  const sortedRooms = [...activeRooms].sort((a, b) => b.capacity - a.capacity);

  // Group offerings by courseId to keep parallel sections (e.g. Basis Data A & B) together at same date/session
  const courseGroups = new Map<string, ExamOffering[]>();
  for (const off of offerings) {
    const list = courseGroups.get(off.courseId) || [];
    list.push(off);
    courseGroups.set(off.courseId, list);
  }

  // Sort groups: higher semester courses first or larger cohorts
  const sortedGroups = Array.from(courseGroups.values()).sort((a, b) => {
    const totalA = a.reduce((sum, o) => sum + o.studentCount, 0);
    const totalB = b.reduce((sum, o) => sum + o.studentCount, 0);
    return totalB - totalA;
  });

  // Keep track of room usage: [date][sessionId] -> Set of roomIds
  const roomOccupancy = new Map<string, Set<string>>();
  // Keep track of semester usage: [date][sessionId] -> Set of semesters
  const semesterOccupancy = new Map<string, Set<number>>();

  const result: ExamOffering[] = [];

  let dateIndex = 0;
  let sessionIndex = 0;

  for (const group of sortedGroups) {
    let assigned = false;

    // Search for a slot where all sections in this group can be placed simultaneously without room overlap
    for (let attempt = 0; attempt < availableDates.length * activeSessions.length; attempt++) {
      const candidateDate = availableDates[(dateIndex + Math.floor(attempt / activeSessions.length)) % availableDates.length];
      const candidateSession = activeSessions[(sessionIndex + (attempt % activeSessions.length)) % activeSessions.length];
      const slotKey = `${candidateDate}__${candidateSession.id}`;

      const usedRooms = roomOccupancy.get(slotKey) || new Set<string>();
      const usedSemesters = semesterOccupancy.get(slotKey) || new Set<number>();

      // Check if semester is already used in this slot
      const semesterConflict = usedSemesters.has(group[0].semester);

      // Find available rooms for each section
      const selectedRooms: Room[] = [];
      const currentUsedInSlot = new Set<string>(usedRooms);

      let canFitAllSections = true;
      for (const off of group) {
        // Find best room that fits studentCount and is not used
        const bestRoom = sortedRooms.find(r => !currentUsedInSlot.has(r.id) && r.capacity >= off.studentCount);
        if (bestRoom) {
          selectedRooms.push(bestRoom);
          currentUsedInSlot.add(bestRoom.id);
        } else {
          canFitAllSections = false;
          break;
        }
      }

      if (canFitAllSections && (!semesterConflict || attempt > availableDates.length * 2)) {
        // Assign!
        roomOccupancy.set(slotKey, currentUsedInSlot);
        usedSemesters.add(group[0].semester);
        semesterOccupancy.set(slotKey, usedSemesters);

        group.forEach((off, idx) => {
          result.push({
            ...off,
            examDate: candidateDate,
            examSessionId: candidateSession.id,
            roomIds: [selectedRooms[idx].id],
            status: 'scheduled',
          });
        });

        assigned = true;
        sessionIndex = (sessionIndex + 1) % activeSessions.length;
        if (sessionIndex === 0) {
          dateIndex = (dateIndex + 1) % availableDates.length;
        }
        break;
      }
    }

    if (!assigned) {
      // Fallback: assign to first date and session with available room
      const fallbackDate = availableDates[dateIndex % availableDates.length];
      const fallbackSession = activeSessions[sessionIndex % activeSessions.length];
      group.forEach(off => {
        const room = sortedRooms.find(r => r.capacity >= off.studentCount) || sortedRooms[0];
        result.push({
          ...off,
          examDate: fallbackDate,
          examSessionId: fallbackSession.id,
          roomIds: [room.id],
          status: 'scheduled',
        });
      });
      dateIndex++;
    }
  }

  return result;
}

/**
 * Cost calculation for simulated annealing
 */
function calculateExamCost(
  offerings: ExamOffering[],
  rooms: Room[],
  sessions: ExamSession[],
  lecturers: Lecturer[]
): number {
  const conflicts = detectExamConflicts(offerings, rooms, sessions, lecturers);

  let cost = 0;
  for (const c of conflicts) {
    if (c.severity === 'high') {
      if (c.type === 'ROOM_OVERLAP') cost += 12000;
      else if (c.type === 'SUPERVISOR_OVERLAP') cost += 9000;
      else if (c.type === 'ROOM_CAPACITY') cost += 7000;
      else cost += 5000;
    } else if (c.severity === 'medium') {
      if (c.type === 'SEMESTER_POTENTIAL_CONFLICT') cost += 2000;
      else cost += 1000;
    } else {
      cost += 200;
    }
  }

  // Bonus for parallel sections of same course having the same date and session
  const courseMap = new Map<string, ExamOffering[]>();
  for (const off of offerings) {
    const list = courseMap.get(off.courseId) || [];
    list.push(off);
    courseMap.set(off.courseId, list);
  }

  courseMap.forEach(sections => {
    if (sections.length > 1) {
      const first = sections[0];
      for (let i = 1; i < sections.length; i++) {
        if (sections[i].examDate !== first.examDate || sections[i].examSessionId !== first.examSessionId) {
          cost += 1500; // Penalty for split sections on different exam times
        }
      }
    }
  });

  return cost;
}

/**
 * Simulated Annealing Optimizer for Exam Scheduling.
 * Mutates only:
 * - examDate
 * - examSessionId
 * - roomIds
 * Never touches:
 * - course, semester, studentCount, examType, supervisors
 */
export async function optimizeExamScheduleSA(
  initialOfferings: ExamOffering[],
  rooms: Room[],
  sessions: ExamSession[],
  lecturers: Lecturer[],
  options: ExamOptimizationOptions,
  onProgress?: (p: ExamOptimizationProgress) => void,
  shouldStopRef?: { current: boolean }
): Promise<{ offerings: ExamOffering[]; conflicts: ExamConflictItem[]; finalCost: number }> {
  const activeRooms = rooms.filter(r => r.isActive);
  const activeSessions = sessions.filter(s => s.isActive);
  const dates = options.availableDates;

  if (initialOfferings.length === 0 || dates.length === 0 || activeSessions.length === 0 || activeRooms.length === 0) {
    const conflicts = detectExamConflicts(initialOfferings, rooms, sessions, lecturers);
    return { offerings: initialOfferings, conflicts, finalCost: 0 };
  }

  let currentOfferings: ExamOffering[] = JSON.parse(JSON.stringify(initialOfferings));
  // Ensure every offering has an initial slot
  currentOfferings = currentOfferings.map(off => {
    if (!off.examDate || !off.examSessionId || off.roomIds.length === 0) {
      const randomDate = dates[Math.floor(Math.random() * dates.length)];
      const randomSession = activeSessions[Math.floor(Math.random() * activeSessions.length)];
      const fittingRoom = activeRooms.find(r => r.capacity >= off.studentCount) || activeRooms[0];
      return {
        ...off,
        examDate: off.examDate || randomDate,
        examSessionId: off.examSessionId || randomSession.id,
        roomIds: off.roomIds.length > 0 ? off.roomIds : [fittingRoom.id],
        status: 'scheduled',
      };
    }
    return off;
  });

  let bestOfferings: ExamOffering[] = JSON.parse(JSON.stringify(currentOfferings));

  let currentCost = calculateExamCost(currentOfferings, rooms, sessions, lecturers);
  let bestCost = currentCost;

  const maxIterations = options.maxIterations || 800;
  let temperature = options.initialTemperature || 1500;
  const coolingRate = options.coolingRate || 0.993;

  for (let iter = 1; iter <= maxIterations; iter++) {
    if (shouldStopRef?.current) {
      break;
    }

    // Generate neighbor mutation
    const neighbor: ExamOffering[] = JSON.parse(JSON.stringify(currentOfferings));
    const targetIdx = Math.floor(Math.random() * neighbor.length);
    const target = neighbor[targetIdx];

    const mutationType = Math.random();

    if (mutationType < 0.4) {
      // Change session and/or date
      target.examSessionId = activeSessions[Math.floor(Math.random() * activeSessions.length)].id;
      if (Math.random() < 0.5) {
        target.examDate = dates[Math.floor(Math.random() * dates.length)];
      }
      // If parallel section exists, keep them together with high probability
      if (options.keepParallelSectionsTogether !== false) {
        neighbor.forEach(other => {
          if (other.id !== target.id && other.courseId === target.courseId) {
            other.examDate = target.examDate;
            other.examSessionId = target.examSessionId;
          }
        });
      }
    } else if (mutationType < 0.75) {
      // Change room to another room
      const fittingRooms = activeRooms.filter(r => r.capacity >= target.studentCount);
      const chosenRoom = fittingRooms.length > 0
        ? fittingRooms[Math.floor(Math.random() * fittingRooms.length)]
        : activeRooms[Math.floor(Math.random() * activeRooms.length)];
      target.roomIds = [chosenRoom.id];
    } else {
      // Swap date/session/room between two offerings of the same or different course
      const otherIdx = Math.floor(Math.random() * neighbor.length);
      if (otherIdx !== targetIdx) {
        const other = neighbor[otherIdx];
        const tempDate = target.examDate;
        const tempSession = target.examSessionId;
        target.examDate = other.examDate;
        target.examSessionId = other.examSessionId;
        other.examDate = tempDate;
        other.examSessionId = tempSession;
      }
    }

    const neighborCost = calculateExamCost(neighbor, rooms, sessions, lecturers);
    const deltaCost = neighborCost - currentCost;

    // Metropolis acceptance criterion
    if (deltaCost < 0 || Math.exp(-deltaCost / Math.max(temperature, 0.001)) > Math.random()) {
      currentOfferings = neighbor;
      currentCost = neighborCost;

      if (currentCost < bestCost) {
        bestOfferings = JSON.parse(JSON.stringify(currentOfferings));
        bestCost = currentCost;
      }
    }

    temperature *= coolingRate;

    // Report progress periodically & yield thread for UI smoothness
    if (iter % 25 === 0 || iter === maxIterations) {
      if (onProgress) {
        const currentConflicts = detectExamConflicts(bestOfferings, rooms, sessions, lecturers);
        onProgress({
          iteration: iter,
          maxIterations,
          temperature,
          currentCost,
          bestCost,
          conflictCount: currentConflicts.length,
          status: iter === maxIterations ? 'completed' : 'running',
        });
      }
      // Async yield
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const finalConflicts = detectExamConflicts(bestOfferings, rooms, sessions, lecturers);

  return {
    offerings: bestOfferings,
    conflicts: finalConflicts,
    finalCost: bestCost,
  };
}
