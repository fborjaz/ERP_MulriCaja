/**
 * Vista del Módulo de Apartados
 * @module renderer/modules/apartados/apartados.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate, formatCurrency } from "../../utils/helpers.js";
import { Validator } from "../../utils/validator.util.js";
import { handleError } from "../../utils/error-handler.js";

export const ApartadosView = {
  apartados: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Gestión de Apartados</h1>
          <div class="header-actions">
            <button id="btn-nuevo-apartado" class="btn btn-primary" disabled>Nuevo Apartado (desde Ventas)</button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Abonado</th>
                    <th>Pendiente</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="apartados-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Abonar -->
      <div id="modal-abonar" class="modal-backdrop hidden">
        <div class="modal">
          <div class="modal-header">
            <h2>Abonar a Apartado</h2>
            <button id="btn-cerrar-modal-abono" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <p>Apartado N°: <strong id="abono-apartado-id"></strong></p>
            <p>Deuda actual: <strong id="abono-deuda-actual"></strong></p>
            <form id="form-abono">
              <input type="hidden" id="abono-apartado-id-form">
              <div class="form-group">
                <label for="abono-monto">Monto a Abonar</label>
                <input type="number" id="abono-monto" class="form-control" required step="0.01">
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-abono" class="btn">Cancelar</button>
            <button type="button" id="btn-guardar-abono" class="btn btn-primary">Registrar Abono</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarApartados();
    this.setupEventListeners();
  },

  setupEventListeners() {
    // La creación de apartados debería originarse en la pantalla de ventas
    const btnNuevo = document.getElementById("btn-nuevo-apartado");
    btnNuevo.addEventListener("click", () =>
      toast.info("Los apartados se crean desde la pantalla de Ventas.")
    );

    // Modal listeners (se delegan en mostrarApartados)
  },

  async cargarApartados() {
    try {
      this.apartados = await api.dbQuery(
        `SELECT a.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido
         FROM apartados a
         LEFT JOIN clientes c ON c.id = a.cliente_id
         WHERE a.estado = 'Pendiente'
         ORDER BY a.fecha DESC`
      );
      this.mostrarApartados();
    } catch (error) {
      console.error("Error cargando apartados:", error);
      toast.error("Error al cargar los apartados.");
    }
  },

  mostrarApartados() {
    const tbody = document.getElementById("apartados-table-body");
    if (!tbody) return;

    if (this.apartados.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No hay apartados pendientes</td></tr>';
      return;
    }

    tbody.innerHTML = this.apartados
      .map((a) => {
        const pendiente = a.total - a.abonado;
        return `
      <tr>
        <td>${a.id}</td>
        <td>${formatDate(a.fecha)}</td>
        <td>${a.cliente_nombre} ${a.cliente_apellido || ""}</td>
        <td>${formatCurrency(a.total)}</td>
        <td>${formatCurrency(a.abonado)}</td>
        <td class="text-danger">${formatCurrency(pendiente)}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-abonar" data-id="${
            a.id
          }">Abonar</button>
          ${
            pendiente <= 0
              ? `<button class="btn btn-sm btn-success btn-completar" data-id="${a.id}">Completar</button>`
              : ""
          }
        </td>
      </tr>
    `;
      })
      .join("");

    tbody
      .querySelectorAll(".btn-abonar")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.mostrarModalAbono(parseInt(btn.dataset.id))
        )
      );
    tbody
      .querySelectorAll(".btn-completar")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.completarApartado(parseInt(btn.dataset.id))
        )
      );
  },

  mostrarModalAbono(id) {
    const apartado = this.apartados.find((a) => a.id === id);
    if (!apartado) return;

    document.getElementById("abono-apartado-id").textContent = id;
    document.getElementById("abono-deuda-actual").textContent = formatCurrency(
      apartado.total - apartado.abonado
    );
    document.getElementById("abono-apartado-id-form").value = id;
    document.getElementById("abono-monto").value = "";

    document.getElementById("modal-abonar").classList.remove("hidden");

    document.getElementById("btn-cerrar-modal-abono").onclick = () =>
      this.ocultarModalAbono();
    document.getElementById("btn-cancelar-abono").onclick = () =>
      this.ocultarModalAbono();
    document.getElementById("btn-guardar-abono").onclick = () =>
      this.guardarAbono();
  },

  ocultarModalAbono() {
    document.getElementById("modal-abonar").classList.add("hidden");
  },

  async guardarAbono() {
    try {
      const id = parseInt(
        document.getElementById("abono-apartado-id-form").value
      );
      const monto = parseFloat(document.getElementById("abono-monto").value);

      // ===== VALIDACIONES =====

      // 1. Validar monto positivo
      if (!Validator.isPositiveNumber(monto)) {
        toast.error("El monto a abonar debe ser un número positivo");
        return;
      }

      // 2. Obtener apartado y validar deuda pendiente
      const apartado = this.apartados.find((a) => a.id === id);
      if (!apartado) {
        toast.error("Apartado no encontrado");
        return;
      }

      const pendiente = apartado.total - apartado.abonado;

      // 3. Validar que el abono no exceda la deuda
      if (monto > pendiente) {
        toast.error(
          `El abono (${formatCurrency(
            monto
          )}) no puede ser mayor que la deuda pendiente (${formatCurrency(
            pendiente
          )})`
        );
        return;
      }

      // 4. Validar monto razonable (máximo 1 millón)
      if (monto > 1000000) {
        toast.error("El monto parece demasiado alto. Verifique el valor.");
        return;
      }

      // ===== GUARDAR EN BASE DE DATOS =====

      await api.dbQuery(
        "UPDATE apartados SET abonado = abonado + ? WHERE id = ?",
        [monto, id]
      );

      const nuevoAbonado = apartado.abonado + monto;
      const nuevoPendiente = apartado.total - nuevoAbonado;

      toast.success(
        `Abono registrado: ${formatCurrency(monto)}. ` +
          `Pendiente: ${formatCurrency(nuevoPendiente)}`
      );

      this.ocultarModalAbono();
      await this.cargarApartados();
    } catch (error) {
      handleError(error, "Error al registrar el abono");
    }
  },

  async completarApartado(id) {
    if (!confirm("¿Marcar este apartado como completado/entregado?")) return;
    try {
      await api.dbQuery(
        "UPDATE apartados SET estado = 'Completado' WHERE id = ?",
        [id]
      );
      toast.success("Apartado completado.");
      this.cargarApartados();
    } catch (error) {
      console.error("Error completando apartado:", error);
      toast.error("Error al completar el apartado.");
    }
  },
};

export default ApartadosView;
