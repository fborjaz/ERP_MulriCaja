/**
 * IPC Handlers para Sincronización
 * @module main/ipc/sync
 */

const { ipcMain } = require('electron');
const path = require('path');

// Intentar cargar SyncEngine desde diferentes ubicaciones posibles
let SyncEngine;
try {
  // Ruta desde src/main/ipc/ a database/sync/ (4 niveles arriba)
  SyncEngine = require(path.join(__dirname, '../../../../database/sync/sync-engine'));
} catch (e) {
  try {
    // Ruta alternativa (3 niveles arriba)
    SyncEngine = require('../../../database/sync/sync-engine');
  } catch (e2) {
    console.error('Error cargando SyncEngine:', e2);
    throw new Error('No se pudo cargar SyncEngine. Verifique la ruta del módulo.');
  }
}

/**
 * Registra handlers IPC para sincronización
 * @param {Database} db - Instancia de la base de datos
 */
function registerSyncHandlers(db) {
  console.log('🔄 Registrando handlers de sincronización...');
  
  // SyncEngine requiere db y config, pero config puede ser null
  // El config se obtendrá desde la BD en los métodos
  let syncEngine;
  try {
    syncEngine = new SyncEngine(db, null);
    console.log('✅ SyncEngine inicializado correctamente');
  } catch (error) {
    console.error('⚠️ Error inicializando SyncEngine:', error);
    // Continuar sin SyncEngine para métodos que no lo requieren
    syncEngine = null;
  }

  // Sincronización completa
  ipcMain.handle('sync-full', async () => {
    try {
      if (!syncEngine) {
        throw new Error('SyncEngine no inicializado');
      }
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
      if (!syncEngine) {
        throw new Error('SyncEngine no inicializado');
      }
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
      if (!syncEngine) {
        throw new Error('SyncEngine no inicializado');
      }
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
      if (!syncEngine) {
        // Si no hay SyncEngine, verificar configuración directamente
        const config = db.prepare('SELECT * FROM sync_config WHERE id = 1').get();
        if (!config || !config.api_url) {
          return { success: true, data: { connected: false, message: 'No configurado' } };
        }
        
        // Intentar hacer una petición simple
        const axios = require('axios');
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
      const result = await syncEngine.checkConnection();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtener estadísticas de sincronización
  ipcMain.handle('sync-get-stats', () => {
    try {
      if (!syncEngine) {
        // Retornar stats básicos sin SyncEngine
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
      const stats = syncEngine.getSyncStats();
      return { success: true, data: stats };
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

module.exports = { registerSyncHandlers };

