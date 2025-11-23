/**
 * Servicio del Módulo de Ventas
 * @module renderer/modules/ventas/ventas.service
 */

import { api } from "../../core/api.js";
import { db } from "../../services/database.service.js";

export class VentasService {
  /**
   * Obtiene ventas en un rango de fechas
   * @param {string} fechaDesde - Fecha inicial
   * @param {string} fechaHasta - Fecha final
   * @returns {Promise<Array>} Lista de ventas
   */
  async getVentas(fechaDesde, fechaHasta) {
    return await db.getVentas(fechaDesde, fechaHasta);
  }

  /**
   * Obtiene una venta por ID
   * @param {number} id - ID de la venta
   * @returns {Promise<Object>} Venta
   */
  async getVenta(id) {
    return await db.getVenta(id);
  }

  /**
   * Obtiene detalles de una venta
   * @param {number} ventaId - ID de la venta
   * @returns {Promise<Array>} Detalles
   */
  async getDetallesVenta(ventaId) {
    return await api.dbQuery(
      `SELECT vd.*, p.nombre as producto_nombre
       FROM ventas_detalle vd
       JOIN productos p ON p.id = vd.producto_id
       WHERE vd.venta_id = ?`,
      [ventaId]
    );
  }

  /**
   * Crea una nueva venta
   * @param {Object} ventaData - Datos de la venta
   * @returns {Promise<Object>} Venta creada
   */
  async crearVenta(ventaData) {
    return await db.crearVenta(ventaData);
  }

  /**
   * Anula una venta
   * @param {number} ventaId - ID de la venta
   * @param {string} motivo - Motivo de anulación
   * @returns {Promise<void>}
   */
  async anularVenta(ventaId, motivo) {
    // Obtener detalles de la venta
    const detalles = await this.getDetallesVenta(ventaId);

    // Devolver stock
    for (const detalle of detalles) {
      await api.dbQuery(
        "UPDATE productos SET stock_actual = stock_actual + ? WHERE id = ?",
        [detalle.cantidad, detalle.producto_id]
      );
    }

    // Marcar venta como anulada
    await api.dbQuery(
      "UPDATE ventas SET estado = ?, motivo_anulacion = ? WHERE id = ?",
      ["Anulada", motivo, ventaId]
    );
  }

  /**
   * Obtiene estadísticas de ventas
   * @param {string} fecha - Fecha para estadísticas
   * @returns {Promise<Object>} Estadísticas
   */
  async getEstadisticas(fecha) {
    const stats = await api.dbQuery(
      `SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(itbis), 0) as total_itbis,
        COALESCE(SUM(total), 0) as total_total,
        COALESCE(AVG(total), 0) as promedio_venta
       FROM ventas
       WHERE DATE(fecha) = ? AND estado = 'Completada'`,
      [fecha]
    );
    return stats[0];
  }

  /**
   * Obtiene productos más vendidos
   * @param {number} limite - Límite de resultados
   * @returns {Promise<Array>} Productos más vendidos
   */
  async getProductosMasVendidos(limite = 10) {
    return await api.dbQuery(
      `SELECT p.nombre, SUM(vd.cantidad) as total_vendido, SUM(vd.total) as total_ingresos
       FROM ventas_detalle vd
       JOIN productos p ON p.id = vd.producto_id
       JOIN ventas v ON v.id = vd.venta_id
       WHERE v.fecha >= datetime('now', '-30 days') AND v.estado = 'Completada'
       GROUP BY p.id
       ORDER BY total_vendido DESC
       LIMIT ?`,
      [limite]
    );
  }
}

// Crear y exportar instancia singleton
export const ventasService = new VentasService();

// Exportar también como default
export default ventasService;
