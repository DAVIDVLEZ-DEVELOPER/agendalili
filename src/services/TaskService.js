/**
 * Servicio de Tareas (TaskService)
 * Fuente: sdd-agenda-tareas.md (Secciones 3 y 4.1)
 */

const { Task } = require('../domain/entities');
const { TaskStatus, TaskPriority } = require('../domain/enums');
const { TaskValidationException, IllegalStateException } = require('../domain/exceptions');

const STATUS_ALIASES = Object.freeze({
  IN_PROCESS: TaskStatus.EN_PROCESO,
  PENDING: TaskStatus.PENDIENTE,
  COMPLETED: TaskStatus.COMPLETADA,
  CANCELLED: TaskStatus.CANCELADA,
});

function normalizeTaskStatus(status) {
  if (!status) return status;
  return STATUS_ALIASES[status] || status;
}

class TaskService {
  /**
   * @param {import('../repositories/TaskRepository').TaskRepository} taskRepository
   */
  constructor(taskRepository) {
    this.taskRepository = taskRepository;
  }

  /**
   * Contrato SDD 4.1: createTask(dto: CreateTaskDTO): Task
   * Aplica RN-01: No se puede crear una tarea con fechaVencimiento en el pasado.
   * @param {object} dto
   * @param {Date|string} [referenceNow] Instante de referencia (por defecto new Date())
   * @returns {Task}
   */
  createTask(dto, referenceNow = new Date()) {
    if (!dto || typeof dto !== 'object') {
      throw new TaskValidationException('Los datos de la tarea son requeridos.', 'TASK_DTO_REQUIRED');
    }

    const now = referenceNow instanceof Date ? referenceNow : new Date(referenceNow);
    const dueDate = new Date(dto.fechaVencimiento);

    if (!dto.fechaVencimiento || Number.isNaN(dueDate.getTime())) {
      throw new TaskValidationException(
        'RN-01: La fecha de vencimiento (fechaVencimiento) es requerida y debe ser válida.',
        'RN-01'
      );
    }

    // RN-01: No se puede crear ni actualizar una tarea con fechaVencimiento en el pasado
    if (dueDate.getTime() < now.getTime()) {
      throw new TaskValidationException(
        'RN-01: No se puede crear ni actualizar una tarea con una fecha de vencimiento en el pasado.',
        'RN-01'
      );
    }

    const task = new Task({
      id: dto.id,
      titulo: dto.titulo,
      descripcion: dto.descripcion || '',
      fechaVencimiento: dueDate.toISOString(),
      prioridad: dto.prioridad || TaskPriority.MEDIA,
      estado: dto.estado || TaskStatus.PENDIENTE,
      etiquetas: Array.isArray(dto.etiquetas) ? dto.etiquetas : [],
    });

    return this.taskRepository.save(task);
  }

  /**
   * Contrato SDD 4.1: updateTaskStatus(id: UUID, newStatus: TaskStatus): Task
   * Aplica RN-02: Una tarea COMPLETADA o CANCELADA no puede cambiar a EN_PROCESO o PENDIENTE.
   * @param {string} id
   * @param {string} newStatus
   * @returns {Task}
   */
  updateTaskStatus(id, newStatus) {
    const existing = this.taskRepository.findById(id);
    if (!existing) {
      throw new TaskValidationException(`No se encontró la tarea con id "${id}".`, 'TASK_NOT_FOUND');
    }

    const normalizedStatus = normalizeTaskStatus(newStatus);

    if (!Object.values(TaskStatus).includes(normalizedStatus)) {
      throw new TaskValidationException(
        `Estado "${newStatus}" inválido. Permitidos: ${Object.values(TaskStatus).join(', ')}.`,
        'DOMAIN_TASK_STATUS'
      );
    }

    // RN-02 (TDD-T03): Una tarea COMPLETADA o CANCELADA no puede cambiar a EN_PROCESO o PENDIENTE
    const isTerminal =
      existing.estado === TaskStatus.COMPLETADA || existing.estado === TaskStatus.CANCELADA;
    const isReopening =
      normalizedStatus === TaskStatus.EN_PROCESO || normalizedStatus === TaskStatus.PENDIENTE;

    if (isTerminal && isReopening) {
      throw new IllegalStateException(
        `RN-02: No se puede reabrir una tarea completada (estado actual: ${existing.estado}, estado solicitado: ${normalizedStatus}).`,
        'RN-02'
      );
    }

    return this.taskRepository.updateStatus(id, normalizedStatus);
  }

  /**
   * Actualiza los datos de una tarea existente respetando RN-01 y RN-02
   * @param {string} id
   * @param {object} dto
   * @param {Date|string} [referenceNow]
   * @returns {Task}
   */
  updateTask(id, dto, referenceNow = new Date()) {
    const existing = this.taskRepository.findById(id);
    if (!existing) {
      throw new TaskValidationException(`No se encontró la tarea con id "${id}".`, 'TASK_NOT_FOUND');
    }

    const nextStatus =
      dto.estado !== undefined ? normalizeTaskStatus(dto.estado) : existing.estado;
    const isTerminal =
      existing.estado === TaskStatus.COMPLETADA || existing.estado === TaskStatus.CANCELADA;
    const isReopening =
      nextStatus === TaskStatus.EN_PROCESO || nextStatus === TaskStatus.PENDIENTE;

    if (isTerminal && isReopening) {
      throw new IllegalStateException(
        `RN-02: No se puede reabrir una tarea completada (estado actual: ${existing.estado}, estado solicitado: ${nextStatus}).`,
        'RN-02'
      );
    }

    const nextDueStr =
      dto.fechaVencimiento !== undefined ? dto.fechaVencimiento : existing.fechaVencimiento;
    const nextDue = new Date(nextDueStr);
    const now = referenceNow instanceof Date ? referenceNow : new Date(referenceNow);

    if (Number.isNaN(nextDue.getTime()) || nextDue.getTime() < now.getTime()) {
      throw new TaskValidationException(
        'RN-01: No se puede actualizar una tarea con una fecha de vencimiento en el pasado.',
        'RN-01'
      );
    }

    const updated = new Task({
      id: existing.id,
      titulo: dto.titulo !== undefined ? dto.titulo : existing.titulo,
      descripcion: dto.descripcion !== undefined ? dto.descripcion : existing.descripcion,
      fechaVencimiento: nextDue.toISOString(),
      prioridad: dto.prioridad !== undefined ? dto.prioridad : existing.prioridad,
      estado: nextStatus,
      etiquetas: dto.etiquetas !== undefined ? dto.etiquetas : existing.etiquetas,
      createdAt: existing.createdAt,
    });

    return this.taskRepository.save(updated);
  }

  /**
   * Contrato SDD 4.1: getPendingTasksOverdue(now: DateTime): List<Task>
   * @param {Date|string} [now]
   * @returns {Task[]}
   */
  getPendingTasksOverdue(now = new Date()) {
    const parsedNow = now instanceof Date ? now : new Date(now);
    return this.taskRepository.findPendingOverdue(parsedNow.toISOString());
  }

  /**
   * Obtiene todas las tareas registradas
   * @returns {Task[]}
   */
  getAllTasks() {
    return this.taskRepository.findAll();
  }

  /**
   * Elimina una tarea por su UUID
   * @param {string} id
   * @returns {boolean}
   */
  deleteTask(id) {
    return this.taskRepository.deleteById(id);
  }
}

module.exports = { TaskService };
