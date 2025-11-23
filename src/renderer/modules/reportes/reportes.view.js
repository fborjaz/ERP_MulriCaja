/**
 * Vista del Módulo de Reportes
 * @module renderer/modules/reportes/reportes.view
 */

import { db } from "../../services/database.service.js";
import { toast } from "../../components/notifications/toast.js";
import { formatCurrency, formatDate } from "../../utils/helpers.js";

export const ReportesView = {
  // Datos cacheados para exportación
  currentReportData: null,
  currentReportStats: null,

  render() {
    const today = new Date().toISOString().split("T")[0];
    return `
      <div class="view-container">
        <div class="view-header">
          <h1>Generador de Reportes</h1>
        </div>

        <div class="report-generators-grid">
          <!-- Reporte de Ventas -->
          <div class="card">
            <div class="card-header">
              <h2>Reporte de Ventas</h2>
            </div>
            <div class="card-body">
              <p>Genera un resumen de ventas por rango de fechas.</p>
              <div class="form-grid">
                <div class="form-group">
                  <label for="fecha-inicio-ventas">Fecha Inicio</label>
                  <input type="date" id="fecha-inicio-ventas" class="form-control" value="${today}">
                </div>
                <div class="form-group">
                  <label for="fecha-fin-ventas">Fecha Fin</label>
                  <input type="date" id="fecha-fin-ventas" class="form-control" value="${today}">
                </div>
              </div>
            </div>
            <div class="card-footer">
              <button id="btn-reporte-ventas" class="btn btn-primary">Generar Reporte</button>
            </div>
          </div>

          <!-- Reporte de Inventario -->
          <div class="card">
            <div class="card-header">
              <h2>Reporte de Inventario</h2>
            </div>
            <div class="card-body">
              <p>Genera un resumen completo del estado del inventario.</p>
            </div>
            <div class="card-footer">
              <button id="btn-reporte-inventario" class="btn btn-primary">Generar Reporte</button>
            </div>
          </div>

          <!-- Reporte de Clientes -->
          <div class="card">
            <div class="card-header">
              <h2>Reporte de Clientes</h2>
            </div>
            <div class="card-body">
              <p>Genera un listado y estadísticas de los clientes.</p>
            </div>
            <div class="card-footer">
              <button id="btn-reporte-clientes" class="btn btn-primary">Generar Reporte</button>
            </div>
          </div>
          
           <!-- Reporte Financiero Simplificado -->
          <div class="card">
            <div class="card-header">
              <h2>Reporte Financiero (Día)</h2>
            </div>
            <div class="card-body">
              <p>Genera un resumen financiero del día de hoy.</p>
            </div>
            <div class="card-footer">
              <button id="btn-reporte-financiero" class="btn btn-primary">Generar Reporte</button>
            </div>
          </div>
        </div>

        <!-- Contenedor de Resultados -->
        <div id="reporte-resultado" class="report-results-container">
          <p>Seleccione un reporte para generar los resultados.</p>
        </div>
      </div>
    `;
  },
  
  init() {
    this.setupEventListeners();
  },

  setupEventListeners() {
    document.getElementById("btn-reporte-ventas").addEventListener("click", () => this.generarReporteVentas());
    document.getElementById("btn-reporte-inventario").addEventListener("click", () => this.generarReporteInventario());
    document.getElementById("btn-reporte-clientes").addEventListener("click", () => this.generarReporteClientes());
    document.getElementById("btn-reporte-financiero").addEventListener("click", () => this.generarReporteFinanciero());
  },

  async generarReporteVentas() {
    try {
      const fechaInicio = document.getElementById("fecha-inicio-ventas").value;
      const fechaFin = document.getElementById("fecha-fin-ventas").value;
      if (!fechaInicio || !fechaFin) {
        toast.warning("Seleccione un rango de fechas.");
        return;
      }
      const ventas = await db.getVentas(fechaInicio, fechaFin);
      const totales = {
        "Cantidad de Ventas": ventas.length,
        "Subtotal General": formatCurrency(ventas.reduce((sum, v) => sum + v.subtotal, 0)),
        "ITBIS General": formatCurrency(ventas.reduce((sum, v) => sum + v.itbis, 0)),
        "Total General": formatCurrency(ventas.reduce((sum, v) => sum + v.total, 0)),
      };
      this.mostrarResultadoReporte("Ventas", ventas, totales);
      toast.success("Reporte de ventas generado.");
    } catch (error) {
      console.error("Error generando reporte de ventas:", error);
      toast.error("Error al generar reporte de ventas.");
    }
  },

  async generarReporteInventario() {
    try {
      const productos = await db.getProductos();
      const estadisticas = {
        "Total de Productos": productos.length,
        "Productos Bajo Stock": productos.filter(p => p.stock_actual <= p.stock_minimo).length,
        "Valor de Inventario (Costo)": formatCurrency(productos.reduce((sum, p) => sum + p.stock_actual * p.precio_costo, 0)),
      };
      this.mostrarResultadoReporte("Inventario", productos, estadisticas);
      toast.success("Reporte de inventario generado.");
    } catch (error) {
      console.error("Error generando reporte de inventario:", error);
      toast.error("Error al generar reporte de inventario.");
    }
  },

  async generarReporteClientes() {
    try {
      const clientes = await db.getClientes();
      const estadisticas = {
        "Total de Clientes": clientes.length,
      };
      this.mostrarResultadoReporte("Clientes", clientes, estadisticas);
      toast.success("Reporte de clientes generado.");
    } catch (error) {
      console.error("Error generando reporte de clientes:", error);
      toast.error("Error al generar reporte de clientes.");
    }
  },

  async generarReporteFinanciero() {
    try {
      // Corregido: usar getEstadisticas() en lugar de getDashboardStats()
      const stats = await db.getEstadisticas();
      this.mostrarResultadoReporte("Financiero del Día", [], stats);
      toast.success("Reporte financiero generado.");
    } catch (error) {
      console.error("Error generando reporte financiero:", error);
      toast.error("Error al generar reporte financiero.");
    }
  },

  mostrarResultadoReporte(tipo, datos, estadisticas) {
    this.currentReportData = datos;
    this.currentReportStats = estadisticas;
    
    const container = document.getElementById("reporte-resultado");
    let html = `<div class="card reporte-container">
                    <div class="card-header"><h3>Reporte de ${tipo}</h3></div>
                    <div class="card-body"><div class="reporte-estadisticas">
`;

    for (const [key, value] of Object.entries(estadisticas)) {
      html += `<div class="stat-item"><strong>${key}:</strong> ${value}</div>`;
    }

    html += `</div></div><div class="card-footer reporte-acciones">
              <button class="btn btn-secondary btn-export-pdf" data-tipo="${tipo}">Exportar a PDF</button>
              <button class="btn btn-secondary btn-export-excel" data-tipo="${tipo}">Exportar a Excel</button>
             </div></div>`;
    
    container.innerHTML = html;
    
    container.querySelector(".btn-export-pdf").addEventListener("click", () => this.exportar("pdf", tipo));
    container.querySelector(".btn-export-excel").addEventListener("click", () => this.exportar("excel", tipo));
  },
  
  exportar(formato, tipo) {
      toast.info(`Exportando reporte de ${tipo} a ${formato}... (funcionalidad en desarrollo)`);
      // Lógica de exportación usando this.currentReportData y this.currentReportStats
  },
};

export default ReportesView;