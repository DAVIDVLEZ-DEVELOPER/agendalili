/**
 * Repositorio Aislado de Tareas (TaskRepository)
 * Fuente: sdd-agenda-tareas.md (Sección 5.4)
 */

const { Task } = require('../domain/entities');
const { TaskStatus } = require('../domain/enums');
const { runInTransaction } = require('../database/db');

class TaskRepository {
  /**
   * @param {import('../database/db').SqliteDatabase} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Persiste una entidad Task y sus etiquetas relacionales en SQLite de forma transaccional
   * @param {Task} task
   * @returns {Task}
   */
  save(task) {
    runInTransaction(this.db, () => {
      const upsertTaskStmt = this.db.prepare(`
        INSERT INTO tasks (id, titulo, descripcion, fechaVencimiento, prioridad, estado, etiquetas, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          titulo = excluded.titulo,
          descripcion = excluded.descripcion,
          fechaVencimiento = excluded.fechaVencimiento,
          prioridad = excluded.prioridad,
          estado = excluded.estado,
          etiquetas = excluded.etiquetas
      `);

      upsertTaskStmt.run(
        task.id,
        task.titulo,
        task.descripcion,
        task.fechaVencimiento,
        task.prioridad,
        task.estado,
        JSON.stringify(task.etiquetas),
        task.createdAt
      );

      // Sincronizar tabla relacional task_tags (1:N)
      const deleteTagsStmt = this.db.prepare(`DELETE FROM task_tags WHERE task_id = ?`);
      deleteTagsStmt.run(task.id);

      if (Array.isArray(task.etiquetas) && task.etiquetas.length > 0) {
        const insertTagStmt = this.db.prepare(`
          INSERT INTO task_tags (task_id, tag) VALUES (?, ?)
        `);
        for (const tag of task.etiquetas) {
          insertTagStmt.run(task.id, tag);
        }
      }
    });

    return this.findById(task.id);
  }

  /**
   * Actualiza directamente el estado de una tarea en SQLite
   * @param {string} id
   * @param {string} newStatus
   * @returns {Task|null}
   */
  updateStatus(id, newStatus) {
    const stmt = this.db.prepare(`UPDATE tasks SET estado = ? WHERE id = ?`);
    stmt.run(newStatus, id);
    return this.findById(id);
  }

  /**
   * Obtiene una tarea por su UUID
   * @param {string} id
   * @returns {Task|null}
   */
  findById(id) {
    const stmt = this.db.prepare(`SELECT * FROM tasks WHERE id = ?`);
    const row = stmt.get(id);
    return row ? this._mapRowToEntity(row) : null;
  }

  /**
   * Lista todas las tareas ordenadas por fecha de vencimiento ascendente
   * @returns {Task[]}
   */
  findAll() {
    const stmt = this.db.prepare(`SELECT * FROM tasks ORDER BY fechaVencimiento ASC`);
    const rows = stmt.all();
    return rows.map((row) => this._mapRowToEntity(row));
  }

  /**
   * Obtiene tareas pendientes o en proceso vencidas respecto a una fecha dada
   * @param {string} nowIso Fecha ISO 8601 de referencia
   * @returns {Task[]}
   */
  findPendingOverdue(nowIso) {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks
      WHERE estado IN (?, ?)
        AND fechaVencimiento < ?
      ORDER BY fechaVencimiento ASC
    `);
    const rows = stmt.all(TaskStatus.PENDIENTE, TaskStatus.EN_PROCESO, nowIso);
    return rows.map((row) => this._mapRowToEntity(row));
  }

  /**
   * Elimina una tarea por su UUID
   * @param {string} id
   * @returns {boolean}
   */
  deleteById(id) {
    const stmt = this.db.prepare(`DELETE FROM tasks WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * @private
   */
  _mapRowToEntity(row) {
    const tagRows = this.db
      .prepare(`SELECT tag FROM task_tags WHERE task_id = ? ORDER BY id ASC`)
      .all(row.id);

    let parsedTags = [];
    if (tagRows.length > 0) {
      parsedTags = tagRows.map((r) => r.tag);
    } else {
      try {
        parsedTags = JSON.parse(row.etiquetas || '[]');
      } catch {
        parsedTags = [];
      }
    }

    return new Task({
      id: row.id,
      titulo: row.titulo,
      descripcion: row.descripcion || '',
      fechaVencimiento: row.fechaVencimiento,
      prioridad: row.prioridad,
      estado: row.estado,
      etiquetas: parsedTags,
      createdAt: row.createdAt,
    });
  }
}

module.exports = { TaskRepository };
