/**
 * Handlers IPC para operaciones de base de datos
 * @module ipc/database
 */

const { ipcMain } = require("electron");

/**
 * Registra todos los handlers IPC relacionados con la base de datos
 * @param {Database} db - Instancia de la base de datos SQLite
 */
function registerDatabaseHandlers(db) {
  // Handler para consultas SQL
  ipcMain.handle("db-query", async (event, sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith("SELECT")) {
        return stmt.all(params);
      } else {
        return stmt.run(params);
      }
    } catch (error) {
      console.error("Error en query:", error);
      throw error;
    }
  });

  // Handler para ejecución de scripts SQL
  ipcMain.handle("db-exec", async (event, sql) => {
    try {
      return db.exec(sql);
    } catch (error) {
      console.error("Error en exec:", error);
      throw error;
    }
  });

  // Handler para obtener información del sistema
  ipcMain.handle("get-system-info", () => {
    const { app } = require("electron");
    const path = require("path");

    return {
      platform: process.platform,
      version: app.getVersion(),
      userData: app.getPath("userData"),
      dbPath: path.join(app.getPath("userData"), "erp_multicajas.db"),
    };
  });
}

module.exports = { registerDatabaseHandlers };
