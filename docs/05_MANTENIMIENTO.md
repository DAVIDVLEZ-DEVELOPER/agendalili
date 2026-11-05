# Fase 5: Mantenimiento y Operación (Modelo en Cascada)

**Proyecto:** Sistema de Agenda de Tareas y Compromisos (Estética Vintage)  
**Entrada:** `docs/04_VERIFICACION.md`  
**Estado de la Fase:** CERRADA Y EN OPERACIÓN

---

## 1. Manual de Operación y Ejecución

### Iniciar el Servidor en Producción / Desarrollo Local
```bash
node src/server.js
```
El servidor queda disponible en `http://localhost:3000` (o en el puerto definido en la variable de entorno `PORT`) e inicializa automáticamente la base de datos SQLite en `data/agenda_vintage.sqlite` en modo `WAL` (Write-Ahead Logging).

### Ejecutar la Suite de Verificación Automatizada
```bash
node tests/run-tests.js
```

---

## 2. Plan de Mantenimiento (Correctivo, Adaptativo y Perfectivo)

1. **Mantenimiento de Persistencia SQLite:**
   - La base de datos se almacena en `data/agenda_vintage.sqlite` con integridad transaccional ACID y `PRAGMA journal_mode = WAL`.
   - Para realizar copias de seguridad en frío o caliente, basta con respaldar el archivo `data/agenda_vintage.sqlite`.
2. **Mantenimiento Evolutivo de Reglas de Negocio:**
   - Gracias al aislamiento de capas (`Domain` -> `Repository` -> `Service` -> `HTTP Server`), cualquier nueva regla de negocio (`RN-06+`) se incorpora en `TaskService` o `CommitmentService` sin alterar el esquema de persistencia ni el cliente web.
3. **Mantenimiento del Sistema de Diseño Vintage:**
   - Todos los tokens de color residen centralizados en `:root` dentro de `public/css/vintage.css` (`--blanco` y `--pastel-1` a `--pastel-5`), garantizando la conservación de la proporción 60/40 ante nuevos componentes.

