/**
 * Servicio de Exportación
 * @module renderer/services/export.service
 */

import { api } from "../core/api.js";

export class ExportService {
  /**
   * Exporta datos a PDF
   * @param {string} tipo - Tipo de documento
   * @param {Object} datos - Datos a exportar
   * @param {Object} opciones - Opciones de exportación
   * @returns {Promise<Object>} Resultado de la exportación
   */
  async exportarPDF(tipo, datos, opciones = {}) {
    try {
      const result = await api.exportPdf(tipo, datos, opciones);
      return result;
    } catch (error) {
      console.error("Error exportando PDF:", error);
      throw error;
    }
  }

  /**
   * Exporta datos a Excel
   * @param {string} tipo - Tipo de documento
   * @param {Object} datos - Datos a exportar
   * @param {Object} opciones - Opciones de exportación
   * @returns {Promise<Object>} Resultado de la exportación
   */
  async exportarExcel(tipo, datos, opciones = {}) {
    try {
      const result = await api.exportExcel(tipo, datos, opciones);
      return result;
    } catch (error) {
      console.error("Error exportando Excel:", error);
      throw error;
    }
  }

  /**
   * Exporta reporte de ventas
   * @param {Date} fechaInicio - Fecha inicial
   * @param {Date} fechaFin - Fecha final
   * @param {string} formato - 'pdf' o 'excel'
   * @returns {Promise<Object>} Resultado
   */
  async exportarReporteVentas(fechaInicio, fechaFin, formato = "pdf") {
    try {
      const ventas = await api.dbQuery(
        `SELECT v.*, u.nombre || ' ' || u.apellido as usuario,
                c.nombre as cliente, caja.nombre as caja
         FROM ventas v
         LEFT JOIN usuarios u ON u.id = v.usuario_id
         LEFT JOIN clientes c ON c.id = v.cliente_id
         LEFT JOIN cajas caja ON caja.id = v.caja_id
         WHERE DATE(v.fecha) BETWEEN ? AND ?
         ORDER BY v.fecha DESC`,
        [fechaInicio, fechaFin]
      );

      const datos = {
        titulo: "Reporte de Ventas",
        periodo: `${fechaInicio} - ${fechaFin}`,
        ventas: ventas,
        totales: {
          cantidad: ventas.length,
          subtotal: ventas.reduce((sum, v) => sum + v.subtotal, 0),
          itbis: ventas.reduce((sum, v) => sum + v.itbis, 0),
          total: ventas.reduce((sum, v) => sum + v.total, 0),
        },
      };

      if (formato === "pdf") {
        return await this.exportarPDF("ventas", datos);
      } else {
        return await this.exportarExcel("ventas", datos);
      }
    } catch (error) {
      console.error("Error exportando reporte de ventas:", error);
      throw error;
    }
  }

  /**
   * Exporta inventario
   * @param {string} formato - 'pdf' o 'excel'
   * @returns {Promise<Object>} Resultado
   */
  async exportarInventario(formato = "excel") {
    try {
      const productos = await api.dbQuery(
        `SELECT p.*, c.nombre as categoria
         FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
         WHERE p.activo = 1
         ORDER BY p.nombre`
      );

      const datos = {
        titulo: "Inventario de Productos",
        fecha: new Date().toLocaleDateString("es-DO"),
        productos: productos,
        totales: {
          cantidad: productos.length,
          valor_costo: productos.reduce(
            (sum, p) => sum + p.stock_actual * p.precio_costo,
            0
          ),
          valor_venta: productos.reduce(
            (sum, p) => sum + p.stock_actual * p.precio_venta,
            0
          ),
        },
      };

      if (formato === "pdf") {
        return await this.exportarPDF("inventario", datos);
      } else {
        return await this.exportarExcel("inventario", datos);
      }
    } catch (error) {
      console.error("Error exportando inventario:", error);
      throw error;
    }
  }
}

// Crear y exportar instancia singleton
export const exportService = new ExportService();

// Exportar también como default
export default exportService;
