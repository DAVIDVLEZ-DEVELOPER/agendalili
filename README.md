# Agenda SDD — Sistema Modular de Tareas y Compromisos

Sistema de gestión de **Tareas (`Task`)** y **Compromisos (`Commitment`)** desarrollado bajo **Specification-Driven Development (SDD v1.0.0)**, arquitectura limpia en capas (Dominio, Repositorios SQLite Relacionales, Servicios de Aplicación, Contratos TypeScript) y una interfaz modular **Glassmorphism** con soporte para modo **Cristal Claro / Cristal Oscuro** y sistema cromático **Vintage**.

---

## Características Principales

- **Motor Determinista de Reglas de Negocio (RN-01 a RN-05)**:
  - **RN-01 (`TaskValidationException`)**: Prohibición de crear o actualizar tareas con `fechaVencimiento` en el pasado.
  - **RN-02 (`TaskValidationException`)**: Las tareas en estado terminal (`COMPLETADA` o `CANCELADA`) no pueden reabrirse a `PENDIENTE` ni `EN_PROCESO`.
  - **RN-03 (`ScheduleConflictException`)**: Detección determinista de colisiones horarias `(NuevoInicio < ExistenteFin) && (NuevoFin > ExistenteInicio)` para compromisos en estado `PROGRAMADO` o `CONFIRMADO`, liberando el bloque automáticamente al cancelar.
  - **RN-04 (`CommitmentValidationException`)**: Validación estricta de `fechaFin > fechaInicio` y duración mínima de **15 minutos**.
  - **RN-05 (`CommitmentValidationException`)**: Validación de mínimo 1 participante (creador) y cumplimiento del estándar **RFC 5322** en todos los correos electrónicos.
- **Persistencia Relacional en SQLite (`node:sqlite`)**:
  - Esquema transaccional (`tasks`, `task_tags`, `commitments`, `commitment_participants`) con claves foráneas e índices optimizados.
- **Interfaz Modular ES6 + Glassmorphism UI**:
  - Validación en tiempo real de solapamientos horarios, duración y chips RFC 5322.
  - Inspector y simulador interactivo de reglas SDD en vivo.

---

## Estructura del Proyecto

```text
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
    └── run-tests.js               # Suite de pruebas automatizadas (10/10 verificaciones SDD)
```

---

## Requisitos y Ejecución

- **Node.js** `>= 22.5.0` (usa el módulo nativo `node:sqlite` sin dependencias externas pesadas).

```bash
# Ejecutar la suite de pruebas de verificación SDD
npm test

# Iniciar el servidor web y API REST
npm start
```
