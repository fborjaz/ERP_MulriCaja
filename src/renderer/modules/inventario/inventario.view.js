/**
 * Vista del Módulo de Inventario
 * @module renderer/modules/inventario/inventario.view
 */

import { db } from "../../services/database.service.js";
import { toast } from "../../components/notifications/toast.js";
import { formatCurrency } from "../../utils/helpers.js";
// Asumiendo que existe un exportService que funciona a través del main process si es necesario
// import { exportService } from "../../services/export.service.js";

export const InventarioView = {
  productos: [],

  render() {
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Control de Inventario</h1>
          <div class="header-actions">
            <button id="btn-bajo-stock" class="btn btn-warning">Mostrar Bajo Stock</button>
            <button id="btn-exportar-inventario" class="btn btn-secondary">Exportar a Excel</button>
          </div>
        </div>

        <!-- Tarjetas de Estadísticas de Inventario -->
        <div class="stat-cards-container">
          <div class="stat-card">
            <div class="stat-card-icon icon-productos">
              <span class="material-icons">inventory_2</span>
            </div>
            <div class="stat-card-info">
              <p>Total de Productos</p>
              <h3 id="total-productos-inv">0</h3>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon icon-stock">
              <span class="material-icons">warning</span>
            </div>
            <div class="stat-card-info">
              <p>Productos Bajo Stock</p>
              <h3 id="productos-bajo-stock-inv">0</h3>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon icon-costo">
              <span class="material-icons">monetization_on</span>
            </div>
            <div class="stat-card-info">
              <p>Valor Inventario (Costo)</p>
              <h3 id="valor-inventario-costo">$0.00</h3>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-card-icon icon-ingresos">
              <span class="material-icons">trending_up</span>
            </div>
            <div class="stat-card-info">
              <p>Valor Inventario (Venta)</p>
              <h3 id="valor-inventario-venta">$0.00</h3>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Listado General de Inventario</h2>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Stock Actual</th>
                    <th>Stock Mínimo</th>
                    <th>Estado</th>
                    <th>Valor (Costo)</th>
                  </tr>
                </thead>
                <tbody id="inventario-table-body"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  
  async init() {
    await this.cargarInventario();
    this.setupEventListeners();
  },

  setupEventListeners() {
    const btnExportar = document.getElementById("btn-exportar-inventario");
    btnExportar.addEventListener("click", () => this.exportarInventario());

    const btnBajoStock = document.getElementById("btn-bajo-stock");
    btnBajoStock.addEventListener("click", () => this.mostrarBajoStock());
  },

  async cargarInventario() {
    try {
      this.productos = await db.getProductos(); // Carga todos los productos
      this.mostrarInventario();
      this.calcularEstadisticas();
    } catch (error) {
      console.error("Error cargando inventario:", error);
      toast.error("Error al cargar el inventario");
    }
  },

  mostrarInventario() {
    const tbody = document.getElementById("inventario-table-body");
    if (this.productos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay productos en el inventario</td></tr>';
      return;
    }
    tbody.innerHTML = this.productos.map(p => {
      const valorStock = p.stock_actual * p.precio_costo;
      const esBajoStock = p.stock_actual <= p.stock_minimo;
      const esMedioStock = !esBajoStock && p.stock_actual <= p.stock_minimo * 2;
      
      let estadoStock = 'Óptimo';
      let claseStock = 'text-success';
      if (esBajoStock) {
        estadoStock = 'Bajo';
        claseStock = 'text-danger';
      } else if (esMedioStock) {
        estadoStock = 'Medio';
        claseStock = 'text-warning';
      }

      return `
        <tr>
          <td>${p.codigo}</td>
          <td>${p.nombre}</td>
          <td>${p.categoria_nombre}</td>
          <td>${p.stock_actual}</td>
          <td>${p.stock_minimo}</td>
          <td class="${claseStock}">${estadoStock}</td>
          <td>${formatCurrency(valorStock)}</td>
        </tr>
      `;
    }).join("");
  },

  calcularEstadisticas() {
    const totalProductos = this.productos.length;
    const productosBajoStock = this.productos.filter(p => p.stock_actual <= p.stock_minimo).length;
    const valorTotalCosto = this.productos.reduce((sum, p) => sum + p.stock_actual * p.precio_costo, 0);
    const valorTotalVenta = this.productos.reduce((sum, p) => sum + p.stock_actual * p.precio_venta, 0);
    
    document.getElementById("total-productos-inv").textContent = totalProductos;
    document.getElementById("productos-bajo-stock-inv").textContent = productosBajoStock;
    document.getElementById("valor-inventario-costo").textContent = formatCurrency(valorTotalCosto);
    document.getElementById("valor-inventario-venta").textContent = formatCurrency(valorTotalVenta);
  },

  async mostrarBajoStock() {
    try {
      this.productos = await db.getProductosBajoStock();
      this.mostrarInventario();
      toast.info(`Mostrando ${this.productos.length} productos con stock bajo`);
    } catch (error) {
      console.error("Error mostrando bajo stock:", error);
      toast.error("Error al cargar productos con bajo stock");
    }
  },

  async exportarInventario() {
    toast.info("Funcionalidad de exportar en desarrollo.");
    // try {
    //   await api.exportExcel("inventario", this.productos);
    //   toast.success("Inventario exportado exitosamente");
    // } catch (error) {
    //   console.error("Error exportando:", error);
    //   toast.error("Error al exportar inventario");
    // }
  },
};

export default InventarioView;