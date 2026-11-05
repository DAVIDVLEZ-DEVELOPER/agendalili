/**
 * Fase 4 (Verificación): Suite de Pruebas Automatizadas del Modelo en Cascada
 * Verifica:
 *  - Esquema SQLite relacional (`src/database/schema.sql`: `tasks`, `task_tags`, `commitments`, `commitment_participants`)
 *  - Entidades Task y Commitment (límites 100/500 chars, UUID, valores por defecto)
 *  - RN-01: Validación de fechaVencimiento futura en tareas (TaskValidationException)
 *  - RN-02: Prohibición de transiciones desde COMPLETADA/CANCELADA a EN_PROCESO/PENDIENTE (TaskValidationException)
 *  - RN-03: Sin solapamiento de compromisos en estado PROGRAMADO o CONFIRMADO por userId UUID y por correo (ScheduleConflictException)
 *  - RN-04: fechaFin > fechaInicio y duración mínima de 15 minutos
 *  - RN-05: Validación de correos de participantes bajo formato RFC 5322 (mínimo 1)
 *  - Contratos de TaskService y CommitmentService sobre SQLite
 *  - Verificación de variables CSS (:root) de la paleta vintage en public/css/vintage.css
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createDatabase, SCHEMA_SQL_PATH } = require('../src/database/db');
const { TaskRepository } = require('../src/repositories/TaskRepository');
const { CommitmentRepository } = require('../src/repositories/CommitmentRepository');
const { TaskService } = require('../src/services/TaskService');
const { CommitmentService } = require('../src/services/CommitmentService');
const { TaskPriority, TaskStatus, CommitmentStatus } = require('../src/domain/enums');
const {
  TaskValidationException,
  ScheduleConflictException,
  CommitmentValidationException,
} = require('../src/domain/exceptions');

function runVerificationSuite() {
  const db = createDatabase(':memory:');
  const taskRepo = new TaskRepository(db);
  const commRepo = new CommitmentRepository(db);
  const taskService = new TaskService(taskRepo);
  const commitmentService = new CommitmentService(commRepo);

  let passed = 0;
  function test(name, fn) {
    fn();
    passed++;
    console.log(`  [PASS] ${name}`);
  }

  console.log('=== INICIANDO FASE 4: VERIFICACIÓN DEL SISTEMA (MODELO EN CASCADA) ===\n');

  // 1. Verificación del Stack SQLite y Tablas Relacionales
  test('Stack SQLite: Esquema relacional schema.sql cargado con tablas tasks, task_tags, commitments y commitment_participants', () => {
    assert.ok(fs.existsSync(SCHEMA_SQL_PATH), 'Debe existir src/database/schema.sql');
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
      .all()
      .map((r) => r.name);

    assert.ok(tables.includes('tasks'));
    assert.ok(tables.includes('task_tags'));
    assert.ok(tables.includes('commitments'));
    assert.ok(tables.includes('commitment_participants'));
  });

  // 2. Prueba RN-01
  test('RN-01: Rechaza crear tarea con fechaVencimiento en el pasado (TaskValidationException)', () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    assert.throws(
      () =>
        taskService.createTask({
          titulo: 'Tarea con fecha pasada',
          fechaVencimiento: pastDate,
          prioridad: TaskPriority.MEDIA,
        }),
      (err) => err instanceof TaskValidationException && err.ruleCode === 'RN-01'
    );
  });

  // 3. Prueba creación válida, persistencia relacional task_tags y límites de caracteres de Tarea
  let createdTaskId = null;
  test('Dominio Task: Crea tarea válida en SQLite (tasks + task_tags) y respeta límites de 100 y 500 caracteres', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const task = taskService.createTask({
      titulo: 'Tarea Vintage de Prueba',
      descripcion: 'Descripción de prueba dentro del límite de 500 caracteres.',
      fechaVencimiento: futureDate,
      prioridad: TaskPriority.ALTA,
      etiquetas: ['Trabajo', 'Personal'],
    });

    assert.ok(task.id);
    assert.equal(task.estado, TaskStatus.PENDIENTE);
    assert.deepEqual(task.etiquetas, ['Trabajo', 'Personal']);
    createdTaskId = task.id;

    // Verificar filas en tabla relacional task_tags
    const tagCount = db
      .prepare(`SELECT COUNT(*) as total FROM task_tags WHERE task_id = ?`)
      .get(task.id).total;
    assert.equal(tagCount, 2);

    // Título > 100 caracteres debe lanzar TaskValidationException
    assert.throws(
      () =>
        taskService.createTask({
          titulo: 'A'.repeat(101),
          fechaVencimiento: futureDate,
        }),
      TaskValidationException
    );

    // Descripción > 500 caracteres debe lanzar TaskValidationException
    assert.throws(
      () =>
        taskService.createTask({
          titulo: 'Título válido',
          descripcion: 'D'.repeat(501),
          fechaVencimiento: futureDate,
        }),
      TaskValidationException
    );
  });

  // 4. Prueba RN-02
  test('RN-02: Impide que una tarea COMPLETADA o CANCELADA vuelva a EN_PROCESO o PENDIENTE', () => {
    const inProgress = taskService.updateTaskStatus(createdTaskId, TaskStatus.EN_PROCESO);
    assert.equal(inProgress.estado, TaskStatus.EN_PROCESO);

    const completed = taskService.updateTaskStatus(createdTaskId, TaskStatus.COMPLETADA);
    assert.equal(completed.estado, TaskStatus.COMPLETADA);

    assert.throws(
      () => taskService.updateTaskStatus(createdTaskId, TaskStatus.EN_PROCESO),
      (err) => err instanceof TaskValidationException && err.ruleCode === 'RN-02'
    );

    assert.throws(
      () => taskService.updateTaskStatus(createdTaskId, TaskStatus.PENDIENTE),
      (err) => err instanceof TaskValidationException && err.ruleCode === 'RN-02'
    );
  });

  // 5. Prueba getPendingTasksOverdue
  test('Contrato TaskService.getPendingTasksOverdue(now): Detecta tareas pendientes vencidas', () => {
    const baseNow = new Date('2026-11-01T10:00:00.000Z');
    const dueTomorrow = new Date('2026-11-02T10:00:00.000Z');
    const afterDue = new Date('2026-11-03T10:00:00.000Z');

    const t = taskService.createTask(
      {
        titulo: 'Tarea por vencer',
        fechaVencimiento: dueTomorrow.toISOString(),
        prioridad: TaskPriority.CRITICA,
      },
      baseNow
    );

    const overdueList = taskService.getPendingTasksOverdue(afterDue);
    assert.ok(overdueList.some((item) => item.id === t.id));
  });

  // 6. Prueba RN-04 (fechaFin > fechaInicio y duración mínima de 15 minutos)
  test('RN-04: Exige fechaFin > fechaInicio y duración mínima de 15 minutos en compromisos', () => {
    const start = '2026-12-01T10:00:00.000Z';
    const invalidEndBefore = '2026-12-01T09:30:00.000Z';
    const invalidEndShort = '2026-12-01T10:10:00.000Z'; // 10 min (< 15 min)

    assert.throws(
      () =>
        commitmentService.scheduleCommitment({
          titulo: 'Reunión invertida',
          fechaInicio: start,
          fechaFin: invalidEndBefore,
          participantes: ['autor@vintage.com'],
        }),
      (err) => err instanceof CommitmentValidationException && err.ruleCode === 'RN-04'
    );

    assert.throws(
      () =>
        commitmentService.scheduleCommitment({
          titulo: 'Reunión demasiado corta',
          fechaInicio: start,
          fechaFin: invalidEndShort,
          participantes: ['autor@vintage.com'],
        }),
      (err) => err instanceof CommitmentValidationException && err.ruleCode === 'RN-04'
    );
  });

  // 7. Prueba RN-05 (Validación RFC 5322 de correos de participantes)
  test('RN-05: Exige mínimo 1 participante y valida formato RFC 5322 en todos los correos', () => {
    const start = '2026-12-01T12:00:00.000Z';
    const end = '2026-12-01T12:30:00.000Z';

    assert.throws(
      () =>
        commitmentService.scheduleCommitment({
          titulo: 'Sin participantes',
          fechaInicio: start,
          fechaFin: end,
          participantes: [],
        }),
      (err) => err instanceof CommitmentValidationException && err.ruleCode === 'RN-05'
    );

    assert.throws(
      () =>
        commitmentService.scheduleCommitment({
          titulo: 'Correo mal formado',
          fechaInicio: start,
          fechaFin: end,
          participantes: ['autor@vintage.com', 'correo-invalido-sin-dominio'],
        }),
      (err) => err instanceof CommitmentValidationException && err.ruleCode === 'RN-05'
    );
  });

  // 8. Prueba RN-03 (Sin solapamiento por userId UUID y correo, y liberación al cancelar)
  test('RN-03: Detecta solapamiento (ScheduleConflictException) por UUID userId y correo, y libera horario al cancelar', () => {
    const creatorUuid = '550e8400-e29b-41d4-a716-446655440000';
    const first = commitmentService.scheduleCommitment({
      userId: creatorUuid,
      titulo: 'Sesión Editorial Matutina',
      fechaInicio: '2026-12-10T09:00:00.000Z',
      fechaFin: '2026-12-10T10:00:00.000Z',
      participantes: ['clara@vintage.es', 'invitado@vintage.es'],
    });
    assert.equal(first.minutosRecordatorio, 15);
    assert.equal(first.estado, CommitmentStatus.PROGRAMADO);

    // Verificar consulta hasScheduleConflict usando el UUID userId (Contrato SDD 4.2)
    assert.equal(
      commitmentService.hasScheduleConflict(
        creatorUuid,
        '2026-12-10T09:30:00.000Z',
        '2026-12-10T10:30:00.000Z'
      ),
      true
    );

    // Solapamiento parcial (09:30 a 10:30) para la misma creadora clara@vintage.es -> ScheduleConflictException
    assert.throws(
      () =>
        commitmentService.scheduleCommitment({
          userId: creatorUuid,
          titulo: 'Compromiso Solapado',
          fechaInicio: '2026-12-10T09:30:00.000Z',
          fechaFin: '2026-12-10T10:30:00.000Z',
          participantes: ['clara@vintage.es'],
        }),
      ScheduleConflictException
    );

    // Al cancelar el primer compromiso, el bloque horario queda libre
    commitmentService.cancelCommitment(first.id);
    assert.equal(
      commitmentService.hasScheduleConflict(
        creatorUuid,
        '2026-12-10T09:30:00.000Z',
        '2026-12-10T10:30:00.000Z'
      ),
      false
    );

    const rescheduled = commitmentService.scheduleCommitment({
      userId: creatorUuid,
      titulo: 'Compromiso Reagendado tras Cancelación',
      fechaInicio: '2026-12-10T09:30:00.000Z',
      fechaFin: '2026-12-10T10:30:00.000Z',
      participantes: ['clara@vintage.es'],
    });
    assert.ok(rescheduled.id);
  });

  // 9. Verificación de la paleta CSS obligatoria en public/css/vintage.css
  test('Diseño Visual: Verifica variables CSS (:root) y paleta pastel exacta en vintage.css', () => {
    const cssPath = path.join(__dirname, '..', 'public', 'css', 'vintage.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    const expectedVariables = [
      '--pastel-1: #F4C2C2;',
      '--pastel-2: #D7BDE2;',
      '--pastel-3: #A7D8E8;',
      '--pastel-4: #FFF3B0;',
      '--pastel-5: #B5EAD7;',
      '--blanco: #FFFFFF;',
    ];

    for (const declaration of expectedVariables) {
      assert.ok(
        cssContent.includes(declaration),
        `Falta la declaración obligatoria "${declaration}" en vintage.css`
      );
    }
  });

  // 10. Verificación de Módulos Frontend Glassmorphism y Contrato TypeScript SDD
  test('Frontend Modular Glassmorphism & Contrato TypeScript SDD: Verifica existencia y propiedades clave', () => {
    const glassCssPath = path.join(__dirname, '..', 'public', 'css', 'glassmorphism.css');
    assert.ok(fs.existsSync(glassCssPath), 'Debe existir public/css/glassmorphism.css');
    const glassCss = fs.readFileSync(glassCssPath, 'utf8');
    assert.ok(glassCss.includes('backdrop-filter'), 'glassmorphism.css debe incluir backdrop-filter');
    assert.ok(glassCss.includes('--glass-surface'), 'glassmorphism.css debe definir variables minimalistas de cristal');

    const requiredModules = [
      'public/js/app.js',
      'public/js/modules/api.js',
      'public/js/modules/validators.js',
      'public/js/modules/state.js',
      'public/js/modules/notifications.js',
      'public/js/modules/ui-components.js',
      'src/contracts/sdd-contracts.ts',
    ];

    for (const relPath of requiredModules) {
      const fullPath = path.join(__dirname, '..', relPath);
      assert.ok(fs.existsSync(fullPath), `Falta el módulo requerido: ${relPath}`);
    }
  });

  console.log(`\n=== RESULTADO: ${passed}/${passed} PRUEBAS DE VERIFICACIÓN SUPERADAS ===`);
}

runVerificationSuite();
