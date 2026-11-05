/**
 * Servidor HTTP y API REST en Node.js + SQLite
 * Proyecto: Sistema de Agenda de Tareas y Compromisos (Estética Vintage)
 * Fuentes: sdd-agenda-tareas.md y design.md_sistema_de_dise_o_vintage.md
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const { createDatabase, DEFAULT_DB_PATH } = require('./database/db');
const { TaskRepository } = require('./repositories/TaskRepository');
const { CommitmentRepository } = require('./repositories/CommitmentRepository');
const { TaskService } = require('./services/TaskService');
const { CommitmentService } = require('./services/CommitmentService');
const { TaskPriority, TaskStatus, CommitmentStatus } = require('./domain/enums');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Crea datos iniciales demostrativos en caso de que la base de datos esté vacía
 */
function seedInitialDataIfEmpty(taskService, commitmentService) {
  const existingTasks = taskService.getAllTasks();
  const existingCommitments = commitmentService.getAllCommitments();

  if (existingTasks.length === 0) {
    const now = Date.now();
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    const inTwoDays = new Date(now + 48 * 60 * 60 * 1000).toISOString();
    const inThreeDays = new Date(now + 72 * 60 * 60 * 1000).toISOString();
    const inFiveDays = new Date(now + 120 * 60 * 60 * 1000).toISOString();

    taskService.createTask({
      titulo: 'Revisar pruebas de imprenta del catálogo otoño-invierno',
      descripcion:
        'Verificar márgenes editoriales, contraste tipográfico serif y proporción cromática 60% blanco / 40% tonos pastel.',
      fechaVencimiento: tomorrow,
      prioridad: TaskPriority.CRITICA,
      estado: TaskStatus.EN_PROCESO,
      etiquetas: ['Editorial', 'Diseño', 'Urgente'],
    });

    taskService.createTask({
      titulo: 'Catalogar correspondencia del archivo histórico',
      descripcion:
        'Clasificar las cartas por década y etiquetar cada carpeta con su sello correspondiente.',
      fechaVencimiento: inTwoDays,
      prioridad: TaskPriority.ALTA,
      estado: TaskStatus.PENDIENTE,
      etiquetas: ['Archivo', 'Trabajo'],
    });

    taskService.createTask({
      titulo: 'Adquirir plumas estilográficas y papel verjurado',
      descripcion: 'Visitar la papelería tradicional del centro para reponer tinta sepia y sobres.',
      fechaVencimiento: inThreeDays,
      prioridad: TaskPriority.MEDIA,
      estado: TaskStatus.PENDIENTE,
      etiquetas: ['Personal', 'Compras'],
    });

    taskService.createTask({
      titulo: 'Restauración de encuadernación del tomo III',
      descripcion: 'Entregar ejemplar ya restaurado y sellado en la biblioteca personal.',
      fechaVencimiento: inFiveDays,
      prioridad: TaskPriority.BAJA,
      estado: TaskStatus.COMPLETADA,
      etiquetas: ['Biblioteca', 'Personal'],
    });
  }

  if (existingCommitments.length === 0) {
    const baseDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    baseDate.setHours(10, 0, 0, 0);
    const start1 = new Date(baseDate.getTime());
    const end1 = new Date(baseDate.getTime() + 45 * 60 * 1000);

    const start2 = new Date(baseDate.getTime() + 3 * 60 * 60 * 1000);
    const end2 = new Date(start2.getTime() + 60 * 60 * 1000);

    commitmentService.scheduleCommitment({
      titulo: 'Tertulia de Diseño Tipográfico y Sistemas Retro',
      descripcion: 'Revisión del sistema visual vintage, paleta pastel y contratos del dominio SDD.',
      fechaInicio: start1.toISOString(),
      fechaFin: end1.toISOString(),
      ubicacion: 'Salón de Lectura Principal / https://meet.vintage.org/tertulia',
      participantes: ['clara.valle@editorialvintage.es', 'mateo.solis@editorialvintage.es'],
      estado: CommitmentStatus.CONFIRMADO,
      minutosRecordatorio: 15,
    });

    commitmentService.scheduleCommitment({
      titulo: 'Comité de Curaduría y Planificación Semanal',
      descripcion: 'Coordinación de entregas y validación de compromisos sin solapamiento.',
      fechaInicio: start2.toISOString(),
      fechaFin: end2.toISOString(),
      ubicacion: 'Despacho 204, Edificio Bellas Artes',
      participantes: ['clara.valle@editorialvintage.es', 'elena.roca@archivo.org'],
      estado: CommitmentStatus.PROGRAMADO,
      minutosRecordatorio: 30,
    });
  }
}

/**
 * Lee el cuerpo JSON de una petición HTTP
 */
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1e6) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('El cuerpo de la petición no es un JSON válido.'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Envía una respuesta JSON estandarizada
 */
function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

/**
 * Crea y configura la aplicación HTTP con inyección de base de datos
 * @param {string} [dbPath]
 */
function createApp(dbPath = DEFAULT_DB_PATH, shouldSeed = true) {
  const db = createDatabase(dbPath);
  const taskRepository = new TaskRepository(db);
  const commitmentRepository = new CommitmentRepository(db);
  const taskService = new TaskService(taskRepository);
  const commitmentService = new CommitmentService(commitmentRepository);

  if (shouldSeed) {
    seedInitialDataIfEmpty(taskService, commitmentService);
  }

  const publicDir = path.join(__dirname, '..', 'public');

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;
      const method = req.method.toUpperCase();

      // ==================== RUTAS API: TAREAS ====================
      if (pathname === '/api/tasks' && method === 'GET') {
        const tasks = taskService.getAllTasks();
        return sendJson(res, 200, { ok: true, data: tasks });
      }

      if (pathname === '/api/tasks/overdue' && method === 'GET') {
        const nowParam = parsedUrl.searchParams.get('now') || new Date().toISOString();
        const overdue = taskService.getPendingTasksOverdue(nowParam);
        return sendJson(res, 200, { ok: true, data: overdue });
      }

      if (pathname === '/api/tasks' && method === 'POST') {
        const body = await parseJsonBody(req);
        const created = taskService.createTask(body);
        return sendJson(res, 201, { ok: true, data: created });
      }

      const taskStatusMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/status$/);
      if (taskStatusMatch && method === 'PATCH') {
        const taskId = decodeURIComponent(taskStatusMatch[1]);
        const body = await parseJsonBody(req);
        const updated = taskService.updateTaskStatus(taskId, body.estado);
        return sendJson(res, 200, { ok: true, data: updated });
      }

      const taskItemMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
      if (taskItemMatch && method === 'PUT') {
        const taskId = decodeURIComponent(taskItemMatch[1]);
        const body = await parseJsonBody(req);
        const updated = taskService.updateTask(taskId, body);
        return sendJson(res, 200, { ok: true, data: updated });
      }

      if (taskItemMatch && method === 'DELETE') {
        const taskId = decodeURIComponent(taskItemMatch[1]);
        const deleted = taskService.deleteTask(taskId);
        return sendJson(res, 200, { ok: true, deleted });
      }

      // ==================== RUTAS API: COMPROMISOS ====================
      if (pathname === '/api/commitments' && method === 'GET') {
        const commitments = commitmentService.getAllCommitments();
        return sendJson(res, 200, { ok: true, data: commitments });
      }

      if (pathname === '/api/commitments/conflict-check' && method === 'GET') {
        const userId = parsedUrl.searchParams.get('userId') || '*';
        const start = parsedUrl.searchParams.get('start');
        const end = parsedUrl.searchParams.get('end');
        const hasConflict = commitmentService.hasScheduleConflict(userId, start, end);
        return sendJson(res, 200, { ok: true, hasConflict });
      }

      if (pathname === '/api/commitments' && method === 'POST') {
        const body = await parseJsonBody(req);
        const scheduled = commitmentService.scheduleCommitment(body);
        return sendJson(res, 201, { ok: true, data: scheduled });
      }

      const commitmentCancelMatch = pathname.match(/^\/api\/commitments\/([^/]+)\/cancel$/);
      if (commitmentCancelMatch && method === 'PATCH') {
        const commitmentId = decodeURIComponent(commitmentCancelMatch[1]);
        const cancelled = commitmentService.cancelCommitment(commitmentId);
        return sendJson(res, 200, { ok: true, data: cancelled });
      }

      const commitmentConfirmMatch = pathname.match(/^\/api\/commitments\/([^/]+)\/confirm$/);
      if (commitmentConfirmMatch && method === 'PATCH') {
        const commitmentId = decodeURIComponent(commitmentConfirmMatch[1]);
        const confirmed = commitmentService.confirmCommitment(commitmentId);
        return sendJson(res, 200, { ok: true, data: confirmed });
      }

      const commitmentItemMatch = pathname.match(/^\/api\/commitments\/([^/]+)$/);
      if (commitmentItemMatch && method === 'DELETE') {
        const commitmentId = decodeURIComponent(commitmentItemMatch[1]);
        const deleted = commitmentService.deleteCommitment(commitmentId);
        return sendJson(res, 200, { ok: true, deleted });
      }

      // ==================== ARCHIVOS ESTÁTICOS (FRONTEND) ====================
      const resolvedPublicDir = path.resolve(publicDir);
      const relativeTarget = (pathname === '/' ? '/index.html' : pathname).replace(/^[/\\]+/, '');
      const filePath = path.resolve(resolvedPublicDir, relativeTarget);

      if (
        (filePath === resolvedPublicDir || filePath.startsWith(resolvedPublicDir + path.sep)) &&
        fs.existsSync(filePath) &&
        fs.statSync(filePath).isFile()
      ) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      sendJson(res, 404, { ok: false, error: 'Recurso no encontrado' });
    } catch (error) {
      const statusCode = error.statusCode || 400;
      sendJson(res, statusCode, {
        ok: false,
        error: error.message || 'Error interno en el servidor',
        exceptionType: error.name || 'Error',
        ruleCode: error.ruleCode || 'GENERAL_ERROR',
      });
    }
  });

  return {
    server,
    db,
    taskRepository,
    commitmentRepository,
    taskService,
    commitmentService,
  };
}

if (require.main === module) {
  const initialPort = Number(process.env.PORT) || 3000;
  const { server } = createApp();

  function startListening(port) {
    const onListening = () => {
      server.removeListener('error', onError);
      console.log(`[Agenda SDD] Servidor activo en http://localhost:${port}`);
    };
    const onError = (err) => {
      server.removeListener('listening', onListening);
      if (err.code === 'EADDRINUSE' && !process.env.PORT && port < initialPort + 10) {
        console.warn(`[Agenda SDD] Puerto ${port} ocupado, intentando en puerto ${port + 1}...`);
        startListening(port + 1);
      } else {
        console.error(`[Agenda SDD] Error al iniciar el servidor:`, err.message);
        process.exit(1);
      }
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  }

  startListening(initialPort);
}

module.exports = { createApp };

