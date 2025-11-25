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
    // Usar tablas detalle_venta y producto según esquema IMAXPOS
    return await api.dbQuery(
      `SELECT dv.*, p.producto_nombre
       FROM detalle_venta dv
       JOIN producto p ON p.producto_id = dv.id_producto
       WHERE dv.id_venta = ?`,
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

    // Devolver stock en producto_almacen
    for (const detalle of detalles) {
      await api.dbQuery(
        `UPDATE producto_almacen 
         SET cantidad = cantidad + ? 
         WHERE id_producto = ? AND id_local = 1`,
        [detalle.cantidad, detalle.id_producto]
      );
    }

    // Marcar venta como anulada (usar tabla venta según esquema IMAXPOS)
    await api.dbQuery(
      "UPDATE venta SET venta_status = ? WHERE venta_id = ?",
      ["Anulada", ventaId]
    );
  }

  /**
   * Obtiene estadísticas de ventas
   * @param {string} fecha - Fecha para estadísticas
   * @returns {Promise<Object>} Estadísticas
   */
  async getEstadisticas(fecha) {
    // Usar tabla venta (singular) según esquema IMAXPOS
    const stats = await api.dbQuery(
      `SELECT 
        COUNT(*) as total_ventas,
        COALESCE(SUM(subtotal), 0) as total_subtotal,
        COALESCE(SUM(total_impuesto), 0) as total_itbis,
        COALESCE(SUM(total), 0) as total_total,
        COALESCE(AVG(total), 0) as promedio_venta
       FROM venta
       WHERE DATE(fecha) = ? AND venta_status = 'Completada'`,
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
    // Usar tablas detalle_venta, producto y venta según esquema IMAXPOS
    return await api.dbQuery(
      `SELECT p.producto_nombre as nombre, SUM(dv.cantidad) as total_vendido, SUM(dv.total) as total_ingresos
       FROM detalle_venta dv
       JOIN producto p ON p.producto_id = dv.id_producto
       JOIN venta v ON v.venta_id = dv.id_venta
       WHERE v.fecha >= datetime('now', '-30 days') AND v.venta_status = 'Completada'
       GROUP BY p.producto_id
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
