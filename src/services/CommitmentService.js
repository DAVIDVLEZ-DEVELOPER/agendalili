/**
 * Servicio de Compromisos (CommitmentService)
 * Fuente: sdd-agenda-tareas.md (Secciones 3 y 4.2)
 */

const { Commitment } = require('../domain/entities');
const { CommitmentStatus } = require('../domain/enums');
const {
  ScheduleConflictException,
  CommitmentValidationException,
} = require('../domain/exceptions');

class CommitmentService {
  /**
   * @param {import('../repositories/CommitmentRepository').CommitmentRepository} commitmentRepository
   */
  constructor(commitmentRepository) {
    this.commitmentRepository = commitmentRepository;
  }

  /**
   * Contrato SDD 4.2: scheduleCommitment(dto: CreateCommitmentDTO): Commitment
   * Valida RN-03 (sin solapamiento), RN-04 (duración >= 15m y fechaFin > fechaInicio) y RN-05 (RFC 5322)
   * @param {object} dto
   * @returns {Commitment}
   */
  scheduleCommitment(dto) {
    if (!dto || typeof dto !== 'object') {
      throw new CommitmentValidationException(
        'Los datos del compromiso son requeridos.',
        'COMMITMENT_DTO_REQUIRED'
      );
    }

    // Construye y valida la entidad de dominio (incluye RN-04 y RN-05)
    const commitment = new Commitment({
      id: dto.id,
      userId: dto.userId,
      titulo: dto.titulo,
      descripcion: dto.descripcion || '',
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      ubicacion: dto.ubicacion || '',
      participantes: dto.participantes,
      estado: dto.estado || CommitmentStatus.PROGRAMADO,
      minutosRecordatorio:
        dto.minutosRecordatorio !== undefined ? dto.minutosRecordatorio : 15,
    });

    // RN-03: Si el compromiso se agenda como PROGRAMADO o CONFIRMADO, verificar traslapes
    if (
      commitment.estado === CommitmentStatus.PROGRAMADO ||
      commitment.estado === CommitmentStatus.CONFIRMADO
    ) {
      const identifiersToCheck = dto.userId
        ? [dto.userId, ...commitment.participantes]
        : commitment.participantes;

      const hasConflict = this.hasScheduleConflict(
        identifiersToCheck,
        commitment.fechaInicio,
        commitment.fechaFin
      );

      if (hasConflict) {
        const overlapping = this.commitmentRepository.findOverlapping(
          identifiersToCheck,
          commitment.fechaInicio,
          commitment.fechaFin
        );
        const conflictTitles = overlapping.map((c) => `"${c.titulo}"`).join(', ');
        throw new ScheduleConflictException(
          `RN-03: Conflicto de horario detectado para "${commitment.creadorEmail}". El compromiso se solapa con: ${conflictTitles}.`,
          'RN-03'
        );
      }
    }

    return this.commitmentRepository.save(commitment);
  }

  /**
   * Contrato SDD 4.2: cancelCommitment(id: UUID): void
   * Cambia el estado del compromiso a CANCELADO en SQLite (liberando su bloque horario para RN-03)
   * @param {string} id
   * @returns {Commitment}
   */
  cancelCommitment(id) {
    const existing = this.commitmentRepository.findById(id);
    if (!existing) {
      throw new CommitmentValidationException(
        `No se encontró el compromiso con id "${id}".`,
        'COMMITMENT_NOT_FOUND'
      );
    }

    return this.commitmentRepository.updateStatus(id, CommitmentStatus.CANCELADO);
  }

  /**
   * Confirma un compromiso existente (PROGRAMADO -> CONFIRMADO)
   * @param {string} id
   * @returns {Commitment}
   */
  confirmCommitment(id) {
    const existing = this.commitmentRepository.findById(id);
    if (!existing) {
      throw new CommitmentValidationException(
        `No se encontró el compromiso con id "${id}".`,
        'COMMITMENT_NOT_FOUND'
      );
    }

    if (existing.estado === CommitmentStatus.CANCELADO) {
      throw new CommitmentValidationException(
        'No se puede confirmar un compromiso que ya fue CANCELADO.',
        'COMMITMENT_CANCELLED'
      );
    }

    return this.commitmentRepository.updateStatus(id, CommitmentStatus.CONFIRMADO);
  }

  /**
   * Contrato SDD 4.2: hasScheduleConflict(userId: UUID, start: DateTime, end: DateTime): boolean
   * Evalúa RN-03: (NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)
   * @param {string|string[]} userId Identificador UUID o correo(s) del creador/usuario
   * @param {Date|string} start Inicio del nuevo compromiso
   * @param {Date|string} end Fin del nuevo compromiso
   * @returns {boolean}
   */
  hasScheduleConflict(userId, start, end) {
    const parsedStart = start instanceof Date ? start : new Date(start);
    const parsedEnd = end instanceof Date ? end : new Date(end);

    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      throw new CommitmentValidationException(
        'Fechas inválidas para verificación de conflicto de horario.',
        'RN-03'
      );
    }

    const conflicts = this.commitmentRepository.findOverlapping(
      userId,
      parsedStart.toISOString(),
      parsedEnd.toISOString()
    );

    return conflicts.length > 0;
  }

  /**
   * Obtiene todos los compromisos registrados
   * @returns {Commitment[]}
   */
  getAllCommitments() {
    return this.commitmentRepository.findAll();
  }

  /**
   * Elimina un compromiso por su UUID
   * @param {string} id
   * @returns {boolean}
   */
  deleteCommitment(id) {
    return this.commitmentRepository.deleteById(id);
  }
}

module.exports = { CommitmentService };
