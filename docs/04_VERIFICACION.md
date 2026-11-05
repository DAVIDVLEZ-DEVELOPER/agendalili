# Fase 4: Verificación y Validación (Modelo en Cascada)

**Proyecto:** Sistema de Agenda de Tareas y Compromisos (Estética Vintage)  
**Entrada:** `docs/03_IMPLEMENTACION.md` y suite ejecutable `tests/run-tests.js`  
**Estado de la Fase:** CERRADA Y VERIFICADA (8/8 Pruebas Aprobadas)

---

## 1. Matriz de Verificación de Reglas de Negocio y Contratos SDD

| Identificador | Requisito / Regla Verificada | Método de Prueba | Resultado |
|---|---|---|---|
| **RN-01** | Rechazo de `fechaVencimiento` en el pasado al crear/actualizar tarea (`TaskValidationException`). | Prueba automatizada en `tests/run-tests.js` + validación en `app.js`. | **APROBADO** |
| **RN-02** | Prohibición de transicionar de `COMPLETADA` o `CANCELADA` hacia `EN_PROCESO` o `PENDIENTE` (`TaskValidationException`). | Prueba automatizada + bloqueo visual de opciones `<option disabled>` en UI. | **APROBADO** |
| **RN-03** | Detección de solapamiento `(NuevoInicio < ExistenteFin) && (NuevoFin > ExistenteInicio)` para compromisos `PROGRAMADO` o `CONFIRMADO` (`ScheduleConflictException`). | Prueba automatizada + endpoint `/api/commitments/conflict-check`. | **APROBADO** |
| **RN-04** | Validación `fechaFin > fechaInicio` y duración mínima de 15 minutos en compromisos. | Prueba automatizada + alerta dinámica en formulario (`#commDateRangeAlert`). | **APROBADO** |
| **RN-05** | Lista de participantes con mínimo 1 correo válido conforme a RFC 5322. | Prueba automatizada + validación regex en cliente y servidor. | **APROBADO** |
| **Límites de Dominio** | Contadores y restricción `<= 100` en títulos y `<= 500` en descripción de tarea + `CHECK` en SQLite. | Prueba automatizada + contadores en vivo (`0 / 100`, `0 / 500`). | **APROBADO** |
| **Proporción 60/40** | `--blanco: #FFFFFF` al 60% de la superficie visual y 40% repartido entre `--pastel-1` a `--pastel-5`. | Auditoría de superficie CSS y barra de proporción en cabecera. | **APROBADO** |

