/**
 * Preload Script - Expone APIs de forma segura al renderer
 * @module preload
 */

import { contextBridge, ipcRenderer } from "electron";

// Exponer API al renderer de forma segura
contextBridge.exposeInMainWorld("api", {
  // Base de datos
  dbQuery: (sql, params) => ipcRenderer.invoke("db-query", sql, params),
  dbExec: (sql) => ipcRenderer.invoke("db-exec", sql),
  dbBackup: () => ipcRenderer.invoke("db-backup"),
  dbRestore: (backupPath) => ipcRenderer.invoke("db-restore", backupPath),

  // Configuración
  configGet: (key) => ipcRenderer.invoke("config-get", key),
  configSet: (key, value) => ipcRenderer.invoke("config-set", key, value),

  // Auto-inicio
  autostartEnable: () => ipcRenderer.invoke("autostart-enable"),
  autostartDisable: () => ipcRenderer.invoke("autostart-disable"),
  autostartGet: () => ipcRenderer.invoke("autostart-get"),

  // Exportación
  exportPdf: (tipo, datos, opciones) =>
    ipcRenderer.invoke("export-pdf", tipo, datos, opciones),
  exportExcel: (tipo, datos, opciones) =>
    ipcRenderer.invoke("export-excel", tipo, datos, opciones),

  // Sincronización
  syncFull: () => ipcRenderer.invoke("sync-full"),
  syncPull: () => ipcRenderer.invoke("sync-pull"),
  syncPush: () => ipcRenderer.invoke("sync-push"),
  syncCheckConnection: () => ipcRenderer.invoke("sync-check-connection"),
  syncGetStats: () => ipcRenderer.invoke("sync-get-stats"),
  syncConfigure: (config) => ipcRenderer.invoke("sync-configure", config),
  syncGetConfig: () => ipcRenderer.invoke("sync-get-config"),
  syncGetLog: (limit) => ipcRenderer.invoke("sync-get-log", limit),
  syncGetConflicts: () => ipcRenderer.invoke("sync-get-conflicts"),
  syncResolveConflict: (conflictId, resolution) => 
    ipcRenderer.invoke("sync-resolve-conflict", conflictId, resolution),
  syncCleanLog: (days) => ipcRenderer.invoke("sync-clean-log", days),

  // Sistema
  getSystemInfo: () => ipcRenderer.invoke("get-system-info"),
  appQuit: () => ipcRenderer.send("app-quit"),
});
