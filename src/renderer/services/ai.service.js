/**
 * Servicio de Inteligencia Artificial
 * @module renderer/services/ai.service
 */

import { api } from "../core/api.js";

export class AIService {
  /**
   * Genera recomendación de compra basada en análisis de ventas
   * @param {Object} producto - Producto a analizar
   * @returns {Promise<Object>} Recomendación generada
   */
  async generarRecomendacionCompra(producto) {
    try {
      // Análisis de ventas recientes (últimos 30 días)
      const ventasRecientes = await api.dbQuery(
        `SELECT SUM(vd.cantidad) as total_vendido
         FROM ventas_detalle vd
         JOIN ventas v ON v.id = vd.venta_id
         WHERE vd.producto_id = ? 
         AND v.fecha >= datetime('now', '-30 days')`,
        [producto.id]
      );

      const totalVendido = ventasRecientes[0]?.total_vendido || 0;
      const promedioDiario = totalVendido / 30;
      const diasStock = producto.stock_actual / (promedioDiario || 1);

      let mensaje = "";
      let cantidadSugerida = 0;
      let confianza = 0.7;

      if (diasStock < 7) {
        cantidadSugerida = Math.ceil(promedioDiario * 30); // Stock para 30 días
        mensaje = `Producto con bajo stock. Se recomienda comprar ${cantidadSugerida} unidades para mantener inventario por 30 días.`;
        confianza = 0.9;
      } else if (diasStock < 15) {
        cantidadSugerida = Math.ceil(promedioDiario * 15);
        mensaje = `Stock moderado. Se recomienda comprar ${cantidadSugerida} unidades para mantener inventario por 15 días.`;
        confianza = 0.8;
      } else {
        mensaje = `Stock suficiente. No se requiere compra inmediata.`;
        confianza = 0.6;
      }

      // Guardar recomendación si existe tabla
      try {
        await api.dbQuery(
          `INSERT INTO recomendaciones_ia 
           (tipo, producto_id, mensaje, confianza, accion)
           VALUES (?, ?, ?, ?, ?)`,
          ["Compra", producto.id, mensaje, confianza, "Crear Orden de Compra"]
        );
      } catch (error) {
        // Tabla puede no existir aún
        console.warn("Tabla recomendaciones_ia no existe:", error.message);
      }

      return { mensaje, cantidadSugerida, confianza };
    } catch (error) {
      console.error("Error generando recomendación de compra:", error);
      throw error;
    }
  }

  /**
   * Predice la demanda de un producto
   * @param {number} productoId - ID del producto
   * @param {number} dias - Días a predecir
   * @returns {Promise<Object>} Predicción de demanda
   */
  async predecirDemanda(productoId, dias = 7) {
    try {
      // Análisis de tendencias de ventas (últimos 90 días)
      const ventas = await api.dbQuery(
        `SELECT DATE(v.fecha) as fecha, SUM(vd.cantidad) as cantidad
         FROM ventas_detalle vd
         JOIN ventas v ON v.id = vd.venta_id
         WHERE vd.producto_id = ?
         AND v.fecha >= datetime('now', '-90 days')
         GROUP BY DATE(v.fecha)
         ORDER BY fecha`,
        [productoId]
      );

      if (ventas.length < 7) {
        return {
          valor_predicho: 0,
          confianza: 0.3,
          mensaje: "Datos insuficientes para predicción",
        };
      }

      // Calcular promedio móvil
      const promedios = [];
      for (let i = 6; i < ventas.length; i++) {
        const promedio =
          ventas.slice(i - 6, i + 1).reduce((sum, v) => sum + v.cantidad, 0) /
          7;
        promedios.push(promedio);
      }

      const promedioFinal =
        promedios.reduce((sum, p) => sum + p, 0) / promedios.length;
      const demandaPredicha = promedioFinal * dias;

      // Guardar predicción si existe tabla
      try {
        await api.dbQuery(
          `INSERT INTO predicciones_ia 
           (tipo, producto_id, periodo, valor_predicho, confianza)
           VALUES (?, ?, ?, ?, ?)`,
          ["Demanda", productoId, `${dias} días`, demandaPredicha, 0.75]
        );
      } catch (error) {
        console.warn("Tabla predicciones_ia no existe:", error.message);
      }

      return {
        valor_predicho: demandaPredicha,
        confianza: 0.75,
        mensaje: `Se predice una demanda de ${demandaPredicha.toFixed(
          0
        )} unidades en los próximos ${dias} días`,
      };
    } catch (error) {
      console.error("Error prediciendo demanda:", error);
      throw error;
    }
  }

  /**
   * Sugiere precio óptimo para un producto
   * @param {Object} producto - Producto a analizar
   * @returns {Promise<Object>} Sugerencia de precio
   */
  async sugerirPrecio(producto) {
    try {
      const precioActual = producto.precio_venta;
      const costo = producto.precio_costo;
      const margenActual = ((precioActual - costo) / precioActual) * 100;

      let sugerencia = "";
      let nuevoPrecio = precioActual;

      if (margenActual < 20) {
        nuevoPrecio = costo * 1.3; // 30% de margen mínimo
        sugerencia = `Margen bajo detectado (${margenActual.toFixed(
          1
        )}%). Se sugiere aumentar precio a RD$ ${nuevoPrecio.toFixed(
          2
        )} para mantener margen saludable.`;
      } else if (margenActual > 50) {
        nuevoPrecio = costo * 1.4; // 40% de margen recomendado
        sugerencia = `Margen alto (${margenActual.toFixed(
          1
        )}%). Se puede optimizar precio a RD$ ${nuevoPrecio.toFixed(
          2
        )} para mejorar competitividad.`;
      } else {
        sugerencia = `Precio actual es adecuado. Margen: ${margenActual.toFixed(
          1
        )}%`;
      }

      return {
        precio_actual: precioActual,
        precio_sugerido: nuevoPrecio,
        margen_actual: margenActual,
        mensaje: sugerencia,
      };
    } catch (error) {
      console.error("Error sugiriendo precio:", error);
      throw error;
    }
  }

  /**
   * Analiza tendencias de ventas
   * @returns {Promise<Object>} Análisis de tendencias
   */
  async analizarTendencias() {
    try {
      // Productos más vendidos (últimos 30 días)
      const topProductos = await api.dbQuery(
        `SELECT p.id, p.nombre, SUM(vd.cantidad) as total_vendido
         FROM ventas_detalle vd
         JOIN productos p ON p.id = vd.producto_id
         JOIN ventas v ON v.id = vd.venta_id
         WHERE v.fecha >= datetime('now', '-30 days')
         GROUP BY p.id
         ORDER BY total_vendido DESC
         LIMIT 10`
      );

      // Categorías más vendidas (últimos 30 días)
      const topCategorias = await api.dbQuery(
        `SELECT c.nombre, SUM(vd.cantidad) as total_vendido
         FROM ventas_detalle vd
         JOIN productos p ON p.id = vd.producto_id
         JOIN categorias c ON c.id = p.categoria_id
         JOIN ventas v ON v.id = vd.venta_id
         WHERE v.fecha >= datetime('now', '-30 days')
         GROUP BY c.id
         ORDER BY total_vendido DESC
         LIMIT 5`
      );

      return {
        top_productos: topProductos,
        top_categorias: topCategorias,
        mensaje: "Análisis de tendencias completado",
      };
    } catch (error) {
      console.error("Error analizando tendencias:", error);
      throw error;
    }
  }
}

// Crear y exportar instancia singleton
export const aiService = new AIService();

// Exportar también como default
export default aiService;
