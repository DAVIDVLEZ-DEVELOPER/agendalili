/**
 * Dobles de Prueba (Mocks en Memoria) para Aislamiento Puro en Unit Testing TDD
 * Implementan exactamente los contratos de TaskRepository y CommitmentRepository
 */

const { Task, Commitment } = require('../../src/domain/entities');
const { TaskStatus, CommitmentStatus } = require('../../src/domain/enums');

class MockTaskRepository {
  constructor() {
    /** @type {Map<string, Task>} */
    this.store = new Map();
  }

  save(task) {
    const entity = task instanceof Task ? task : new Task(task);
    this.store.set(entity.id, entity);
    return entity;
  }

  updateStatus(id, newStatus) {
    const existing = this.store.get(id);
    if (!existing) return null;
    existing.estado = newStatus;
    this.store.set(id, existing);
    return existing;
  }

  findById(id) {
    return this.store.get(id) || null;
  }

  findAll() {
    return Array.from(this.store.values()).sort((a, b) =>
      a.fechaVencimiento.localeCompare(b.fechaVencimiento)
    );
  }

  findPendingOverdue(nowIso) {
    const refTime = new Date(nowIso).getTime();
    return this.findAll().filter(
      (t) =>
        (t.estado === TaskStatus.PENDIENTE || t.estado === TaskStatus.EN_PROCESO) &&
        new Date(t.fechaVencimiento).getTime() < refTime
    );
  }

  deleteById(id) {
    return this.store.delete(id);
  }
}

class MockCommitmentRepository {
  constructor() {
    /** @type {Map<string, Commitment>} */
    this.store = new Map();
  }

  save(commitment) {
    const entity =
      commitment instanceof Commitment
        ? commitment
        : new Commitment({
            ...commitment,
            id:
              commitment.id && /^[0-9a-f]{8}-/i.test(commitment.id)
                ? commitment.id
                : undefined,
          });
    this.store.set(entity.id, entity);
    return entity;
  }

  updateStatus(id, newStatus) {
    const existing = this.store.get(id);
    if (!existing) return null;
    existing.estado = newStatus;
    this.store.set(id, existing);
    return existing;
  }

  findById(id) {
    return this.store.get(id) || null;
  }

  findAll() {
    return Array.from(this.store.values()).sort((a, b) =>
      a.fechaInicio.localeCompare(b.fechaInicio)
    );
  }

  /**
   * RN-03: (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)
   * Nota: Si NuevoInicio === ExistenteFin (TDD-C03 Boundary Touch), la condición
   * NuevoInicio < ExistenteFin es FALSE, por lo que NO hay solapamiento.
   */
  findOverlapping(userOrEmails, startIso, endIso, excludeId = null) {
    const newStart = new Date(startIso).getTime();
    const newEnd = new Date(endIso).getTime();

    const activeOverlap = this.findAll().filter((c) => {
      if (excludeId && c.id === excludeId) return false;
      if (
        c.estado !== CommitmentStatus.PROGRAMADO &&
        c.estado !== CommitmentStatus.CONFIRMADO
      ) {
        return false;
      }
      const existingStart = new Date(c.fechaInicio).getTime();
      const existingEnd = new Date(c.fechaFin).getTime();
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (!userOrEmails || userOrEmails === '*') {
      return activeOverlap;
    }

    const targets = (Array.isArray(userOrEmails) ? userOrEmails : [userOrEmails])
      .map((u) => String(u).trim().toLowerCase())
      .filter(Boolean);

    if (targets.length === 0 || targets.includes('*')) {
      return activeOverlap;
    }

    return activeOverlap.filter((c) => {
      const cUserId = String(c.userId || '').toLowerCase();
      const cCreator = String(c.creadorEmail || '').toLowerCase();
      return targets.some(
        (target) =>
          target === cUserId ||
          target === cCreator ||
          c.participantes.some((p) => p.toLowerCase() === target)
      );
    });
  }

  deleteById(id) {
    return this.store.delete(id);
  }
}

module.exports = {
  MockTaskRepository,
  MockCommitmentRepository,
};
