/**
 * IPC Handlers para Sincronización
 * @module main/ipc/sync
 */

const { ipcMain } = require('electron');
const SyncEngine = require('../../../database/sync/sync-engine');

/**
 * Registra handlers IPC para sincronización
 * @param {Database} db - Instancia de la base de datos
 */
function registerSyncHandlers(db) {
  const syncEngine = new SyncEngine(db);

  // Sincronización completa
  ipcMain.handle('sync-full', async () => {
    try {
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
      const result = await syncEngine.checkConnection();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Obtener estadísticas de sincronización
  ipcMain.handle('sync-get-stats', () => {
    try {
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

  console.log('✅ Handlers de sincronización registrados');
}

module.exports = { registerSyncHandlers };

