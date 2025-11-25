/**
 * Plugin de Ferretería
 * @module renderer/plugins/ferreteria
 */

import { api } from "../../core/api.js";

export class FerreteriaPlugin {
  /**
   * Obtiene productos de construcción
   * @returns {Promise<Array>} Productos de construcción
   */
  async productosConstruccion() {
    try {
      // Usar tabla producto (singular) según esquema IMAXPOS
      return await api.dbQuery(
        `SELECT p.*, c.nombre_categoria as categoria_nombre 
         FROM producto p
         LEFT JOIN categoria c ON c.id_categoria = p.produto_grupo
         WHERE p.producto_estatus = 1
         ORDER BY p.producto_nombre`
      );
    } catch (error) {
      console.error("Error obteniendo productos de construcción:", error);
      return [];
    }
  }

  /**
   * Obtiene herramientas eléctricas
   * @returns {Promise<Array>} Herramientas eléctricas
   */
  async herramientasElectricas() {
    try {
      // Usar tabla producto (singular) según esquema IMAXPOS
      return await api.dbQuery(
        `SELECT p.* FROM producto p
         LEFT JOIN categoria c ON c.id_categoria = p.produto_grupo
         WHERE p.producto_estatus = 1
         ORDER BY p.producto_nombre`
      );
    } catch (error) {
      console.error("Error obteniendo herramientas eléctricas:", error);
      return [];
    }
  }

  /**
   * Analiza rotación de productos
   * @param {number} dias - Días a analizar
   * @returns {Promise<Array>} Análisis de rotación
   */
  async analizarRotacion(dias = 30) {
    try {
      // Usar tablas producto, detalle_venta y venta según esquema IMAXPOS
      return await api.dbQuery(
        `SELECT 
          p.producto_id as id,
          p.producto_nombre as nombre,
          p.producto_codigo_interno as codigo,
          SUM(dv.cantidad) as unidades_vendidas,
          COUNT(DISTINCT v.venta_id) as veces_vendido,
          AVG(dv.precio) as precio_promedio
         FROM producto p
         LEFT JOIN detalle_venta dv ON dv.id_producto = p.producto_id
         LEFT JOIN venta v ON v.venta_id = dv.id_venta
         WHERE v.fecha >= datetime('now', '-' || ? || ' days')
         AND p.producto_estatus = 1
         GROUP BY p.producto_id
         ORDER BY unidades_vendidas DESC`,
        [dias]
      );
    } catch (error) {
      console.error("Error analizando rotación:", error);
      return [];
    }
  }

  /**
   * Genera reporte de productos más vendidos
   * @param {number} limite - Límite de resultados
   * @returns {Promise<Array>} Productos más vendidos
   */
  async productosMasVendidos(limite = 10) {
    const rotacion = await this.analizarRotacion(30);
    return rotacion.slice(0, limite);
  }

  /**
   * Identifica productos de baja rotación
   * @param {number} dias - Días sin ventas
   * @returns {Promise<Array>} Productos de baja rotación
   */
  async productosBajaRotacion(dias = 90) {
    try {
      // Usar tabla producto (singular) según esquema IMAXPOS
      return await api.dbQuery(
        `SELECT p.* 
         FROM producto p
         WHERE p.producto_estatus = 1
         AND p.producto_id NOT IN (
           SELECT DISTINCT dv.id_producto
           FROM detalle_venta dv
           JOIN venta v ON v.venta_id = dv.id_venta
           WHERE v.fecha >= datetime('now', '-' || ? || ' days')
         )
         ORDER BY p.producto_nombre`,
        [dias]
      );
    } catch (error) {
      console.error("Error identificando productos de baja rotación:", error);
      return [];
    }
  }
}

// Exportar instancia
export const ferreteriaPlugin = new FerreteriaPlugin();

// Exportar también como default
export default ferreteriaPlugin;
