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
                  <input type="text" id="empresa-nombre" class="form-control">
                </div>
                <div class="form-group">
                  <label for="empresa-rnc">RNC</label>
                  <input type="text" id="empresa-rnc" class="form-control">
                </div>
                <div class="form-group">
                  <label for="empresa-telefono">Teléfono</label>
                  <input type="tel" id="empresa-telefono" class="form-control">
                </div>
                <div class="form-group">
                  <label for="empresa-email">Email</label>
                  <input type="email" id="empresa-email" class="form-control">
                </div>
                <div class="form-group full-width">
                  <label for="empresa-direccion">Dirección</label>
                  <textarea id="empresa-direccion" class="form-control" rows="3"></textarea>
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
   */
  async cargarConfiguracion() {
    try {
      // Usando el método correcto expuesto en el preload
      const config = await api.configGet('empresa');
      if (config) {
        document.getElementById("empresa-nombre").value = config.nombre || "";
        document.getElementById("empresa-rnc").value = config.rnc || "";
        document.getElementById("empresa-telefono").value = config.telefono || "";
        document.getElementById("empresa-direccion").value = config.direccion || "";
        document.getElementById("empresa-email").value = config.email || "";
      }

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
   */
  async guardarConfiguracion() {
    try {
      const config = {
        nombre: document.getElementById("empresa-nombre").value,
        rnc: document.getElementById("empresa-rnc").value,
        telefono: document.getElementById("empresa-telefono").value,
        direccion: document.getElementById("empresa-direccion").value,
        email: document.getElementById("empresa-email").value
      };
      
      // Usando el método correcto expuesto en el preload
      await api.configSet('empresa', config);

      toast.success("Configuración guardada exitosamente");
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