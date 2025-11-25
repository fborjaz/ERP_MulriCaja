/**
 * Servicio de Sincronización
 * @module renderer/services/sync.service
 */

import { api } from '../core/api.js';
import { toast } from '../components/notifications/toast.js';

export class SyncService {
  constructor() {
    this.syncInProgress = false;
    this.autoSyncInterval = null;
    this.listeners = [];
  }

  /**
   * Sincronización completa (automática)
   */
  async syncFull(showNotifications = true) {
    if (this.syncInProgress) {
      if (showNotifications) {
        toast.warning('Ya hay una sincronización en progreso');
      }
      return { success: false, error: 'Sync in progress' };
    }

    this.syncInProgress = true;
    this._notifyListeners('sync-started');

    try {
      if (showNotifications) {
        toast.info('Iniciando sincronización...');
      }

      const result = await api.syncFull();

      if (result.success) {
        if (showNotifications) {
          toast.success('✅ Sincronización completada exitosamente');
        }
        this._notifyListeners('sync-completed', result.data);
        return result;
      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error) {
      console.error('Error en sincronización:', error);
      
      if (showNotifications) {
        if (error.message.includes('conexión') || error.message.includes('internet')) {
          toast.warning('⚠️ Sin conexión al servidor. Los cambios se sincronizarán cuando haya conexión.');
        } else {
          toast.error(`❌ Error en sincronización: ${error.message}`);
        }
      }

      this._notifyListeners('sync-error', error);
      return { success: false, error: error.message };

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincronización PULL (descargar del servidor)
   */
  async syncPull() {
    try {
      toast.info('⬇️ Descargando cambios del servidor...');
      const result = await api.syncPull();

      if (result.success) {
        toast.success(`✅ ${result.data.appliedChanges} cambios descargados`);
        return result;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      toast.error(`❌ Error al descargar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Sincronización PUSH (enviar al servidor)
   */
  async syncPush() {
    try {
      toast.info('⬆️ Enviando cambios al servidor...');
      const result = await api.syncPush();

      if (result.success) {
        const message = result.data.sentChanges > 0
          ? `✅ ${result.data.sentChanges} cambios enviados`
          : 'ℹ️ No hay cambios para enviar';
        
        toast.success(message);
        return result;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      toast.error(`❌ Error al enviar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar estado de conexión
   */
  async checkConnection() {
    try {
      const result = await api.syncCheckConnection();
      
      if (result.success) {
        return result.data;
      } else {
        return { connected: false, message: result.error };
      }

    } catch (error) {
      return { connected: false, message: error.message };
    }
  }

  /**
   * Obtener estadísticas de sincronización
   */
  async getStats() {
    try {
      const result = await api.syncGetStats();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return null;
    }
  }

  /**
   * Configurar sincronización
   */
  async configure(config) {
    try {
      const result = await api.syncConfigure(config);
      
      if (result.success) {
        toast.success('Configuración guardada');
        
        // Reiniciar auto-sync si está habilitado
        if (config.auto_sync) {
          this.startAutoSync();
        } else {
          this.stopAutoSync();
        }
        
        return result;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      toast.error(`Error guardando configuración: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener configuración actual
   */
  async getConfig() {
    try {
      const result = await api.syncGetConfig();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      return null;
    }
  }

  /**
   * Obtener log de sincronización
   */
  async getLog(limit = 50) {
    try {
      const result = await api.syncGetLog(limit);
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error obteniendo log:', error);
      return [];
    }
  }

  /**
   * Obtener conflictos pendientes
   */
  async getConflicts() {
    try {
      const result = await api.syncGetConflicts();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error obteniendo conflictos:', error);
      return [];
    }
  }

  /**
   * Resolver conflicto
   */
  async resolveConflict(conflictId, resolution) {
    try {
      const result = await api.syncResolveConflict(conflictId, resolution);
      
      if (result.success) {
        toast.success('Conflicto resuelto');
        return result;
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      toast.error(`Error resolviendo conflicto: ${error.message}`);
      throw error;
    }
  }

  /**
   * Iniciar sincronización automática
   */
  async startAutoSync() {
    const config = await this.getConfig();
    
    if (!config || !config.auto_sync) {
      console.log('Auto-sync deshabilitado');
      return;
    }

    // Limpiar intervalo anterior si existe
    this.stopAutoSync();

    const interval = (config.sync_interval || 300) * 1000; // Convertir a ms

    console.log(`🔄 Auto-sync iniciado cada ${config.sync_interval} segundos`);

    this.autoSyncInterval = setInterval(async () => {
      console.log('🔄 Ejecutando sincronización automática...');
      await this.syncFull(false); // Sin notificaciones en auto-sync
    }, interval);

    // Sincronizar inmediatamente
    await this.syncFull(false);
  }

  /**
   * Detener sincronización automática
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('Auto-sync detenido');
    }
  }

  /**
   * Agregar listener para eventos de sincronización
   */
  addEventListener(callback) {
    this.listeners.push(callback);
  }

  /**
   * Remover listener
   */
  removeEventListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  /**
   * Notificar a todos los listeners
   */
  _notifyListeners(event, data) {
    for (const listener of this.listeners) {
      try {
        listener({ event, data });
      } catch (error) {
        console.error('Error en listener:', error);
      }
    }
  }

  /**
   * Formatear fecha/hora para display
   */
  formatSyncTime(timestamp) {
    if (!timestamp) return 'Nunca';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }
}

// Crear y exportar instancia singleton
export const syncService = new SyncService();

// Iniciar auto-sync al cargar
syncService.startAutoSync().catch(error => {
  console.error('Error iniciando auto-sync:', error);
});

// Exportar también como default
export default syncService;

