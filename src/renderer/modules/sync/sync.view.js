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
                <input type="text" id="api-url" class="form-control" 
                  placeholder="https://api.imaxpos.com" required>
                <small>URL base del API de IMAXPOS Cloud</small>
              </div>

              <div class="form-group">
                <label for="empresa-id">ID de Empresa</label>
                <input type="number" id="empresa-id" class="form-control" 
                  placeholder="1" required>
                <small>ID de tu empresa en IMAXPOS Cloud</small>
              </div>

              <div class="form-group">
                <label for="auth-token">Token de Autenticación</label>
                <input type="password" id="auth-token" class="form-control" 
                  placeholder="Token de acceso" required>
                <small>Token de autenticación proporcionado por IMAXPOS</small>
              </div>

              <div class="form-group">
                <label>
                  <input type="checkbox" id="auto-sync" checked>
                  Sincronización Automática
                </label>
                <small>Sincronizar automáticamente cada cierto tiempo</small>
              </div>

              <div class="form-group" id="sync-interval-group">
                <label for="sync-interval">Intervalo de Sincronización (segundos)</label>
                <input type="number" id="sync-interval" class="form-control" 
                  value="300" min="60" max="3600">
                <small>Tiempo entre sincronizaciones automáticas (mínimo 60 segundos)</small>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                  <span class="material-icons">save</span>
                  Guardar Configuración
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

    // Guardar configuración
    document.getElementById('form-sync-config')
      .addEventListener('submit', (e) => this.saveConfig(e));

    // Probar conexión
    document.getElementById('btn-test-connection')
      .addEventListener('click', () => this.testConnection());

    // Auto-sync checkbox
    document.getElementById('auto-sync')
      .addEventListener('change', (e) => {
        const intervalGroup = document.getElementById('sync-interval-group');
        intervalGroup.style.display = e.target.checked ? 'block' : 'none';
      });

    // Refresh log
    document.getElementById('btn-refresh-log')
      .addEventListener('click', () => this.loadLog());
  },

  async loadConfig() {
    try {
      this.config = await syncService.getConfig();

      if (this.config) {
        document.getElementById('api-url').value = this.config.api_url || '';
        document.getElementById('empresa-id').value = this.config.empresa_id || '';
        document.getElementById('auth-token').value = this.config.auth_token || '';
        document.getElementById('auto-sync').checked = this.config.auto_sync === 1;
        document.getElementById('sync-interval').value = this.config.sync_interval || 300;

        const intervalGroup = document.getElementById('sync-interval-group');
        intervalGroup.style.display = this.config.auto_sync ? 'block' : 'none';
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  },

  async saveConfig(e) {
    e.preventDefault();

    const config = {
      api_url: document.getElementById('api-url').value.trim(),
      empresa_id: parseInt(document.getElementById('empresa-id').value),
      auth_token: document.getElementById('auth-token').value.trim(),
      auto_sync: document.getElementById('auto-sync').checked,
      sync_interval: parseInt(document.getElementById('sync-interval').value),
      enabled: 1
    };

    try {
      await syncService.configure(config);
      this.config = config;
      
      // Recargar estado
      await this.checkStatus();
    } catch (error) {
      console.error('Error guardando configuración:', error);
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

