/**
 * Handlers IPC para backup y restauración de base de datos
 * @module ipc/backup
 */

const { ipcMain, app } = require("electron");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

/**
 * Registra handlers IPC para backup y restore
 * @param {Database} db - Instancia de la base de datos SQLite
 * @param {Function} setDb - Función para actualizar la instancia de DB
 */
function registerBackupHandlers(db, setDb) {
  // Backup de base de datos
  ipcMain.handle("db-backup", async () => {
    try {
      const dbPath = path.join(app.getPath("userData"), "erp_multicajas.db");
      const backupDir = path.join(app.getPath("userData"), "backups");

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = path.join(backupDir, `backup-${timestamp}.db`);

      fs.copyFileSync(dbPath, backupPath);

      // Mantener solo los últimos 10 backups
      const backups = fs
        .readdirSync(backupDir)
        .filter((f) => f.startsWith("backup-"))
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(backupDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      if (backups.length > 10) {
        backups.slice(10).forEach((b) => {
          fs.unlinkSync(path.join(backupDir, b.name));
        });
      }

      return { success: true, path: backupPath };
    } catch (error) {
      console.error("Error en backup:", error);
      return { success: false, error: error.message };
    }
  });

  // Restaurar base de datos
  ipcMain.handle("db-restore", async (event, backupPath) => {
    try {
      const dbPath = path.join(app.getPath("userData"), "erp_multicajas.db");

      if (db) {
        db.close();
      }

      fs.copyFileSync(backupPath, dbPath);
      const newDb = new Database(dbPath);
      newDb.pragma("journal_mode = WAL");
      setDb(newDb);

      return { success: true };
    } catch (error) {
      console.error("Error en restore:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerBackupHandlers };
