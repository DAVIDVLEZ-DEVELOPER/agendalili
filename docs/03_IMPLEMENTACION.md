# Fase 3: Implementación (Modelo en Cascada)

**Proyecto:** Sistema de Agenda de Tareas y Compromisos (Estética Vintage)  
**Entrada:** `docs/02_DISENO.md`  
**Estado de la Fase:** CERRADA Y COMPLETADA

---

## Estructura de Proyecto Entregada

```text
agendalili/
├── package.json
├── docs/
│   ├── 01_REQUISITOS.md
│   ├── 02_DISENO.md
│   ├── 03_IMPLEMENTACION.md
│   ├── 04_VERIFICACION.md
│   └── 05_MANTENIMIENTO.md
├── src/
│   ├── server.js
│   ├── database/
│   │   └── db.js
│   ├── domain/
│   │   ├── enums.js
│   │   ├── exceptions.js
│   │   └── entities.js
│   ├── repositories/
│   │   ├── TaskRepository.js
│   │   └── CommitmentRepository.js
│   └── services/
│       ├── TaskService.js
│       └── CommitmentService.js
├── public/
│   ├── index.html
│   ├── css/
│   │   └── vintage.css
│   └── js/
│       └── app.js
└── tests/
    └── run-tests.js
```

## Decisiones de Implementación Trazables

1. **Persistencia SQLite (`src/database/db.js`, `TaskRepository.js`, `CommitmentRepository.js`):**
   - Implementación mediante el motor SQLite nativo de Node.js (`node:sqlite`) con restricciones `CHECK` a nivel de tabla para longitud de caracteres (`<= 100`, `<= 500`) y valores de enumeraciones.
2. **Contratos de Servicio (`TaskService.js`, `CommitmentService.js`):**
   - Implementación exacta de `createTask`, `updateTaskStatus`, `getPendingTasksOverdue`, `scheduleCommitment`, `cancelCommitment` y `hasScheduleConflict`.
3. **Interfaz Vintage y Proporción 60/40 (`public/css/vintage.css`, `public/index.html`, `public/js/app.js`):**
   - Variables CSS en `:root` con `--blanco: #FFFFFF` y `--pastel-1` a `--pastel-5`, contadores de caracteres en vivo y validación visual inmediata.

