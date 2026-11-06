/**
 * Orquestador Principal del Frontend Modular Glassmorphism (ES6 Modules)
 * Especificación del Sistema de Agenda de Tareas y Compromisos (SDD v1.0.0 + Plan TDD)
 */

import { TaskClientService, CommitmentClientService, TddClientService } from './modules/api.js';
import { AppStore } from './modules/state.js';
import { NotificationManager } from './modules/notifications.js';
import { UIRenderer } from './modules/ui-components.js';
import {
  validateTaskDueDate,
  validateTaskStatusTransition,
  validateCommitmentDuration,
  validateParticipantsRFC5322,
  evaluateLocalScheduleConflict,
  toLocalDateTimeInputValue,
  escapeHtml,
} from './modules/validators.js';

const store = new AppStore();

const els = {
  globalNotification: document.getElementById('globalNotification'),
  toastStack: document.getElementById('toastStack'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  searchInput: document.getElementById('globalSearchInput'),
  overdueReferenceInput: document.getElementById('overdueReferenceInput'),
  btnCheckOverdueNow: document.getElementById('btnCheckOverdueNow'),

  // Navegación de módulos
  moduleTabBtns: document.querySelectorAll('[data-module-target]'),
  moduleTasksCol: document.getElementById('moduleTasksCol'),
  moduleCommitmentsCol: document.getElementById('moduleCommitmentsCol'),
  moduleSddInspector: document.getElementById('moduleSddInspector'),
  navCountTasks: document.getElementById('navCountTasks'),
  navCountCommitments: document.getElementById('navCountCommitments'),

  // KPIs
  kpiTotalTasks: document.getElementById('kpiTotalTasks'),
  kpiCompletedTasks: document.getElementById('kpiCompletedTasks'),
  kpiOverdueTasks: document.getElementById('kpiOverdueTasks'),
  kpiActiveCommitments: document.getElementById('kpiActiveCommitments'),
  kpiConfirmedCommitments: document.getElementById('kpiConfirmedCommitments'),
  kpiTddStatus: document.getElementById('kpiTddStatus'),

  // Formulario de Tareas
  taskForm: document.getElementById('taskForm'),
  taskTitulo: document.getElementById('taskTitulo'),
  taskTituloCounter: document.getElementById('taskTituloCounter'),
  taskDescripcion: document.getElementById('taskDescripcion'),
  taskDescripcionCounter: document.getElementById('taskDescripcionCounter'),
  taskFechaVencimiento: document.getElementById('taskFechaVencimiento'),
  taskPrioridad: document.getElementById('taskPrioridad'),
  taskEstado: document.getElementById('taskEstado'),
  taskEtiquetas: document.getElementById('taskEtiquetas'),
  taskFormFeedback: document.getElementById('taskFormFeedback'),
  filterTaskStatus: document.getElementById('filterTaskStatus'),
  filterTaskPriority: document.getElementById('filterTaskPriority'),
  tasksContainer: document.getElementById('tasksContainer'),

  // Modal de Edición de Tarea
  editTaskModal: document.getElementById('editTaskModal'),
  editTaskForm: document.getElementById('editTaskForm'),
  editTaskId: document.getElementById('editTaskId'),
  editTaskTitulo: document.getElementById('editTaskTitulo'),
  editTaskDescripcion: document.getElementById('editTaskDescripcion'),
  editTaskFechaVencimiento: document.getElementById('editTaskFechaVencimiento'),
  editTaskPrioridad: document.getElementById('editTaskPrioridad'),
  editTaskEstado: document.getElementById('editTaskEstado'),
  editTaskEtiquetas: document.getElementById('editTaskEtiquetas'),
  editTaskFeedback: document.getElementById('editTaskFeedback'),
  btnCloseEditModal: document.getElementById('btnCloseEditModal'),
  btnCancelEditModal: document.getElementById('btnCancelEditModal'),

  // Formulario de Compromisos
  commitmentForm: document.getElementById('commitmentForm'),
  commTitulo: document.getElementById('commTitulo'),
  commTituloCounter: document.getElementById('commTituloCounter'),
  commDescripcion: document.getElementById('commDescripcion'),
  commFechaInicio: document.getElementById('commFechaInicio'),
  commFechaFin: document.getElementById('commFechaFin'),
  commDateRangeAlert: document.getElementById('commDateRangeAlert'),
  commUbicacion: document.getElementById('commUbicacion'),
  commEstado: document.getElementById('commEstado'),
  commRecordatorio: document.getElementById('commRecordatorio'),
  commParticipantes: document.getElementById('commParticipantes'),
  commParticipantChips: document.getElementById('commParticipantChips'),
  commFormFeedback: document.getElementById('commFormFeedback'),
  filterCommStatus: document.getElementById('filterCommStatus'),
  commitmentsContainer: document.getElementById('commitmentsContainer'),
  durationPresetBtns: document.querySelectorAll('[data-duration-preset]'),

  // Simulador interactivo SDD & Ejecutor TDD
  sddSimOutput: document.getElementById('sddSimOutput'),
  sddSimButtons: document.querySelectorAll('[data-sdd-sim]'),
  btnRunTddSuites: document.getElementById('btnRunTddSuites'),
  tddCoverageBadge: document.getElementById('tddCoverageBadge'),
  tddSuitesContainer: document.getElementById('tddSuitesContainer'),
};

const notifier = new NotificationManager(els.toastStack, els.globalNotification);

/**
 * Inicializa fechas futuras válidas por defecto en formularios
 */
function initDefaultDates() {
  const now = new Date();
  const defaultDue = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  if (els.taskFechaVencimiento) {
    els.taskFechaVencimiento.value = toLocalDateTimeInputValue(defaultDue);
  }
  if (els.overdueReferenceInput) {
    els.overdueReferenceInput.value = toLocalDateTimeInputValue(now);
  }

  const defaultCommStart = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  defaultCommStart.setMinutes(0, 0, 0);
  const defaultCommEnd = new Date(defaultCommStart.getTime() + 30 * 60 * 1000);

  if (els.commFechaInicio && els.commFechaFin) {
    els.commFechaInicio.value = toLocalDateTimeInputValue(defaultCommStart);
    els.commFechaFin.value = toLocalDateTimeInputValue(defaultCommEnd);
  }
}

/**
 * Contador de caracteres en vivo (100 para título, 500 para descripción)
 */
function attachCharCounter(inputEl, counterEl, maxLen) {
  if (!inputEl || !counterEl) return;
  const update = () => {
    if (inputEl.value.length > maxLen) {
      inputEl.value = inputEl.value.slice(0, maxLen);
    }
    const len = inputEl.value.length;
    counterEl.textContent = `${len} / ${maxLen}`;
    counterEl.classList.remove('near-limit', 'at-limit');
    if (len >= maxLen) {
      counterEl.classList.add('at-limit');
    } else if (len >= Math.floor(maxLen * 0.85)) {
      counterEl.classList.add('near-limit');
    }
  };
  inputEl.addEventListener('input', update);
  update();
}

/**
 * Sincroniza todos los datos desde el backend SQLite
 */
async function syncAllData() {
  const refNow = els.overdueReferenceInput?.value
    ? new Date(els.overdueReferenceInput.value).toISOString()
    : new Date().toISOString();

  const [tasks, overdueTasks, commitments] = await Promise.all([
    TaskClientService.getAllTasks(),
    TaskClientService.getPendingTasksOverdue(refNow),
    CommitmentClientService.getAllCommitments(),
  ]);

  store.setState({ tasks, overdueTasks, commitments, referenceNow: refNow });
}

/**
 * Ejecuta y renderiza el reporte de las suites TDD (TaskServiceTest & CommitmentServiceTest)
 */
async function runAndRenderTddSuites(notifyUser = false) {
  if (!els.tddSuitesContainer) return;
  try {
    const report = await TddClientService.runSuites();
    if (els.kpiTddStatus) {
      els.kpiTddStatus.textContent = `${report.passed} / ${report.total} PASS`;
    }
    if (els.tddCoverageBadge) {
      els.tddCoverageBadge.textContent = `Cobertura: ${report.coveragePercent}%`;
    }

    els.tddSuitesContainer.innerHTML = (report.suites || [])
      .map(
        (suite) => `
        <div class="col-md-6">
          <div class="sdd-rule-card">
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2" style="border-bottom: 1px solid var(--glass-border-subtle);">
              <strong class="small">${escapeHtml(suite.suiteName)}</strong>
              <span class="badge-rule">${suite.tests.length} Tests Unitarios</span>
            </div>
            <div class="d-flex flex-column gap-2">
              ${suite.tests
                .map(
                  (t) => `
                  <div class="d-flex justify-content-between align-items-center gap-2 p-2 rounded" style="background: var(--glass-surface-elevated); border: 1px solid var(--glass-border-subtle);">
                    <div>
                      <div class="d-flex align-items-center gap-2">
                        <span class="glass-badge ${
                          t.status === 'PASS' ? 'badge-status-COMPLETADA' : 'badge-prio-CRITICA'
                        }">${t.status === 'PASS' ? '✓ GREEN' : '✗ RED'}</span>
                        <code class="small fw-bold">${escapeHtml(t.id)}</code>
                        <span class="mono-uuid">${escapeHtml(t.cycle)}</span>
                      </div>
                      <div class="small mt-1" style="color: var(--text-secondary); font-size: 0.75rem;">
                        ${escapeHtml(t.name)}
                      </div>
                    </div>
                    <span class="mono-uuid">${t.durationMs}ms</span>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </div>
      `
      )
      .join('');

    if (notifyUser) {
      notifier.pushToast({
        title: 'Suites TDD Ejecutadas',
        message: `${report.passed}/${report.total} pruebas unitarias en verde (Cobertura: ${report.coveragePercent}%).`,
        type: report.failed === 0 ? 'success' : 'error',
        ruleCode: 'Red → Green → Refactor',
      });
    }
  } catch (err) {
    if (notifyUser) {
      notifier.pushToast({
        title: 'Error en Runner TDD',
        message: err.message,
        type: 'error',
      });
    }
  }
}

/**
 * Renderiza toda la interfaz cuando cambia el estado
 */
function renderApp(state) {
  const totalTasks = state.tasks.length;
  const completedTasks = state.tasks.filter((t) => t.estado === 'COMPLETADA').length;
  const overdueCount = state.overdueTasks.length;
  const activeCommitments = state.commitments.filter((c) => c.estado !== 'CANCELADO').length;
  const confirmedCommitments = state.commitments.filter((c) => c.estado === 'CONFIRMADO').length;

  if (els.kpiTotalTasks) els.kpiTotalTasks.textContent = String(totalTasks);
  if (els.kpiCompletedTasks) els.kpiCompletedTasks.textContent = `${completedTasks} completada(s)`;
  if (els.kpiOverdueTasks) els.kpiOverdueTasks.textContent = String(overdueCount);
  if (els.kpiActiveCommitments) els.kpiActiveCommitments.textContent = String(activeCommitments);
  if (els.kpiConfirmedCommitments) {
    els.kpiConfirmedCommitments.textContent = `${confirmedCommitments} confirmado(s)`;
  }

  if (els.navCountTasks) els.navCountTasks.textContent = String(totalTasks);
  if (els.navCountCommitments) els.navCountCommitments.textContent = String(activeCommitments);

  // Actualizar botón de tema
  if (els.themeToggleBtn) {
    els.themeToggleBtn.textContent = state.theme === 'dark' ? '☀ Cristal Claro' : '☾ Cristal Oscuro';
  }

  // Visibilidad de módulos según pestaña seleccionada
  if (els.moduleTasksCol && els.moduleCommitmentsCol && els.moduleSddInspector) {
    if (state.activeModule === 'all') {
      els.moduleTasksCol.className = 'col-lg-6';
      els.moduleCommitmentsCol.className = 'col-lg-6';
      els.moduleSddInspector.classList.add('d-none');
    } else if (state.activeModule === 'tasks') {
      els.moduleTasksCol.className = 'col-lg-12';
      els.moduleCommitmentsCol.className = 'd-none';
      els.moduleSddInspector.classList.add('d-none');
    } else if (state.activeModule === 'commitments') {
      els.moduleTasksCol.className = 'd-none';
      els.moduleCommitmentsCol.className = 'col-lg-12';
      els.moduleSddInspector.classList.add('d-none');
    } else if (state.activeModule === 'sdd') {
      els.moduleTasksCol.className = 'd-none';
      els.moduleCommitmentsCol.className = 'd-none';
      els.moduleSddInspector.classList.remove('d-none');
    }
  }

  UIRenderer.renderTaskList(
    els.tasksContainer,
    store.getFilteredTasks(),
    state.overdueTasks
  );
  UIRenderer.renderCommitmentList(
    els.commitmentsContainer,
    store.getFilteredCommitments()
  );
}

/**
 * Validación en vivo de rango de fechas, duración RN-04 y conflicto RN-03 en Compromisos
 */
async function validateCommitmentLive() {
  if (!els.commFechaInicio || !els.commFechaFin || !els.commDateRangeAlert) return false;

  const startVal = els.commFechaInicio.value;
  const endVal = els.commFechaFin.value;

  els.commFechaInicio.classList.remove('is-invalid');
  els.commFechaFin.classList.remove('is-invalid');

  if (els.commParticipantChips && els.commParticipantes) {
    UIRenderer.renderLiveParticipantChips(els.commParticipantChips, els.commParticipantes.value);
  }

  const durationCheck = validateCommitmentDuration(startVal, endVal);
  if (!durationCheck.valid) {
    els.commFechaFin.classList.add('is-invalid');
    els.commDateRangeAlert.className = 'glass-alert glass-alert--error mb-3';
    els.commDateRangeAlert.innerHTML = `
      <div>
        <strong>✗ ${escapeHtml(durationCheck.ruleCode)} (IllegalArgumentException):</strong> ${escapeHtml(durationCheck.message)}
      </div>
    `;
    return false;
  }

  const start = new Date(startVal);
  const end = new Date(endVal);
  const currentStatus = els.commEstado.value;
  const rawParticipants = els.commParticipantes.value
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const creatorEmail = rawParticipants[0] || '*';

  if (currentStatus !== 'CANCELADO') {
    try {
      const hasServerConflict = await CommitmentClientService.hasScheduleConflict(
        creatorEmail,
        start.toISOString(),
        end.toISOString()
      );
      const localCheck = evaluateLocalScheduleConflict(
        start,
        end,
        store.getState().commitments,
        rawParticipants
      );

      if (hasServerConflict || localCheck.hasConflict) {
        els.commFechaInicio.classList.add('is-invalid');
        els.commFechaFin.classList.add('is-invalid');
        const names = localCheck.conflicts.map((c) => `"${c.titulo}"`).join(', ');
        els.commDateRangeAlert.className = 'glass-alert glass-alert--error mb-3';
        els.commDateRangeAlert.innerHTML = `
          <div>
            <strong>✗ Violación RN-03 (ScheduleConflictException):</strong>
            El bloque de <strong>${durationCheck.durationMinutes} min</strong> se solapa con otro compromiso activo ${
              names ? `(${escapeHtml(names)})` : ''
            } para <code>${escapeHtml(creatorEmail)}</code>.
          </div>
        `;
        return false;
      }
    } catch {
      // Se verificará nuevamente al enviar
    }
  }

  els.commDateRangeAlert.className = 'glass-alert glass-alert--success mb-3';
  els.commDateRangeAlert.innerHTML = `
    <div>
      <strong>✓ Horario Disponible (RN-03 &amp; RN-04):</strong>
      Duración de <strong>${durationCheck.durationMinutes} minutos</strong> verificada sin solapamientos en agenda.
    </div>
  `;
  return true;
}

function showInlineError(el, message, ruleCode = '') {
  if (!el) return;
  el.className = 'glass-alert glass-alert--error mb-3';
  el.innerHTML = `
    <div class="d-flex justify-content-between align-items-center w-100 gap-2">
      <span><strong>✗ Error:</strong> ${escapeHtml(message)}</span>
      ${ruleCode ? `<span class="badge-rule">${escapeHtml(ruleCode)}</span>` : ''}
    </div>
  `;
  el.classList.remove('d-none');
}

/**
 * Envío del formulario de Nueva Tarea (TaskService.createTask)
 */
async function handleTaskSubmit(event) {
  event.preventDefault();
  els.taskFormFeedback.classList.add('d-none');

  const titulo = els.taskTitulo.value.trim();
  const descripcion = els.taskDescripcion.value.trim();
  const fechaVencimientoVal = els.taskFechaVencimiento.value;
  const prioridad = els.taskPrioridad.value;
  const estado = els.taskEstado.value;
  const etiquetas = els.taskEtiquetas.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  if (!titulo) {
    showInlineError(els.taskFormFeedback, 'El título de la tarea es obligatorio.', 'DOMAIN_TASK_TITLE');
    return;
  }
  if (titulo.length > 100) {
    showInlineError(els.taskFormFeedback, 'El título no puede exceder 100 caracteres.', 'DOMAIN_TASK_TITLE_MAX');
    return;
  }
  if (descripcion.length > 500) {
    showInlineError(els.taskFormFeedback, 'La descripción no puede exceder 500 caracteres.', 'DOMAIN_TASK_DESC_MAX');
    return;
  }

  const dueCheck = validateTaskDueDate(fechaVencimientoVal);
  if (!dueCheck.valid) {
    showInlineError(els.taskFormFeedback, dueCheck.message, dueCheck.ruleCode);
    notifier.pushToast({
      title: 'TaskValidationException',
      message: dueCheck.message,
      type: 'error',
      ruleCode: dueCheck.ruleCode,
    });
    return;
  }

  try {
    const created = await TaskClientService.createTask({
      titulo,
      descripcion,
      fechaVencimiento: new Date(fechaVencimientoVal).toISOString(),
      prioridad,
      estado,
      etiquetas,
    });

    els.taskForm.reset();
    initDefaultDates();
    els.taskTituloCounter.textContent = '0 / 100';
    els.taskDescripcionCounter.textContent = '0 / 500';

    notifier.pushToast({
      title: 'Tarea Registrada',
      message: `"${created.titulo}" creada exitosamente con prioridad ${created.prioridad}.`,
      type: 'success',
      ruleCode: 'TDD-T01 OK',
    });
    await syncAllData();
  } catch (err) {
    showInlineError(els.taskFormFeedback, err.message, err.ruleCode);
    notifier.pushToast({
      title: err.name || 'TaskValidationException',
      message: err.message,
      type: 'error',
      ruleCode: err.ruleCode || 'RN-01',
    });
  }
}

/**
 * Envío del formulario de Nuevo Compromiso (CommitmentService.scheduleCommitment)
 */
async function handleCommitmentSubmit(event) {
  event.preventDefault();
  els.commFormFeedback.classList.add('d-none');

  const titulo = els.commTitulo.value.trim();
  const descripcion = els.commDescripcion.value.trim();
  const fechaInicioVal = els.commFechaInicio.value;
  const fechaFinVal = els.commFechaFin.value;
  const ubicacion = els.commUbicacion.value.trim();
  const estado = els.commEstado.value;
  const minutosRecordatorio = parseInt(els.commRecordatorio.value, 10);
  const rawEmails = els.commParticipantes.value
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!titulo) {
    showInlineError(els.commFormFeedback, 'El título del compromiso es obligatorio.', 'DOMAIN_COMMITMENT_TITLE');
    return;
  }
  if (titulo.length > 100) {
    showInlineError(els.commFormFeedback, 'El título no puede superar 100 caracteres.', 'DOMAIN_COMMITMENT_TITLE_MAX');
    return;
  }

  const durationCheck = validateCommitmentDuration(fechaInicioVal, fechaFinVal);
  if (!durationCheck.valid) {
    showInlineError(els.commFormFeedback, durationCheck.message, durationCheck.ruleCode);
    notifier.pushToast({
      title: 'IllegalArgumentException',
      message: durationCheck.message,
      type: 'error',
      ruleCode: durationCheck.ruleCode,
    });
    return;
  }

  const rfcCheck = validateParticipantsRFC5322(rawEmails);
  if (!rfcCheck.valid) {
    showInlineError(els.commFormFeedback, rfcCheck.message, rfcCheck.ruleCode);
    notifier.pushToast({
      title: 'CommitmentValidationException',
      message: rfcCheck.message,
      type: 'error',
      ruleCode: rfcCheck.ruleCode,
    });
    return;
  }

  try {
    const scheduled = await CommitmentClientService.scheduleCommitment({
      titulo,
      descripcion,
      fechaInicio: new Date(fechaInicioVal).toISOString(),
      fechaFin: new Date(fechaFinVal).toISOString(),
      ubicacion,
      participantes: rfcCheck.validEmails,
      estado,
      minutosRecordatorio: Number.isNaN(minutosRecordatorio) ? 15 : minutosRecordatorio,
    });

    els.commitmentForm.reset();
    els.commParticipantes.value = 'clara.valle@editorialvintage.es';
    els.commRecordatorio.value = '15';
    initDefaultDates();
    els.commTituloCounter.textContent = '0 / 100';
    await syncAllData();
    await validateCommitmentLive();

    notifier.pushToast({
      title: 'Compromiso Agendado',
      message: `"${scheduled.titulo}" agendado sin conflictos de horario.`,
      type: 'success',
      ruleCode: 'TDD-C01 OK',
    });
  } catch (err) {
    showInlineError(els.commFormFeedback, err.message, err.ruleCode);
    notifier.pushToast({
      title: err.name || 'ScheduleConflictException',
      message: err.message,
      type: 'error',
      ruleCode: err.ruleCode || 'RN-03',
    });
  }
}

/**
 * Abre el modal Glassmorphism para editar una tarea existente (validando RN-01 y RN-02)
 */
function openEditTaskModal(taskId) {
  const task = store.getState().tasks.find((t) => t.id === taskId);
  if (!task || !els.editTaskModal) return;

  els.editTaskFeedback.classList.add('d-none');
  els.editTaskId.value = task.id;
  els.editTaskTitulo.value = task.titulo;
  els.editTaskDescripcion.value = task.descripcion || '';
  els.editTaskFechaVencimiento.value = toLocalDateTimeInputValue(new Date(task.fechaVencimiento));
  els.editTaskPrioridad.value = task.prioridad;
  els.editTaskEstado.value = task.estado;
  els.editTaskEtiquetas.value = (task.etiquetas || []).join(', ');

  els.editTaskModal.classList.remove('d-none');
}

function closeEditTaskModal() {
  if (els.editTaskModal) {
    els.editTaskModal.classList.add('d-none');
  }
}

async function handleEditTaskSubmit(event) {
  event.preventDefault();
  const id = els.editTaskId.value;
  const existing = store.getState().tasks.find((t) => t.id === id);
  if (!existing) return;

  const nextStatus = els.editTaskEstado.value;
  const transitionCheck = validateTaskStatusTransition(existing.estado, nextStatus);
  if (!transitionCheck.valid) {
    showInlineError(els.editTaskFeedback, transitionCheck.message, transitionCheck.ruleCode);
    return;
  }

  const dueVal = els.editTaskFechaVencimiento.value;
  const dueCheck = validateTaskDueDate(dueVal);
  if (!dueCheck.valid) {
    showInlineError(els.editTaskFeedback, dueCheck.message, dueCheck.ruleCode);
    return;
  }

  try {
    const updated = await TaskClientService.updateTask(id, {
      titulo: els.editTaskTitulo.value.trim(),
      descripcion: els.editTaskDescripcion.value.trim(),
      fechaVencimiento: new Date(dueVal).toISOString(),
      prioridad: els.editTaskPrioridad.value,
      estado: nextStatus,
      etiquetas: els.editTaskEtiquetas.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

    closeEditTaskModal();
    notifier.pushToast({
      title: 'Tarea Actualizada',
      message: `"${updated.titulo}" actualizada cumpliendo RN-01 y RN-02.`,
      type: 'success',
      ruleCode: 'RN-01/02',
    });
    await syncAllData();
  } catch (err) {
    showInlineError(els.editTaskFeedback, err.message, err.ruleCode);
  }
}

/**
 * Simulador interactivo de Reglas de Negocio SDD / TDD (Sección 3 y 4)
 */
async function runSddRuleSimulation(ruleKey) {
  if (!els.sddSimOutput) return;
  try {
    if (ruleKey === 'RN-01') {
      const pastIso = new Date(Date.now() - 3600 * 1000).toISOString();
      await TaskClientService.createTask({
        titulo: 'Prueba Determinista RN-01 (Fecha en el pasado)',
        fechaVencimiento: pastIso,
        prioridad: 'ALTA',
      });
    } else if (ruleKey === 'RN-02') {
      const completedTask = store.getState().tasks.find(
        (t) => t.estado === 'COMPLETADA' || t.estado === 'CANCELADA'
      );
      if (completedTask) {
        await TaskClientService.updateTaskStatus(completedTask.id, 'IN_PROCESS');
      } else {
        throw {
          name: 'IllegalStateException',
          ruleCode: 'RN-02',
          message: 'RN-02: No se puede reabrir una tarea completada (estado solicitado: EN_PROCESO).',
        };
      }
    } else if (ruleKey === 'RN-03') {
      const activeComm = store.getState().commitments.find(
        (c) => c.estado === 'PROGRAMADO' || c.estado === 'CONFIRMADO'
      );
      if (activeComm) {
        await CommitmentClientService.scheduleCommitment({
          titulo: 'Prueba Colisión Horaria RN-03',
          fechaInicio: activeComm.fechaInicio,
          fechaFin: activeComm.fechaFin,
          participantes: activeComm.participantes,
        });
      } else {
        throw {
          name: 'ScheduleConflictException',
          ruleCode: 'RN-03',
          message: 'RN-03: No se permite agendar un compromiso con traslape (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio).',
        };
      }
    } else if (ruleKey === 'RN-04') {
      const start = new Date(Date.now() + 7200 * 1000);
      const endShort = new Date(start.getTime() + 10 * 60 * 1000); // 10 minutos (< 15m)
      await CommitmentClientService.scheduleCommitment({
        titulo: 'Prueba Duración 10 min RN-04',
        fechaInicio: start.toISOString(),
        fechaFin: endShort.toISOString(),
        participantes: ['clara.valle@editorialvintage.es'],
      });
    } else if (ruleKey === 'RN-05') {
      const start = new Date(Date.now() + 10800 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      await CommitmentClientService.scheduleCommitment({
        titulo: 'Prueba Correo Inválido RN-05',
        fechaInicio: start.toISOString(),
        fechaFin: end.toISOString(),
        participantes: ['correo_sin_formato_rfc5322'],
      });
    }
  } catch (err) {
    els.sddSimOutput.className = 'glass-alert glass-alert--error mt-3';
    els.sddSimOutput.innerHTML = `
      <div>
        <div class="d-flex align-items-center gap-2 mb-1">
          <strong>Excepción Capturada Deterministamente:</strong>
          <span class="badge-rule">${escapeHtml(err.name || 'DomainException')}</span>
          <span class="badge-rule">${escapeHtml(err.ruleCode || ruleKey)}</span>
        </div>
        <div class="small">${escapeHtml(err.message)}</div>
      </div>
    `;
    notifier.pushToast({
      title: `Verificación ${ruleKey} Exitosa`,
      message: `El contrato rechazó la operación inválida con ${err.name}: ${err.message}`,
      type: 'warning',
      ruleCode: err.ruleCode || ruleKey,
    });
  }
}

/**
 * Configura todos los listeners de eventos del DOM
 */
function setupEventListeners() {
  attachCharCounter(els.taskTitulo, els.taskTituloCounter, 100);
  attachCharCounter(els.taskDescripcion, els.taskDescripcionCounter, 500);
  attachCharCounter(els.commTitulo, els.commTituloCounter, 100);

  if (els.themeToggleBtn) {
    els.themeToggleBtn.addEventListener('click', () => {
      const next = store.getState().theme === 'dark' ? 'light' : 'dark';
      store.setState({ theme: next });
    });
  }

  // Navegación por módulos
  els.moduleTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      els.moduleTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-module-target');
      store.setState({ activeModule: target });
    });
  });

  // Buscador global en tiempo real
  if (els.searchInput) {
    els.searchInput.addEventListener('input', () => {
      store.setState({ searchQuery: els.searchInput.value });
    });
  }

  // Evaluador getPendingTasksOverdue(now)
  if (els.btnCheckOverdueNow) {
    els.btnCheckOverdueNow.addEventListener('click', async () => {
      await syncAllData();
      const count = store.getState().overdueTasks.length;
      notifier.pushToast({
        title: 'getPendingTasksOverdue(now)',
        message: `Se detectaron ${count} tarea(s) pendiente(s) o en proceso vencida(s) respecto a la fecha seleccionada.`,
        type: count > 0 ? 'warning' : 'success',
        ruleCode: 'TDD-T04',
      });
    });
  }

  // Botón de ejecución en vivo de la suite TDD
  if (els.btnRunTddSuites) {
    els.btnRunTddSuites.addEventListener('click', () => {
      runAndRenderTddSuites(true);
    });
  }

  // Botones de duración rápida en compromisos (+15m, +30m, +60m)
  els.durationPresetBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mins = parseInt(btn.getAttribute('data-duration-preset'), 10);
      const startVal = els.commFechaInicio.value;
      const baseStart = startVal ? new Date(startVal) : new Date(Date.now() + 3600 * 1000);
      if (!startVal) {
        els.commFechaInicio.value = toLocalDateTimeInputValue(baseStart);
      }
      const nextEnd = new Date(baseStart.getTime() + mins * 60 * 1000);
      els.commFechaFin.value = toLocalDateTimeInputValue(nextEnd);
      await validateCommitmentLive();
    });
  });

  els.taskForm?.addEventListener('submit', handleTaskSubmit);
  els.commitmentForm?.addEventListener('submit', handleCommitmentSubmit);

  ['change', 'input'].forEach((evt) => {
    els.commFechaInicio?.addEventListener(evt, validateCommitmentLive);
    els.commFechaFin?.addEventListener(evt, validateCommitmentLive);
    els.commParticipantes?.addEventListener(evt, validateCommitmentLive);
    els.commEstado?.addEventListener(evt, validateCommitmentLive);
  });

  els.filterTaskStatus?.addEventListener('change', () => {
    store.setState({ taskFilter: els.filterTaskStatus.value });
  });

  els.filterTaskPriority?.addEventListener('change', () => {
    store.setState({ taskPriorityFilter: els.filterTaskPriority.value });
  });

  els.filterCommStatus?.addEventListener('change', () => {
    store.setState({ commFilter: els.filterCommStatus.value });
  });

  // Eventos delegados de Tareas (cambio de estado RN-02, edición y eliminación)
  els.tasksContainer?.addEventListener('change', async (e) => {
    const select = e.target.closest('.js-task-status-select');
    if (!select) return;

    const taskId = select.getAttribute('data-task-id');
    const newStatus = select.value;

    try {
      await TaskClientService.updateTaskStatus(taskId, newStatus);
      notifier.pushToast({
        title: 'Estado Actualizado',
        message: `La tarea cambió a estado ${newStatus} (RN-02 verificada).`,
        type: 'success',
        ruleCode: 'RN-02 OK',
      });
      await syncAllData();
    } catch (err) {
      notifier.pushToast({
        title: err.name || 'IllegalStateException',
        message: err.message,
        type: 'error',
        ruleCode: err.ruleCode || 'RN-02',
      });
      await syncAllData();
    }
  });

  els.tasksContainer?.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.js-edit-task');
    if (editBtn) {
      openEditTaskModal(editBtn.getAttribute('data-task-id'));
      return;
    }

    const deleteBtn = e.target.closest('.js-delete-task');
    if (deleteBtn) {
      const taskId = deleteBtn.getAttribute('data-task-id');
      await TaskClientService.deleteTask(taskId);
      notifier.pushToast({
        title: 'Tarea Eliminada',
        message: 'La tarea fue eliminada del repositorio.',
        type: 'success',
      });
      await syncAllData();
    }
  });

  // Modal de edición de tarea
  els.btnCloseEditModal?.addEventListener('click', closeEditTaskModal);
  els.btnCancelEditModal?.addEventListener('click', closeEditTaskModal);
  els.editTaskForm?.addEventListener('submit', handleEditTaskSubmit);

  // Eventos delegados de Compromisos (Confirmar, Cancelar RN-03, Eliminar)
  els.commitmentsContainer?.addEventListener('click', async (e) => {
    const confirmBtn = e.target.closest('.js-confirm-comm');
    if (confirmBtn) {
      const commId = confirmBtn.getAttribute('data-comm-id');
      try {
        await CommitmentClientService.confirmCommitment(commId);
        notifier.pushToast({
          title: 'Compromiso Confirmado',
          message: 'El estado del compromiso cambió a CONFIRMADO.',
          type: 'success',
        });
        await syncAllData();
        await validateCommitmentLive();
      } catch (err) {
        notifier.pushToast({
          title: err.name || 'Error',
          message: err.message,
          type: 'error',
          ruleCode: err.ruleCode,
        });
      }
      return;
    }

    const cancelBtn = e.target.closest('.js-cancel-comm');
    if (cancelBtn) {
      const commId = cancelBtn.getAttribute('data-comm-id');
      try {
        await CommitmentClientService.cancelCommitment(commId);
        notifier.pushToast({
          title: 'Compromiso Cancelado',
          message: 'Estado cambiado a CANCELADO. Su bloque horario fue liberado (RN-03).',
          type: 'warning',
          ruleCode: 'RN-03',
        });
        await syncAllData();
        await validateCommitmentLive();
      } catch (err) {
        notifier.pushToast({
          title: err.name || 'Error',
          message: err.message,
          type: 'error',
          ruleCode: err.ruleCode,
        });
      }
      return;
    }

    const deleteBtn = e.target.closest('.js-delete-comm');
    if (deleteBtn) {
      const commId = deleteBtn.getAttribute('data-comm-id');
      await CommitmentClientService.deleteCommitment(commId);
      notifier.pushToast({
        title: 'Compromiso Eliminado',
        message: 'El compromiso fue eliminado del repositorio.',
        type: 'success',
      });
      await syncAllData();
      await validateCommitmentLive();
    }
  });

  // Botones del simulador de reglas SDD
  els.sddSimButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      runSddRuleSimulation(btn.getAttribute('data-sdd-sim'));
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  document.documentElement.setAttribute('data-theme', store.getState().theme);
  store.subscribe(renderApp);
  initDefaultDates();
  setupEventListeners();
  await Promise.all([syncAllData(), runAndRenderTddSuites(false)]);
  await validateCommitmentLive();
});
