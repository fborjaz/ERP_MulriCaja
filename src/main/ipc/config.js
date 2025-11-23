/**
 * Handlers IPC para configuración de la aplicación
 * @module ipc/config
 */

const { ipcMain, app } = require("electron");

/**
 * Registra handlers IPC para configuración
 * @param {Store} store - Instancia de electron-store
 */
function registerConfigHandlers(store) {
  // Obtener configuración
  ipcMain.handle("config-get", (event, key) => {
    return store.get(key);
  });

  // Establecer configuración
  ipcMain.handle("config-set", (event, key, value) => {
    store.set(key, value);
    return true;
  });

  // Auto-run (ejecutar al iniciar Windows)
  ipcMain.handle("autostart-enable", () => {
    app.setLoginItemSettings({
      openAtLogin: true,
      name: "ERP Multicajas RD",
      path: process.execPath,
      args: [],
    });
    store.set("autostart_configured", true);
    return true;
  });

  ipcMain.handle("autostart-disable", () => {
    app.setLoginItemSettings({
      openAtLogin: false,
    });
    store.set("autostart_configured", false);
    return true;
  });

  ipcMain.handle("autostart-get", () => {
    return app.getLoginItemSettings();
  });

  // Cerrar aplicación
  ipcMain.on("app-quit", () => {
    app.quit();
  });
}

module.exports = { registerConfigHandlers };
