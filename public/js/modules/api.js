/**
 * Módulo de Servicios Cliente API (Contrato SDD Sección 4 + Suite TDD)
 * Implementa las llamadas deterministas hacia TaskService, CommitmentService y TddRunner en el backend
 */

class SddApiException extends Error {
  constructor(message, exceptionType = 'Error', ruleCode = 'GENERAL_ERROR', statusCode = 400) {
    super(message);
    this.name = exceptionType;
    this.ruleCode = ruleCode;
    this.statusCode = statusCode;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new SddApiException(
      payload.error || 'Error en la operación del servidor',
      payload.exceptionType || 'Error',
      payload.ruleCode || 'GENERAL_ERROR',
      response.status
    );
  }
  return payload;
}

/**
 * 4.1 Servicio de Tareas (TaskService)
 */
export class TaskClientService {
  /**
   * createTask(dto: CreateTaskDTO): Promise<Task>
   */
  static async createTask(dto) {
    const res = await requestJson('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  }

  /**
   * updateTaskStatus(id: UUID, newStatus: TaskStatus): Promise<Task>
   */
  static async updateTaskStatus(id, newStatus) {
    const res = await requestJson(`/api/tasks/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: newStatus }),
    });
    return res.data;
  }

  /**
   * getPendingTasksOverdue(now: DateTime): Promise<Task[]>
   */
  static async getPendingTasksOverdue(now = new Date().toISOString()) {
    const iso = now instanceof Date ? now.toISOString() : String(now);
    const params = new URLSearchParams({ now: iso });
    const res = await requestJson(`/api/tasks/overdue?${params.toString()}`);
    return res.data;
  }

  /**
   * updateTask(id: UUID, dto: Partial<CreateTaskDTO>): Promise<Task>
   */
  static async updateTask(id, dto) {
    const res = await requestJson(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
    return res.data;
  }

  /**
   * getAllTasks(): Promise<Task[]>
   */
  static async getAllTasks() {
    const res = await requestJson('/api/tasks');
    return res.data;
  }

  /**
   * deleteTask(id: UUID): Promise<boolean>
   */
  static async deleteTask(id) {
    const res = await requestJson(`/api/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }
}

/**
 * 4.2 Servicio de Compromisos (CommitmentService)
 */
export class CommitmentClientService {
  /**
   * scheduleCommitment(dto: CreateCommitmentDTO): Promise<Commitment>
   */
  static async scheduleCommitment(dto) {
    const res = await requestJson('/api/commitments', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  }

  /**
   * cancelCommitment(id: UUID): Promise<Commitment>
   */
  static async cancelCommitment(id) {
    const res = await requestJson(`/api/commitments/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
    });
    return res.data;
  }

  /**
   * confirmCommitment(id: UUID): Promise<Commitment>
   */
  static async confirmCommitment(id) {
    const res = await requestJson(`/api/commitments/${encodeURIComponent(id)}/confirm`, {
      method: 'PATCH',
    });
    return res.data;
  }

  /**
   * hasScheduleConflict(userId: UUID, start: DateTime, end: DateTime): Promise<boolean>
   */
  static async hasScheduleConflict(userId, start, end) {
    const startIso = start instanceof Date ? start.toISOString() : String(start);
    const endIso = end instanceof Date ? end.toISOString() : String(end);
    const params = new URLSearchParams({
      userId: userId || '*',
      start: startIso,
      end: endIso,
    });
    const res = await requestJson(`/api/commitments/conflict-check?${params.toString()}`);
    return Boolean(res.hasConflict);
  }

  /**
   * getAllCommitments(): Promise<Commitment[]>
   */
  static async getAllCommitments() {
    const res = await requestJson('/api/commitments');
    return res.data;
  }

  /**
   * deleteCommitment(id: UUID): Promise<boolean>
   */
  static async deleteCommitment(id) {
    const res = await requestJson(`/api/commitments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.deleted;
  }
}

/**
 * Servicio Cliente para Ejecución de Suites TDD (TaskServiceTest & CommitmentServiceTest)
 */
export class TddClientService {
  static async runSuites() {
    const res = await requestJson('/api/tdd/run');
    return res.data;
  }
}

export { SddApiException };
