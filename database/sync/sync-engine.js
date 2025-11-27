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
      // Obtener cambios del servidor usando el endpoint correcto
      const baseUrl = syncConfig.api_url.endsWith('/')
        ? syncConfig.api_url.slice(0, -1)
        : syncConfig.api_url;
      const downloadUrl = baseUrl.includes('/api/sync')
        ? `${baseUrl}/download-changes`
        : `${baseUrl}/api/sync/download-changes`;

      const response = await axios.post(
        downloadUrl,
        {
          apiKey: syncConfig.auth_token,
          companyId: syncConfig.empresa_id.toString(),
          lastSyncTime:
            syncConfig.last_successful_sync || '1970-01-01 00:00:00',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 segundos
        }
      );

      // La respuesta tiene: { total, changes: [{ table, operation, data }] }
      const changes = response.data.changes || [];
      const total = response.data.total || changes.length;

      console.log(
        `📊 Cambios recibidos: ${total} registros (${changes.length} operaciones)`
      );

      // Aplicar cambios en orden de prioridad
      for (const tableName of this.tableOrder) {
        const tableChanges = changes.filter((c) => c.table === tableName);

        if (tableChanges.length > 0) {
          await this._applyTableChanges(tableName, tableChanges);
        }
      }

      // Aplicar cambios de tablas que no están en el orden de prioridad
      const processedTables = new Set(this.tableOrder);
      const remainingChanges = changes.filter(
        (c) => !processedTables.has(c.table)
      );

      if (remainingChanges.length > 0) {
        // Agrupar por tabla
        const changesByTable = {};
        remainingChanges.forEach((change) => {
          if (!changesByTable[change.table]) {
            changesByTable[change.table] = [];
          }
          changesByTable[change.table].push(change);
        });

        // Aplicar cambios de cada tabla
        for (const [tableName, tableChanges] of Object.entries(
          changesByTable
        )) {
          await this._applyTableChanges(tableName, tableChanges);
        }
      }

      return {
        success: true,
        total: total,
        appliedChanges: changes.length,
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new Error(
          'No se puede conectar al servidor. Verifique su conexión a internet.'
        );
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

      // Enviar cambios al servidor usando el endpoint correcto
      const baseUrl = syncConfig.api_url.endsWith('/')
        ? syncConfig.api_url.slice(0, -1)
        : syncConfig.api_url;
      const uploadUrl = baseUrl.includes('/api/sync')
        ? `${baseUrl}/upload-changes`
        : `${baseUrl}/api/sync/upload-changes`;

      const response = await axios.post(
        uploadUrl,
        {
          apiKey: syncConfig.auth_token,
          companyId: syncConfig.empresa_id.toString(),
          changes: localChanges,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 120000, // 2 minutos
        }
      );

      // La respuesta puede tener diferentes estructuras
      const applied = response.data.applied || [];
      const conflicts = response.data.conflicts || [];
      const errors = response.data.errors || [];
      const appliedCount = Array.isArray(applied) ? applied.length : (typeof applied === 'number' ? applied : 0);
      const conflictsCount = Array.isArray(conflicts) ? conflicts.length : (typeof conflicts === 'number' ? conflicts : 0);

      // Manejar conflictos si existen
      if (conflictsCount > 0) {
        console.warn(`⚠️ Conflictos detectados: ${conflictsCount}`);
        // Guardar conflictos en la BD local
        if (Array.isArray(conflicts)) {
          for (const conflict of conflicts) {
            this.db.prepare(`
              INSERT OR REPLACE INTO sync_conflicts 
              (table_name, record_id, local_data, remote_data, resolution, resolved)
              VALUES (?, ?, ?, ?, 'pending', 0)
            `).run(
              conflict.table || 'unknown',
              conflict.record_id || null,
              JSON.stringify(conflict.local_data || {}),
              JSON.stringify(conflict.remote_data || {}),
            );
          }
        }
      }

      // Manejar errores si existen
      if (errors.length > 0) {
        console.error(`❌ Errores al aplicar cambios: ${errors.length}`);
        errors.forEach((err) => {
          console.error(`   - ${err.table || 'unknown'}: ${err.error || err.message || 'Error desconocido'}`);
        });
      }

      // Marcar cambios como sincronizados solo si fueron aplicados exitosamente
      if (appliedCount > 0 && Array.isArray(applied)) {
        this._markChangesSynced(applied);
      }

      return {
        success: true,
        sentChanges: appliedCount,
        conflicts: conflictsCount,
        errors: errors.length,
      };
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        throw new Error(
          'No se puede conectar al servidor. Los cambios se sincronizarán cuando haya conexión.'
        );
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
            case 'upsert':
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
   * Obtiene el nombre del campo ID para una tabla específica
   * Las tablas IMAXPOS tienen diferentes nombres de ID
   */
  _getIdField(tableName) {
    // Mapeo de tablas a sus campos ID según esquema IMAXPOS
    const idFields = {
      'producto': 'producto_id',
      'cliente': 'id_cliente',
      'venta': 'venta_id',
      'detalle_venta': 'id_detalle_venta',
      'usuario': 'nUsuCodigo',
      'proveedor': 'id_proveedor',
      'categoria': 'id_categoria',
      'local': 'id_local',
      'moneda': 'id_moneda',
      'banco': 'id_banco',
      'caja': 'id_caja',
      'producto_almacen': 'id_producto', // Clave compuesta, pero usamos id_producto
      'producto_costo_unitario': 'producto_id', // Clave compuesta
      'unidades_has_precio': 'id',
      'unidades_has_producto': 'id',
      'precios': 'id_precio',
      'unidades': 'id_unidad',
      'marcas': 'id_marca',
      'lineas': 'id_linea',
      'familia': 'id_familia',
      'grupos': 'id_grupo',
      'configuraciones': 'id',
      'ajusteinventario': 'id_ajusteinventario',
      'ajustedetalle': 'id_ajustedetalle',
    };
    
    // Si la tabla tiene un mapeo específico, usarlo
    if (idFields[tableName]) {
      return idFields[tableName];
    }
    
    // Intentar detectar automáticamente el campo ID
    try {
      const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
      // Buscar campo que termine en _id o sea PRIMARY KEY
      const primaryKey = tableInfo.find(col => col.pk === 1);
      if (primaryKey) {
        return primaryKey.name;
      }
      // Buscar campo que termine en _id
      const idField = tableInfo.find(col => col.name.endsWith('_id') || col.name === 'id');
      if (idField) {
        return idField.name;
      }
    } catch (error) {
      console.warn(`No se pudo detectar campo ID para ${tableName}, usando 'id' por defecto`);
    }
    
    // Por defecto, usar 'id'
    return 'id';
  }

  /**
   * Aplica INSERT
   */
  _applyInsert(tableName, data) {
    const idField = this._getIdField(tableName);
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);

    // Usar INSERT OR REPLACE solo si hay una clave primaria definida
    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
      this.db.prepare(sql).run(...values);
    } catch (error) {
      // Si falla el INSERT OR REPLACE, intentar UPDATE si existe el registro
      const recordId = data[idField] || data.id;
      if (recordId) {
        try {
          this._applyUpdate(tableName, data, recordId);
        } catch (updateError) {
          // Si también falla el UPDATE, intentar INSERT simple
          const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
          this.db.prepare(insertSql).run(...values);
        }
      } else {
        // Si no hay ID, intentar INSERT simple
        const insertSql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
        this.db.prepare(insertSql).run(...values);
      }
    }
  }

  /**
   * Aplica UPDATE
   */
  _applyUpdate(tableName, data, recordId) {
    const idField = this._getIdField(tableName);
    const columns = Object.keys(data).filter((k) => k !== idField && k !== 'id');
    const setClause = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => data[col]);

    const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`;
    try {
      this.db.prepare(sql).run(...values, recordId || data[idField]);
    } catch (error) {
      console.error(`Error actualizando ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Aplica DELETE
   */
  _applyDelete(tableName, recordId) {
    const idField = this._getIdField(tableName);
    const sql = `DELETE FROM ${tableName} WHERE ${idField} = ?`;
    try {
      this.db.prepare(sql).run(recordId);
    } catch (error) {
      console.error(`Error eliminando de ${tableName}:`, error);
      throw error;
    }
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
          const idField = this._getIdField(tableName);
          const recordId = record[idField] || record.id;
          changes.push({
            table: tableName,
            operation: recordId ? 'update' : 'insert',
            record_id: recordId,
            data: record,
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
        const idField = this._getIdField(change.table);
        this.db.prepare(`
          UPDATE ${change.table}
          SET updated_at = CURRENT_TIMESTAMP
          WHERE ${idField} = ?
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
      const baseUrl = syncConfig.api_url.endsWith('/')
        ? syncConfig.api_url.slice(0, -1)
        : syncConfig.api_url;
      const statusUrl = baseUrl.includes('/api/sync')
        ? `${baseUrl}/status`
        : `${baseUrl}/api/sync/status`;
      
      const response = await axios.get(statusUrl, {
        timeout: 5000
      });

      return {
        connected: true,
        message: 'Conectado',
        serverTime: response.data?.server_time
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
