import {
  ScheduleAssignment,
  Course,
  Lecturer,
  ClassGroup,
  Room,
  Timeslot,
  SAParameters,
  ConstraintWeights,
  OptimizationResult,
  ConvergencePoint,
  TraceLogItem,
  Student,
  StudentEnrollment,
  CurriculumPackage,
} from '../types';
import { evaluateSchedule } from './fitness';
import { generateNeighbor } from './neighborGeneration';

export interface SAProgressCallbackData {
  iteration: number;
  maxIterations: number;
  currentCost: number;
  bestCost: number;
  currentFitness: number;
  bestFitness: number;
  temperature: number;
  currentConflicts: number;
  bestConflicts: number;
  hardConflicts: number;
  softConflicts: number;
  progressPercentage: number;
  recentTrace: TraceLogItem[];
  currentSchedule: ScheduleAssignment[];
  bestSchedule: ScheduleAssignment[];
}

export type SAProgressCallback = (data: SAProgressCallbackData) => void;

export class SimulatedAnnealingEngine {
  private isRunning: boolean = false;
  private shouldStop: boolean = false;

  public stop(): void {
    this.shouldStop = true;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Executes the Simulated Annealing optimization process asynchronously.
   */
  public async runOptimization(
    initialSchedule: ScheduleAssignment[],
    courses: Course[],
    lecturers: Lecturer[],
    classes: ClassGroup[],
    rooms: Room[],
    timeslots: Timeslot[],
    parameters: SAParameters,
    weights: ConstraintWeights,
    onProgress?: SAProgressCallback,
    students?: Student[],
    enrollments?: StudentEnrollment[],
    curriculumPackages?: CurriculumPackage[]
  ): Promise<OptimizationResult> {
    this.isRunning = true;
    this.shouldStop = false;
    const startTime = performance.now();

    // 1. Initial State Evaluation
    let currentSolution: ScheduleAssignment[] = initialSchedule.map(a => ({ ...a }));
    let currentEval = evaluateSchedule(
      currentSolution,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights,
      students,
      enrollments,
      curriculumPackages
    );
    let currentCost = currentEval.cost;

    let bestSolution: ScheduleAssignment[] = currentSolution.map(a => ({ ...a }));
    let bestCost = currentCost;
    let bestEval = currentEval;
    let bestIteration = 0;

    let temperature = parameters.initialTemperature;
    const minTemp = parameters.minimumTemperature;
    const coolingRate = parameters.coolingRate;
    const maxIter = parameters.maxIterations;

    const initialResultSummary = {
      total: currentEval.totalConflicts,
      hard: currentEval.hardConflicts,
      soft: currentEval.softConflicts,
      items: currentEval.conflictDetails.items,
    };

    const convergenceHistory: ConvergencePoint[] = [];
    const sampleTrace: TraceLogItem[] = [];

    // Record initial starting point
    convergenceHistory.push({
      iteration: 0,
      currentCost,
      bestCost,
      temperature,
      currentConflicts: currentEval.totalConflicts,
      bestConflicts: bestEval.totalConflicts,
      hardConflicts: currentEval.hardConflicts,
      softConflicts: currentEval.softConflicts,
    });

    let iteration = 0;
    const batchSize = Math.max(10, Math.floor(maxIter / 200)); // update UI in responsive batches

    while (iteration < maxIter && temperature > minTemp && !this.shouldStop) {
      iteration++;

      // Identify conflicting assignments to guide mutation
      const conflictAssignmentIds = currentEval.conflictDetails.items
        .map(c => [c.assignment1Id, c.assignment2Id])
        .flat()
        .filter((id): id is string => Boolean(id));

      // Generate neighbor solution
      const { neighbor, moveType } = generateNeighbor(
        currentSolution,
        courses,
        rooms,
        timeslots,
        parameters.mutationRate,
        conflictAssignmentIds
      );

      // Evaluate neighbor
      const neighborEval = evaluateSchedule(
        neighbor,
        courses,
        lecturers,
        classes,
        rooms,
        timeslots,
        weights,
        students,
        enrollments,
        curriculumPackages
      );
      const neighborCost = neighborEval.cost;
      const deltaCost = neighborCost - currentCost;

      let accepted = false;
      let acceptanceProbability = 1.0;
      let isNewBest = false;

      // Acceptance criterion
      if (deltaCost < 0) {
        // Better solution found -> unconditional acceptance
        accepted = true;
        acceptanceProbability = 1.0;
      } else {
        // Worse solution -> metropolis acceptance probability
        // Prevent floating point division by near-zero temperature
        const safeTemp = Math.max(temperature, 1e-10);
        acceptanceProbability = Math.exp(-deltaCost / safeTemp);
        
        if (Math.random() < acceptanceProbability) {
          accepted = true;
        }
      }

      if (accepted) {
        currentSolution = neighbor;
        currentCost = neighborCost;
        currentEval = neighborEval;

        // Check if global best
        if (currentCost < bestCost) {
          bestCost = currentCost;
          bestSolution = currentSolution.map(a => ({ ...a }));
          bestEval = currentEval;
          bestIteration = iteration;
          isNewBest = true;
        }
      }

      // Record sample trace item (keep last 60 items)
      if (sampleTrace.length >= 60) {
        sampleTrace.shift();
      }
      sampleTrace.push({
        iteration,
        currentCost,
        neighborCost,
        deltaCost,
        temperature,
        acceptanceProbability: Number(acceptanceProbability.toFixed(4)),
        accepted,
        isNewBest,
        actionTaken: `${moveType} ${accepted ? (isNewBest ? '(★ Solusi Terbaik Baru)' : '(Diterima)') : '(Ditolak)'}`,
      });

      // Record convergence data at log/interval steps
      const shouldRecordConvergence =
        iteration === 1 ||
        iteration % Math.max(1, Math.floor(maxIter / 100)) === 0 ||
        isNewBest ||
        iteration === maxIter;

      if (shouldRecordConvergence) {
        convergenceHistory.push({
          iteration,
          currentCost,
          bestCost,
          temperature: Number(temperature.toFixed(2)),
          currentConflicts: currentEval.totalConflicts,
          bestConflicts: bestEval.totalConflicts,
          hardConflicts: bestEval.hardConflicts,
          softConflicts: bestEval.softConflicts,
        });
      }

      // Cooling schedule
      temperature *= coolingRate;

      // Batch yield to keep UI responsive and notify progress
      if (iteration % batchSize === 0 || iteration === maxIter || isNewBest) {
        if (onProgress) {
          onProgress({
            iteration,
            maxIterations: maxIter,
            currentCost,
            bestCost,
            currentFitness: currentEval.fitness,
            bestFitness: bestEval.fitness,
            temperature,
            currentConflicts: currentEval.totalConflicts,
            bestConflicts: bestEval.totalConflicts,
            hardConflicts: bestEval.hardConflicts,
            softConflicts: bestEval.softConflicts,
            progressPercentage: Math.min(100, Math.round((iteration / maxIter) * 100)),
            recentTrace: [...sampleTrace],
            currentSchedule: currentSolution,
            bestSchedule: bestSolution,
          });
        }
        // Give event loop a breather
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Early exit if optimal zero cost found
      if (bestCost === 0) {
        break;
      }
    }

    const endTime = performance.now();
    const executionTimeMs = Math.round(endTime - startTime);

    this.isRunning = false;

    // Final evaluation for best solution
    const finalEval = evaluateSchedule(
      bestSolution,
      courses,
      lecturers,
      classes,
      rooms,
      timeslots,
      weights
    );

    const result: OptimizationResult = {
      id: `opt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      parameters,
      weights,
      initialSchedule,
      initialCost: currentEval.cost,
      initialFitness: 1 / (1 + currentEval.cost),
      initialConflicts: initialResultSummary,
      bestSchedule: bestSolution,
      bestCost: finalEval.cost,
      bestFitness: finalEval.fitness,
      bestConflicts: {
        total: finalEval.totalConflicts,
        hard: finalEval.hardConflicts,
        soft: finalEval.softConflicts,
        items: finalEval.conflictDetails.items,
      },
      bestIteration,
      totalIterationsCompleted: iteration,
      executionTimeMs,
      status: this.shouldStop ? 'STOPPED' : 'COMPLETED',
      convergenceHistory,
      sampleTrace,
    };

    return result;
  }
}
