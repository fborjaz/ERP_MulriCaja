/**
 * Vista de Sincronización con IMAXPOS Cloud
 * @module renderer/modules/sync/sync.view
 */

import { syncService } from '../../services/sync.service.js';
import { toast } from '../../components/notifications/toast.js';

export const SyncView = {
  refreshInterval: null,
  config: null,

  render() {
    return `
      <style>
        .readonly-field {
          background-color: #f5f5f5 !important;
          color: #6c757d !important;
          cursor: not-allowed !important;
          border-color: #dee2e6 !important;
        }
        .readonly-field:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
          padding: 8px 0;
        }
        .checkbox-label input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 20px;
          height: 20px;
          min-width: 20px;
          min-height: 20px;
          border: 2px solid #ccc;
          border-radius: 4px;
          cursor: pointer;
          position: relative;
          margin: 0;
          flex-shrink: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          background-color: white;
          display: inline-block;
          vertical-align: middle;
        }
        .checkbox-label input[type="checkbox"]:checked {
          background-color: #6366f1;
          border-color: #6366f1;
        }
        .checkbox-label input[type="checkbox"]:checked::after {
          content: '✓';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 14px;
          font-weight: bold;
          line-height: 1;
          display: block;
        }
        .checkbox-label input[type="checkbox"]:hover {
          border-color: #6366f1;
          transform: scale(1.05);
        }
        .checkbox-label input[type="checkbox"]:focus {
          outline: 2px solid rgba(99, 102, 241, 0.3);
          outline-offset: 2px;
        }
        .checkbox-label input[type="checkbox"]:active {
          transform: scale(0.95);
        }
        .checkbox-text {
          font-weight: 500;
          color: #333;
          transition: color 0.2s ease;
        }
        .checkbox-label:hover .checkbox-text {
          color: #6366f1;
        }
      </style>
      <div class="sync-container">
        <!-- Estado de Conexión -->
        <div class="card">
          <div class="card-header">
            <h2>Estado de Sincronización</h2>
            <div id="sync-status-badge" class="badge badge-secondary">Verificando...</div>
          </div>
          <div class="card-body">
            <div class="sync-status-grid">
              <div class="sync-stat">
                <span class="material-icons">cloud</span>
                <div>
                  <h3 id="connection-status">Verificando...</h3>
                  <p>Conexión al servidor</p>
                </div>
              </div>
              <div class="sync-stat">
                <span class="material-icons">sync</span>
                <div>
                  <h3 id="last-sync-time">Nunca</h3>
                  <p>Última sincronización</p>
                </div>
              </div>
              <div class="sync-stat">
                <span class="material-icons">pending</span>
                <div>
                  <h3 id="pending-changes">0</h3>
                  <p>Cambios pendientes</p>
                </div>
              </div>
              <div class="sync-stat">
                <span class="material-icons">warning</span>
                <div>
                  <h3 id="conflicts-count">0</h3>
                  <p>Conflictos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Botones de Sincronización -->
        <div class="card">
          <div class="card-header">
            <h2>Acciones de Sincronización</h2>
          </div>
          <div class="card-body">
            <div class="sync-actions">
              <button id="btn-sync-full" class="btn btn-primary btn-lg">
                <span class="material-icons">sync</span>
                Sincronizar Ahora
              </button>
              <button id="btn-sync-pull" class="btn btn-info">
                <span class="material-icons">cloud_download</span>
                Descargar del Servidor
              </button>
              <button id="btn-sync-push" class="btn btn-success">
                <span class="material-icons">cloud_upload</span>
                Enviar al Servidor
              </button>
              <button id="btn-check-connection" class="btn btn-secondary">
                <span class="material-icons">wifi</span>
                Verificar Conexión
              </button>
            </div>
            
            <div id="sync-progress" class="sync-progress hidden">
              <div class="spinner"></div>
              <p>Sincronizando...</p>
            </div>
          </div>
        </div>

        <!-- Configuración -->
        <div class="card">
          <div class="card-header">
            <h2>Configuración de Sincronización</h2>
          </div>
          <div class="card-body">
            <form id="form-sync-config">
              <div class="form-group">
                <label for="api-url">URL del Servidor IMAXPOS</label>
                <input type="text" id="api-url" class="form-control readonly-field" 
                  placeholder="https://api.imaxpos.com" readonly disabled>
                <small style="color: #6c757d;">🔒 Configurado durante el setup inicial (no editable)</small>
              </div>

              <div class="form-group">
                <label for="empresa-id">ID de Empresa</label>
                <input type="number" id="empresa-id" class="form-control readonly-field" 
                  placeholder="1" readonly disabled>
                <small style="color: #6c757d;">🔒 Configurado durante el setup inicial (no editable)</small>
              </div>

              <div class="form-group">
                <label for="auth-token">Token de Autenticación</label>
                <div style="position: relative;">
                  <input type="password" id="auth-token" class="form-control readonly-field" 
                    placeholder="Token de acceso" readonly disabled>
                  <button type="button" id="btn-show-token" class="btn btn-sm" 
                    style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #6c757d; cursor: pointer;"
                    title="Mostrar/Ocultar token">
                    <span class="material-icons" style="font-size: 18px;">visibility</span>
                  </button>
                </div>
                <small style="color: #6c757d;">🔒 Solo visualización (configurado durante el setup inicial)</small>
              </div>

              <div class="form-group">
                <label class="checkbox-label" for="auto-sync">
                  <input type="checkbox" id="auto-sync" checked>
                  <span class="checkbox-text">Sincronización Automática</span>
                </label>
                <small>Sincronizar automáticamente cada cierto tiempo</small>
              </div>

              <div class="form-group" id="sync-interval-group">
                <label for="sync-interval">Intervalo de Sincronización (segundos)</label>
                <input type="number" id="sync-interval" class="form-control readonly-field" 
                  value="300" min="60" max="3600" readonly disabled>
                <small style="color: #6c757d;">🔒 Configurado durante el setup inicial (no editable)</small>
              </div>

              <div class="form-actions">
                <button type="button" id="btn-save-auto-sync" class="btn btn-primary">
                  <span class="material-icons">save</span>
                  Guardar Cambios
                </button>
                <button type="button" id="btn-test-connection" class="btn btn-secondary">
                  <span class="material-icons">check_circle</span>
                  Probar Conexión
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Log de Sincronización -->
        <div class="card">
          <div class="card-header">
            <h2>Historial de Sincronización</h2>
            <button id="btn-refresh-log" class="btn btn-sm btn-secondary">
              <span class="material-icons">refresh</span>
              Actualizar
            </button>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Fecha/Hora</th>
                    <th>Tipo</th>
                    <th>Tabla</th>
                    <th>Operación</th>
                    <th>Estado</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody id="sync-log-body">
                  <tr><td colspan="6" style="text-align: center;">Cargando...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Conflictos Pendientes -->
        <div id="conflicts-section" class="card hidden">
          <div class="card-header">
            <h2>Conflictos Pendientes</h2>
            <span class="badge badge-danger" id="conflicts-badge">0</span>
          </div>
          <div class="card-body">
            <div id="conflicts-list"></div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    // Cargar configuración actual
    await this.loadConfig();

    // Verificar estado inicial
    await this.checkStatus();

    // Cargar log
    await this.loadLog();

    // Verificar conflictos
    await this.loadConflicts();

    // Setup event listeners
    this.setupEventListeners();

    // Auto-refresh cada 10 segundos
    this.refreshInterval = setInterval(() => {
      this.checkStatus();
      this.loadConflicts();
    }, 10000);
  },

  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  },

  setupEventListeners() {
    // Sincronización completa
    document.getElementById('btn-sync-full')
      .addEventListener('click', () => this.syncFull());

    // Pull
    document.getElementById('btn-sync-pull')
      .addEventListener('click', () => this.syncPull());

    // Push
    document.getElementById('btn-sync-push')
      .addEventListener('click', () => this.syncPush());

    // Verificar conexión
    document.getElementById('btn-check-connection')
      .addEventListener('click', () => this.checkConnection());

    // Guardar solo auto-sync (los demás campos son readonly)
    document.getElementById('btn-save-auto-sync')
      .addEventListener('click', () => this.saveAutoSync());

    // Probar conexión
    document.getElementById('btn-test-connection')
      .addEventListener('click', () => this.testConnection());

    // Auto-sync checkbox
    document.getElementById('auto-sync')
      .addEventListener('change', (e) => {
        const intervalGroup = document.getElementById('sync-interval-group');
        intervalGroup.style.display = e.target.checked ? 'block' : 'none';
      });

    // Mostrar/Ocultar token (solo visualización, el campo es readonly)
    const btnShowToken = document.getElementById('btn-show-token');
    const authTokenInput = document.getElementById('auth-token');
    if (btnShowToken && authTokenInput) {
      btnShowToken.addEventListener('click', () => {
        const icon = btnShowToken.querySelector('.material-icons');
        if (authTokenInput.type === 'password') {
          authTokenInput.type = 'text';
          if (icon) icon.textContent = 'visibility_off';
        } else {
          authTokenInput.type = 'password';
          if (icon) icon.textContent = 'visibility';
        }
      });
    }

    // Refresh log
    document.getElementById('btn-refresh-log')
      .addEventListener('click', () => this.loadLog());
  },

  async loadConfig() {
    try {
      this.config = await syncService.getConfig();

      if (this.config) {
        // Cargar valores en campos readonly (solo visualización)
        const apiUrlInput = document.getElementById('api-url');
        const empresaIdInput = document.getElementById('empresa-id');
        const authTokenInput = document.getElementById('auth-token');
        const syncIntervalInput = document.getElementById('sync-interval');
        
        if (apiUrlInput) {
          apiUrlInput.value = this.config.api_url || '';
        }
        if (empresaIdInput) {
          empresaIdInput.value = this.config.empresa_id || '';
        }
        if (authTokenInput) {
          authTokenInput.value = this.config.auth_token || '';
        }
        if (syncIntervalInput) {
          syncIntervalInput.value = this.config.sync_interval || 300;
        }

        // Solo el checkbox de auto-sync es editable
        const autoSyncCheckbox = document.getElementById('auto-sync');
        if (autoSyncCheckbox) {
          autoSyncCheckbox.checked = this.config.auto_sync === 1;
        }

        const intervalGroup = document.getElementById('sync-interval-group');
        if (intervalGroup) {
          intervalGroup.style.display = this.config.auto_sync === 1 ? 'block' : 'none';
        }
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      toast.error('Error al cargar la configuración de sincronización');
    }
  },

  async saveAutoSync() {
    // Solo guardar el estado de auto_sync, los demás campos son readonly
    const autoSync = document.getElementById('auto-sync').checked;

    try {
      // Obtener la configuración actual completa
      const currentConfig = await syncService.getConfig();
      
      if (!currentConfig) {
        toast.error('No se encontró la configuración de sincronización');
        return;
      }

      // Actualizar solo el auto_sync manteniendo los demás valores
      const config = {
        api_url: currentConfig.api_url,
        empresa_id: currentConfig.empresa_id,
        auth_token: currentConfig.auth_token,
        auto_sync: autoSync,
        sync_interval: currentConfig.sync_interval || 300,
        enabled: currentConfig.enabled !== undefined ? currentConfig.enabled : 1
      };

      await syncService.configure(config);
      this.config = config;
      
      toast.success('✅ Sincronización automática ' + (autoSync ? 'activada' : 'desactivada'));
      
      // Recargar estado
      await this.checkStatus();
    } catch (error) {
      console.error('Error guardando configuración:', error);
      toast.error('Error al guardar la configuración');
    }
  },

  async testConnection() {
    try {
      toast.info('Probando conexión...');
      const status = await syncService.checkConnection();

      if (status.connected) {
        toast.success('✅ Conexión exitosa con el servidor');
      } else {
        toast.error(`❌ Sin conexión: ${status.message}`);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  },

  async checkStatus() {
    try {
      const stats = await syncService.getStats();
      const connection = await syncService.checkConnection();

      // Estado de conexión
      const statusBadge = document.getElementById('sync-status-badge');
      const connectionStatus = document.getElementById('connection-status');

      if (connection.connected) {
        statusBadge.className = 'badge badge-success';
        statusBadge.textContent = 'Conectado';
        connectionStatus.textContent = 'Conectado';
        connectionStatus.className = 'text-success';
      } else {
        statusBadge.className = 'badge badge-danger';
        statusBadge.textContent = 'Sin conexión';
        connectionStatus.textContent = 'Sin conexión';
        connectionStatus.className = 'text-danger';
      }

      // Estadísticas
      if (stats) {
        document.getElementById('last-sync-time').textContent = 
          syncService.formatSyncTime(stats.lastSync);
        document.getElementById('pending-changes').textContent = stats.pendingChanges;
        document.getElementById('conflicts-count').textContent = stats.unresolvedConflicts;

        // Mostrar sección de conflictos si hay alguno
        const conflictsSection = document.getElementById('conflicts-section');
        if (stats.unresolvedConflicts > 0) {
          conflictsSection.classList.remove('hidden');
        } else {
          conflictsSection.classList.add('hidden');
        }
      }
    } catch (error) {
      console.error('Error verificando estado:', error);
    }
  },

  async syncFull() {
    const progress = document.getElementById('sync-progress');
    const buttons = document.querySelectorAll('.sync-actions button');

    try {
      // Mostrar progreso
      progress.classList.remove('hidden');
      buttons.forEach(btn => btn.disabled = true);

      await syncService.syncFull(true);

      // Recargar estado y log
      await this.checkStatus();
      await this.loadLog();
      await this.loadConflicts();

    } catch (error) {
      console.error('Error en sincronización:', error);
    } finally {
      progress.classList.add('hidden');
      buttons.forEach(btn => btn.disabled = false);
    }
  },

  async syncPull() {
    try {
      await syncService.syncPull();
      await this.checkStatus();
      await this.loadLog();
    } catch (error) {
      console.error('Error en PULL:', error);
    }
  },

  async syncPush() {
    try {
      await syncService.syncPush();
      await this.checkStatus();
      await this.loadLog();
    } catch (error) {
      console.error('Error en PUSH:', error);
    }
  },

  async checkConnection() {
    const connection = await syncService.checkConnection();
    
    if (connection.connected) {
      toast.success('✅ Conectado al servidor');
    } else {
      toast.error(`❌ ${connection.message}`);
    }
  },

  async loadLog() {
    try {
      const logs = await syncService.getLog(50);
      const tbody = document.getElementById('sync-log-body');

      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay registros</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map(log => `
        <tr class="sync-log-${log.status}">
          <td>${new Date(log.started_at).toLocaleString('es-DO')}</td>
          <td>${log.sync_type || '-'}</td>
          <td>${log.table_name || 'Todas'}</td>
          <td>${log.operation || '-'}</td>
          <td><span class="badge badge-${this.getStatusClass(log.status)}">${log.status}</span></td>
          <td>${log.error_message || '-'}</td>
        </tr>
      `).join('');

    } catch (error) {
      console.error('Error cargando log:', error);
    }
  },

  async loadConflicts() {
    try {
      const conflicts = await syncService.getConflicts();
      const badge = document.getElementById('conflicts-badge');
      const list = document.getElementById('conflicts-list');

      badge.textContent = conflicts.length;

      if (conflicts.length > 0) {
        list.innerHTML = conflicts.map(conflict => `
          <div class="conflict-item">
            <h4>${conflict.table_name} - Registro #${conflict.record_id}</h4>
            <div class="conflict-actions">
              <button class="btn btn-primary" onclick="window.resolveConflict(${conflict.id}, 'local')">
                Usar Datos Locales
              </button>
              <button class="btn btn-success" onclick="window.resolveConflict(${conflict.id}, 'remote')">
                Usar Datos del Servidor
              </button>
            </div>
          </div>
        `).join('');

        // Exponer función global para resolver conflictos
        window.resolveConflict = async (conflictId, resolution) => {
          try {
            await syncService.resolveConflict(conflictId, resolution);
            await this.loadConflicts();
            await this.checkStatus();
          } catch (error) {
            console.error('Error resolviendo conflicto:', error);
          }
        };
      } else {
        list.innerHTML = '<p style="text-align: center;">No hay conflictos pendientes</p>';
      }

    } catch (error) {
      console.error('Error cargando conflictos:', error);
    }
  },

  getStatusClass(status) {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'danger';
      case 'conflict': return 'warning';
      case 'in_progress': return 'info';
      default: return 'secondary';
    }
  }
};

export default SyncView;

