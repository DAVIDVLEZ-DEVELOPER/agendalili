/**
 * Enumeraciones inmutables del Modelo de Dominio
 * Fuente: sdd-agenda-tareas.md (Sección 2)
 */

const TaskPriority = Object.freeze({
  BAJA: 'BAJA',
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA',
});

const TaskStatus = Object.freeze({
  PENDIENTE: 'PENDIENTE',
  EN_PROCESO: 'EN_PROCESO',
  COMPLETADA: 'COMPLETADA',
  CANCELADA: 'CANCELADA',
});

const CommitmentStatus = Object.freeze({
  PROGRAMADO: 'PROGRAMADO',
  CONFIRMADO: 'CONFIRMADO',
  CANCELADO: 'CANCELADO',
});

module.exports = {
  TaskPriority,
  TaskStatus,
  CommitmentStatus,
};

