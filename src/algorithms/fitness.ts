import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  ConstraintWeights,
  Student,
  StudentEnrollment,
  CurriculumPackage,
  CourseOffering,
} from '../types';
import { detectConflicts, ConflictDetectionResult } from './conflictDetection';

export interface FitnessEvaluation {
  cost: number;
  fitness: number;
  hardConflicts: number;
  softConflicts: number;
  totalConflicts: number;
  conflictDetails: ConflictDetectionResult;
}

/**
 * Evaluates the cost and fitness score of a schedule assignment solution.
 * Cost = (Hard Conflicts * Hard Weights) + (Soft Conflicts * Soft Weights)
 * Objective is minimization of Cost.
 * Fitness = 1 / (1 + Cost) where higher is better (range: (0, 1]).
 */
export function evaluateSchedule(
  assignments: ScheduleAssignment[],
  courses: Course[],
  lecturers: Lecturer[],
  classes: ClassGroup[],
  rooms: Room[],
  timeslots: Timeslot[],
  weights: ConstraintWeights,
  students?: Student[],
  enrollments?: StudentEnrollment[],
  curriculumPackages?: CurriculumPackage[],
  offerings?: CourseOffering[]
): FitnessEvaluation {
  const conflictResult = detectConflicts(
    assignments,
    courses,
    lecturers,
    classes,
    rooms,
    timeslots,
    weights,
    students,
    enrollments,
    curriculumPackages,
    offerings
  );

  const cost = conflictResult.totalCost;
  const fitness = 1 / (1 + cost);

  return {
    cost,
    fitness,
    hardConflicts: conflictResult.hardConflictsCount,
    softConflicts: conflictResult.softConflictsCount,
    totalConflicts: conflictResult.totalConflictsCount,
    conflictDetails: conflictResult,
  };
}
