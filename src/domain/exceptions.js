/**
 * Excepciones deterministas del Dominio (SDD v1.0.0 + TDD Suite)
 * Fuente: sdd-agenda-tareas.md (Sección 5.3) y Plan de Pruebas TDD
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

/**
 * TDD-T03: Excepción lanzada al intentar una transición de estado ilegal en una tarea
 * Hereda de TaskValidationException para mantener compatibilidad total con el contrato SDD.
 */
class IllegalStateException extends TaskValidationException {
  /**
   * @param {string} message Mensaje descriptivo ("No se puede reabrir una tarea completada")
   * @param {string} [ruleCode] Código de regla (por defecto RN-02)
   */
  constructor(message = 'No se puede reabrir una tarea completada', ruleCode = 'RN-02') {
    super(message, ruleCode);
    this.name = 'IllegalStateException';
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

/**
 * TDD-C04: Excepción lanzada ante argumentos inválidos como duración menor a 15 minutos
 * Hereda de CommitmentValidationException para mantener compatibilidad total con el contrato SDD.
 */
class IllegalArgumentException extends CommitmentValidationException {
  /**
   * @param {string} message Mensaje descriptivo ("Duración mínima 15 mins")
   * @param {string} [ruleCode] Código de regla (por defecto RN-04)
   */
  constructor(message = 'Duración mínima 15 mins', ruleCode = 'RN-04') {
    super(message, ruleCode);
    this.name = 'IllegalArgumentException';
  }
}

module.exports = {
  TaskValidationException,
  IllegalStateException,
  ScheduleConflictException,
  CommitmentValidationException,
  IllegalArgumentException,
};
