/**
 * Vista del Módulo de Despachos
 * @module renderer/modules/despachos/despachos.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate } from "../../utils/helpers.js";
import { Validator } from "../../utils/validator.util.js";
import { handleError } from "../../utils/error-handler.js";

export const DespachosView = {
  despachos: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Gestión de Despachos</h1>
          <div class="header-actions">
            <button id="btn-nuevo-despacho" class="btn btn-primary">Nuevo Despacho</button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>ID Despacho</th>
                    <th>Fecha</th>
                    <th>Factura N°</th>
                    <th>Conductor</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="despachos-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Nuevo Despacho -->
      <div id="modal-despacho" class="modal-backdrop hidden">
        <div class="modal">
          <div class="modal-header">
            <h2>Nuevo Despacho</h2>
            <button id="btn-cerrar-modal-despacho" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="form-despacho">
              <div class="form-group">
                <label for="despacho-venta-id">ID de la Venta</label>
                <input type="number" id="despacho-venta-id" class="form-control" placeholder="ID de la venta a despachar" required>
              </div>
              <div class="form-group">
                <label for="despacho-conductor-id">Conductor</label>
                <input type="text" id="despacho-conductor-id" class="form-control" placeholder="ID del conductor" required>
              </div>
              <div class="form-group">
                <label for="despacho-direccion">Dirección de Entrega</label>
                <textarea id="despacho-direccion" class="form-control" rows="3" required></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-despacho" class="btn">Cancelar</button>
            <button type="button" id="btn-guardar-despacho" class="btn btn-primary">Crear Despacho</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarDespachos();
    this.setupEventListeners();
  },

  setupEventListeners() {
    document
      .getElementById("btn-nuevo-despacho")
      .addEventListener("click", () => this.nuevoDespacho());

    // Modal listeners
    document
      .getElementById("btn-cerrar-modal-despacho")
      .addEventListener("click", () => this.ocultarModal());
    document
      .getElementById("btn-cancelar-despacho")
      .addEventListener("click", () => this.ocultarModal());
    document
      .getElementById("btn-guardar-despacho")
      .addEventListener("click", () => this.guardarDespacho());
  },

  async cargarDespachos() {
    try {
      // Usar tabla venta (singular) con campo delivery según esquema IMAXPOS
      this.despachos = await api.dbQuery(
        `SELECT v.venta_id as id, v.numero_factura, v.fecha, v.FechaEntrega as fecha_entrega,
                v.delivery, v.total, v.venta_status as estado,
                c.nombre_comercial as cliente_nombre, c.telefono1 as cliente_telefono,
                c.direccion as cliente_direccion,
                u.nombre as vendedor_nombre
         FROM venta v
         LEFT JOIN cliente c ON c.id_cliente = v.id_cliente
         LEFT JOIN usuario u ON u.nUsuCodigo = v.id_vendedor
         WHERE v.delivery = 1
         ORDER BY v.fecha DESC
         LIMIT 100`
      );
      this.mostrarDespachos();
    } catch (error) {
      console.error("Error cargando despachos:", error);
      toast.error("Error cargando despachos");
    }
  },

  mostrarDespachos() {
    const tbody = document.getElementById("despachos-table-body");
    if (this.despachos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No hay despachos pendientes o registrados</td></tr>';
      return;
    }
    tbody.innerHTML = this.despachos
      .map(
        (d) => `
      <tr>
        <td>${d.id}</td>
        <td>${formatDate(d.fecha)}</td>
        <td>${d.numero_factura || "-"}</td>
        <td>${d.conductor_nombre || "N/A"}</td>
        <td><span class="badge badge-${(d.estado || "").toLowerCase()}">${
          d.estado
        }</span></td>
        <td>
          <button class="btn btn-sm btn-secondary btn-ver" data-id="${
            d.id
          }"><span class="material-icons">visibility</span></button>
          ${
            d.estado !== "Completado"
              ? `<button class="btn btn-sm btn-success btn-completar" data-id="${d.id}"><span class="material-icons">check_circle</span></button>`
              : ""
          }
        </td>
      </tr>
    `
      )
      .join("");

    tbody
      .querySelectorAll(".btn-ver")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.verDespacho(parseInt(btn.dataset.id))
        )
      );
    tbody
      .querySelectorAll(".btn-completar")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.completar(parseInt(btn.dataset.id))
        )
      );
  },

  nuevoDespacho() {
    document.getElementById("form-despacho").reset();
    document.getElementById("modal-despacho").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-despacho").classList.add("hidden");
  },

  async guardarDespacho() {
    try {
      const ventaId = parseInt(
        document.getElementById("despacho-venta-id").value
      );
      const conductorId = document
        .getElementById("despacho-conductor-id")
        .value.trim();
      const direccion = document
        .getElementById("despacho-direccion")
        .value.trim();

      // ===== VALIDACIONES =====

      // 1. Validar ID de venta
      if (!Validator.isPositiveNumber(ventaId)) {
        toast.error("El ID de la venta debe ser un número positivo");
        return;
      }

      // 2. Validar conductor
      if (!Validator.isNotEmpty(conductorId)) {
        toast.error("El conductor es requerido");
        return;
      }

      if (!Validator.isValidLength(conductorId, 1, 100)) {
        toast.error("El conductor debe tener entre 1 y 100 caracteres");
        return;
      }

      // 3. Validar dirección
      if (!Validator.isNotEmpty(direccion)) {
        toast.error("La dirección de entrega es requerida");
        return;
      }

      if (!Validator.isValidLength(direccion, 10, 500)) {
        toast.error("La dirección debe tener entre 10 y 500 caracteres");
        return;
      }

      // 4. Verificar que la venta existe
      const ventaExiste = await api.dbQuery(
        "SELECT id FROM ventas WHERE id = ?",
        [ventaId]
      );

      if (ventaExiste.length === 0) {
        toast.error(`No se encontró la venta con ID ${ventaId}`);
        return;
      }

      // 5. Sanitizar entrada
      const conductorSanitizado = Validator.sanitizeInput(conductorId);
      const direccionSanitizada = Validator.sanitizeInput(direccion);

      // ===== GUARDAR EN BASE DE DATOS =====

      await api.dbQuery(
        `INSERT INTO despachos (venta_id, conductor_id, direccion, estado, fecha) 
         VALUES (?, ?, ?, 'Pendiente', datetime('now'))`,
        [ventaId, conductorSanitizado, direccionSanitizada]
      );

      toast.success(`Despacho creado exitosamente para venta #${ventaId}`);
      this.ocultarModal();
      await this.cargarDespachos();
    } catch (error) {
      handleError(error, "Error al crear el despacho");
    }
  },

  verDespacho(id) {
    const despacho = this.despachos.find((d) => d.id === id);
    if (despacho) {
      alert(
        `Detalles del Despacho #${id}:\nFactura: ${despacho.numero_factura}\nDirección: ${despacho.direccion}\nEstado: ${despacho.estado}`
      );
    }
  },

  async completar(id) {
    if (!confirm("¿Marcar este despacho como completado?")) return;
    try {
      await api.dbQuery(
        "UPDATE despachos SET estado = 'Completado' WHERE id = ?",
        [id]
      );
      toast.success("Despacho completado");
      await this.cargarDespachos();
    } catch (error) {
      console.error("Error completando despacho:", error);
      toast.error("Error al completar el despacho");
    }
  },
};

export default DespachosView;
