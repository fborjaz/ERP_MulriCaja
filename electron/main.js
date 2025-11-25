/**
 * Proceso Principal de Electron - ERP Multicajas RD
 * @module main
 */

import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Store from "electron-store";

// Importar módulos
import { initDatabase } from "./database/connection.js";
import { registerDatabaseHandlers } from "./ipc/database.js";
import { registerBackupHandlers } from "./ipc/backup.js";
import { registerConfigHandlers } from "./ipc/config.js";
import { registerExportHandlers } from "./ipc/export.js";

// Importar handlers de sincronización
let registerSyncHandlers;
try {
  const syncModule = await import("./ipc/sync.js");
  registerSyncHandlers = syncModule.registerSyncHandlers;
  console.log('✅ Módulo de sincronización cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando módulo de sincronización:', error);
  // Crear función dummy para evitar errores
  registerSyncHandlers = () => {
    console.warn('⚠️ Handlers de sincronización no disponibles');
  };
}

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar store
const store = new Store();

// Variables globales
let mainWindow;
let db;

/**
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    icon: join(__dirname, "../../assets/icon.png"),
    show: false,
    titleBarStyle: "default",
  });

  // Cargar aplicación
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  // Mostrar cuando esté listo
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * Configura el auto-inicio en Windows
 */
function setupAutoStart() {
  const autoRunConfig = store.get("autostart_configured", false);
  if (!autoRunConfig && process.platform === "win32") {
    try {
      app.setLoginItemSettings({
        openAtLogin: true,
        name: "ERP Multicajas RD",
        path: process.execPath,
        args: [],
      });
      store.set("autostart_configured", true);
      console.log("✅ Auto-run activado automáticamente");
    } catch (error) {
      console.error("Error activando auto-run:", error);
    }
  }
}

/**
 * Función para actualizar la instancia de DB (usado por backup/restore)
 */
function setDb(newDb) {
  db = newDb;
}

// Inicializar cuando Electron esté listo
app.whenReady().then(async () => {
  // Configurar auto-inicio
  setupAutoStart();

  // Inicializar base de datos
  db = await initDatabase();

  // Registrar handlers IPC
  registerDatabaseHandlers(db);
  registerBackupHandlers(db, setDb);
  registerConfigHandlers(store);
  registerExportHandlers();
  
  // Registrar handlers de sincronización
  try {
    await registerSyncHandlers(db);
    console.log('✅ Handlers de sincronización registrados exitosamente');
  } catch (error) {
    console.error('❌ Error registrando handlers de sincronización:', error);
  }

  // Crear ventana
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Cerrar cuando todas las ventanas estén cerradas
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) {
      db.close();
    }
    app.quit();
  }
});

// Cerrar base de datos antes de salir
app.on("before-quit", () => {
  if (db) {
    db.close();
  }
});
