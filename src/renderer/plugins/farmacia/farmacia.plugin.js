/**
 * Plugin de Farmacia
 * @module renderer/plugins/farmacia
 */

import { api } from "../../core/api.js";
import { db } from "../../services/database.service.js";
import { toast } from "../../components/notifications/toast.js";
import { formatDate } from "../../utils/helpers.js";

export class FarmaciaPlugin {
  /**
   * Verifica productos próximos a vencer
   * @param {number} dias - Días de anticipación
   * @returns {Promise<Array>} Productos próximos a vencer
   */
  async verificarVencimientos(dias = 30) {
    try {
      // Usar tabla producto (singular) según esquema IMAXPOS
      const productos = await api.dbQuery(
        `SELECT * FROM producto 
         WHERE producto_vencimiento IS NOT NULL
         AND producto_vencimiento <= date('now', '+' || ? || ' days')
         AND producto_vencimiento >= date('now')
         AND producto_estatus = 1
         ORDER BY producto_vencimiento`,
        [dias]
      );
      return productos;
    } catch (error) {
      console.error("Error verificando vencimientos:", error);
      return [];
    }
  }

  /**
   * Obtiene productos vencidos
   * @returns {Promise<Array>} Productos vencidos
   */
  async productosVencidos() {
    try {
      // Usar tabla producto (singular) según esquema IMAXPOS
      return await api.dbQuery(
        `SELECT * FROM producto 
         WHERE producto_vencimiento IS NOT NULL
         AND producto_vencimiento < date('now')
         AND producto_estatus = 1
         ORDER BY producto_vencimiento`
      );
    } catch (error) {
      console.error("Error obteniendo productos vencidos:", error);
      return [];
    }
  }

  /**
   * Verifica si un producto requiere receta
   * @param {number} productoId - ID del producto
   * @returns {Promise<boolean>} True si requiere receta
   */
  async verificarReceta(productoId) {
    try {
      const producto = await db.getProducto(productoId);
      return producto.requiere_receta === 1;
    } catch (error) {
      console.error("Error verificando receta:", error);
      return false;
    }
  }

  /**
   * Genera alertas de vencimiento
   * @returns {Promise<Array>} Alertas generadas
   */
  async generarAlertasVencimiento() {
    const vencimientos = await this.verificarVencimientos(30);
    const vencidos = await this.productosVencidos();
    const alertas = [];

    // Productos vencidos
    vencidos.forEach((p) => {
      alertas.push({
        tipo: "error",
        mensaje: `⚠️ ${p.nombre} está VENCIDO desde ${formatDate(
          p.fecha_vencimiento
        )}`,
        producto_id: p.id,
        prioridad: "alta",
      });
    });

    // Productos próximos a vencer
    vencimientos.forEach((p) => {
      const diasRestantes = Math.ceil(
        (new Date(p.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)
      );
      alertas.push({
        tipo: diasRestantes <= 7 ? "warning" : "info",
        mensaje: `⏰ ${p.nombre} vence en ${diasRestantes} días (${formatDate(
          p.fecha_vencimiento
        )})`,
        producto_id: p.id,
        prioridad: diasRestantes <= 7 ? "alta" : "media",
      });
    });

    return alertas;
  }

  /**
   * Muestra alertas en el dashboard
   */
  async mostrarAlertas() {
    const alertas = await this.generarAlertasVencimiento();

    alertas.forEach((alerta) => {
      if (alerta.tipo === "error") {
        toast.error(alerta.mensaje);
      } else if (alerta.tipo === "warning") {
        toast.warning(alerta.mensaje);
      } else {
        toast.info(alerta.mensaje);
      }
    });
  }
}

// Exportar instancia
export const farmaciaPlugin = new FarmaciaPlugin();

// Exportar también como default
export default farmaciaPlugin;
