# Agenda SDD & TDD — Sistema Modular de Tareas y Compromisos

Sistema de gestión de **Tareas (`Task`)** y **Compromisos (`Commitment`)** desarrollado bajo **Specification-Driven Development (SDD v1.0.0)** y **Test-Driven Development (TDD: Ciclo Red → Green → Refactor)** con **100% de cobertura** en la lógica de dominio y servicios, persistencia relacional en **SQLite (`node:sqlite`)** y una interfaz modular **Glassmorphism** con soporte para modo **Cristal Claro / Cristal Oscuro**.

---

## Características Principales

- **Motor Determinista de Reglas de Negocio (RN-01 a RN-05)**:
  - **RN-01 (`TaskValidationException` / `TDD-T02`)**: Prohibición de crear o actualizar tareas con `fechaVencimiento` en el pasado.
  - **RN-02 (`IllegalStateException` / `TaskValidationException` / `TDD-T03`)**: Las tareas en estado terminal (`COMPLETADA` o `CANCELADA`) no pueden reabrirse a `PENDIENTE` ni `EN_PROCESO` (`IN_PROCESS`).
  - **RN-03 (`ScheduleConflictException` / `TDD-C02` & `TDD-C03`)**: Detección determinista de colisiones horarias `(NuevoInicio < ExistenteFin) && (NuevoFin > ExistenteInicio)` para compromisos en estado `PROGRAMADO` o `CONFIRMADO`, permitiendo bloques contiguos exactos (`Boundary Touch`) y liberando el bloque automáticamente al cancelar.
  - **RN-04 (`IllegalArgumentException` / `CommitmentValidationException` / `TDD-C04`)**: Validación estricta de `fechaFin > fechaInicio` y duración mínima de **15 minutos**.
  - **RN-05 (`CommitmentValidationException` / `TDD-C05`)**: Validación de mínimo 1 participante (creador) y cumplimiento del estándar **RFC 5322** en todos los correos electrónicos.
- **Suite de Pruebas Unitarias TDD (100% Cobertura)**:
  - `TaskServiceTest` (`TDD-T01` a `TDD-T05`) y `CommitmentServiceTest` (`TDD-C01` a `TDD-C05`) sobre repositorios `MockTaskRepository` y `MockCommitmentRepository` aislados y sobre SQLite.
  - Ejecutor interactivo en vivo integrado en la pestaña **Laboratorio SDD & TDD** de la interfaz web (`GET /api/tdd/run`).
- **Interfaz Modular ES6 + Glassmorphism UI**:
  - Validación en tiempo real de solapamientos horarios, duración y chips RFC 5322.
  - Conmutador de tema **Cristal Claro (Alabaster Pearl)** y **Cristal Oscuro (Obsidian Slate)**.

---

## Estructura del Proyecto

```text
├── .github/workflows/ci.yml       # Pipeline CI automatizado para SDD + TDD en GitHub Actions
├── docs/                          # Documentación de Ingeniería (Fases 01 a 05 del Modelo en Cascada)
├── public/                        # Frontend Modular ES6 + Glassmorphism & Vintage CSS
│   ├── css/
│   │   ├── glassmorphism.css
│   │   └── vintage.css
│   ├── js/
│   │   ├── app.js
│   │   └── modules/               # api.js, state.js, validators.js, notifications.js, ui-components.js
│   └── index.html
├── src/
│   ├── contracts/                 # Contratos estrictos en TypeScript (sdd-contracts.ts)
│   ├── database/                  # Conexión SQLite, transacciones y schema.sql
│   ├── domain/                    # Entidades (Task, Commitment), Enums y Excepciones
│   ├── repositories/              # TaskRepository y CommitmentRepository
│   ├── services/                  # TaskService y CommitmentService
│   └── server.js                  # Servidor HTTP y API REST
└── tests/
    ├── run-tests.js               # Suite de verificación integral SDD + SQLite + TDD (11/11)
    └── tdd/                       # Suites Unitarias TDD (mocks.js, run-tdd.js, sdd-tdd-suites.spec.ts)
```

---

## Requisitos y Ejecución

- **Node.js** `>= 22.5.0` (recomendado Node.js 24; usa `node:sqlite` y soporte nativo de TypeScript).

```bash
# Ejecutar la suite integral SDD + SQLite + TDD
npm test

# Ejecutar las suites unitarias TDD (Red -> Green -> Refactor)
npm run test:tdd

# Ejecutar la especificación TDD en TypeScript
npm run test:ts

# Iniciar el servidor web y API REST
npm start
```
