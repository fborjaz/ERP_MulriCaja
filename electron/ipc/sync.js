/**
 * IPC Handlers para Sincronización
 * @module main/ipc/sync
 */

import { ipcMain, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Intentar cargar SyncEngine desde diferentes ubicaciones posibles
// Nota: SyncEngine usa CommonJS, así que lo cargamos dinámicamente
// Lo haremos dentro de la función para evitar errores de carga al inicio
let SyncEngine = null;

/**
 * Registra handlers IPC para sincronización
 * @param {Database} db - Instancia de la base de datos
 */
// Variable para almacenar la clase SyncEngine (cargada una vez)
let SyncEngineClass = null;

/**
 * Carga la clase SyncEngine (solo una vez)
 */
async function loadSyncEngineClass() {
  if (SyncEngineClass) {
    return SyncEngineClass;
  }

  // Intentar diferentes rutas posibles
  // El problema es que en producción __dirname apunta a out/main/chunks/
  // Necesitamos encontrar la ruta real del archivo sync-engine.js
  
  const appPath = app.getAppPath();
  const isDev = !app.isPackaged;
  
  // En desarrollo, app.getAppPath() devuelve la ruta del proyecto
  // En producción, devuelve la ruta del .asar o del ejecutable
  const possiblePaths = [];
  
  if (isDev) {
    // Rutas para desarrollo
    // En desarrollo, __dirname puede estar en out/main/chunks/ o en electron/ipc/
    // appPath en desarrollo apunta a la raíz del proyecto (desktop/)
    console.log(`🔍 Desarrollo: __dirname=${__dirname}, appPath=${appPath}, cwd=${process.cwd()}`);
    
    possiblePaths.push(
      // Desde out/main/chunks/sync-*.js -> subir varios niveles
      path.resolve(__dirname, '../../../../database/sync/sync-engine.js'), // out/main/chunks/ -> ../../../../ -> database/sync/
      path.resolve(__dirname, '../../../database/sync/sync-engine.js'), // Alternativa
      path.resolve(__dirname, '../../database/sync/sync-engine.js'), // Otra alternativa
      // Desde appPath (raíz del proyecto en desarrollo)
      path.resolve(appPath, 'database/sync/sync-engine.js'), // Desde app path
      // Desde cwd
      path.resolve(process.cwd(), 'database/sync/sync-engine.js'), // Desde cwd (si estamos en desktop/)
      path.resolve(process.cwd(), 'desktop/database/sync/sync-engine.js') // Desde raíz del proyecto
    );
  } else {
    // Rutas para producción
    // En producción, los recursos extra están en resources/ (fuera del .asar)
    const resourcesPath = process.resourcesPath || path.join(path.dirname(appPath), 'resources');
    possiblePaths.push(
      path.join(resourcesPath, 'database/sync/sync-engine.js'), // Recursos extraídos (PREFERIDO)
      path.join(path.dirname(appPath), 'resources/database/sync/sync-engine.js'), // Alternativa recursos
      path.join(appPath, 'database/sync/sync-engine.js'), // En app.asar (puede no funcionar)
      path.join(path.dirname(appPath), 'database/sync/sync-engine.js') // Junto al ejecutable
    );
  }
  
  // Agregar rutas adicionales que siempre deberían funcionar (útil para debugging)
  const cwd = process.cwd();
  if (cwd && cwd !== appPath) {
    possiblePaths.push(
      path.resolve(cwd, 'database/sync/sync-engine.js'),
      path.resolve(cwd, 'desktop/database/sync/sync-engine.js')
    );
  }
  
  const fs = await import('fs');
  
  // Log de todas las rutas que se intentarán
  console.log(`🔍 Intentando cargar SyncEngine. Modo: ${isDev ? 'DESARROLLO' : 'PRODUCCIÓN'}`);
  console.log(`   __dirname: ${__dirname}`);
  console.log(`   appPath: ${appPath}`);
  console.log(`   process.cwd(): ${process.cwd()}`);
  console.log(`   Rutas a intentar (${possiblePaths.length}):`);
  possiblePaths.forEach((p, i) => console.log(`     ${i + 1}. ${p}`));
  
  for (const tryPath of possiblePaths) {
    try {
      // Normalizar la ruta para evitar problemas con barras
      const normalizedPath = path.normalize(tryPath);
      
      // Verificar si el archivo existe
      if (!fs.existsSync(normalizedPath)) {
        console.log(`⚠️ Ruta no existe: ${normalizedPath}`);
        continue;
      }
      
      console.log(`✅ Archivo encontrado en: ${normalizedPath}`);
      console.log(`🔍 Intentando cargar desde: ${normalizedPath}`);
      
      // Intentar cargar el módulo (CommonJS)
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const syncModule = require(normalizedPath);
      
      // El módulo exporta directamente la clase: module.exports = SyncEngine
      SyncEngineClass = syncModule.default || syncModule.SyncEngine || syncModule;
      
      // Verificar que sea una clase
      if (!SyncEngineClass || typeof SyncEngineClass !== 'function') {
        console.log(`⚠️ El módulo no exporta una clase válida. Tipo: ${typeof syncModule}`);
        continue;
      }
      
      if (SyncEngineClass && typeof SyncEngineClass === 'function') {
        console.log(`✅ SyncEngine encontrado y cargado desde: ${tryPath}`);
        return SyncEngineClass;
      } else {
        console.log(`⚠️ Módulo cargado pero no es una clase válida desde: ${tryPath}`);
        continue;
      }
    } catch (e) {
      console.log(`⚠️ Error cargando desde ${tryPath}:`, e.message);
      if (e.stack) {
        console.log(`   Stack: ${e.stack.split('\n').slice(0, 3).join('\n')}`);
      }
      // Continuar con la siguiente ruta
      continue;
    }
  }
  
  console.error('❌ No se pudo cargar SyncEngine. Rutas intentadas:');
  possiblePaths.forEach(p => {
    const exists = fs.existsSync(p);
    console.error(`   ${exists ? '✅' : '❌'} ${p}`);
  });
  throw new Error('No se pudo cargar SyncEngine desde ninguna ruta. Verifique que desktop/database/sync/sync-engine.js existe.');
}

/**
 * Obtiene una instancia de SyncEngine (se crea dinámicamente cada vez)
 */
async function getSyncEngine(db) {
  try {
    const SyncEngine = await loadSyncEngineClass();
    // SyncEngine constructor: (db, config)
    // Si config es null, SyncEngine obtendrá la config desde la BD
    return new SyncEngine(db, null);
  } catch (error) {
    console.error('❌ Error creando instancia de SyncEngine:', error);
    throw new Error(`SyncEngine no disponible: ${error.message}`);
  }
}

export async function registerSyncHandlers(db) {
  console.log('🔄 Registrando handlers de sincronización...');

  // Sincronización completa
  ipcMain.handle('sync-full', async () => {
    try {
      const syncEngine = await getSyncEngine(db);
      const result = await syncEngine.syncFull();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error en sincronización completa:', error);
      return { success: false, error: error.message };
    }
  });

  // Sincronización PULL (descargar del servidor)
  ipcMain.handle('sync-pull', async () => {
    try {
      const syncEngine = await getSyncEngine(db);
      const result = await syncEngine.syncPull();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error en PULL:', error);
      return { success: false, error: error.message };
    }
  });

  // Sincronización PUSH (enviar al servidor)
  ipcMain.handle('sync-push', async () => {
    try {
      const syncEngine = await getSyncEngine(db);
      const result = await syncEngine.syncPush();
      return { success: true, data: result };
    } catch (error) {
      console.error('Error en PUSH:', error);
      return { success: false, error: error.message };
    }
  });

  // Verificar conexión con el servidor
  ipcMain.handle('sync-check-connection', async () => {
    try {
      // Intentar usar SyncEngine si está disponible
      try {
        const syncEngine = await getSyncEngine(db);
        const result = await syncEngine.checkConnection();
        return { success: true, data: result };
      } catch (syncError) {
        // Si SyncEngine no está disponible, verificar configuración directamente
        console.warn('SyncEngine no disponible, verificando conexión directamente:', syncError.message);
        const config = db.prepare('SELECT * FROM sync_config WHERE id = 1').get();
        if (!config || !config.api_url) {
          return { success: true, data: { connected: false, message: 'No configurado' } };
        }
        
        // Intentar hacer una petición simple
        const axios = (await import('axios')).default;
        try {
          // Asegurar que la URL termine correctamente
          const apiUrl = config.api_url.endsWith('/') 
            ? config.api_url.slice(0, -1) 
            : config.api_url;
          // El endpoint correcto es /api/sync/status según la API
          const statusUrl = apiUrl.includes('/api/sync') 
            ? `${apiUrl}/status` 
            : `${apiUrl}/api/sync/status`;
          const response = await axios.get(statusUrl, { timeout: 5000 });
          return { success: true, data: { connected: true, message: 'Conectado', serverTime: response.data?.server_time } };
        } catch (error) {
          return { success: true, data: { connected: false, message: error.message } };
        }
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtener estadísticas de sincronización
  ipcMain.handle('sync-get-stats', async () => {
    try {
      // Intentar usar SyncEngine si está disponible
      try {
        const syncEngine = await getSyncEngine(db);
        const stats = syncEngine.getSyncStats();
        return { success: true, data: stats };
      } catch (syncError) {
        // Si SyncEngine no está disponible, retornar stats básicos
        console.warn('SyncEngine no disponible, retornando stats básicos:', syncError.message);
        const config = db.prepare('SELECT * FROM sync_config WHERE id = 1').get();
        return { 
          success: true, 
          data: {
            lastSync: null,
            pendingChanges: 0,
            unresolvedConflicts: 0,
            autoSyncEnabled: config?.auto_sync === 1,
            syncInterval: config?.sync_interval || 300
          }
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Configurar sincronización
  ipcMain.handle('sync-configure', async (event, config) => {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO sync_config 
        (id, api_url, empresa_id, auth_token, auto_sync, sync_interval, enabled)
        VALUES (1, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        config.api_url,
        config.empresa_id,
        config.auth_token,
        config.auto_sync ? 1 : 0,
        config.sync_interval || 300,
        config.enabled ? 1 : 0
      );

      // Re-inicializar SyncEngine para que tome la nueva configuración
      syncEngineInstance = null; 
      await getSyncEngine(db);

      return { success: true, message: 'Configuración guardada' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtener configuración actual
  ipcMain.handle('sync-get-config', () => {
    try {
      const config = db.prepare('SELECT * FROM sync_config WHERE id = 1').get();
      return { success: true, data: config };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtener log de sincronización
  ipcMain.handle('sync-get-log', (event, limit = 50) => {
    try {
      const logs = db.prepare(`
        SELECT * FROM sync_log 
        ORDER BY started_at DESC 
        LIMIT ?
      `).all(limit);

      return { success: true, data: logs };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtener conflictos pendientes
  ipcMain.handle('sync-get-conflicts', () => {
    try {
      const conflicts = db.prepare(`
        SELECT * FROM sync_conflicts 
        WHERE resolved = 0 
        ORDER BY created_at DESC
      `).all();

      return { success: true, data: conflicts };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Resolver conflicto
  ipcMain.handle('sync-resolve-conflict', (event, conflictId, resolution) => {
    try {
      const conflict = db.prepare('SELECT * FROM sync_conflicts WHERE id = ?').get(conflictId);
      
      if (!conflict) {
        throw new Error('Conflicto no encontrado');
      }

      // Aplicar resolución
      const data = resolution === 'local' 
        ? JSON.parse(conflict.local_data)
        : JSON.parse(conflict.remote_data);

      const columns = Object.keys(data).filter(k => k !== 'id');
      const setClause = columns.map(col => `${col} = ?`).join(', ');
      const values = columns.map(col => data[col]);

      db.prepare(`UPDATE ${conflict.table_name} SET ${setClause} WHERE id = ?`)
        .run(...values, conflict.record_id);

      // Marcar como resuelto
      db.prepare(`
        UPDATE sync_conflicts 
        SET resolved = 1, resolution = ?, resolved_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(resolution, conflictId);

      return { success: true, message: 'Conflicto resuelto' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Limpiar log antiguo
  ipcMain.handle('sync-clean-log', (event, days = 30) => {
    try {
      const result = db.prepare(`
        DELETE FROM sync_log 
        WHERE started_at < datetime('now', '-' || ? || ' days')
      `).run(days);

      return { 
        success: true, 
        message: `${result.changes} registros eliminados` 
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Handlers de sincronización registrados:');
  console.log('   - sync-configure');
  console.log('   - sync-check-connection');
  console.log('   - sync-full');
  console.log('   - sync-pull');
  console.log('   - sync-push');
  console.log('   - sync-get-stats');
  console.log('   - sync-get-config');
  console.log('   - sync-get-log');
  console.log('   - sync-get-conflicts');
  console.log('   - sync-resolve-conflict');
  console.log('   - sync-clean-log');
}

