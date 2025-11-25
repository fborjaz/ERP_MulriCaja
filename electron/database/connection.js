/**
 * Módulo de conexión y gestión de base de datos SQLite
 * @module electron/database/connection
 */

import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { app } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Obtiene la ruta de recursos (funciona en desarrollo y compilado)
 * @param {string} relativePath - Ruta relativa al recurso
 * @returns {string} Ruta absoluta al recurso
 */
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    // Aplicación compilada - los recursos están en resources/
    return join(process.resourcesPath, relativePath);
  } else {
    // Modo desarrollo - usar __dirname
    return join(__dirname, "../..", relativePath);
  }
}

/**
 * Inicializa la base de datos SQLite
 * @returns {Database} Instancia de la base de datos
 */
export async function initDatabase() {
  const dbPath = join(app.getPath("userData"), "erp_multicajas.db");
  const isNewDatabase = !existsSync(dbPath);

  const db = new Database(dbPath);

  // SIEMPRE ejecutar el schema completo de IMAXPOS (154 tablas)
  const schemaImaxposPath = getResourcePath("database/schema_imaxpos_complete.sql");

  if (existsSync(schemaImaxposPath)) {
    try {
      const schemaImaxpos = readFileSync(schemaImaxposPath, "utf8");
      db.exec(schemaImaxpos);
      console.log("✅ Schema IMAXPOS completo ejecutado (154 tablas)");
      console.log("   📦 Desde:", schemaImaxposPath);
    } catch (error) {
      console.error("❌ Error ejecutando schema_imaxpos_complete.sql:", error);
      console.error("   Intentando con schema.sql fallback...");
      
      // Fallback al schema básico
      const schemaPath = getResourcePath("database/schema.sql");
      if (existsSync(schemaPath)) {
        try {
          const schema = readFileSync(schemaPath, "utf8");
          db.exec(schema);
          console.log("✅ Schema básico ejecutado (fallback)");
        } catch (fallbackError) {
          console.error("❌ Error ejecutando schema.sql:", fallbackError);
          // Fallback final a init.js
          try {
            const initPath = getResourcePath("database/init.js");
            if (existsSync(initPath)) {
              const { default: initDb } = await import(initPath);
              initDb(db);
              console.log("✅ Base de datos inicializada con init.js");
            }
          } catch (initError) {
            console.error("❌ Error en init.js:", initError);
          }
        }
      }
    }
  } else {
    console.log("⚠️ schema_imaxpos_complete.sql no encontrado");
    console.log("   Intentando con schema.sql...");
    
    // Fallback al schema básico
    const schemaPath = getResourcePath("database/schema.sql");
    if (existsSync(schemaPath)) {
      try {
        const schema = readFileSync(schemaPath, "utf8");
        db.exec(schema);
        console.log("✅ Schema básico ejecutado");
      } catch (error) {
        console.error("❌ Error ejecutando schema.sql:", error);
        // Fallback final a init.js
        try {
          const initPath = getResourcePath("database/init.js");
          if (existsSync(initPath)) {
            const { default: initDb } = await import(initPath);
            initDb(db);
          }
        } catch (initError) {
          console.error("❌ Error cargando init.js:", initError);
        }
      }
    } else {
      console.log("⚠️ Ningún schema encontrado, usando init.js");
      try {
        const initPath = getResourcePath("database/init.js");
        if (existsSync(initPath)) {
          const { default: initDb } = await import(initPath);
          initDb(db);
        }
      } catch (error) {
        console.error("❌ Error cargando init.js:", error);
      }
    }
  }

  // Ejecutar tablas adicionales (siempre, usan CREATE TABLE IF NOT EXISTS)
  const tablasAdicionales = getResourcePath("database/tablas-adicionales.sql");
  const tablasCotizaciones = getResourcePath(
    "database/tablas-cotizaciones.sql"
  );
  const tablasContabilidad = getResourcePath(
    "database/tablas-contabilidad-rd.sql"
  );

  try {
    if (existsSync(tablasAdicionales)) {
      const adicionales = readFileSync(tablasAdicionales, "utf8");
      db.exec(adicionales);
      console.log("✅ Tablas adicionales ejecutadas");
    }

    if (existsSync(tablasCotizaciones)) {
      const cotizaciones = readFileSync(tablasCotizaciones, "utf8");
      db.exec(cotizaciones);
      console.log("✅ Tablas de cotizaciones ejecutadas");
    }

    if (existsSync(tablasContabilidad)) {
      const contabilidad = readFileSync(tablasContabilidad, "utf8");
      db.exec(contabilidad);
      console.log("✅ Tablas de contabilidad ejecutadas");
    }
  } catch (error) {
    // Ignorar errores de tablas ya existentes
    console.log("⚠️ Algunas tablas adicionales ya existen:", error.message);
  }

  // Ejecutar migraciones (crear tablas que puedan faltar)
  try {
    const migrationsPath = getResourcePath("database/migrations");
    if (existsSync(migrationsPath)) {
      const migrations = readdirSync(migrationsPath)
        .filter(f => f.endsWith('.sql'))
        .sort();
      
      for (const migration of migrations) {
        try {
          const migrationPath = join(migrationsPath, migration);
          const migrationSQL = readFileSync(migrationPath, "utf8");
          db.exec(migrationSQL);
          console.log(`✅ Migración ejecutada: ${migration}`);
        } catch (error) {
          // Ignorar errores de tablas ya existentes
          console.log(`⚠️ Migración ${migration} (tablas pueden existir):`, error.message);
        }
      }
    }
  } catch (error) {
    console.log("⚠️ Error ejecutando migraciones:", error.message);
  }

  // Verificar tablas críticas de IMAXPOS (incluyendo sincronización)
  const criticalTables = [
    "venta",
    "cliente",
    "producto",
    "usuario",
    "caja",
    "local",
    "moneda",
    "sync_config",
    "sync_metadata",
    "sync_log",
    "sync_conflicts",
  ];
  const existingTables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all();
  const existingTableNames = existingTables.map((t) => t.name);

  const missingTables = criticalTables.filter(
    (table) => !existingTableNames.includes(table)
  );

  if (missingTables.length > 0) {
    console.error("❌ TABLAS CRÍTICAS FALTANTES:", missingTables.join(", "));
    console.error("📋 Tablas existentes:", existingTableNames.join(", "));
  } else {
    console.log("✅ Todas las tablas críticas verificadas");
  }

  // Asegurar que las tablas de sincronización existan
  try {
    const ensureSyncTablesPath = getResourcePath("database/ensure-sync-tables.js");
    if (existsSync(ensureSyncTablesPath)) {
      const { default: ensureSyncTables } = await import(ensureSyncTablesPath);
      ensureSyncTables(db);
    }
  } catch (error) {
    console.log("⚠️ Error ejecutando ensure-sync-tables:", error.message);
    // Intentar crear las tablas directamente
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS sync_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          api_url TEXT NOT NULL,
          empresa_id INTEGER,
          auth_token TEXT,
          auto_sync INTEGER DEFAULT 1,
          sync_interval INTEGER DEFAULT 300,
          last_successful_sync DATETIME,
          enabled INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS sync_metadata (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL UNIQUE,
          last_sync DATETIME,
          sync_status TEXT DEFAULT 'pending',
          total_records INTEGER DEFAULT 0,
          synced_records INTEGER DEFAULT 0,
          error_message TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sync_type TEXT NOT NULL,
          table_name TEXT,
          operation TEXT,
          record_id INTEGER,
          status TEXT,
          error_message TEXT,
          started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME
        );
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          local_data TEXT,
          remote_data TEXT,
          resolution TEXT,
          resolved INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME
        );
      `);
      console.log("✅ Tablas de sincronización creadas (fallback)");
    } catch (createError) {
      console.error("❌ Error creando tablas de sincronización:", createError.message);
    }
  }

  // Configurar WAL mode para mejor rendimiento
  db.pragma("journal_mode = WAL");

  console.log("Base de datos inicializada:", dbPath);
  return db;
}

export { getResourcePath };
