/**
 * Repositorio Aislado de Compromisos (CommitmentRepository)
 * Fuente: sdd-agenda-tareas.md (Sección 5.4)
 */

const { Commitment } = require('../domain/entities');
const { CommitmentStatus } = require('../domain/enums');
const { runInTransaction } = require('../database/db');

class CommitmentRepository {
  /**
   * @param {import('../database/db').SqliteDatabase} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * Persiste una entidad Commitment y sus participantes relacionales en SQLite
   * @param {Commitment} commitment
   * @returns {Commitment}
   */
  save(commitment) {
    runInTransaction(this.db, () => {
      const upsertStmt = this.db.prepare(`
        INSERT INTO commitments (
          id, userId, titulo, descripcion, fechaInicio, fechaFin,
          ubicacion, participantes, creadorEmail, estado, minutosRecordatorio, createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          userId = excluded.userId,
          titulo = excluded.titulo,
          descripcion = excluded.descripcion,
          fechaInicio = excluded.fechaInicio,
          fechaFin = excluded.fechaFin,
          ubicacion = excluded.ubicacion,
          participantes = excluded.participantes,
          creadorEmail = excluded.creadorEmail,
          estado = excluded.estado,
          minutosRecordatorio = excluded.minutosRecordatorio
      `);

      upsertStmt.run(
        commitment.id,
        commitment.userId,
        commitment.titulo,
        commitment.descripcion,
        commitment.fechaInicio,
        commitment.fechaFin,
        commitment.ubicacion,
        JSON.stringify(commitment.participantes),
        commitment.creadorEmail,
        commitment.estado,
        commitment.minutosRecordatorio,
        commitment.createdAt
      );

      // Sincronizar tabla relacional commitment_participants (1:N)
      const deleteParticipantsStmt = this.db.prepare(
        `DELETE FROM commitment_participants WHERE commitment_id = ?`
      );
      deleteParticipantsStmt.run(commitment.id);

      const insertParticipantStmt = this.db.prepare(`
        INSERT INTO commitment_participants (commitment_id, email, is_creator)
        VALUES (?, ?, ?)
      `);

      commitment.participantes.forEach((email, idx) => {
        insertParticipantStmt.run(commitment.id, email.toLowerCase(), idx === 0 ? 1 : 0);
      });
    });

    return this.findById(commitment.id);
  }

  /**
   * Actualiza directamente el estado de un compromiso en SQLite
   * @param {string} id
   * @param {string} newStatus
   * @returns {Commitment|null}
   */
  updateStatus(id, newStatus) {
    const stmt = this.db.prepare(`UPDATE commitments SET estado = ? WHERE id = ?`);
    stmt.run(newStatus, id);
    return this.findById(id);
  }

  /**
   * Busca un compromiso por su UUID
   * @param {string} id
   * @returns {Commitment|null}
   */
  findById(id) {
    const stmt = this.db.prepare(`SELECT * FROM commitments WHERE id = ?`);
    const row = stmt.get(id);
    return row ? this._mapRowToEntity(row) : null;
  }

  /**
   * Lista todos los compromisos ordenados por fecha de inicio ascendente
   * @returns {Commitment[]}
   */
  findAll() {
    const stmt = this.db.prepare(`SELECT * FROM commitments ORDER BY fechaInicio ASC`);
    const rows = stmt.all();
    return rows.map((row) => this._mapRowToEntity(row));
  }

  /**
   * RN-03: Busca compromisos activos (PROGRAMADO o CONFIRMADO) que se solapen en el rango
   * Rango de traslape: (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)
   * Soporta filtrado por userId (UUID), correo del creador o correo de participante en SQLite.
   * @param {string|string[]|null} userOrEmails Identificador(es) de usuario/correo (si es null o '*', evalúa toda la agenda activa)
   * @param {string} startIso NuevoInicio en ISO 8601
   * @param {string} endIso NuevoFin en ISO 8601
   * @param {string|null} [excludeId] ID a excluir si se actualiza un compromiso existente
   * @returns {Commitment[]}
   */
  findOverlapping(userOrEmails, startIso, endIso, excludeId = null) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM commitments
      WHERE estado IN (?, ?)
        AND (? < fechaFin)
        AND (? > fechaInicio)
      ORDER BY fechaInicio ASC
    `);

    const rows = stmt.all(
      CommitmentStatus.PROGRAMADO,
      CommitmentStatus.CONFIRMADO,
      startIso,
      endIso
    );

    const entities = rows
      .map((row) => this._mapRowToEntity(row))
      .filter((c) => (excludeId ? c.id !== excludeId : true));

    if (!userOrEmails || userOrEmails === '*') {
      return entities;
    }

    const rawList = Array.isArray(userOrEmails)
      ? userOrEmails
      : String(userOrEmails).split(',');

    const targets = rawList
      .map((u) => String(u).trim().toLowerCase())
      .filter(Boolean);

    if (targets.length === 0 || targets.includes('*')) {
      return entities;
    }

    return entities.filter((c) => {
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

  /**
   * Elimina un compromiso por su UUID
   * @param {string} id
   * @returns {boolean}
   */
  deleteById(id) {
    const stmt = this.db.prepare(`DELETE FROM commitments WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * @private
   */
  _mapRowToEntity(row) {
    const participantRows = this.db
      .prepare(
        `SELECT email FROM commitment_participants WHERE commitment_id = ? ORDER BY is_creator DESC, id ASC`
      )
      .all(row.id);

    let parsedParticipants = [];
    if (participantRows.length > 0) {
      parsedParticipants = participantRows.map((r) => r.email);
    } else {
      try {
        parsedParticipants = JSON.parse(row.participantes || '[]');
      } catch {
        parsedParticipants = [];
      }
    }

    return new Commitment({
      id: row.id,
      userId: row.userId,
      titulo: row.titulo,
      descripcion: row.descripcion || '',
      fechaInicio: row.fechaInicio,
      fechaFin: row.fechaFin,
      ubicacion: row.ubicacion || '',
      participantes: parsedParticipants,
      estado: row.estado,
      minutosRecordatorio: row.minutosRecordatorio,
      createdAt: row.createdAt,
    });
  }
}

module.exports = { CommitmentRepository };
