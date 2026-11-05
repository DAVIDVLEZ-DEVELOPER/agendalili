# SDD: Especificación del Sistema de Agenda de Tareas y Compromisos

> **Especificación Ejecutable para Agentes Autónomos de Desarrollo (AI Agents)** **Paradigma:** Specification-Driven Development (SDD) **Versión:** 1.0.0

---

## 1\. Visión General del Sistema

El sistema **Agenda de Tareas y Compromisos** es un módulo de gestión personal y profesional diseñado para registrar, organizar y priorizar tareas individuales, así como agendar y validar compromisos con participantes y restricciones de horario.

Esta especificación actúa como el **contrato ejecutable inmutable** para el Agente de Inteligencia Artificial encargado de la implementación.

---

## 2\. Modelo del Dominio

### 2.1 Entidad: Tarea (`Task`)

- `id` (UUID, Requerido, Único): Identificador único.  
- `titulo` (String, Requerido, Máx. 100 caracteres): Título de la tarea.  
- `descripcion` (String, Opcional, Máx. 500 caracteres): Detalle explicativo.  
- `fechaVencimiento` (DateTime, Requerido): Fecha límite para completar la tarea.  
- `prioridad` (Enum: `BAJA`, `MEDIA`, `ALTA`, `CRITICA`): Nivel de urgencia/importancia.  
- `estado` (Enum: `PENDIENTE`, `EN_PROCESO`, `COMPLETADA`, `CANCELADA`): Estado actual.  
- `etiquetas` (List, Opcional): Categorías asociadas (ej. "Trabajo", "Personal").

### 2.2 Entidad: Compromiso (`Commitment`)

- `id` (UUID, Requerido, Único): Identificador único.  
- `titulo` (String, Requerido, Máx. 100 caracteres): Título de la reunión o compromiso.  
- `descripcion` (String, Opcional): Detalles del encuentro.  
- `fechaInicio` (DateTime, Requerido): Inicio del compromiso.  
- `fechaFin` (DateTime, Requerido): Fin del compromiso (`fechaFin > fechaInicio`).  
- `ubicacion` (String, Opcional): Enlace virtual o dirección física.  
- `participantes` (List, Requerido): Lista de correos de los asistentes (mínimo 1, el creador).  
- `estado` (Enum: `PROGRAMADO`, `CONFIRMADO`, `CANCELADO`): Estado del compromiso.  
- `minutosRecordatorio` (Integer, Default: 15): Tiempo previo para enviar alerta.

---

## 3\. Reglas de Negocio Estrictas (Business Rules)

1. **RN-01 (Validación de Fechas de Tareas):** No se puede crear ni actualizar una tarea con una `fechaVencimiento` en el pasado con respecto al momento de creación.  
2. **RN-02 (Transiciones de Estado de Tarea):**  
   - Una tarea `COMPLETADA` o `CANCELADA` no puede cambiar a `EN_PROCESO` o `PENDIENTE`.  
3. **RN-03 (Sin Solapamiento de Compromisos):**  
   - No se permite agendar un compromiso que se traslape con otro compromiso existente en el estado `PROGRAMADO` o `CONFIRMADO` para el mismo usuario/creador.  
   - Rango de traslape: `(NuevoInicio < ExistenteFin) Y (NuevoFin > ExistenteInicio)`.  
4. **RN-04 (Duración Mínima de Compromiso):**  
   - La duración mínima entre `fechaInicio` y `fechaFin` debe ser de al menos 15 minutos.  
5. **RN-05 (Validación de Participantes):**  
   - Todos los correos en la lista de participantes deben cumplir con el formato estándar RFC 5322\.

---

## 4\. Contrato de API / Interfaces del Servicio

### 4.1 Servicio de Tareas (`TaskService`)

- `createTask(dto: CreateTaskDTO): Task`  
- `updateTaskStatus(id: UUID, newStatus: TaskStatus): Task`  
- `getPendingTasksOverdue(now: DateTime): List<Task>`

### 4.2 Servicio de Compromisos (`CommitmentService`)

- `scheduleCommitment(dto: CreateCommitmentDTO): Commitment`  
- `cancelCommitment(id: UUID): void`  
- `hasScheduleConflict(userId: UUID, start: DateTime, end: DateTime): boolean`

---

## 5\. Directivas de Ejecución para el Agente de IA

1. **Código Determinista:** Implementar utilizando POO con tipado estricto (Typescript / Java / Python con Type Hints).  
2. **Sin Vibe Coding:** Toda clase y método debe corresponder exactamente a las estructuras definidas en las Secciones 2, 3 y 4\.  
3. **Manejo de Excepciones:**  
   - `TaskValidationException` para violaciones de reglas de tareas.  
   - `ScheduleConflictException` al detectar traslapes de compromisos.  
4. **Persistencia:** Diseñar capa de repositorio aislada (`TaskRepository`, `CommitmentRepository`).