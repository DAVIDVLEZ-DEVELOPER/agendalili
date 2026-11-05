# Fase 2: Diseño del Sistema y Arquitectura (Modelo en Cascada)

**Proyecto:** Sistema de Agenda de Tareas y Compromisos (Estética Vintage)  
**Entrada:** `docs/01_REQUISITOS.md`  
**Estado de la Fase:** CERRADA Y APROBADA

---

## 1. Arquitectura en Capas (POO Determinista)

El sistema implementa una arquitectura en 4 capas estrictamente desacopladas según la Sección 4 y 5 de `sdd-agenda-tareas.md`:

1. **Capa de Dominio (`src/domain/`)**:
   - Entidades con validación estructural y tipado determinista (`Task`, `Commitment`).
   - Enumeraciones inmutables (`TaskPriority`, `TaskStatus`, `CommitmentStatus`).
   - Jerarquía de excepciones del dominio: `TaskValidationException`, `ScheduleConflictException`, `CommitmentValidationException`.
2. **Capa de Persistencia (`src/repositories/`)**:
   - Conexión SQLite (`src/database/db.js`).
   - `TaskRepository`: Operaciones CRUD sobre la tabla `tasks`.
   - `CommitmentRepository`: Operaciones CRUD y consulta de solapamiento sobre la tabla `commitments`.
3. **Capa de Servicios de Aplicación (`src/services/`)**:
   - `TaskService`:
     - `createTask(dto)`
     - `updateTaskStatus(id, newStatus)`
     - `getPendingTasksOverdue(now)`
     - `getAllTasks()`
   - `CommitmentService`:
     - `scheduleCommitment(dto)`
     - `cancelCommitment(id)`
     - `confirmCommitment(id)`
     - `hasScheduleConflict(userId, start, end)`
     - `getAllCommitments()`
4. **Capa de Presentación y API (`src/server.js`, `public/`)**:
   - Servidor HTTP/REST en Node.js + Express.
   - Interfaz Web Vintage con Bootstrap 5, CSS con variables `:root` y JavaScript Vanilla.

---

## 2. Diseño de Base de Datos (Esquema SQLite)

```sql
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL CHECK(length(titulo) <= 100),
    descripcion TEXT CHECK(descripcion IS NULL OR length(descripcion) <= 500),
    fechaVencimiento TEXT NOT NULL,
    prioridad TEXT NOT NULL CHECK(prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    estado TEXT NOT NULL CHECK(estado IN ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA')),
    etiquetas TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commitments (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL CHECK(length(titulo) <= 100),
    descripcion TEXT,
    fechaInicio TEXT NOT NULL,
    fechaFin TEXT NOT NULL,
    ubicacion TEXT,
    participantes TEXT NOT NULL,
    creadorEmail TEXT NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('PROGRAMADO', 'CONFIRMADO', 'CANCELADO')),
    minutosRecordatorio INTEGER NOT NULL DEFAULT 15,
    createdAt TEXT NOT NULL
);
```

---

## 3. Diseño Visual Vintage y Distribución Cromática 60 / 40

Para cumplir estrictamente con `design.md`:

- **Superficie Blanca (`--blanco: #FFFFFF` — 60% del área visual):**
  - Fondo general del lienzo (`body`), fondos internos de tarjetas (`.vintage-card`), paneles de formularios, fondos de inputs y área de listados.
- **Acentos Pastel (40% repartido equitativamente ~8% cada uno):**
  - `--pastel-1 (#F4C2C2)`: Prioridad `CRITICA`, estado `CANCELADA`/`CANCELADO`, bordes de alerta y botones de cancelación.
  - `--pastel-2 (#D7BDE2)`: Identidad de la sección de Compromisos, badges de etiquetas (`etiquetas`), foco de campos y ornamentos de cabecera.
  - `--pastel-3 (#A7D8E8)`: Identidad de la sección de Tareas, estado `EN_PROCESO` y `PROGRAMADO`, barra de estadísticas e iconos informativos.
  - `--pastel-4 (#FFF3B0)`: Prioridad `MEDIA` y `ALTA`, estado `PENDIENTE`, cintillo de avisos vintage y contadores de caracteres cercanos al límite.
  - `--pastel-5 (#B5EAD7)`: Estado `COMPLETADA` y `CONFIRMADO`, prioridad `BAJA`, botones de acción principal ("Guardar Tarea", "Agendar Compromiso").
- **Tipografía y Ornamentos Retro:**
  - Encabezados en serif editorial (`'Playfair Display', Georgia, serif`), cuerpo en serif de lectura (`'Lora', Georgia, serif`), filetes dobles (`border-style: double`), esquinas redondeadas suaves (`6px`) y sombras desplazadas sólidas pero discretas (`3px 3px 0px`).

