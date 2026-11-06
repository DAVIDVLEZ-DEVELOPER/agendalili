/**
 * Entidades del Dominio: Task y Commitment
 * Fuente: sdd-agenda-tareas.md (Sección 2 y 3) y design.md
 */

const { randomUUID } = require('node:crypto');
const { TaskPriority, TaskStatus, CommitmentStatus } = require('./enums');
const {
  TaskValidationException,
  CommitmentValidationException,
  IllegalArgumentException,
} = require('./exceptions');

/**
 * Expresión regular estándar basada en RFC 5322 para validación de correos (RN-05)
 */
const RFC5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DEFAULT_USER_ID = '00000000-0000-4000-8000-000000000001';

class Task {
  /**
   * @param {object} props
   * @param {string} [props.id] UUID único
   * @param {string} props.titulo Máx. 100 caracteres
   * @param {string} [props.descripcion] Opcional, máx. 500 caracteres
   * @param {string|Date} props.fechaVencimiento Fecha y hora límite
   * @param {string} [props.prioridad] BAJA | MEDIA | ALTA | CRITICA
   * @param {string} [props.estado] PENDIENTE | EN_PROCESO | COMPLETADA | CANCELADA
   * @param {string[]} [props.etiquetas] Lista opcional de categorías
   * @param {string} [props.createdAt]
   */
  constructor({
    id = randomUUID(),
    titulo,
    descripcion = '',
    fechaVencimiento,
    prioridad = TaskPriority.MEDIA,
    estado = TaskStatus.PENDIENTE,
    etiquetas = [],
    createdAt = new Date().toISOString(),
  }) {
    if (!id || !UUID_REGEX.test(String(id))) {
      throw new TaskValidationException('El campo id de la tarea debe ser un UUID válido.', 'DOMAIN_TASK_ID');
    }

    const cleanTitle = typeof titulo === 'string' ? titulo.trim() : '';
    if (!cleanTitle) {
      throw new TaskValidationException('El título de la tarea es obligatorio.', 'DOMAIN_TASK_TITLE');
    }
    if (cleanTitle.length > 100) {
      throw new TaskValidationException(
        `El título de la tarea no puede exceder 100 caracteres (actual: ${cleanTitle.length}).`,
        'DOMAIN_TASK_TITLE_MAX'
      );
    }

    const cleanDesc = descripcion == null ? '' : String(descripcion).trim();
    if (cleanDesc.length > 500) {
      throw new TaskValidationException(
        `La descripción de la tarea no puede exceder 500 caracteres (actual: ${cleanDesc.length}).`,
        'DOMAIN_TASK_DESC_MAX'
      );
    }

    const parsedDue = new Date(fechaVencimiento);
    if (!fechaVencimiento || Number.isNaN(parsedDue.getTime())) {
      throw new TaskValidationException('La fecha de vencimiento es obligatoria y debe ser válida.', 'DOMAIN_TASK_DUE');
    }

    if (!Object.values(TaskPriority).includes(prioridad)) {
      throw new TaskValidationException(
        `Prioridad inválida "${prioridad}". Valores permitidos: ${Object.values(TaskPriority).join(', ')}.`,
        'DOMAIN_TASK_PRIORITY'
      );
    }

    if (!Object.values(TaskStatus).includes(estado)) {
      throw new TaskValidationException(
        `Estado inválido "${estado}". Valores permitidos: ${Object.values(TaskStatus).join(', ')}.`,
        'DOMAIN_TASK_STATUS'
      );
    }

    const normalizedTags = Array.isArray(etiquetas)
      ? [...new Set(etiquetas.map((t) => String(t).trim()).filter(Boolean))]
      : [];

    this.id = id;
    this.titulo = cleanTitle;
    this.descripcion = cleanDesc;
    this.fechaVencimiento = parsedDue.toISOString();
    this.prioridad = prioridad;
    this.estado = estado;
    this.etiquetas = normalizedTags;
    this.createdAt = createdAt;
  }
}

class Commitment {
  /**
   * @param {object} props
   * @param {string} [props.id] UUID único
   * @param {string} [props.userId] UUID o identificador del usuario creador
   * @param {string} props.titulo Máx. 100 caracteres
   * @param {string} [props.descripcion] Opcional
   * @param {string|Date} props.fechaInicio Fecha y hora de inicio
   * @param {string|Date} props.fechaFin Fecha y hora de fin (fechaFin > fechaInicio)
   * @param {string} [props.ubicacion] Opcional, enlace virtual o dirección física
   * @param {string[]} props.participantes Lista de correos (mínimo 1, incluido el creador)
   * @param {string} [props.estado] PROGRAMADO | CONFIRMADO | CANCELADO
   * @param {number} [props.minutosRecordatorio] Entero, por defecto 15
   * @param {string} [props.createdAt]
   */
  constructor({
    id = randomUUID(),
    userId = DEFAULT_USER_ID,
    titulo,
    descripcion = '',
    fechaInicio,
    fechaFin,
    ubicacion = '',
    participantes = [],
    estado = CommitmentStatus.PROGRAMADO,
    minutosRecordatorio = 15,
    createdAt = new Date().toISOString(),
  }) {
    if (!id || !UUID_REGEX.test(String(id))) {
      throw new CommitmentValidationException(
        'El campo id del compromiso debe ser un UUID válido.',
        'DOMAIN_COMMITMENT_ID'
      );
    }

    const cleanTitle = typeof titulo === 'string' ? titulo.trim() : '';
    if (!cleanTitle) {
      throw new CommitmentValidationException(
        'El título del compromiso es obligatorio.',
        'DOMAIN_COMMITMENT_TITLE'
      );
    }
    if (cleanTitle.length > 100) {
      throw new CommitmentValidationException(
        `El título del compromiso no puede exceder 100 caracteres (actual: ${cleanTitle.length}).`,
        'DOMAIN_COMMITMENT_TITLE_MAX'
      );
    }

    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    if (!fechaInicio || Number.isNaN(start.getTime())) {
      throw new CommitmentValidationException('La fecha de inicio es obligatoria y debe ser válida.', 'RN-04');
    }
    if (!fechaFin || Number.isNaN(end.getTime())) {
      throw new CommitmentValidationException('La fecha de fin es obligatoria y debe ser válida.', 'RN-04');
    }

    if (end.getTime() <= start.getTime()) {
      throw new CommitmentValidationException(
        'La fecha de fin (fechaFin) debe ser estrictamente posterior a la fecha de inicio (fechaInicio).',
        'RN-04'
      );
    }

    // RN-04 (TDD-C04): Duración mínima de 15 minutos
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      throw new IllegalArgumentException(
        `RN-04: Duración mínima 15 mins requerida entre fechaInicio y fechaFin (actual: ${Math.round(durationMinutes)} min).`,
        'RN-04'
      );
    }

    // RN-05: Validación de participantes (mínimo 1 correo válido según RFC 5322)
    const emailList = Array.isArray(participantes)
      ? [...new Set(participantes.map((e) => String(e).trim().toLowerCase()).filter(Boolean))]
      : [];

    if (emailList.length < 1) {
      throw new CommitmentValidationException(
        'RN-05: Se requiere al menos 1 participante (incluido el creador) en la lista de correos.',
        'RN-05'
      );
    }

    for (const email of emailList) {
      if (!RFC5322_EMAIL_REGEX.test(email)) {
        throw new CommitmentValidationException(
          `RN-05: El correo "${email}" no cumple con el formato estándar RFC 5322.`,
          'RN-05'
        );
      }
    }

    if (!Object.values(CommitmentStatus).includes(estado)) {
      throw new CommitmentValidationException(
        `Estado de compromiso inválido "${estado}". Valores permitidos: ${Object.values(CommitmentStatus).join(', ')}.`,
        'DOMAIN_COMMITMENT_STATUS'
      );
    }

    const parsedReminder =
      minutosRecordatorio === undefined || minutosRecordatorio === null || minutosRecordatorio === ''
        ? 15
        : Number(minutosRecordatorio);

    if (!Number.isInteger(parsedReminder) || parsedReminder < 0) {
      throw new CommitmentValidationException(
        'El campo minutosRecordatorio debe ser un número entero mayor o igual a 0.',
        'DOMAIN_COMMITMENT_REMINDER'
      );
    }

    this.id = id;
    this.userId = userId && String(userId).trim() ? String(userId).trim() : DEFAULT_USER_ID;
    this.titulo = cleanTitle;
    this.descripcion = descripcion == null ? '' : String(descripcion).trim();
    this.fechaInicio = start.toISOString();
    this.fechaFin = end.toISOString();
    this.ubicacion = ubicacion == null ? '' : String(ubicacion).trim();
    this.participantes = emailList;
    this.creadorEmail = emailList[0];
    this.estado = estado;
    this.minutosRecordatorio = parsedReminder;
    this.createdAt = createdAt;
  }
}

module.exports = {
  Task,
  Commitment,
  RFC5322_EMAIL_REGEX,
  UUID_REGEX,
  DEFAULT_USER_ID,
};
