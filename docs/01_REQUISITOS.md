# Fase 1: Ingeniería de Requisitos (Modelo en Cascada)

**Proyecto:** Sistema de Agenda de Tareas y Compromisos (Estética Vintage)  
**Fuentes Base:** `sdd-agenda-tareas.md` (v1.0.0) y `design.md_sistema_de_dise_o_vintage.md`  
**Estado de la Fase:** CERRADA Y APROBADA

---

## 1. Requisitos del Dominio de Datos

### 1.1 Entidad: Tarea (`Task`)
| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | `UUID` | Requerido, Único, generado automáticamente (UUID v4). |
| `titulo` | `String` | Requerido, longitud máxima de **100 caracteres**. |
| `descripcion` | `String` | Opcional, longitud máxima de **500 caracteres**. |
| `fechaVencimiento` | `DateTime` (ISO 8601) | Requerido, debe ser futura al momento de creación/actualización (**RN-01**). |
| `prioridad` | `Enum` | Requerido: `BAJA`, `MEDIA`, `ALTA`, `CRITICA`. |
| `estado` | `Enum` | Requerido: `PENDIENTE`, `EN_PROCESO`, `COMPLETADA`, `CANCELADA`. |
| `etiquetas` | `List<String>` | Opcional (ej. `["Trabajo", "Personal"]`), almacenado como JSON en SQLite. |

### 1.2 Entidad: Compromiso (`Commitment`)
| Campo | Tipo | Restricciones |
|---|---|---|
| `id` | `UUID` | Requerido, Único, generado automáticamente (UUID v4). |
| `titulo` | `String` | Requerido, longitud máxima de **100 caracteres**. |
| `descripcion` | `String` | Opcional. |
| `fechaInicio` | `DateTime` (ISO 8601) | Requerido. |
| `fechaFin` | `DateTime` (ISO 8601) | Requerido, estrictamente posterior a `fechaInicio` (`fechaFin > fechaInicio`) y con duración mínima de 15 minutos (**RN-04**). |
| `ubicacion` | `String` | Opcional (enlace virtual o dirección física). |
| `participantes` | `List<String>` | Requerido, mínimo 1 correo (incluido el creador), formato RFC 5322 (**RN-05**). |
| `estado` | `Enum` | Requerido: `PROGRAMADO`, `CONFIRMADO`, `CANCELADO`. |
| `minutosRecordatorio` | `Integer` | Valor por defecto: `15`. |

---

## 2. Reglas de Negocio Estrictas (RF-RN)

- **RN-01 (Validación de Fechas de Tareas):** No se permite crear ni actualizar una tarea cuya `fechaVencimiento` esté en el pasado respecto al instante actual (`now`). Lanza `TaskValidationException`.
- **RN-02 (Transiciones de Estado de Tarea):** Una tarea en estado terminal (`COMPLETADA` o `CANCELADA`) tiene prohibido transicionar a `EN_PROCESO` o `PENDIENTE`. Lanza `TaskValidationException`.
- **RN-03 (Sin Solapamiento de Compromisos):** No se permite agendar un compromiso que se traslape en horario con otro compromiso existente en estado `PROGRAMADO` o `CONFIRMADO` para el mismo usuario/creador. Condición de traslape: `(NuevoInicio < ExistenteFin) && (NuevoFin > ExistenteInicio)`. Lanza `ScheduleConflictException`.
- **RN-04 (Duración Mínima de Compromiso):** `fechaFin` debe ser posterior a `fechaInicio` y la diferencia `(fechaFin - fechaInicio)` debe ser de al menos **15 minutos**.
- **RN-05 (Validación de Participantes):** La lista de `participantes` debe contener al menos 1 correo electrónico y todos deben cumplir con el estándar **RFC 5322**.

---

## 3. Requisitos No Funcionales y de Diseño Visual (RNF)

- **RNF-01 (Stack Tecnológico):** Node.js, SQLite, JavaScript Vanilla (ES6+) en cliente, Bootstrap 5 y hoja de estilos CSS personalizada con variables nativas `var()`.
- **RNF-02 (Paleta de Color y Proporción 60/40):**
  - `--blanco: #FFFFFF` (~60% de la superficie visual: fondo principal, interior de tarjetas, contenedores de lectura y tablas).
  - `--pastel-1: #F4C2C2` (Rosa empolvado vintage - acentos críticos/cancelados y ornamentos).
  - `--pastel-2: #D7BDE2` (Lavanda retro - acentos de compromisos, etiquetas y bordes activos).
  - `--pastel-3: #A7D8E8` (Azul cielo antiguo - acentos informativos, estado en proceso/programado).
  - `--pastel-4: #FFF3B0` (Crema/amarillo mantequilla - alertas suaves, prioridad media/alta, encabezados secundarios).
  - `--pastel-5: #B5EAD7` (Verde menta pastel - estados completados/confirmados, prioridad baja y acciones primarias).
- **RNF-03 (Estética Vintage y Usabilidad):** Tipografía serif clásica (`Playfair Display`, `Lora`, `Georgia`), bordes finos tipo papel de época, contadores de caracteres en vivo (`100` y `500`), diferenciación visual clara de prioridades y estados, y validación en vivo de `fechaFin > fechaInicio`.

