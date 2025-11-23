/**
 * Módulo de conexión y gestión de base de datos SQLite
 * @module electron/database/connection
 */

import Database from "better-sqlite3";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
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

  // SIEMPRE ejecutar el schema principal (usa CREATE TABLE IF NOT EXISTS)
  const schemaPath = getResourcePath("database/schema.sql");

  if (existsSync(schemaPath)) {
    try {
      const schema = readFileSync(schemaPath, "utf8");
      db.exec(schema);
      console.log("✅ Schema principal ejecutado desde:", schemaPath);
    } catch (error) {
      console.error("❌ Error ejecutando schema.sql:", error);
      // Fallback a init.js
      try {
        const initPath = getResourcePath("database/init.js");
        if (existsSync(initPath)) {
          const { default: initDb } = await import(initPath);
          initDb(db);
        }
      } catch (initError) {
        console.error("❌ Error en init.js:", initError);
      }
    }
  } else {
    console.log("⚠️ schema.sql no encontrado, usando init.js");
    // Crear base de datos básica usando init.js
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

  // Verificar tablas críticas
  const criticalTables = [
    "ventas",
    "clientes",
    "productos",
    "categorias",
    "usuarios",
    "cajas",
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

  // Configurar WAL mode para mejor rendimiento
  db.pragma("journal_mode = WAL");

  console.log("Base de datos inicializada:", dbPath);
  return db;
}

export { getResourcePath };
