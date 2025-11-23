/**
 * Handlers IPC para exportación de documentos
 * @module electron/ipc/export
 */

import { ipcMain } from "electron";

/**
 * Registra handlers IPC para exportación
 */
export function registerExportHandlers() {
  // Handler para exportación PDF
  ipcMain.handle("export-pdf", async (event, tipo, datos, opciones) => {
    try {
      // Nota: jsPDF se usará en el renderer, no en el main process
      // Este handler puede ser usado para operaciones del lado del servidor si es necesario
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handler para exportación Excel
  ipcMain.handle("export-excel", async (event, tipo, datos, opciones) => {
    try {
      // Nota: XLSX se usará en el renderer, no en el main process
      // Este handler puede ser usado para operaciones del lado del servidor si es necesario
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}
