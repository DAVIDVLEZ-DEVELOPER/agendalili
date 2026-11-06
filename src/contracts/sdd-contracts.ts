/**
 * SDD: Especificación del Sistema de Agenda de Tareas y Compromisos v1.0.0
 * Contrato Ejecutable Determinista con Tipado Estricto en TypeScript (POO)
 * Secciones 2, 3, 4 y 5 de la Especificación SDD
 */

export type UUID = string;
export type DateTime = string | Date;

// ============================================================================
// SECCIÓN 2: MODELO DEL DOMINIO (ENUMS & INTERFACES)
// ============================================================================

export enum TaskPriority {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

export enum TaskStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

export enum CommitmentStatus {
  PROGRAMADO = 'PROGRAMADO',
  CONFIRMADO = 'CONFIRMADO',
  CANCELADO = 'CANCELADO',
}

export interface CreateTaskDTO {
  id?: UUID;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: DateTime;
  prioridad?: TaskPriority;
  estado?: TaskStatus;
  etiquetas?: string[];
}

export interface CreateCommitmentDTO {
  id?: UUID;
  userId?: UUID;
  titulo: string;
  descripcion?: string;
  fechaInicio: DateTime;
  fechaFin: DateTime;
  ubicacion?: string;
  participantes: string[];
  estado?: CommitmentStatus;
  minutosRecordatorio?: number;
}

// ============================================================================
// SECCIÓN 5.3: MANEJO DE EXCEPCIONES DEL DOMINIO
// ============================================================================

export class TaskValidationException extends Error {
  public readonly ruleCode: string;
  public readonly statusCode: number = 400;

  constructor(message: string, ruleCode: string = 'TASK_VALIDATION_ERROR') {
    super(message);
    this.name = 'TaskValidationException';
    this.ruleCode = ruleCode;
  }
}

export class IllegalStateException extends TaskValidationException {
  constructor(message: string = 'No se puede reabrir una tarea completada', ruleCode: string = 'RN-02') {
    super(message, ruleCode);
    this.name = 'IllegalStateException';
  }
}

export class ScheduleConflictException extends Error {
  public readonly ruleCode: string;
  public readonly statusCode: number = 409;

  constructor(message: string, ruleCode: string = 'RN-03') {
    super(message);
    this.name = 'ScheduleConflictException';
    this.ruleCode = ruleCode;
  }
}

export class CommitmentValidationException extends Error {
  public readonly ruleCode: string;
  public readonly statusCode: number = 400;

  constructor(message: string, ruleCode: string = 'COMMITMENT_VALIDATION_ERROR') {
    super(message);
    this.name = 'CommitmentValidationException';
    this.ruleCode = ruleCode;
  }
}

export class IllegalArgumentException extends CommitmentValidationException {
  constructor(message: string = 'Duración mínima 15 mins', ruleCode: string = 'RN-04') {
    super(message, ruleCode);
    this.name = 'IllegalArgumentException';
  }
}

// ============================================================================
// SECCIÓN 2.1 & 2.2: ENTIDADES DEL DOMINIO
// ============================================================================

export interface ITask {
  readonly id: UUID;
  titulo: string;
  descripcion?: string;
  fechaVencimiento: string;
  prioridad: TaskPriority;
  estado: TaskStatus;
  etiquetas: string[];
}

export interface ICommitment {
  readonly id: UUID;
  readonly userId: UUID;
  titulo: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin: string;
  ubicacion?: string;
  participantes: string[];
  estado: CommitmentStatus;
  minutosRecordatorio: number;
}

// ============================================================================
// SECCIÓN 5.4: CAPA DE REPOSITORIO AISLADA
// ============================================================================

export interface ITaskRepository {
  save(task: ITask): ITask;
  updateStatus(id: UUID, newStatus: TaskStatus): ITask | null;
  findById(id: UUID): ITask | null;
  findAll(): ITask[];
  findPendingOverdue(nowIso: string): ITask[];
  deleteById(id: UUID): boolean;
}

export interface ICommitmentRepository {
  save(commitment: ICommitment): ICommitment;
  updateStatus(id: UUID, newStatus: CommitmentStatus): ICommitment | null;
  findById(id: UUID): ICommitment | null;
  findAll(): ICommitment[];
  findOverlapping(
    userOrEmails: string | string[] | null,
    startIso: string,
    endIso: string,
    excludeId?: UUID | null
  ): ICommitment[];
  deleteById(id: UUID): boolean;
}

// ============================================================================
// SECCIÓN 4: CONTRATOS DE SERVICIO (TaskService & CommitmentService)
// ============================================================================

export interface ITaskService {
  createTask(dto: CreateTaskDTO): ITask;
  updateTaskStatus(id: UUID, newStatus: TaskStatus): ITask;
  getPendingTasksOverdue(now: DateTime): ITask[];
}

export interface ICommitmentService {
  scheduleCommitment(dto: CreateCommitmentDTO): ICommitment;
  cancelCommitment(id: UUID): void;
  hasScheduleConflict(userId: UUID, start: DateTime, end: DateTime): boolean;
}
