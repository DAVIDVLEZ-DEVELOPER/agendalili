-- =============================================================================
-- ESQUEMA RELACIONAL SQLITE: SISTEMA DE AGENDA DE TAREAS Y COMPROMISOS (SDD)
-- Fuentes: sdd-agenda-tareas.md y design.md_sistema_de_dise_o_vintage.md
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 1. Tabla Principal de Tareas (Task)
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL CHECK(length(trim(titulo)) > 0 AND length(titulo) <= 100),
  descripcion TEXT DEFAULT '' CHECK(descripcion IS NULL OR length(descripcion) <= 500),
  fechaVencimiento TEXT NOT NULL,
  prioridad TEXT NOT NULL CHECK(prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  estado TEXT NOT NULL CHECK(estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA')),
  etiquetas TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL
);

-- 2. Tabla Relacional de Etiquetas por Tarea (1:N)
CREATE TABLE IF NOT EXISTS task_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tasks_estado_vencimiento
  ON tasks(estado, fechaVencimiento);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id
  ON task_tags(task_id);

-- 3. Tabla Principal de Compromisos (Commitment)
CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
  titulo TEXT NOT NULL CHECK(length(trim(titulo)) > 0 AND length(titulo) <= 100),
  descripcion TEXT DEFAULT '',
  fechaInicio TEXT NOT NULL,
  fechaFin TEXT NOT NULL CHECK(fechaFin > fechaInicio),
  ubicacion TEXT DEFAULT '',
  participantes TEXT NOT NULL DEFAULT '[]',
  creadorEmail TEXT NOT NULL,
  estado TEXT NOT NULL CHECK(estado IN ('PROGRAMADO', 'CONFIRMADO', 'CANCELADO')),
  minutosRecordatorio INTEGER NOT NULL DEFAULT 15 CHECK(minutosRecordatorio >= 0),
  createdAt TEXT NOT NULL
);

-- 4. Tabla Relacional de Participantes por Compromiso (1:N)
CREATE TABLE IF NOT EXISTS commitment_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  commitment_id TEXT NOT NULL,
  email TEXT NOT NULL,
  is_creator INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (commitment_id) REFERENCES commitments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commitments_schedule
  ON commitments(estado, fechaInicio, fechaFin);

CREATE INDEX IF NOT EXISTS idx_commitments_user
  ON commitments(userId, creadorEmail);

CREATE INDEX IF NOT EXISTS idx_commitment_participants_email
  ON commitment_participants(email, commitment_id);

