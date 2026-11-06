/**
 * Especificación Ejecutable TDD en TypeScript (Compatible con Jest y Node 24 Nativo)
 * Implementa las Suites de Pruebas de las Secciones 2, 3 y 4 del Plan TDD:
 *   - TaskServiceTest (TDD-T01 a TDD-T04)
 *   - CommitmentServiceTest (TDD-C01 a TDD-C04)
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const { TaskService } = require('../../src/services/TaskService');
const { CommitmentService } = require('../../src/services/CommitmentService');
const { TaskStatus, CommitmentStatus } = require('../../src/domain/enums');
const {
  TaskValidationException,
  IllegalStateException,
  ScheduleConflictException,
  IllegalArgumentException,
} = require('../../src/domain/exceptions');
const { MockTaskRepository, MockCommitmentRepository } = require('./mocks');

// Micro-harness compatible con Jest (describe / beforeEach / test / expect)
type HookFn = () => void | Promise<void>;
type TestFn = () => void | Promise<void>;

let currentBeforeEach: HookFn | null = null;
const pendingTests: Array<{ suite: string; name: string; beforeEachFn: HookFn | null; fn: TestFn }> = [];
let currentSuiteName = '';

function describe(suiteName: string, def: () => void): void {
  currentSuiteName = suiteName;
  currentBeforeEach = null;
  def();
}

function beforeEach(fn: HookFn): void {
  currentBeforeEach = fn;
}

function test(name: string, fn: TestFn): void {
  pendingTests.push({
    suite: currentSuiteName,
    name,
    beforeEachFn: currentBeforeEach,
    fn,
  });
}

function expect(received: unknown) {
  return {
    toBeDefined() {
      assert.ok(received !== undefined && received !== null);
    },
    toBe(expected: unknown) {
      assert.equal(received, expected);
    },
    toHaveLength(len: number) {
      assert.equal((received as Array<unknown>).length, len);
    },
    toThrow(ErrorClass?: new (...args: any[]) => Error) {
      assert.throws(
        received as () => unknown,
        ErrorClass ? (err: unknown) => err instanceof ErrorClass : undefined
      );
    },
    get rejects() {
      return {
        async toThrow(ErrorClass?: new (...args: any[]) => Error) {
          let threw = false;
          let caughtErr: unknown = null;
          try {
            if (typeof received === 'function') {
              await (received as () => Promise<unknown>)();
            } else {
              await received;
            }
          } catch (err) {
            threw = true;
            caughtErr = err;
          }
          assert.ok(threw, 'Expected operation to reject/throw an exception');
          if (ErrorClass) {
            assert.ok(
              caughtErr instanceof ErrorClass,
              `Expected error to be instance of ${ErrorClass.name}, got ${(caughtErr as Error)?.name}`
            );
          }
        },
      };
    },
  };
}

// ============================================================================
// 2. Suite de Pruebas: TaskServiceTest (TDD-T01 a TDD-T04)
// ============================================================================
describe('TaskService - TDD Tests', () => {
  let service: any;
  let repository: any;

  beforeEach(() => {
    repository = new MockTaskRepository();
    service = new TaskService(repository);
  });

  test('TDD-T01: testCreateTask_WithValidData_ShouldReturnTaskWithPendingStatus', async () => {
    const now = new Date('2026-10-15T10:00:00Z');
    const dueInTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const task = await service.createTask(
      {
        titulo: 'Revisar PR',
        fechaVencimiento: dueInTwoDays,
      },
      now
    );

    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.estado).toBe(TaskStatus.PENDIENTE);
  });

  test('TDD-T02: testCreateTask_WithPastDate_ShouldThrowTaskValidationException', async () => {
    const now = new Date('2026-10-15T10:00:00Z');
    const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    await expect(async () =>
      service.createTask(
        {
          titulo: 'Tarea Pasada',
          fechaVencimiento: pastDate,
        },
        now
      )
    ).rejects.toThrow(TaskValidationException);
  });

  test('TDD-T03: testUpdateTaskStatus_FromCompletedToInProcess_ShouldThrowException', async () => {
    const now = new Date('2026-10-15T10:00:00Z');
    const created = await service.createTask(
      {
        titulo: 'Tarea Completada',
        fechaVencimiento: new Date('2026-10-17T10:00:00Z'),
        estado: TaskStatus.COMPLETADA,
      },
      now
    );

    await expect(async () =>
      service.updateTaskStatus(created.id, 'IN_PROCESS')
    ).rejects.toThrow(IllegalStateException);
  });

  test('TDD-T04: testGetPendingTasksOverdue_ShouldReturnOnlyOverdueTasks', async () => {
    const createdTime = new Date('2026-10-10T08:00:00Z');
    await service.createTask(
      { titulo: 'Vencida 1', fechaVencimiento: new Date('2026-10-12T10:00:00Z') },
      createdTime
    );
    await service.createTask(
      { titulo: 'Vencida 2', fechaVencimiento: new Date('2026-10-14T10:00:00Z') },
      createdTime
    );
    await service.createTask(
      { titulo: 'Futura 1', fechaVencimiento: new Date('2026-10-20T10:00:00Z') },
      createdTime
    );

    const overdue = await service.getPendingTasksOverdue(new Date('2026-10-15T10:00:00Z'));
    expect(overdue).toHaveLength(2);
  });
});

// ============================================================================
// 3 & 4. Suite de Pruebas: CommitmentServiceTest (TDD-C01 a TDD-C04)
// ============================================================================
describe('CommitmentService - TDD Tests', () => {
  let service: any;
  let repository: any;

  beforeEach(() => {
    repository = new MockCommitmentRepository();
    service = new CommitmentService(repository);
  });

  test('TDD-C01: testScheduleCommitment_WithoutConflict_ShouldSaveAndReturnCommitment', async () => {
    const commitment = await service.scheduleCommitment({
      titulo: ' arquitectura inicial',
      fechaInicio: new Date('2026-10-15T10:00:00Z'),
      fechaFin: new Date('2026-10-15T11:00:00Z'),
      participantes: ['dev@empresa.com'],
    });

    expect(commitment).toBeDefined();
    expect(commitment.estado).toBe(CommitmentStatus.PROGRAMADO);
  });

  test('TDD-C02: Should throw ScheduleConflictException when commitment overlaps', async () => {
    // Arrange: Crear compromiso existente de 10:00 a 11:00
    await repository.save({
      id: 'c1',
      titulo: 'Reunión Existente',
      fechaInicio: new Date('2026-10-15T10:00:00Z'),
      fechaFin: new Date('2026-10-15T11:00:00Z'),
      participantes: ['dev@empresa.com'],
    });

    // Act & Assert: Intentar agendar de 10:30 a 11:30 (Traslape)
    const newCommitment = {
      titulo: 'Nueva Reunión',
      fechaInicio: new Date('2026-10-15T10:30:00Z'),
      fechaFin: new Date('2026-10-15T11:30:00Z'),
      participantes: ['dev@empresa.com'],
    };

    await expect(async () => service.scheduleCommitment(newCommitment)).rejects.toThrow(
      ScheduleConflictException
    );
  });

  test('TDD-C03: testScheduleCommitment_ExactBoundaryTouch_ShouldAllowScheduling', async () => {
    await repository.save({
      id: 'c1',
      titulo: 'Reunión 10 a 11',
      fechaInicio: new Date('2026-10-15T10:00:00Z'),
      fechaFin: new Date('2026-10-15T11:00:00Z'),
      participantes: ['dev@empresa.com'],
    });

    const contiguous = await service.scheduleCommitment({
      titulo: 'Reunión 11 a 12',
      fechaInicio: new Date('2026-10-15T11:00:00Z'),
      fechaFin: new Date('2026-10-15T12:00:00Z'),
      participantes: ['dev@empresa.com'],
    });

    expect(contiguous).toBeDefined();
    expect(contiguous.estado).toBe(CommitmentStatus.PROGRAMADO);
  });

  test('TDD-C04: testScheduleCommitment_DurationLessThan15Mins_ShouldThrowException', async () => {
    await expect(async () =>
      service.scheduleCommitment({
        titulo: 'Reunión 10 mins',
        fechaInicio: new Date('2026-10-15T10:00:00Z'),
        fechaFin: new Date('2026-10-15T10:10:00Z'),
        participantes: ['dev@empresa.com'],
      })
    ).rejects.toThrow(IllegalArgumentException);
  });
});

// Ejecutor directo en TypeScript
async function main() {
  console.log('=== EJECUTANDO ESPECIFICACIÓN TYPESCRIPT TDD (sdd-tdd-suites.spec.ts) ===');
  for (const item of pendingTests) {
    if (item.beforeEachFn) await item.beforeEachFn();
    await item.fn();
    console.log(`  [PASS] [${item.suite}] ${item.name}`);
  }
  console.log(`=== ${pendingTests.length}/${pendingTests.length} TESTS TYPESCRIPT TDD SUPERADOS ===`);
}

main();
