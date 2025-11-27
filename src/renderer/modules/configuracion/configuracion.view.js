/**
 * Vista del Módulo de Configuración
 * @module renderer/modules/configuracion/configuracion.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";

export const ConfiguracionView = {
  /**
   * Renderiza el HTML de la vista
   * @returns {string} HTML de la vista
   */
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
        .readonly-help-text {
          color: #dc3545;
          font-size: 0.875rem;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .readonly-help-text .material-icons {
          font-size: 16px;
        }
      </style>
      <div class="view-container">
        <h1>Configuración</h1>
        
        <div class="card">
          <div class="card-header">
            <h2>Información de la Empresa</h2>
          </div>
          <div class="card-body">
            <form id="config-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="empresa-nombre">Nombre de la Empresa</label>
                  <input type="text" id="empresa-nombre" class="form-control readonly-field" readonly disabled>
                  <small class="readonly-help-text">
                    <span class="material-icons">info</span>
                    Comuníquese con soporte para que puedan cambiar este campo
                  </small>
                </div>
                <div class="form-group">
                  <label for="empresa-rnc">RNC</label>
                  <input type="text" id="empresa-rnc" class="form-control readonly-field" readonly disabled>
                  <small class="readonly-help-text">
                    <span class="material-icons">info</span>
                    Comuníquese con soporte para que puedan cambiar este campo
                  </small>
                </div>
                <div class="form-group">
                  <label for="empresa-telefono">Teléfono</label>
                  <input type="tel" id="empresa-telefono" class="form-control">
                  <small style="color: #6c757d;">Puede editar este campo</small>
                </div>
                <div class="form-group">
                  <label for="empresa-email">Email</label>
                  <input type="email" id="empresa-email" class="form-control">
                  <small style="color: #6c757d;">Puede editar este campo</small>
                </div>
                <div class="form-group full-width">
                  <label for="empresa-direccion">Dirección</label>
                  <textarea id="empresa-direccion" class="form-control" rows="3"></textarea>
                  <small style="color: #6c757d;">Puede editar este campo</small>
                </div>
              </div>
              <div class="form-actions">
                <button type="button" id="btn-guardar-config" class="btn btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Base de Datos</h2>
          </div>
          <div class="card-body">
            <p>Crea o restaura una copia de seguridad de tu base de datos.</p>
            <div class="button-group">
                <button id="btn-crear-backup" class="btn">Crear Backup</button>
                <button id="btn-restaurar-backup" class="btn btn-secondary">Restaurar Backup</button>
            </div>
          </div>
        </div>

        <div class="card">
            <div class="card-header">
              <h2>Información del Sistema</h2>
            </div>
            <div class="card-body">
              <ul class="system-info-list">
                  <li><strong>Plataforma:</strong> <span id="sys-platform">Cargando...</span></li>
                  <li><strong>Versión App:</strong> <span id="sys-version">Cargando...</span></li>
                  <li><strong>Ruta DB:</strong> <span id="sys-db-path">Cargando...</span></li>
              </ul>
            </div>
        </div>
      </div>
    `;
  },

  /**
   * Inicializa la lógica de la vista después de renderizar
   */
  async init() {
    this.setupEventListeners();
    await this.cargarConfiguracion();
  },

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    const btnGuardar = document.getElementById("btn-guardar-config");
    btnGuardar.addEventListener("click", () => this.guardarConfiguracion());

    const btnBackup = document.getElementById("btn-crear-backup");
    btnBackup.addEventListener("click", () => this.crearBackup());

    const btnRestore = document.getElementById("btn-restaurar-backup");
    btnRestore.addEventListener("click", () => this.restaurarBackup());
  },

  /**
   * Carga configuración en los campos del formulario
   * Carga desde la tabla configuraciones con las claves: empresa_nombre, empresa_rnc, etc.
   */
  async cargarConfiguracion() {
    try {
      // Cargar desde la tabla configuraciones directamente
      const configRows = await api.dbQuery(`
        SELECT config_key, config_value 
        FROM configuraciones 
        WHERE config_key IN ('empresa_nombre', 'empresa_rnc', 'empresa_telefono', 'empresa_direccion', 'empresa_email', 'EMPRESA_TELEFONO', 'EMPRESA_DIRECCION', 'EMPRESA_CORREO', 'EMPRESA_NOMBRE', 'EMPRESA_IDENTIFICACION')
      `);
      
      // Convertir array a objeto
      const config = {};
      configRows.forEach((row) => {
        const key = row.config_key.toLowerCase();
        if (key.includes('empresa_nombre') || key.includes('nombre')) {
          config.nombre = row.config_value || '';
        } else if (key.includes('empresa_rnc') || key.includes('identificacion')) {
          config.rnc = row.config_value || '';
        } else if (key.includes('empresa_telefono') || key.includes('telefono')) {
          config.telefono = row.config_value || '';
        } else if (key.includes('empresa_direccion') || key.includes('direccion')) {
          config.direccion = row.config_value || '';
        } else if (key.includes('empresa_email') || key.includes('empresa_correo') || key.includes('correo')) {
          config.email = row.config_value || '';
        }
      });

      // Cargar valores en los campos
      if (config.nombre) {
        document.getElementById("empresa-nombre").value = config.nombre;
      }
      if (config.rnc) {
        document.getElementById("empresa-rnc").value = config.rnc;
      }
      if (config.telefono) {
        document.getElementById("empresa-telefono").value = config.telefono;
      }
      if (config.direccion) {
        document.getElementById("empresa-direccion").value = config.direccion;
      }
      if (config.email) {
        document.getElementById("empresa-email").value = config.email;
      }

      // Cargar información del sistema
      const sysInfo = await api.getSystemInfo();
      if (sysInfo) {
        document.getElementById("sys-platform").textContent = sysInfo.platform;
        document.getElementById("sys-version").textContent = sysInfo.version;
        document.getElementById("sys-db-path").textContent = sysInfo.dbPath;
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
      toast.error("Error cargando configuración");
    }
  },

  /**
   * Guarda configuración
   * Solo guarda los campos editables (Teléfono, Email, Dirección)
   * Nombre y RNC vienen de la BD maestra y no se pueden modificar
   */
  async guardarConfiguracion() {
    try {
      const telefono = document.getElementById("empresa-telefono").value.trim();
      const direccion = document.getElementById("empresa-direccion").value.trim();
      const email = document.getElementById("empresa-email").value.trim();
      
      // Validar email si se proporciona
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("El email ingresado no es válido");
        return;
      }
      
      // Guardar solo los campos editables en la tabla configuraciones
      // Usar INSERT OR REPLACE para actualizar o crear si no existe
      if (telefono) {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('empresa_telefono', ?)`,
          [telefono]
        );
      }
      
      if (direccion) {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('empresa_direccion', ?)`,
          [direccion]
        );
      }
      
      if (email) {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('empresa_email', ?)`,
          [email]
        );
      }

      // También guardar en formato legacy si existe
      if (telefono) {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('EMPRESA_TELEFONO', ?)`,
          [telefono]
        );
      }
      
      if (direccion) {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('EMPRESA_DIRECCION', ?)`,
          [direccion]
        );
      }
      
      if (email) {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('EMPRESA_CORREO', ?)`,
          [email]
        );
      }

      toast.success("✅ Configuración guardada exitosamente");
      
      // Recargar la configuración para mostrar los valores actualizados
      await this.cargarConfiguracion();
    } catch (error) {
      console.error("Error guardando configuración:", error);
      toast.error("Error guardando configuración");
    }
  },

  /**
   * Crea backup de la base de datos
   */
  async crearBackup() {
    try {
      const result = await api.dbBackup();
      if (result.success) {
        toast.success(`Backup creado: ${result.path}`);
      } else {
        toast.error(result.error || "Error creando backup");
      }
    } catch (error) {
      console.error("Error creando backup:", error);
      toast.error("Error creando backup");
    }
  },

  /**
   * Restaura backup
   */
  async restaurarBackup() {
    if (
      !confirm(
        "¿Está seguro de restaurar un backup? Esto sobrescribirá los datos actuales."
      )
    ) {
      return;
    }
    toast.info("Funcionalidad en desarrollo.");
  },
};

export default ConfiguracionView;