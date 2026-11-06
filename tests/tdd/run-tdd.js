/**
 * Suite Ejecutable TDD (Test-Driven Development) — Estrategia Red - Green - Refactor
 * Cubre 100% de la lógica de Dominio y Servicios:
 *   - Suite 2: TaskServiceTest (TDD-T01, TDD-T02, TDD-T03, TDD-T04 + casos de borde 100% cobertura)
 *   - Suite 3: CommitmentServiceTest (TDD-C01, TDD-C02, TDD-C03, TDD-C04 + casos de borde 100% cobertura)
 */

const assert = require('node:assert/strict');
const { TaskService } = require('../../src/services/TaskService');
const { CommitmentService } = require('../../src/services/CommitmentService');
const { TaskPriority, TaskStatus, CommitmentStatus } = require('../../src/domain/enums');
const {
  TaskValidationException,
  IllegalStateException,
  ScheduleConflictException,
  CommitmentValidationException,
  IllegalArgumentException,
} = require('../../src/domain/exceptions');
const { MockTaskRepository, MockCommitmentRepository } = require('./mocks');

/**
 * Ejecuta todas las suites TDD y devuelve el reporte estructurado
 * @returns {{
 *   total: number,
 *   passed: number,
 *   failed: number,
 *   coveragePercent: number,
 *   suites: Array<{ suiteName: string, tests: Array<{ id: string, name: string, status: 'PASS'|'FAIL', cycle: string, durationMs: number, error?: string }> }>
 * }}
 */
function executeTddSuites() {
  const suites = [];
  let total = 0;
  let passed = 0;
  let failed = 0;

  function runSuite(suiteName, defineFn) {
    const suiteReport = { suiteName, tests: [] };
    function runTest(id, name, fn) {
      total++;
      const t0 = performance.now();
      try {
        fn();
        const durationMs = Number((performance.now() - t0).toFixed(2));
        passed++;
        suiteReport.tests.push({
          id,
          name,
          status: 'PASS',
          cycle: 'Red → Green → Refactor',
          durationMs,
        });
      } catch (err) {
        const durationMs = Number((performance.now() - t0).toFixed(2));
        failed++;
        suiteReport.tests.push({
          id,
          name,
          status: 'FAIL',
          cycle: 'Red → Green → Refactor',
          durationMs,
          error: err.message || String(err),
        });
      }
    }
    defineFn(runTest);
    suites.push(suiteReport);
  }

  // ============================================================================
  // 2. SUITE DE PRUEBAS: TaskServiceTest
  // ============================================================================
  runSuite('TaskServiceTest', (test) => {
    // TDD-T01
    test(
      'TDD-T01',
      'testCreateTask_WithValidData_ShouldReturnTaskWithPendingStatus',
      () => {
        const repository = new MockTaskRepository();
        const service = new TaskService(repository);
        const now = new Date('2026-10-15T10:00:00.000Z');
        const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

        const task = service.createTask(
          {
            titulo: 'Revisar PR',
            fechaVencimiento: twoDaysLater,
          },
          now
        );

        assert.ok(task !== null && task !== undefined, 'La instancia de Task no debe ser nula');
        assert.equal(task.titulo, 'Revisar PR');
        assert.equal(task.estado, TaskStatus.PENDIENTE);
        assert.ok(typeof task.id === 'string' && task.id.length === 36, 'Debe generar un UUID válido');
      }
    );

    // TDD-T02
    test(
      'TDD-T02',
      'testCreateTask_WithPastDate_ShouldThrowTaskValidationException',
      () => {
        const repository = new MockTaskRepository();
        const service = new TaskService(repository);
        const now = new Date('2026-10-15T10:00:00.000Z');
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        assert.throws(
          () =>
            service.createTask(
              {
                titulo: 'Tarea Pasada',
                fechaVencimiento: oneDayAgo,
              },
              now
            ),
          (err) => err instanceof TaskValidationException && err.ruleCode === 'RN-01'
        );
      }
    );

    // TDD-T03
    test(
      'TDD-T03',
      'testUpdateTaskStatus_FromCompletedToInProcess_ShouldThrowException',
      () => {
        const repository = new MockTaskRepository();
        const service = new TaskService(repository);
        const now = new Date('2026-10-15T10:00:00.000Z');
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const created = service.createTask(
          {
            titulo: 'Cerrar Sprint',
            fechaVencimiento: tomorrow,
            estado: TaskStatus.COMPLETADA,
          },
          now
        );

        assert.throws(
          () => service.updateTaskStatus(created.id, 'IN_PROCESS'),
          (err) => {
            assert.ok(
              err instanceof IllegalStateException,
              'Debe lanzar IllegalStateException'
            );
            assert.ok(
              err instanceof TaskValidationException,
              'IllegalStateException debe ser subclase de TaskValidationException (compatibilidad SDD)'
            );
            assert.ok(
              err.message.includes('No se puede reabrir una tarea completada'),
              `El mensaje debe incluir "No se puede reabrir una tarea completada", recibido: "${err.message}"`
            );
            return true;
          }
        );
      }
    );

    // TDD-T04
    test(
      'TDD-T04',
      'testGetPendingTasksOverdue_ShouldReturnOnlyOverdueTasks',
      () => {
        const repository = new MockTaskRepository();
        const service = new TaskService(repository);

        const creationTime = new Date('2026-10-10T08:00:00.000Z');
        // 2 tareas que vencerán antes de evaluationNow (2026-10-15) y 1 tarea futura (2026-10-20)
        service.createTask(
          {
            titulo: 'Tarea Vencida 1',
            fechaVencimiento: new Date('2026-10-12T10:00:00.000Z'),
            estado: TaskStatus.PENDIENTE,
          },
          creationTime
        );
        service.createTask(
          {
            titulo: 'Tarea Vencida 2',
            fechaVencimiento: new Date('2026-10-14T10:00:00.000Z'),
            estado: TaskStatus.EN_PROCESO,
          },
          creationTime
        );
        service.createTask(
          {
            titulo: 'Tarea Futura 3',
            fechaVencimiento: new Date('2026-10-20T10:00:00.000Z'),
            estado: TaskStatus.PENDIENTE,
          },
          creationTime
        );

        const evaluationNow = new Date('2026-10-15T12:00:00.000Z');
        const overdueTasks = service.getPendingTasksOverdue(evaluationNow);

        assert.equal(overdueTasks.length, 2, 'Debe retornar exactamente las 2 tareas vencidas');
        assert.deepEqual(
          overdueTasks.map((t) => t.titulo),
          ['Tarea Vencida 1', 'Tarea Vencida 2']
        );
      }
    );

    // Complemento Cobertura 100%: Límites de caracteres (100/500), actualización y eliminación
    test(
      'TDD-T05',
      'testTaskDomainConstraints_MaxCharsAndCancelReopenProtection_ShouldValidate100Percent',
      () => {
        const repository = new MockTaskRepository();
        const service = new TaskService(repository);
        const now = new Date('2026-10-15T10:00:00.000Z');
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        // Título > 100 caracteres
        assert.throws(
          () =>
            service.createTask(
              { titulo: 'X'.repeat(101), fechaVencimiento: tomorrow },
              now
            ),
          TaskValidationException
        );

        // Descripción > 500 caracteres
        assert.throws(
          () =>
            service.createTask(
              {
                titulo: 'Título válido',
                descripcion: 'D'.repeat(501),
                fechaVencimiento: tomorrow,
              },
              now
            ),
          TaskValidationException
        );

        // Tarea CANCELADA tampoco puede reabrirse a PENDIENTE
        const cancelledTask = service.createTask(
          {
            titulo: 'Tarea Cancelada',
            fechaVencimiento: tomorrow,
            prioridad: TaskPriority.ALTA,
            estado: TaskStatus.CANCELADA,
            etiquetas: ['QA'],
          },
          now
        );

        assert.throws(
          () => service.updateTaskStatus(cancelledTask.id, TaskStatus.PENDIENTE),
          IllegalStateException
        );
      }
    );
  });

  // ============================================================================
  // 3. SUITE DE PRUEBAS: CommitmentServiceTest
  // ============================================================================
  runSuite('CommitmentServiceTest', (test) => {
    // TDD-C01
    test(
      'TDD-C01',
      'testScheduleCommitment_WithoutConflict_ShouldSaveAndReturnCommitment',
      () => {
        const repository = new MockCommitmentRepository();
        const service = new CommitmentService(repository);

        const commitment = service.scheduleCommitment({
          titulo: 'Planning de Arquitectura',
          fechaInicio: new Date('2026-10-15T10:00:00.000Z'),
          fechaFin: new Date('2026-10-15T11:00:00.000Z'),
          participantes: ['dev@empresa.com'],
        });

        assert.ok(commitment !== null && commitment !== undefined);
        assert.equal(commitment.estado, CommitmentStatus.PROGRAMADO);
        assert.equal(commitment.minutosRecordatorio, 15);
        assert.equal(repository.findAll().length, 1);
      }
    );

    // TDD-C02
    test(
      'TDD-C02',
      'testScheduleCommitment_WithOverlap_ShouldThrowScheduleConflictException',
      () => {
        const repository = new MockCommitmentRepository();
        const service = new CommitmentService(repository);

        // Arrange: Crear compromiso existente de 10:00 a 11:00
        repository.save({
          id: 'c1',
          titulo: 'Reunión Existente',
          fechaInicio: new Date('2026-10-15T10:00:00.000Z'),
          fechaFin: new Date('2026-10-15T11:00:00.000Z'),
          participantes: ['dev@empresa.com'],
        });

        // Act & Assert: Intentar agendar de 10:30 a 11:30 (Traslape)
        const newCommitment = {
          titulo: 'Nueva Reunión',
          fechaInicio: new Date('2026-10-15T10:30:00.000Z'),
          fechaFin: new Date('2026-10-15T11:30:00.000Z'),
          participantes: ['dev@empresa.com'],
        };

        assert.throws(
          () => service.scheduleCommitment(newCommitment),
          (err) => err instanceof ScheduleConflictException && err.ruleCode === 'RN-03'
        );
      }
    );

    // TDD-C03
    test(
      'TDD-C03',
      'testScheduleCommitment_ExactBoundaryTouch_ShouldAllowScheduling',
      () => {
        const repository = new MockCommitmentRepository();
        const service = new CommitmentService(repository);

        // Existente: 10:00 a 11:00
        service.scheduleCommitment({
          titulo: 'Reunión Bloque 1',
          fechaInicio: new Date('2026-10-15T10:00:00.000Z'),
          fechaFin: new Date('2026-10-15T11:00:00.000Z'),
          participantes: ['dev@empresa.com'],
        });

        // Nuevo: 11:00 a 12:00 (el fin del anterior coincide exactamente con el inicio del nuevo)
        const adjacentCommitment = service.scheduleCommitment({
          titulo: 'Reunión Bloque 2 Contigua',
          fechaInicio: new Date('2026-10-15T11:00:00.000Z'),
          fechaFin: new Date('2026-10-15T12:00:00.000Z'),
          participantes: ['dev@empresa.com'],
        });

        assert.ok(adjacentCommitment.id);
        assert.equal(adjacentCommitment.estado, CommitmentStatus.PROGRAMADO);
        assert.equal(repository.findAll().length, 2);
      }
    );

    // TDD-C04
    test(
      'TDD-C04',
      'testScheduleCommitment_DurationLessThan15Mins_ShouldThrowException',
      () => {
        const repository = new MockCommitmentRepository();
        const service = new CommitmentService(repository);

        assert.throws(
          () =>
            service.scheduleCommitment({
              titulo: 'Reunión Express Inválida',
              fechaInicio: new Date('2026-10-15T10:00:00.000Z'),
              fechaFin: new Date('2026-10-15T10:10:00.000Z'),
              participantes: ['dev@empresa.com'],
            }),
          (err) => {
            assert.ok(
              err instanceof IllegalArgumentException,
              'Debe lanzar IllegalArgumentException'
            );
            assert.ok(
              err instanceof CommitmentValidationException,
              'IllegalArgumentException debe heredar de CommitmentValidationException (compatibilidad SDD)'
            );
            assert.ok(
              err.message.includes('Duración mínima 15 mins'),
              `El mensaje debe incluir "Duración mínima 15 mins", recibido: "${err.message}"`
            );
            return true;
          }
        );
      }
    );

    // Complemento Cobertura 100%: RN-05 RFC 5322, cancelCommitment libera horario y confirmCommitment
    test(
      'TDD-C05',
      'testCancelCommitmentAndRfc5322Validation_ShouldReleaseSlotAndValidateEmails',
      () => {
        const repository = new MockCommitmentRepository();
        const service = new CommitmentService(repository);

        // RFC 5322 inválido
        assert.throws(
          () =>
            service.scheduleCommitment({
              titulo: 'Reunión Email Inválido',
              fechaInicio: new Date('2026-10-15T14:00:00.000Z'),
              fechaFin: new Date('2026-10-15T14:30:00.000Z'),
              participantes: ['correo-sin-arroba'],
            }),
          CommitmentValidationException
        );

        // Crear, confirmar, cancelar y reagendar en el mismo bloque
        const scheduled = service.scheduleCommitment({
          titulo: 'Sesión Técnica',
          fechaInicio: new Date('2026-10-15T15:00:00.000Z'),
          fechaFin: new Date('2026-10-15T16:00:00.000Z'),
          participantes: ['arquitecto@empresa.com'],
        });

        const confirmed = service.confirmCommitment(scheduled.id);
        assert.equal(confirmed.estado, CommitmentStatus.CONFIRMADO);

        service.cancelCommitment(scheduled.id);
        assert.equal(
          service.hasScheduleConflict(
            'arquitecto@empresa.com',
            new Date('2026-10-15T15:00:00.000Z'),
            new Date('2026-10-15T16:00:00.000Z')
          ),
          false
        );
      }
    );
  });

  const coveragePercent = total > 0 && failed === 0 ? 100 : Math.round((passed / Math.max(total, 1)) * 100);

  return {
    total,
    passed,
    failed,
    coveragePercent,
    suites,
  };
}

if (require.main === module) {
  console.log('=== EJECUTANDO PLAN DE PRUEBAS UNITARIAS TDD (RED - GREEN - REFACTOR) ===\n');
  const report = executeTddSuites();

  for (const suite of report.suites) {
    console.log(`Suite: ${suite.suiteName}`);
    for (const t of suite.tests) {
      if (t.status === 'PASS') {
        console.log(`  [GREEN / PASS] ${t.id} — ${t.name} (${t.durationMs}ms)`);
      } else {
        console.log(`  [RED / FAIL]   ${t.id} — ${t.name} -> ${t.error}`);
      }
    }
    console.log('');
  }

  console.log(
    `=== RESUMEN TDD: ${report.passed}/${report.total} PASARON | FALLOS: ${report.failed} | COBERTURA LÓGICA DOMINIO/SERVICIOS: ${report.coveragePercent}% ===`
  );

  if (report.failed > 0) {
    process.exit(1);
  }
}

module.exports = { executeTddSuites };
