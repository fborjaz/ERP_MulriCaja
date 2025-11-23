/**
 * Vista del Módulo de Cotizaciones
 * @module renderer/modules/cotizaciones/cotizaciones.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate, formatCurrency } from "../../utils/helpers.js";

export const CotizacionesView = {
  cotizaciones: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Gestión de Cotizaciones</h1>
          <div class="header-actions">
             <button id="btn-nueva-cotizacion" class="btn btn-primary" disabled>Nueva Cotización (desde Ventas)</button>
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
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody id="cotizaciones-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarCotizaciones();
    this.setupEventListeners();
  },

  setupEventListeners() {
     const btnNuevo = document.getElementById("btn-nueva-cotizacion");
     btnNuevo.addEventListener("click", () => toast.info("Las cotizaciones se crean desde la pantalla de Ventas."));
  },

  async cargarCotizaciones() {
    try {
      this.cotizaciones = await api.dbQuery(
        `SELECT c.*, cl.nombre as cliente_nombre, cl.apellido as cliente_apellido
         FROM cotizaciones c
         LEFT JOIN clientes cl ON cl.id = c.cliente_id
         ORDER BY c.fecha DESC
         LIMIT 100`
      );
      this.mostrarCotizaciones();
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
      toast.error("Error al cargar cotizaciones");
    }
  },

  mostrarCotizaciones() {
    const tbody = document.getElementById("cotizaciones-table-body");
    if (!tbody) return;

    if (this.cotizaciones.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay cotizaciones registradas</td></tr>';
      return;
    }

    tbody.innerHTML = this.cotizaciones.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${formatDate(c.fecha)}</td>
        <td>${c.cliente_nombre || 'N/A'} ${c.cliente_apellido || ''}</td>
        <td>${formatCurrency(c.total)}</td>
        <td><span class="badge badge-${(c.estado || '').toLowerCase()}">${c.estado}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary btn-ver" data-id="${c.id}"><span class="material-icons">visibility</span></button>
          ${c.estado === 'Pendiente' ? `<button class="btn btn-sm btn-success btn-convertir" data-id="${c.id}"><span class="material-icons">shopping_cart</span></button>` : ''}
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-ver").forEach(btn => btn.addEventListener("click", () => this.verCotizacion(parseInt(btn.dataset.id))));
    tbody.querySelectorAll(".btn-convertir").forEach(btn => btn.addEventListener("click", () => this.convertirAVenta(parseInt(btn.dataset.id))));
  },

  verCotizacion(id) {
    toast.info(`Ver detalles de la cotización #${id} (funcionalidad en desarrollo).`);
  },

  async convertirAVenta(id) {
    if (!confirm("¿Está seguro de que desea convertir esta cotización en una venta?")) return;
    try {
      // Lógica para convertir a venta (puede ser compleja)
      // 1. Marcar cotización como 'Convertida'
      await api.dbQuery("UPDATE cotizaciones SET estado = 'Convertida' WHERE id = ?", [id]);
      
      // 2. Crear una nueva venta (esto es una simplificación)
      // En un caso real, se debería llevar al usuario a la pantalla de ventas con el carrito precargado
      toast.success("Cotización convertida. En un sistema real, se crearía la venta.");

      await this.cargarCotizaciones();
    } catch(error) {
      console.error("Error convirtiendo cotización:", error);
      toast.error("Error al convertir la cotización.");
    }
  },
};

export default CotizacionesView;