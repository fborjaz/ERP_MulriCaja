/**
 * Handlers IPC para operaciones de base de datos
 * @module electron/ipc/database
 */

import { ipcMain, app } from "electron";
import { join } from "node:path";

/**
 * Registra todos los handlers IPC relacionados con la base de datos
 * @param {Database} db - Instancia de la base de datos SQLite
 */
export function registerDatabaseHandlers(db) {
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

}
