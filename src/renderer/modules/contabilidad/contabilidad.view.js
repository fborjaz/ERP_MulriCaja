/**
 * Vista del Módulo de Contabilidad
 * @module renderer/modules/contabilidad/contabilidad.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate, formatCurrency } from "../../utils/helpers.js";

export const ContabilidadView = {
  asientos: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Módulo de Contabilidad</h1>
          <div class="header-actions">
            <button id="btn-libro-diario" class="btn btn-secondary">Libro Diario</button>
            <button id="btn-libro-mayor" class="btn btn-secondary">Libro Mayor</button>
            <button id="btn-balance-comprobacion" class="btn btn-secondary">Balance</button>
            <button id="btn-nuevo-asiento" class="btn btn-primary">Nuevo Asiento</button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h2>Últimos Asientos Contables</h2>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="asientos-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Nuevo Asiento -->
      <div id="modal-asiento" class="modal-backdrop hidden">
        <div class="modal">
          <div class="modal-header">
            <h2>Nuevo Asiento Contable</h2>
            <button id="btn-cerrar-modal-asiento" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="form-asiento">
                <div class="form-group">
                  <label for="asiento-descripcion">Descripción</label>
                  <input type="text" id="asiento-descripcion" class="form-control" required>
                </div>
                <div class="form-group">
                  <label for="asiento-monto">Monto</label>
                  <input type="number" id="asiento-monto" class="form-control" required step="0.01">
                </div>
                <p>Nota: La selección de cuentas (débito/crédito) es una función avanzada que se simplifica aquí.</p>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-asiento" class="btn">Cancelar</button>
            <button type="button" id="btn-guardar-asiento" class="btn btn-primary">Guardar Asiento</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarAsientos();
    this.setupEventListeners();
  },

  setupEventListeners() {
    document.getElementById("btn-nuevo-asiento").addEventListener("click", () => this.nuevoAsiento());
    document.getElementById("btn-libro-diario").addEventListener("click", () => this.verLibroDiario());
    document.getElementById("btn-libro-mayor").addEventListener("click", () => this.verLibroMayor());
    document.getElementById("btn-balance-comprobacion").addEventListener("click", () => this.verBalanceComprobacion());

    // Modal listeners
    document.getElementById("btn-cerrar-modal-asiento").addEventListener("click", () => this.ocultarModal());
    document.getElementById("btn-cancelar-asiento").addEventListener("click", () => this.ocultarModal());
    document.getElementById("btn-guardar-asiento").addEventListener("click", () => this.guardarAsiento());
  },

  async cargarAsientos() {
    try {
      this.asientos = await api.dbQuery(
        `SELECT * FROM asientos_contables ORDER BY fecha DESC LIMIT 100`
      );
      this.mostrarAsientos();
    } catch (error) {
      console.error("Error cargando asientos:", error);
      toast.error("Error cargando asientos contables");
    }
  },

  mostrarAsientos() {
    const tbody = document.getElementById("asientos-table-body");
    if (!tbody) return;

    if (this.asientos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay asientos contables registrados</td></tr>';
      return;
    }

    tbody.innerHTML = this.asientos.map(a => `
      <tr>
        <td>${a.id}</td>
        <td>${formatDate(a.fecha)}</td>
        <td>${a.descripcion}</td>
        <td>${formatCurrency(a.monto)}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-ver" data-id="${a.id}"><span class="material-icons">visibility</span></button>
        </td>
      </tr>
    `).join("");
    
    tbody.querySelectorAll(".btn-ver").forEach(btn => btn.addEventListener("click", () => this.verAsiento(parseInt(btn.dataset.id))));
  },

  nuevoAsiento() {
    document.getElementById("form-asiento").reset();
    document.getElementById("modal-asiento").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-asiento").classList.add("hidden");
  },

  async guardarAsiento() {
    const descripcion = document.getElementById("asiento-descripcion").value;
    const monto = parseFloat(document.getElementById("asiento-monto").value);

    if (!descripcion || !monto || monto <= 0) {
      toast.error("Descripción y monto son obligatorios.");
      return;
    }

    try {
      // Simplificación: se registra como un asiento genérico.
      await api.dbQuery(
        `INSERT INTO asientos_contables (fecha, descripcion, monto) VALUES (datetime('now'), ?, ?)`,
        [descripcion, monto]
      );
      toast.success("Asiento contable registrado.");
      this.ocultarModal();
      await this.cargarAsientos();
    } catch(error) {
      console.error("Error guardando asiento:", error);
      toast.error("Error al registrar el asiento.");
    }
  },

  verAsiento(id) {
    toast.info(`Ver detalles del asiento #${id} (funcionalidad en desarrollo).`);
  },
  
  verLibroDiario() {
    toast.info("Reporte 'Libro Diario' en desarrollo.");
  },

  verLibroMayor() {
    toast.info("Reporte 'Libro Mayor' en desarrollo.");
  },

  verBalanceComprobacion() {
    toast.info("Reporte 'Balance de Comprobación' en desarrollo.");
  },
};

export default ContabilidadView;