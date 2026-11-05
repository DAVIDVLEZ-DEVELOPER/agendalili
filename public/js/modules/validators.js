/**
 * Módulo Determinista de Validación de Reglas de Negocio SDD (RN-01 a RN-05)
 * Espejo exacto en el cliente de las reglas de dominio de la Sección 2 y 3 del SDD v1.0.0
 */

export const RFC5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const TaskPriority = Object.freeze({
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA',
});

export const TaskStatus = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
});

export const CommitmentStatus = Object.freeze({
  PROGRAMADO: 'PROGRAMADO',
  CONFIRMADO: 'CONFIRMADO',
  CANCELADO: 'CANCELADO',
});

/**
 * RN-01: No se puede crear ni actualizar una tarea con una fechaVencimiento en el pasado
 * @param {string|Date} fechaVencimiento
 * @param {Date} [referenceNow]
 * @returns {{ valid: boolean, ruleCode: string, message: string }}
 */
export function validateTaskDueDate(fechaVencimiento, referenceNow = new Date()) {
  if (!fechaVencimiento) {
    return {
      valid: false,
      ruleCode: 'RN-01',
      message: 'RN-01: La fecha de vencimiento (fechaVencimiento) es requerida.',
    };
  }
  const due = new Date(fechaVencimiento);
  if (Number.isNaN(due.getTime())) {
    return {
      valid: false,
      ruleCode: 'RN-01',
      message: 'RN-01: El formato de fechaVencimiento no es válido.',
    };
  }
  if (due.getTime() < referenceNow.getTime()) {
    return {
      valid: false,
      ruleCode: 'RN-01',
      message:
        'RN-01 (TaskValidationException): No se puede crear ni actualizar una tarea con una fechaVencimiento en el pasado.',
    };
  }
  return {
    valid: true,
    ruleCode: 'RN-01',
    message: 'RN-01: Fecha de vencimiento futura válida.',
  };
}

/**
 * RN-02: Una tarea COMPLETADA o CANCELADA no puede cambiar a EN_PROCESO o PENDIENTE
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {{ valid: boolean, ruleCode: string, message: string }}
 */
export function validateTaskStatusTransition(currentStatus, nextStatus) {
  const isTerminal =
    currentStatus === TaskStatus.COMPLETADA || currentStatus === TaskStatus.CANCELADA;
  const isReopening =
    nextStatus === TaskStatus.EN_PROCESO || nextStatus === TaskStatus.PENDIENTE;

  if (isTerminal && isReopening) {
    return {
      valid: false,
      ruleCode: 'RN-02',
      message: `RN-02 (TaskValidationException): Una tarea en estado ${currentStatus} no puede cambiar a ${nextStatus}.`,
    };
  }
  return {
    valid: true,
    ruleCode: 'RN-02',
    message: `RN-02: Transición ${currentStatus} → ${nextStatus} permitida.`,
  };
}

/**
 * RN-04: fechaFin > fechaInicio y duración mínima de 15 minutos
 * @param {string|Date} fechaInicio
 * @param {string|Date} fechaFin
 * @returns {{ valid: boolean, durationMinutes: number, ruleCode: string, message: string }}
 */
export function validateCommitmentDuration(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) {
    return {
      valid: false,
      durationMinutes: 0,
      ruleCode: 'RN-04',
      message: 'RN-04: Seleccione tanto fechaInicio como fechaFin.',
    };
  }

  const start = new Date(fechaInicio);
  const end = new Date(fechaFin);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return {
      valid: false,
      durationMinutes: 0,
      ruleCode: 'RN-04',
      message: 'RN-04: Las fechas de inicio o fin no son válidas.',
    };
  }

  if (end.getTime() <= start.getTime()) {
    return {
      valid: false,
      durationMinutes: 0,
      ruleCode: 'RN-04',
      message: 'RN-04: La fechaFin debe ser estrictamente posterior a fechaInicio (fechaFin > fechaInicio).',
    };
  }

  const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  if (durationMinutes < 15) {
    return {
      valid: false,
      durationMinutes,
      ruleCode: 'RN-04',
      message: `RN-04: La duración mínima debe ser de al menos 15 minutos (actual: ${durationMinutes} min).`,
    };
  }

  return {
    valid: true,
    durationMinutes,
    ruleCode: 'RN-04',
    message: `RN-04 cumplida: Duración válida de ${durationMinutes} minutos (mín. 15 min).`,
  };
}

/**
 * RN-05: Todos los correos en participantes deben cumplir con RFC 5322 (mínimo 1, el creador)
 * @param {string[]} emails
 * @returns {{ valid: boolean, validEmails: string[], invalidEmails: string[], ruleCode: string, message: string }}
 */
export function validateParticipantsRFC5322(emails) {
  const normalized = Array.isArray(emails)
    ? emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : [];

  if (normalized.length < 1) {
    return {
      valid: false,
      validEmails: [],
      invalidEmails: [],
      ruleCode: 'RN-05',
      message: 'RN-05: Se requiere al menos 1 correo de participante (incluido el creador).',
    };
  }

  const validEmails = [];
  const invalidEmails = [];

  for (const email of normalized) {
    if (RFC5322_EMAIL_REGEX.test(email)) {
      validEmails.push(email);
    } else {
      invalidEmails.push(email);
    }
  }

  if (invalidEmails.length > 0) {
    return {
      valid: false,
      validEmails,
      invalidEmails,
      ruleCode: 'RN-05',
      message: `RN-05: Correo(s) inválido(s) según RFC 5322: ${invalidEmails.join(', ')}`,
    };
  }

  return {
    valid: true,
    validEmails,
    invalidEmails: [],
    ruleCode: 'RN-05',
    message: `RN-05 cumplida: ${validEmails.length} participante(s) con formato RFC 5322 válido.`,
  };
}

/**
 * RN-03: Evalúa traslapes localmente con la fórmula exacta:
 * (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)
 * @param {string|Date} start
 * @param {string|Date} end
 * @param {Array} commitments
 * @param {string[]} participantEmails
 */
export function evaluateLocalScheduleConflict(start, end, commitments, participantEmails = []) {
  const newStart = new Date(start).getTime();
  const newEnd = new Date(end).getTime();
  const targets = participantEmails.map((e) => e.trim().toLowerCase()).filter(Boolean);

  const conflicts = (commitments || []).filter((c) => {
    if (c.estado !== CommitmentStatus.PROGRAMADO && c.estado !== CommitmentStatus.CONFIRMADO) {
      return false;
    }
    const existingStart = new Date(c.fechaInicio).getTime();
    const existingEnd = new Date(c.fechaFin).getTime();
    const overlapsTime = newStart < existingEnd && newEnd > existingStart;
    if (!overlapsTime) return false;

    if (targets.length === 0) return true;
    const commEmails = (c.participantes || []).map((p) => p.toLowerCase());
    return targets.some((t) => commEmails.includes(t));
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Utilidades de formato para interfaz
 */
export function toLocalDateTimeInputValue(dateObj) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = dateObj.getFullYear();
  const m = pad(dateObj.getMonth() + 1);
  const d = pad(dateObj.getDate());
  const h = pad(dateObj.getHours());
  const min = pad(dateObj.getMinutes());
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function formatHumanDateTime(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}
