/**
 * Servicio de Notas de Crédito - República Dominicana
 * @module renderer/modules/notas-credito/notas-credito.service
 */

import { api } from "../../core/api.js";
import { facturacionElectronica } from "../facturacion/facturacion-electronica.service.js";

export class NotasCreditoService {
  /**
   * Crea una nota de crédito
   */
  async crearNotaCredito(ventaId, datos) {
    try {
      const ventas = await api.dbQuery("SELECT * FROM ventas WHERE id = ?", [
        ventaId,
      ]);
      if (ventas.length === 0) {
        throw new Error("Venta no encontrada");
      }
      const venta = ventas[0];

      const numeroNota = await this.generarNumeroNota();

      let subtotal = 0;
      let itbis = 0;

      datos.items.forEach((item) => {
        const itemSubtotal = item.cantidad * item.precio_unitario;
        const itemItbis = itemSubtotal * 0.18;
        subtotal += itemSubtotal;
        itbis += itemItbis;
      });

      const total = subtotal + itbis;

      const ncf = await facturacionElectronica.generarNCF("B04");

      const notaResult = await api.dbQuery(
        `INSERT INTO notas_credito 
         (numero_nota, venta_original_id, caja_id, usuario_id, cliente_id, fecha, motivo, 
          subtotal, itbis, total, ncf, tipo_ncf, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'B04', 'Borrador')`,
        [
          numeroNota,
          ventaId,
          1,
          1,
          venta.cliente_id,
          new Date().toISOString(),
          datos.motivo,
          subtotal,
          itbis,
          total,
          ncf,
        ]
      );

      const notaId = notaResult.lastInsertRowid;

      for (const item of datos.items) {
        const itemSubtotal = item.cantidad * item.precio_unitario;
        const itemItbis = itemSubtotal * 0.18;
        const itemTotal = itemSubtotal + itemItbis;

        await api.dbQuery(
          `INSERT INTO notas_credito_detalle
           (nota_credito_id, venta_detalle_id, producto_id, cantidad, precio_unitario, 
            subtotal, itbis, total, motivo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            notaId,
            item.venta_detalle_id,
            item.producto_id,
            item.cantidad,
            item.precio_unitario,
            itemSubtotal,
            itemItbis,
            itemTotal,
            item.motivo || datos.motivo,
          ]
        );
      }

      return {
        success: true,
        id: notaId,
        numero_nota: numeroNota,
        ncf: ncf,
      };
    } catch (error) {
      console.error("Error creando nota de crédito:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera número de nota
   */
  async generarNumeroNota() {
    const count = await api.dbQuery(
      "SELECT COUNT(*) as total FROM notas_credito"
    );
    const numero = (count[0]?.total || 0) + 1;
    return `NC-${String(numero).padStart(8, "0")}`;
  }

  /**
   * Anula una nota de crédito
   */
  async anularNotaCredito(notaId, motivo) {
    try {
      await api.dbQuery(
        `UPDATE notas_credito 
         SET estado = 'Anulada', observaciones = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [motivo, notaId]
      );

      return { success: true };
    } catch (error) {
      console.error("Error anulando nota de crédito:", error);
      return { success: false, error: error.message };
    }
  }
}

// Crear y exportar instancia singleton
export const notasCreditoService = new NotasCreditoService();

// Exportar también como default
export default notasCreditoService;
