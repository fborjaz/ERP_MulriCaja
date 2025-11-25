/**
 * Motor de Sincronización Bidireccional
 * @module database/sync/sync-engine
 * 
 * Sincroniza datos entre SQLite local (offline) y MySQL remoto (IMAXPOS Cloud)
 */

const axios = require('axios');
const Database = require('better-sqlite3');

class SyncEngine {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    
    // Tablas que NO se sincronizan (solo locales)
    this.excludedTables = [
      'sync_metadata',
      'sync_log',
      'sync_conflicts',
      'sync_config',
      'ci_sessions'
    ];

    // Tablas prioritarias (se sincronizan primero)
    this.priorityTables = [
      'local',
      'moneda',
      'usuario',
      'caja',
      'caja_desglose',
      'banco',
      'producto',
      'cliente',
      'proveedor'
    ];

    // Orden de sincronización por dependencias
    this.tableOrder = this._calculateTableOrder();
  }

  /**
   * Sincronización completa (pull + push)
   */
  async syncFull() {
    if (this.syncInProgress) {
      throw new Error('Sincronización ya en progreso');
    }

    this.syncInProgress = true;
    const syncLogId = this._createSyncLog('full');

    try {
      console.log('🔄 Iniciando sincronización completa...');

      // 1. PULL: Obtener cambios del servidor
      await this.syncPull();

      // 2. PUSH: Enviar cambios locales
      await this.syncPush();

      // 3. Actualizar metadata
      this._updateSyncMetadata();

      console.log('✅ Sincronización completa exitosa');
      this._completeSyncLog(syncLogId, 'success');

      return {
        success: true,
        timestamp: new Date().toISOString(),
        message: 'Sincronización completada correctamente'
      };

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      this._completeSyncLog(syncLogId, 'error', error.message);
      
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * PULL: Descargar cambios del servidor
   */
  async syncPull() {
    console.log('⬇️ Descargando cambios del servidor...');

    const syncConfig = this._getSyncConfig();
    if (!syncConfig || !syncConfig.api_url) {
      throw new Error('Configuración de sincronización no encontrada');
    }

    try {
      // Obtener lista de tablas modificadas desde último sync
      const response = await axios.post(
        `${syncConfig.api_url}/api/sync/changes`,
        {
          empresa_id: syncConfig.empresa_id,
          last_sync: syncConfig.last_successful_sync || '1970-01-01 00:00:00'
        },
        {
          headers: {
            'Authorization': `Bearer ${syncConfig.auth_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 segundos
        }
      );

      const { changes, metadata } = response.data;

      console.log(`📊 Cambios recibidos: ${changes.length} operaciones`);

      // Aplicar cambios en orden de prioridad
      for (const tableName of this.tableOrder) {
        const tableChanges = changes.filter(c => c.table === tableName);
        
        if (tableChanges.length > 0) {
          await this._applyTableChanges(tableName, tableChanges);
        }
      }

      return {
        success: true,
        appliedChanges: changes.length,
        metadata
      };

    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new Error('No se puede conectar al servidor. Verifique su conexión a internet.');
      }
      throw error;
    }
  }

  /**
   * PUSH: Enviar cambios locales al servidor
   */
  async syncPush() {
    console.log('⬆️ Enviando cambios al servidor...');

    const syncConfig = this._getSyncConfig();
    if (!syncConfig || !syncConfig.api_url) {
      throw new Error('Configuración de sincronización no encontrada');
    }

    try {
      // Obtener cambios locales pendientes
      const localChanges = this._getLocalChanges();

      if (localChanges.length === 0) {
        console.log('ℹ️ No hay cambios locales para sincronizar');
        return { success: true, sentChanges: 0 };
      }

      console.log(`📤 Enviando ${localChanges.length} cambios...`);

      // Enviar cambios al servidor
      const response = await axios.post(
        `${syncConfig.api_url}/api/sync/apply`,
        {
          empresa_id: syncConfig.empresa_id,
          changes: localChanges
        },
        {
          headers: {
            'Authorization': `Bearer ${syncConfig.auth_token}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minutos
        }
      );

      const { applied, conflicts } = response.data;

      // Manejar conflictos si existen
      if (conflicts && conflicts.length > 0) {
        console.warn(`⚠️ Conflictos detectados: ${conflicts.length}`);
        await this._handleConflicts(conflicts);
      }

      // Marcar cambios como sincronizados
      this._markChangesSynced(applied);

      return {
        success: true,
        sentChanges: applied.length,
        conflicts: conflicts.length
      };

    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new Error('No se puede conectar al servidor. Los cambios se sincronizarán cuando haya conexión.');
      }
      throw error;
    }
  }

  /**
   * Aplica cambios de una tabla específica
   */
  async _applyTableChanges(tableName, changes) {
    console.log(`📝 Aplicando ${changes.length} cambios en ${tableName}`);

    const transaction = this.db.transaction((changes) => {
      for (const change of changes) {
        try {
          switch (change.operation) {
            case 'insert':
              this._applyInsert(tableName, change.data);
              break;
            case 'update':
              this._applyUpdate(tableName, change.data, change.record_id);
              break;
            case 'delete':
              this._applyDelete(tableName, change.record_id);
              break;
          }

          // Registrar en log
          this._logChange(tableName, change.operation, change.record_id, 'success');

        } catch (error) {
          console.error(`Error aplicando cambio en ${tableName}:`, error);
          this._logChange(tableName, change.operation, change.record_id, 'error', error.message);
        }
      }
    });

    transaction(changes);
  }

  /**
   * Aplica INSERT
   */
  _applyInsert(tableName, data) {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      this.db.prepare(sql).run(...values);
    } catch (error) {
      // Si falla el INSERT, intentar UPDATE
      this._applyUpdate(tableName, data, data.id);
    }
  }

  /**
   * Aplica UPDATE
   */
  _applyUpdate(tableName, data, recordId) {
    const columns = Object.keys(data).filter(k => k !== 'id');
    const setClause = columns.map(col => `${col} = ?`).join(', ');
    const values = columns.map(col => data[col]);

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    this.db.prepare(sql).run(...values, recordId);
  }

  /**
   * Aplica DELETE
   */
  _applyDelete(tableName, recordId) {
    const sql = `DELETE FROM ${tableName} WHERE id = ?`;
    this.db.prepare(sql).run(recordId);
  }

  /**
   * Obtiene cambios locales pendientes de sincronización
   */
  _getLocalChanges() {
    const changes = [];
    const tables = this._getAllTables();

    for (const tableName of tables) {
      if (this.excludedTables.includes(tableName)) continue;

      // Obtener registros modificados desde último sync
      const lastSync = this._getLastSync(tableName);
      
      const sql = `
        SELECT * FROM ${tableName}
        WHERE updated_at > ?
        OR (updated_at IS NULL AND created_at > ?)
      `;

      try {
        const records = this.db.prepare(sql).all(lastSync, lastSync);

        for (const record of records) {
          changes.push({
            table: tableName,
            operation: record.id ? 'update' : 'insert',
            record_id: record.id,
            data: record
          });
        }
      } catch (error) {
        // Tabla sin columnas de timestamp, obtener todos los registros
        console.warn(`Tabla ${tableName} sin columnas de timestamp`);
      }
    }

    return changes;
  }

  /**
   * Maneja conflictos de sincronización
   */
  async _handleConflicts(conflicts) {
    console.log('🔧 Manejando conflictos...');

    for (const conflict of conflicts) {
      // Guardar conflicto en BD para resolución posterior
      this.db.prepare(`
        INSERT INTO sync_conflicts (table_name, record_id, local_data, remote_data, resolution)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        conflict.table,
        conflict.record_id,
        JSON.stringify(conflict.local_data),
        JSON.stringify(conflict.remote_data),
        'remote' // Por defecto, servidor gana
      );

      // Aplicar resolución automática (servidor gana)
      this._applyUpdate(conflict.table, conflict.remote_data, conflict.record_id);
    }
  }

  /**
   * Obtiene configuración de sincronización
   */
  _getSyncConfig() {
    const result = this.db.prepare('SELECT * FROM sync_config WHERE enabled = 1 LIMIT 1').get();
    return result;
  }

  /**
   * Obtiene todas las tablas de la BD
   */
  _getAllTables() {
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all();

    return tables.map(t => t.name);
  }

  /**
   * Calcula orden de sincronización por dependencias
   */
  _calculateTableOrder() {
    // Por ahora, retornar orden básico
    // TODO: Implementar análisis de foreign keys para orden óptimo
    return [
      ...this.priorityTables,
      ...this._getAllTables().filter(t => !this.priorityTables.includes(t) && !this.excludedTables.includes(t))
    ];
  }

  /**
   * Obtiene timestamp de última sincronización de una tabla
   */
  _getLastSync(tableName) {
    const result = this.db.prepare(`
      SELECT last_sync FROM sync_metadata WHERE table_name = ?
    `).get(tableName);

    return result?.last_sync || '1970-01-01 00:00:00';
  }

  /**
   * Actualiza metadata de sincronización
   */
  _updateSyncMetadata() {
    const now = new Date().toISOString();

    // Actualizar configuración general
    this.db.prepare(`
      UPDATE sync_config 
      SET last_successful_sync = ? 
      WHERE enabled = 1
    `).run(now);

    // Actualizar metadata por tabla
    const tables = this._getAllTables();
    for (const tableName of tables) {
      if (this.excludedTables.includes(tableName)) continue;

      const totalRecords = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get().count;

      this.db.prepare(`
        INSERT INTO sync_metadata (table_name, last_sync, sync_status, total_records, synced_records)
        VALUES (?, ?, 'completed', ?, ?)
        ON CONFLICT(table_name) DO UPDATE SET
          last_sync = excluded.last_sync,
          sync_status = excluded.sync_status,
          total_records = excluded.total_records,
          synced_records = excluded.synced_records,
          updated_at = CURRENT_TIMESTAMP
      `).run(tableName, now, totalRecords, totalRecords);
    }
  }

  /**
   * Crea registro en log de sincronización
   */
  _createSyncLog(syncType) {
    const result = this.db.prepare(`
      INSERT INTO sync_log (sync_type, status)
      VALUES (?, 'in_progress')
    `).run(syncType);

    return result.lastInsertRowid;
  }

  /**
   * Completa registro en log de sincronización
   */
  _completeSyncLog(logId, status, errorMessage = null) {
    this.db.prepare(`
      UPDATE sync_log 
      SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, errorMessage, logId);
  }

  /**
   * Registra cambio individual en log
   */
  _logChange(tableName, operation, recordId, status, errorMessage = null) {
    this.db.prepare(`
      INSERT INTO sync_log (sync_type, table_name, operation, record_id, status, error_message, completed_at)
      VALUES ('auto', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(tableName, operation, recordId, status, errorMessage);
  }

  /**
   * Marca cambios como sincronizados
   */
  _markChangesSynced(appliedChanges) {
    // Actualizar timestamps de registros sincronizados
    for (const change of appliedChanges) {
      try {
        this.db.prepare(`
          UPDATE ${change.table}
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(change.record_id);
      } catch (error) {
        // Tabla sin columna updated_at, ignorar
      }
    }
  }

  /**
   * Verifica estado de conectividad con el servidor
   */
  async checkConnection() {
    const syncConfig = this._getSyncConfig();
    if (!syncConfig || !syncConfig.api_url) {
      return { connected: false, message: 'No configurado' };
    }

    try {
      const response = await axios.get(
        `${syncConfig.api_url}/api/sync/ping`,
        {
          headers: {
            'Authorization': `Bearer ${syncConfig.auth_token}`
          },
          timeout: 5000
        }
      );

      return {
        connected: true,
        message: 'Conectado',
        serverTime: response.data.timestamp
      };

    } catch (error) {
      return {
        connected: false,
        message: 'Sin conexión',
        error: error.message
      };
    }
  }

  /**
   * Obtiene estadísticas de sincronización
   */
  getSyncStats() {
    const config = this._getSyncConfig();
    
    const pendingChanges = this._getLocalChanges().length;
    
    const conflicts = this.db.prepare(`
      SELECT COUNT(*) as count FROM sync_conflicts WHERE resolved = 0
    `).get().count;

    const lastSync = this.db.prepare(`
      SELECT MAX(completed_at) as last_sync 
      FROM sync_log 
      WHERE status = 'success'
    `).get().last_sync;

    return {
      lastSync,
      pendingChanges,
      unresolvedConflicts: conflicts,
      autoSyncEnabled: config?.auto_sync === 1,
      syncInterval: config?.sync_interval || 300
    };
  }
}

module.exports = SyncEngine;

