/**
 * Módulo de Renderizado de Componentes UI Glassmorphism
 * Renderiza Tarjetas de Tareas, Tarjetas de Compromisos, Chips de Participantes RFC 5322 y Línea de Tiempo
 */

import {
  escapeHtml,
  formatHumanDateTime,
  RFC5322_EMAIL_REGEX,
} from './validators.js';

export class UIRenderer {
  /**
   * Renderiza una lista de tareas en el contenedor especificado
   */
  static renderTaskList(containerEl, tasks, overdueTasks) {
    if (!containerEl) return;

    if (!tasks || tasks.length === 0) {
      containerEl.innerHTML = `
        <div class="glass-panel-subtle p-4 text-center">
          <div class="mb-1 fw-semibold" style="color: var(--text-secondary);">Sin tareas en esta vista</div>
          <div class="small" style="color: var(--text-muted);">
            Crea una nueva tarea en el módulo o ajusta los filtros activos.
          </div>
        </div>
      `;
      return;
    }

    const overdueSet = new Set((overdueTasks || []).map((t) => t.id));

    containerEl.innerHTML = tasks
      .map((task) => {
        const isTerminal = task.estado === 'COMPLETADA' || task.estado === 'CANCELADA';
        const isOverdue = overdueSet.has(task.id);

        const tagsHtml =
          Array.isArray(task.etiquetas) && task.etiquetas.length > 0
            ? task.etiquetas
                .map((tag) => `<span class="glass-tag">#${escapeHtml(tag)}</span>`)
                .join('')
            : `<span class="small" style="color: var(--text-faint);">Sin etiquetas</span>`;

        return `
          <article class="glass-item-card prio-${escapeHtml(task.prioridad)}" data-task-id="${escapeHtml(task.id)}">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h3 class="h6 fw-bold mb-1" style="color: var(--text-primary);">${escapeHtml(task.titulo)}</h3>
                <span class="mono-uuid" title="UUID único de la tarea">UUID: ${escapeHtml(task.id.slice(0, 8))}…</span>
              </div>
              <div class="d-flex flex-wrap align-items-center gap-1">
                ${
                  isOverdue
                    ? `<span class="glass-badge badge-prio-CRITICA" title="Detectada por getPendingTasksOverdue(now)">⚠ Vencida</span>`
                    : ''
                }
                <span class="glass-badge badge-prio-${escapeHtml(task.prioridad)}">
                  <span class="badge-dot" style="background: currentColor;"></span>
                  ${escapeHtml(task.prioridad)}
                </span>
                <span class="glass-badge badge-status-${escapeHtml(task.estado)}">
                  ${escapeHtml(task.estado)}
                </span>
              </div>
            </div>

            ${
              task.descripcion
                ? `<p class="small mb-2" style="color: var(--text-secondary);">${escapeHtml(task.descripcion)}</p>`
                : ''
            }

            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div class="small" style="color: var(--text-muted);">
                <strong>Vence:</strong> ${formatHumanDateTime(task.fechaVencimiento)}
              </div>
              <div>${tagsHtml}</div>
            </div>

            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-2" style="border-top: 1px solid var(--glass-border-subtle);">
              <div class="d-flex align-items-center gap-2">
                <label class="small fw-semibold mb-0" style="color: var(--text-secondary);" for="status-select-${escapeHtml(task.id)}">
                  Estado <span class="badge-rule">RN-02</span>
                </label>
                <select
                  id="status-select-${escapeHtml(task.id)}"
                  class="glass-select py-1 px-2 w-auto js-task-status-select"
                  style="font-size: 0.78rem;"
                  data-task-id="${escapeHtml(task.id)}"
                >
                  <option value="PENDIENTE" ${task.estado === 'PENDIENTE' ? 'selected' : ''} ${
                    isTerminal ? 'disabled' : ''
                  }>
                    PENDIENTE ${isTerminal ? '(Bloqueado RN-02)' : ''}
                  </option>
                  <option value="EN_PROCESO" ${task.estado === 'EN_PROCESO' ? 'selected' : ''} ${
                    isTerminal ? 'disabled' : ''
                  }>
                    EN_PROCESO ${isTerminal ? '(Bloqueado RN-02)' : ''}
                  </option>
                  <option value="COMPLETADA" ${task.estado === 'COMPLETADA' ? 'selected' : ''}>
                    COMPLETADA
                  </option>
                  <option value="CANCELADA" ${task.estado === 'CANCELADA' ? 'selected' : ''}>
                    CANCELADA
                  </option>
                </select>
              </div>

              <div class="d-flex align-items-center gap-1">
                <button
                  type="button"
                  class="btn-glass btn-glass-sm js-edit-task"
                  data-task-id="${escapeHtml(task.id)}"
                  title="Editar Tarea (Valida RN-01 y RN-02)"
                >
                  ✎ Editar
                </button>
                <button
                  type="button"
                  class="btn-glass btn-glass-danger btn-glass-sm js-delete-task"
                  data-task-id="${escapeHtml(task.id)}"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /**
   * Renderiza una lista de compromisos en el contenedor especificado
   */
  static renderCommitmentList(containerEl, commitments) {
    if (!containerEl) return;

    if (!commitments || commitments.length === 0) {
      containerEl.innerHTML = `
        <div class="glass-panel-subtle p-4 text-center">
          <div class="mb-1 fw-semibold" style="color: var(--text-secondary);">Sin compromisos agendados</div>
          <div class="small" style="color: var(--text-muted);">
            Agenda un nuevo compromiso verificando disponibilidad horaria (RN-03) y duración mínima de 15 min (RN-04).
          </div>
        </div>
      `;
      return;
    }

    containerEl.innerHTML = commitments
      .map((comm) => {
        const start = new Date(comm.fechaInicio);
        const end = new Date(comm.fechaFin);
        const durationMin = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

        const participantsHtml = (comm.participantes || [])
          .map(
            (email, idx) => `
              <span class="participant-chip ${idx === 0 ? 'is-creator' : ''}" title="${
                idx === 0 ? 'Creador / Organizador principal' : 'Asistente validado RFC 5322'
              }">
                <span>${idx === 0 ? '★' : '✉'}</span>
                <span>${escapeHtml(email)}</span>
              </span>
            `
          )
          .join('');

        return `
          <article class="glass-item-card comm-${escapeHtml(comm.estado)}" data-comm-id="${escapeHtml(comm.id)}">
            <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
              <div>
                <h3 class="h6 fw-bold mb-1" style="color: var(--text-primary);">${escapeHtml(comm.titulo)}</h3>
                <span class="mono-uuid" title="UUID único del compromiso">UUID: ${escapeHtml(comm.id.slice(0, 8))}…</span>
              </div>
              <div class="d-flex align-items-center gap-1">
                <span class="badge-rule" title="Duración validada según RN-04">${durationMin} min</span>
                <span class="glass-badge badge-comm-${escapeHtml(comm.estado)}">
                  <span class="badge-dot" style="background: currentColor;"></span>
                  ${escapeHtml(comm.estado)}
                </span>
              </div>
            </div>

            ${
              comm.descripcion
                ? `<p class="small mb-2" style="color: var(--text-secondary);">${escapeHtml(comm.descripcion)}</p>`
                : ''
            }

            <div class="glass-panel-subtle p-2 mb-2 small" style="color: var(--text-secondary);">
              <div class="d-flex flex-wrap justify-content-between gap-2">
                <div>
                  <strong>Inicio:</strong> ${formatHumanDateTime(comm.fechaInicio)}
                </div>
                <div>
                  <strong>Fin:</strong> ${formatHumanDateTime(comm.fechaFin)}
                </div>
              </div>
              <div class="d-flex flex-wrap justify-content-between gap-2 mt-1 pt-1" style="border-top: 1px dashed var(--glass-border-subtle);">
                <div>
                  <strong>Ubicación:</strong> ${
                    comm.ubicacion
                      ? escapeHtml(comm.ubicacion)
                      : '<span style="color: var(--text-faint);">Virtual / Por definir</span>'
                  }
                </div>
                <div>
                  <strong>Recordatorio:</strong> ${escapeHtml(comm.minutosRecordatorio)} min antes
                </div>
              </div>
            </div>

            <div class="mb-2">
              <div class="small fw-semibold mb-1" style="color: var(--text-muted);">
                Participantes <span class="badge-rule">RN-05 RFC 5322</span>
              </div>
              <div>${participantsHtml}</div>
            </div>

            <div class="d-flex flex-wrap justify-content-end gap-2 pt-2" style="border-top: 1px solid var(--glass-border-subtle);">
              ${
                comm.estado === 'PROGRAMADO'
                  ? `<button type="button" class="btn-glass btn-glass-success btn-glass-sm js-confirm-comm" data-comm-id="${escapeHtml(
                      comm.id
                    )}">✓ Confirmar</button>`
                  : ''
              }
              ${
                comm.estado !== 'CANCELADO'
                  ? `<button type="button" class="btn-glass btn-glass-warning btn-glass-sm js-cancel-comm" data-comm-id="${escapeHtml(
                      comm.id
                    )}">✕ Cancelar (Liberar RN-03)</button>`
                  : ''
              }
              <button
                type="button"
                class="btn-glass btn-glass-danger btn-glass-sm js-delete-comm"
                data-comm-id="${escapeHtml(comm.id)}"
              >
                Eliminar
              </button>
            </div>
          </article>
        `;
      })
      .join('');
  }

  /**
   * Renderiza chips en vivo para los correos ingresados en el formulario de compromisos (RN-05)
   */
  static renderLiveParticipantChips(containerEl, rawInput) {
    if (!containerEl) return;
    const emails = rawInput
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      containerEl.innerHTML = `<span class="small" style="color: var(--text-faint);">Ingresa al menos 1 correo válido (el primero será el creador).</span>`;
      return;
    }

    containerEl.innerHTML = emails
      .map((email, index) => {
        const isValid = RFC5322_EMAIL_REGEX.test(email);
        const cls = !isValid ? 'invalid-email' : index === 0 ? 'is-creator' : '';
        const badgeIcon = !isValid ? '✗ Inválido' : index === 0 ? '★ Creador' : '✓ RFC 5322';
        return `
          <span class="participant-chip ${cls}">
            <span>${escapeHtml(email)}</span>
            <strong style="font-size:0.65rem; opacity:0.85;">${badgeIcon}</strong>
          </span>
        `;
      })
      .join('');
  }
}
