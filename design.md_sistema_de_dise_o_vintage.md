Actúa como un diseñador UI/UX senior con experiencia en identidad visual retro, sistemas de color para interfaces web y desarrollo front-end con JavaScript vanilla. Tu objetivo es entregar, en una sola respuesta, la interfaz completa de un gestor de tareas y compromisos con estética vintage, construida con **Node.js**, **JavaScript vanilla**, **Bootstrap** y **SQLite** como stack tecnológico.

## Metodología obligatoria: modelo en cascada

Antes de escribir código, recorre las fases del ciclo de vida de desarrollo de software en cascada, en orden estricto: requisitos, diseño, implementación, verificación y mantenimiento. Usa como fuentes los dos documentos activos del proyecto, **sdd-agenda-tareas** y **design.md**, que adjuntaré al usar este prompt. Cada fase debe cerrarse antes de pasar a la siguiente, y las decisiones de cada fase deben quedar reflejadas en el resultado final. Lee ambos archivos completos antes de diseñar y referencia en tu respuesta las decisiones que tomes a partir de ellos.

## Paleta de color y proporción

Usa exclusivamente estos tonos pastel, definidos como variables CSS (sustituye los colores originales por la paleta siguiente):

```css
:root {
  --pastel-1: #F4C2C2;
  --pastel-2: #D7BDE2;
  --pastel-3: #A7D8E8;
  --pastel-4: #FFF3B0;
  --pastel-5: #B5EAD7;
  --blanco: #FFFFFF;
}
```

El blanco (`--blanco`) debe ocupar aproximadamente el 60% de la superficie visual. Los cinco pasteles reparten el 40% restante como acentos en botones, encabezados, tarjetas destacadas, iconos, etiquetas y bordes; ningún pastel debe dominar sobre el blanco. Verifica esta proporción antes de entregar y ajusta si es necesario.

## Modelo de dominio a representar

**Tarea (Task):** `id` (UUID, requerido, único); `titulo` (texto, requerido, máx. 100 caracteres); `descripcion` (texto, opcional, máx. 500 caracteres); `fechaVencimiento` (fecha y hora, requerido); `prioridad` (BAJA, MEDIA, ALTA, CRITICA); `estado` (PENDIENTE, EN_PROCESO, COMPLETADA, CANCELADA); `etiquetas` (lista opcional, p. ej. "Trabajo", "Personal").

**Compromiso (Commitment):** `id` (UUID, requerido, único); `titulo` (texto, requerido, máx. 100 caracteres); `descripcion` (texto, opcional); `fechaInicio` (fecha y hora, requerido); `fechaFin` (fecha y hora, requerido, posterior a `fechaInicio`); `ubicacion` (opcional, enlace virtual o dirección física); `participantes` (lista de correos, mínimo 1, incluido el creador); `estado` (PROGRAMADO, CONFIRMADO, CANCELADO); `minutosRecordatorio` (entero, por defecto 15).

La interfaz debe reflejar estos campos y restricciones: los estados y prioridades deben distinguirse visualmente entre sí; los campos con límite de caracteres deben mostrar el contador y respetarlo en el formulario; y la validación de `fechaFin > fechaInicio` debe ser evidente para el usuario mediante un mensaje claro en el formulario.

## Estética vintage

Aplica un estilo retro mediante tipografías serif de corte clásico, bordes redondeados suaves o líneas finas tipo papel antiguo, sombras discretas, texturas sutiles y ornamentos geométricos de época. Estos recursos no deben competir con la proporción de color. Cuida el contraste de texto sobre los fondos pastel, que la interfaz sea responsive y que los estados de hover y foco sean visibles y mantengan la paleta.

## Entrega

Entrega el código organizado en una estructura de proyecto con Node.js (servidor y persistencia en SQLite), JavaScript vanilla en el cliente, Bootstrap para la base de componentes y CSS propio con `var()` para la paleta. Incluye el esquema de la base de datos para tareas y compromisos, las rutas necesarias y la lógica de validación tanto en servidor como en cliente. Antes de presentar el código, confirma brevemente cómo cada fase de la cascada se refleja en el resultado.