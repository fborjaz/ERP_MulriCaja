/**
 * Módulo de Gráficos y Visualizaciones
 * @module renderer/components/charts/graficos
 */

import { api } from "../../core/api.js";

export class GraficosService {
  /**
   * Genera gráfico de ventas por período
   */
  async generarGraficoVentas(fechaDesde, fechaHasta) {
    try {
      const ventas = await api.dbQuery(
        `SELECT DATE(fecha) as fecha, SUM(total) as total
         FROM ventas
         WHERE DATE(fecha) BETWEEN ? AND ?
         AND estado = 'Completada'
         GROUP BY DATE(fecha)
         ORDER BY fecha`,
        [fechaDesde, fechaHasta]
      );

      return {
        labels: ventas.map((v) => v.fecha),
        data: ventas.map((v) => v.total),
        tipo: "ventas",
      };
    } catch (error) {
      console.error("Error generando gráfico de ventas:", error);
      return { labels: [], data: [] };
    }
  }

  /**
   * Genera gráfico de productos más vendidos
   */
  async generarGraficoProductosMasVendidos(limite = 10) {
    try {
      const productos = await api.dbQuery(
        `SELECT p.nombre, SUM(vd.cantidad) as total_vendido
         FROM ventas_detalle vd
         JOIN productos p ON p.id = vd.producto_id
         JOIN ventas v ON v.id = vd.venta_id
         WHERE v.fecha >= datetime('now', '-30 days')
         AND v.estado = 'Completada'
         GROUP BY p.id
         ORDER BY total_vendido DESC
         LIMIT ?`,
        [limite]
      );

      return {
        labels: productos.map((p) => p.nombre),
        data: productos.map((p) => p.total_vendido),
        tipo: "productos",
      };
    } catch (error) {
      console.error("Error generando gráfico de productos:", error);
      return { labels: [], data: [] };
    }
  }

  /**
   * Genera gráfico de categorías más vendidas
   */
  async generarGraficoCategorias() {
    try {
      const categorias = await api.dbQuery(
        `SELECT c.nombre, SUM(vd.cantidad) as total_vendido
         FROM ventas_detalle vd
         JOIN productos p ON p.id = vd.producto_id
         JOIN categorias c ON c.id = p.categoria_id
         JOIN ventas v ON v.id = vd.venta_id
         WHERE v.fecha >= datetime('now', '-30 days')
         AND v.estado = 'Completada'
         GROUP BY c.id
         ORDER BY total_vendido DESC`,
        []
      );

      return {
        labels: categorias.map((c) => c.nombre),
        data: categorias.map((c) => c.total_vendido),
        tipo: "categorias",
      };
    } catch (error) {
      console.error("Error generando gráfico de categorías:", error);
      return { labels: [], data: [] };
    }
  }
}

// Crear instancia global
export const graficos = new GraficosService();

// Exportar también como default
export default graficos;
