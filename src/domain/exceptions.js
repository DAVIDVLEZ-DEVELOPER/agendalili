/**
 * Excepciones deterministas del Dominio
 * Fuente: sdd-agenda-tareas.md (Sección 5.3)
 */

class TaskValidationException extends Error {
  /**
   * @param {string} message Mensaje descriptivo de la violación
   * @param {string} [ruleCode] Código de regla de negocio (ej. RN-01, RN-02)
   */
  constructor(message, ruleCode = 'TASK_VALIDATION_ERROR') {
    super(message);
    this.name = 'TaskValidationException';
    this.ruleCode = ruleCode;
    this.statusCode = 400;
  }
}

class ScheduleConflictException extends Error {
  /**
   * @param {string} message Mensaje descriptivo del conflicto de horario
   * @param {string} [ruleCode] Código de regla de negocio (por defecto RN-03)
   */
  constructor(message, ruleCode = 'RN-03') {
    super(message);
    this.name = 'ScheduleConflictException';
    this.ruleCode = ruleCode;
    this.statusCode = 409;
  }
}

class CommitmentValidationException extends Error {
  /**
   * @param {string} message Mensaje descriptivo de la violación de compromiso
   * @param {string} [ruleCode] Código de regla de negocio (ej. RN-04, RN-05)
   */
  constructor(message, ruleCode = 'COMMITMENT_VALIDATION_ERROR') {
    super(message);
    this.name = 'CommitmentValidationException';
    this.ruleCode = ruleCode;
    this.statusCode = 400;
  }
}

module.exports = {
  TaskValidationException,
  ScheduleConflictException,
  CommitmentValidationException,
};

