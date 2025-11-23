/**
 * Vista del Módulo de Dashboard
 * @module renderer/modules/dashboard/dashboard.view
 */

import { db } from "../../services/database.service.js";
import { formatCurrency } from "../../utils/helpers.js";
import { toast } from "../../components/notifications/toast.js";

export const DashboardView = {
  intervalId: null,

  /**
   * Renderiza el HTML de la vista
   * @returns {string} HTML de la vista
   */
  render() {
    return `
      <div class="view-container">
        <!-- Tarjetas de Estadísticas -->
        <div class="stat-cards-container">
          <div class="stat-card stat-card-primary">
            <div class="stat-card-icon icon-ventas">
              <span class="material-icons">point_of_sale</span>
            </div>
            <div class="stat-card-info">
              <p>Ventas de Hoy</p>
              <h3 id="ventas-hoy">0</h3>
            </div>
          </div>
          <div class="stat-card stat-card-success">
            <div class="stat-card-icon icon-ingresos">
              <span class="material-icons">attach_money</span>
            </div>
            <div class="stat-card-info">
              <p>Ingresos de Hoy</p>
              <h3 id="ingresos-hoy">$0.00</h3>
            </div>
          </div>
          <div class="stat-card stat-card-danger">
            <div class="stat-card-icon icon-stock">
              <span class="material-icons">warning</span>
            </div>
            <div class="stat-card-info">
              <p>Productos Bajo Stock</p>
              <h3 id="productos-bajo-stock">0</h3>
            </div>
          </div>
          <div class="stat-card stat-card-warning">
            <div class="stat-card-icon icon-productos">
              <span class="material-icons">inventory_2</span>
            </div>
            <div class="stat-card-info">
              <p>Total de Productos</p>
              <h3 id="total-productos">0</h3>
            </div>
          </div>
        </div>

        <!-- Tabla de Productos Bajo Stock -->
        <div class="card">
          <div class="card-header">
            <h2>Productos con Bajo Stock</h2>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                  </tr>
                </thead>
                <tbody id="productos-bajo-stock-body">
                  <tr><td colspan="4" style="text-align: center;">Cargando...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Inicializa la lógica del dashboard después de renderizar
   */
  async init() {
    await this.cargarDatos();
    this.setupAutoRefresh();
  },

  /**
   * Carga todos los datos del dashboard
   */
  async cargarDatos() {
    try {
      await Promise.all([
        this.cargarEstadisticas(),
        this.cargarProductosBajoStock(),
      ]);
    } catch (error) {
      console.error("Error cargando datos del dashboard:", error);
      toast.error("No se pudieron cargar los datos del dashboard.");
    }
  },

  /**
   * Carga estadísticas principales del dashboard
   */
  async cargarEstadisticas() {
    // Llama al método correcto: getEstadisticas()
    const stats = await db.getEstadisticas();

    // Obtener el conteo de productos bajo stock por separado
    const productosBajoStockList = await db.getProductosBajoStock();

    document.getElementById("ventas-hoy").textContent = stats.ventas_hoy || 0;
    document.getElementById("ingresos-hoy").textContent = formatCurrency(
      stats.ingresos_hoy || 0
    );
    document.getElementById("productos-bajo-stock").textContent =
      productosBajoStockList.length || 0;
    document.getElementById("total-productos").textContent =
      stats.total_productos || 0;
  },

  /**
   * Carga la tabla de productos con stock bajo
   */
  async cargarProductosBajoStock() {
    const productos = await db.getProductosBajoStock();
    const tbody = document.getElementById("productos-bajo-stock-body");

    if (!tbody) return;

    if (productos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align: center;">No hay productos con stock bajo</td></tr>';
      return;
    }

    tbody.innerHTML = productos
      .map(
        (p) => `
      <tr>
        <td>${p.codigo || "N/A"}</td>
        <td>${p.nombre}</td>
        <td class="text-danger">${p.stock_actual}</td>
        <td>${p.stock_minimo}</td>
      </tr>
    `
      )
      .join("");
  },

  /**
   * Configura el auto-refresco del dashboard
   */
  setupAutoRefresh() {
    // Limpiar intervalo anterior si existe
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    // Refrescar cada 30 segundos
    this.intervalId = setInterval(() => {
      this.cargarDatos();
    }, 30000);
  },

  /**
   * Limpia los listeners o intervalos al salir de la vista
   */
  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },
};

export default DashboardView;
