/**
 * Vista del Módulo de Compras
 * @module renderer/modules/compras/compras.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate, formatCurrency } from "../../utils/helpers.js";
import { Validator } from "../../utils/validator.util.js";
import { handleError } from "../../utils/error-handler.js";

export const ComprasView = {
  compras: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Registro de Compras</h1>
          <div class="header-actions">
            <button id="btn-nueva-compra" class="btn btn-primary">Registrar Compra</button>
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
                    <th>Proveedor</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="compras-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Modal para Nueva Compra (simplificado) -->
      <div id="modal-compra" class="modal-backdrop hidden">
        <div class="modal">
          <div class="modal-header">
            <h2 id="modal-compra-titulo">Registrar Nueva Compra</h2>
            <button id="btn-cerrar-modal-compra" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p>El registro detallado de compras (con productos, cantidades, etc.) es una función avanzada.</p>
            <p>Por ahora, puedes registrar un resumen de la compra.</p>
            <form id="form-compra">
              <div class="form-grid">
                <div class="form-group">
                  <label for="compra-proveedor">Proveedor (Opcional)</label>
                  <input type="text" id="compra-proveedor" class="form-control">
                </div>
                <div class="form-group">
                  <label for="compra-total">Monto Total</label>
                  <input type="number" id="compra-total" class="form-control" required step="0.01">
                </div>
                <div class="form-group">
                  <label for="compra-estado">Estado</label>
                  <select id="compra-estado" class="form-control">
                    <option>Pagada</option>
                    <option>Pendiente</option>
                  </select>
                </div>
                 <div class="form-group">
                  <label for="compra-numero">Número de Factura/Comprobante</label>
                  <input type="text" id="compra-numero" class="form-control">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-compra" class="btn">Cancelar</button>
            <button type="button" id="btn-guardar-compra" class="btn btn-primary">Guardar Compra</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarCompras();
    this.setupEventListeners();
  },

  setupEventListeners() {
    document
      .getElementById("btn-nueva-compra")
      .addEventListener("click", () => this.nuevaCompra());

    // Modal listeners
    document
      .getElementById("btn-cerrar-modal-compra")
      .addEventListener("click", () => this.ocultarModal());
    document
      .getElementById("btn-cancelar-compra")
      .addEventListener("click", () => this.ocultarModal());
    document
      .getElementById("btn-guardar-compra")
      .addEventListener("click", () => this.guardarCompra());
  },

  async cargarCompras() {
    try {
      this.compras = await api.dbQuery(
        `SELECT c.*, p.nombre as proveedor_nombre FROM compras c LEFT JOIN proveedores p ON p.id = c.proveedor_id ORDER BY c.fecha DESC LIMIT 100`
      );
      this.mostrarCompras();
    } catch (error) {
      console.error("Error cargando compras:", error);
      toast.error("Error cargando compras");
    }
  },

  mostrarCompras() {
    const tbody = document.getElementById("compras-table-body");
    if (this.compras.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No hay compras registradas</td></tr>';
      return;
    }
    tbody.innerHTML = this.compras
      .map(
        (c) => `
      <tr>
        <td>${c.numero || c.id}</td>
        <td>${formatDate(c.fecha)}</td>
        <td>${c.proveedor_nombre || "N/A"}</td>
        <td>${formatCurrency(c.total)}</td>
        <td><span class="badge badge-${(c.estado || "").toLowerCase()}">${
          c.estado
        }</span></td>
        <td>
          <button class="btn btn-sm btn-secondary btn-ver" data-id="${
            c.id
          }"><span class="material-icons">visibility</span></button>
        </td>
      </tr>
    `
      )
      .join("");

    tbody
      .querySelectorAll(".btn-ver")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.verCompra(parseInt(btn.dataset.id))
        )
      );
  },

  nuevaCompra() {
    document.getElementById("form-compra").reset();
    document.getElementById("modal-compra").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-compra").classList.add("hidden");
  },

  async guardarCompra() {
    try {
      const total = parseFloat(document.getElementById("compra-total").value);
      const estado = document.getElementById("compra-estado").value;
      const numero = document.getElementById("compra-numero").value.trim();
      const proveedor = document
        .getElementById("compra-proveedor")
        .value.trim();

      // ===== VALIDACIONES =====

      // 1. Validar total positivo
      if (!Validator.isPositiveNumber(total)) {
        toast.error("El monto total debe ser un número positivo");
        return;
      }

      // 2. Validar total razonable (máximo 10 millones)
      if (total > 10000000) {
        toast.error(
          "El monto total parece demasiado alto. Verifique el valor."
        );
        return;
      }

      // 3. Validar estado
      const estadosValidos = ["Pagada", "Pendiente"];
      if (!estadosValidos.includes(estado)) {
        toast.error("Estado inválido");
        return;
      }

      // 4. Validar número de factura si se proporciona
      if (numero && !Validator.isValidLength(numero, 1, 50)) {
        toast.error("El número de factura debe tener entre 1 y 50 caracteres");
        return;
      }

      // 5. Validar proveedor si se proporciona
      if (proveedor && !Validator.isValidLength(proveedor, 1, 200)) {
        toast.error(
          "El nombre del proveedor debe tener entre 1 y 200 caracteres"
        );
        return;
      }

      // 6. Sanitizar entrada
      const numeroSanitizado = Validator.sanitizeInput(numero);
      const proveedorSanitizado = Validator.sanitizeInput(proveedor);

      // ===== GUARDAR EN BASE DE DATOS =====

      await api.dbQuery(
        `INSERT INTO compras (fecha, total, estado, numero) VALUES (datetime('now'), ?, ?, ?)`,
        [total, estado, numeroSanitizado]
      );

      toast.success(
        `Compra registrada exitosamente. Total: ${formatCurrency(total)}`
      );
      this.ocultarModal();
      await this.cargarCompras();
    } catch (error) {
      handleError(error, "Error al registrar la compra");
    }
  },

  async verCompra(id) {
    toast.info(
      `Ver detalles de la compra #${id} (funcionalidad en desarrollo).`
    );
  },
};

export default ComprasView;
