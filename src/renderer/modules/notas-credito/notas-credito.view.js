/**
 * Vista del Módulo de Notas de Crédito
 * @module renderer/modules/notas-credito/notas-credito.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate, formatCurrency } from "../../utils/helpers.js";

export const NotasCreditoView = {
  notas: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Notas de Crédito</h1>
          <div class="header-actions">
            <button id="btn-nueva-nota-credito" class="btn btn-primary">Nueva Nota de Crédito</button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Factura Afectada</th>
                    <th>Cliente</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="notas-credito-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Nueva Nota de Crédito -->
      <div id="modal-nota" class="modal-backdrop hidden">
        <div class="modal">
          <div class="modal-header">
            <h2>Nueva Nota de Crédito</h2>
            <button id="btn-cerrar-modal-nota" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="form-nota">
                <div class="form-group">
                  <label for="nota-venta-id">ID de la Venta Original</label>
                  <input type="number" id="nota-venta-id" class="form-control" required placeholder="Factura a la que aplica">
                </div>
                <div class="form-group">
                  <label for="nota-monto">Monto</label>
                  <input type="number" id="nota-monto" class="form-control" required step="0.01">
                </div>
                <div class="form-group">
                  <label for="nota-razon">Razón</label>
                  <textarea id="nota-razon" class="form-control" rows="3" required></textarea>
                </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-nota" class="btn">Cancelar</button>
            <button type="button" id="btn-guardar-nota" class="btn btn-primary">Crear Nota</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarNotas();
    this.setupEventListeners();
  },

  setupEventListeners() {
    document.getElementById("btn-nueva-nota-credito").addEventListener("click", () => this.nuevaNota());
    
    // Modal listeners
    document.getElementById("btn-cerrar-modal-nota").addEventListener("click", () => this.ocultarModal());
    document.getElementById("btn-cancelar-nota").addEventListener("click", () => this.ocultarModal());
    document.getElementById("btn-guardar-nota").addEventListener("click", () => this.guardarNota());
  },

  async cargarNotas() {
    try {
      this.notas = await api.dbQuery(
        `SELECT nc.*, v.numero_factura, c.nombre as cliente_nombre
         FROM notas_credito nc
         LEFT JOIN ventas v ON v.id = nc.venta_id
         LEFT JOIN clientes c ON c.id = nc.cliente_id
         ORDER BY nc.fecha DESC
         LIMIT 100`
      );
      this.mostrarNotas();
    } catch (error) {
      console.error("Error cargando notas de crédito:", error);
      toast.error("Error al cargar notas de crédito");
    }
  },

  mostrarNotas() {
    const tbody = document.getElementById("notas-credito-table-body");
    if (!tbody) return;

    if (this.notas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay notas de crédito registradas</td></tr>';
      return;
    }

    tbody.innerHTML = this.notas.map(n => `
      <tr>
        <td>${n.id}</td>
        <td>${formatDate(n.fecha)}</td>
        <td>${n.numero_factura || 'N/A'}</td>
        <td>${n.cliente_nombre || 'N/A'}</td>
        <td>${formatCurrency(n.monto)}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-ver" data-id="${n.id}"><span class="material-icons">visibility</span></button>
        </td>
      </tr>
    `).join("");
    
    tbody.querySelectorAll(".btn-ver").forEach(btn => btn.addEventListener("click", () => this.verNota(parseInt(btn.dataset.id))));
  },

  nuevaNota() {
    document.getElementById("form-nota").reset();
    document.getElementById("modal-nota").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-nota").classList.add("hidden");
  },

  async guardarNota() {
    const ventaId = document.getElementById("nota-venta-id").value;
    const monto = parseFloat(document.getElementById("nota-monto").value);
    const razon = document.getElementById("nota-razon").value;

    if (!ventaId || !monto || monto <= 0 || !razon) {
      toast.error("Todos los campos son obligatorios.");
      return;
    }

    try {
      // Necesitamos el ID del cliente de la venta original
      const venta = await api.dbQuery("SELECT cliente_id FROM ventas WHERE id = ?", [ventaId]);
      if (venta.length === 0) {
        toast.error("La venta original no fue encontrada.");
        return;
      }
      const clienteId = venta[0].cliente_id;

      await api.dbQuery(
        `INSERT INTO notas_credito (venta_id, cliente_id, monto, razon, fecha, estado) VALUES (?, ?, ?, ?, datetime('now'), 'Emitida')`,
        [ventaId, clienteId, monto, razon]
      );
      toast.success("Nota de crédito creada exitosamente.");
      this.ocultarModal();
      await this.cargarNotas();
    } catch(error) {
      console.error("Error creando nota de crédito:", error);
      toast.error("Error al crear la nota de crédito.");
    }
  },

  verNota(id) {
    toast.info(`Ver detalles de la nota #${id} (funcionalidad en desarrollo).`);
  },
};

export default NotasCreditoView;