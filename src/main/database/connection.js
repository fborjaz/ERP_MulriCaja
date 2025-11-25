/**
 * Módulo de conexión y gestión de base de datos SQLite
 * @module main/database/connection
 */

const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

/**
 * Obtiene la ruta de recursos (funciona en desarrollo y compilado)
 * @param {string} relativePath - Ruta relativa al recurso
 * @returns {string} Ruta absoluta al recurso
 */
function getResourcePath(relativePath) {
  if (app.isPackaged) {
    // Aplicación compilada - los recursos están en resources/
    return path.join(process.resourcesPath, relativePath);
  } else {
    // Modo desarrollo - usar __dirname
    return path.join(__dirname, "../../..", relativePath);
  }
}

/**
 * Inicializa la base de datos SQLite
 * @returns {Database} Instancia de la base de datos
 */
function initDatabase() {
  const dbPath = path.join(app.getPath("userData"), "erp_multicajas.db");
  const isNewDatabase = !fs.existsSync(dbPath);

  const db = new Database(dbPath);

  // SIEMPRE ejecutar el schema completo de IMAXPOS (154 tablas)
  const schemaImaxposPath = getResourcePath("database/schema_imaxpos_complete.sql");

  if (fs.existsSync(schemaImaxposPath)) {
    try {
      const schemaImaxpos = fs.readFileSync(schemaImaxposPath, "utf8");
      db.exec(schemaImaxpos);
      console.log("✅ Schema IMAXPOS completo ejecutado (154 tablas)");
      console.log("   📦 Desde:", schemaImaxposPath);
    } catch (error) {
      console.error("❌ Error ejecutando schema_imaxpos_complete.sql:", error);
      console.error("   Intentando con schema.sql fallback...");
      
      // Fallback al schema básico
      const schemaPath = getResourcePath("database/schema.sql");
      if (fs.existsSync(schemaPath)) {
        try {
          const schema = fs.readFileSync(schemaPath, "utf8");
          db.exec(schema);
          console.log("✅ Schema básico ejecutado (fallback)");
        } catch (fallbackError) {
          console.error("❌ Error ejecutando schema.sql:", fallbackError);
        }
      }
    }
  } else {
    console.log("⚠️ schema_imaxpos_complete.sql no encontrado");
    console.log("   Intentando con schema.sql...");
    
    // Fallback al schema básico
    const schemaPath = getResourcePath("database/schema.sql");
    if (fs.existsSync(schemaPath)) {
      try {
        const schema = fs.readFileSync(schemaPath, "utf8");
        db.exec(schema);
        console.log("✅ Schema básico ejecutado");
      } catch (error) {
        console.error("❌ Error ejecutando schema.sql:", error);
        // Fallback final a init.js
        try {
          const initPath = getResourcePath("database/init.js");
          if (fs.existsSync(initPath)) {
            require(initPath)(db);
            console.log("✅ Base de datos inicializada con init.js");
          }
        } catch (initError) {
          console.error("❌ Error en init.js:", initError);
        }
      }
    } else {
      console.log("⚠️ Ningún schema encontrado, usando init.js");
      try {
        const initPath = getResourcePath("database/init.js");
        if (fs.existsSync(initPath)) {
          require(initPath)(db);
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
    if (fs.existsSync(tablasAdicionales)) {
      const adicionales = fs.readFileSync(tablasAdicionales, "utf8");
      db.exec(adicionales);
      console.log("✅ Tablas adicionales ejecutadas");
    }

    if (fs.existsSync(tablasCotizaciones)) {
      const cotizaciones = fs.readFileSync(tablasCotizaciones, "utf8");
      db.exec(cotizaciones);
      console.log("✅ Tablas de cotizaciones ejecutadas");
    }

    if (fs.existsSync(tablasContabilidad)) {
      const contabilidad = fs.readFileSync(tablasContabilidad, "utf8");
      db.exec(contabilidad);
      console.log("✅ Tablas de contabilidad ejecutadas");
    }
  } catch (error) {
    // Ignorar errores de tablas ya existentes
    console.log("⚠️ Algunas tablas adicionales ya existen:", error.message);
  }

  // Verificar tablas críticas de IMAXPOS
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
    "sync_log"
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

module.exports = { initDatabase, getResourcePath };
