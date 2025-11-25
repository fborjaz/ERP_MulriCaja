/**
 * Proceso Principal de Electron - ERP Multicajas RD
 * @module main
 */

const { app, BrowserWindow } = require("electron");
const path = require("path");
const Store = require("electron-store");

// Importar módulos
const { initDatabase } = require("./database/connection");
const { registerDatabaseHandlers } = require("./ipc/database");
const { registerBackupHandlers } = require("./ipc/backup");
const { registerConfigHandlers } = require("./ipc/config");
const { registerExportHandlers } = require("./ipc/export");
const { registerSyncHandlers } = require("./ipc/sync");

// Importar handlers de sincronización con manejo de errores
let registerSyncHandlers;
try {
  const syncModule = require("./ipc/sync");
  registerSyncHandlers = syncModule.registerSyncHandlers;
  console.log('✅ Módulo de sincronización cargado correctamente');
} catch (error) {
  console.error('❌ Error cargando módulo de sincronización:', error);
  // Crear función dummy para evitar errores
  registerSyncHandlers = () => {
    console.warn('⚠️ Handlers de sincronización no disponibles');
  };
}

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
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, "../../assets", "icon.png"),
    show: false,
    titleBarStyle: "default",
  });

  // Cargar aplicación
  mainWindow.loadFile(path.join(__dirname, "../../index.html"));

  // Mostrar cuando esté listo
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Abrir DevTools en desarrollo
    if (process.argv.includes("--dev")) {
      mainWindow.webContents.openDevTools();
    }
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
app.whenReady().then(() => {
  // Configurar auto-inicio
  setupAutoStart();

  // Inicializar base de datos
  db = initDatabase();

  // Registrar handlers IPC
  registerDatabaseHandlers(db);
  registerBackupHandlers(db, setDb);
  registerConfigHandlers(store);
  registerExportHandlers();
<<<<<<< HEAD
  
  // Registrar handlers de sincronización
  try {
    registerSyncHandlers(db);
    console.log('✅ Handlers de sincronización registrados exitosamente');
  } catch (error) {
    console.error('❌ Error registrando handlers de sincronización:', error);
  }
=======
  registerSyncHandlers(db);
>>>>>>> 746344c3d9225b087f0aa8ef4645a7e89f400809

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
