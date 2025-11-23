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
      return await api.dbQuery(
        `SELECT p.*, c.nombre as categoria_nombre 
         FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
         WHERE c.tipo_negocio = 'Ferreteria'
         AND (c.nombre LIKE '%Construcción%' OR c.nombre LIKE '%Material%')
         AND p.activo = 1
         ORDER BY p.nombre`
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
      return await api.dbQuery(
        `SELECT p.* FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
         WHERE c.codigo = 'FERR-002'
         AND p.activo = 1
         ORDER BY p.nombre`
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
      return await api.dbQuery(
        `SELECT 
          p.id,
          p.nombre,
          p.codigo,
          SUM(vd.cantidad) as unidades_vendidas,
          COUNT(DISTINCT v.id) as veces_vendido,
          AVG(vd.precio_unitario) as precio_promedio
         FROM productos p
         LEFT JOIN ventas_detalle vd ON vd.producto_id = p.id
         LEFT JOIN ventas v ON v.id = vd.venta_id
         JOIN categorias c ON c.id = p.categoria_id
         WHERE c.tipo_negocio = 'Ferreteria'
         AND v.fecha >= datetime('now', '-' || ? || ' days')
         AND p.activo = 1
         GROUP BY p.id
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
      return await api.dbQuery(
        `SELECT p.* 
         FROM productos p
         JOIN categorias c ON c.id = p.categoria_id
         WHERE c.tipo_negocio = 'Ferreteria'
         AND p.activo = 1
         AND p.id NOT IN (
           SELECT DISTINCT vd.producto_id
           FROM ventas_detalle vd
           JOIN ventas v ON v.id = vd.venta_id
           WHERE v.fecha >= datetime('now', '-' || ? || ' days')
         )
         ORDER BY p.nombre`,
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
