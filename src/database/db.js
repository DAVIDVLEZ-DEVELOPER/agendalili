/**
 * Capa de Conexión, Migración Automática y Transacciones SQLite
 * Lee y ejecuta el esquema relacional desde `src/database/schema.sql`
 */

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'agenda_vintage.sqlite');
const SCHEMA_SQL_PATH = path.join(__dirname, 'schema.sql');

/**
 * @typedef {object} SqliteStatement
 * @property {(...params: any[]) => any} run
 * @property {(...params: any[]) => any} get
 * @property {(...params: any[]) => any[]} all
 */

/**
 * @typedef {object} SqliteDatabase
 * @property {(sql: string) => void} exec
 * @property {(sql: string) => SqliteStatement} prepare
 * @property {() => void} close
 */

/**
 * Ejecuta una función de forma atómica dentro de una transacción SQLite
 * @template T
 * @param {SqliteDatabase} db
 * @param {() => T} work
 * @returns {T}
 */
function runInTransaction(db, work) {
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const result = work();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignorar si la transacción ya fue revertida por SQLite
    }
    throw err;
  }
}

/**
 * Verifica y aplica migraciones incrementales sobre bases de datos existentes
 * @param {SqliteDatabase} db
 */
function ensureMigrations(db) {
  const columns = db.prepare(`PRAGMA table_info(commitments)`).all();
  const hasUserId = columns.some((col) => col.name === 'userId');
  if (columns.length > 0 && !hasUserId) {
    db.exec(
      `ALTER TABLE commitments ADD COLUMN userId TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001';`
    );
  }
}

/**
 * Inicializa una instancia de base de datos SQLite y ejecuta las migraciones DDL
 * @param {string} [dbPath] Ruta del archivo SQLite o ':memory:' para pruebas
 * @returns {SqliteDatabase}
 */
function createDatabase(dbPath = DEFAULT_DB_PATH) {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // Asegurar migración previa si la tabla ya existía de una versión anterior
  ensureMigrations(db);

  // Cargar y ejecutar el esquema relacional oficial desde schema.sql
  const schemaSql = fs.readFileSync(SCHEMA_SQL_PATH, 'utf8');
  db.exec(schemaSql);

  return db;
}

module.exports = {
  createDatabase,
  runInTransaction,
  DEFAULT_DB_PATH,
  SCHEMA_SQL_PATH,
};
