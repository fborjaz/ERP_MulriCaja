/**
 * Servicio de Despachos - Lógica de Negocio
 * @module renderer/modules/despachos/despachos.service
 */

import { api } from "../../core/api.js";

export class DespachosService {
  /**
   * Crea un nuevo despacho
   */
  async crearDespacho(
    ventaId,
    conductorId,
    vehiculoId,
    direccion,
    observaciones
  ) {
    try {
      const venta = await api.dbQuery("SELECT * FROM ventas WHERE id = ?", [
        ventaId,
      ]);
      if (venta.length === 0) {
        throw new Error("Venta no encontrada");
      }

      const numeroDespacho = `DESP-${Date.now()}`;
      const resultado = await api.dbQuery(
        `INSERT INTO despachos 
         (numero_despacho, venta_id, conductor_id, vehiculo_id, direccion, observaciones, estado, fecha_creacion)
         VALUES (?, ?, ?, ?, ?, ?, 'Pendiente', CURRENT_TIMESTAMP)`,
        [
          numeroDespacho,
          ventaId,
          conductorId,
          vehiculoId,
          direccion,
          observaciones,
        ]
      );

      const despachoId = resultado.lastInsertRowid;

      const productos = await api.dbQuery(
        "SELECT * FROM ventas_detalle WHERE venta_id = ?",
        [ventaId]
      );

      for (const producto of productos) {
        await api.dbQuery(
          `INSERT INTO despachos_detalle 
           (despacho_id, producto_id, cantidad, estado)
           VALUES (?, ?, ?, 'Pendiente')`,
          [despachoId, producto.producto_id, producto.cantidad]
        );
      }

      await api.dbQuery(
        'UPDATE ventas SET estado_despacho = "En Despacho" WHERE id = ?',
        [ventaId]
      );

      return {
        success: true,
        despacho_id: despachoId,
        numero_despacho: numeroDespacho,
      };
    } catch (error) {
      console.error("Error creando despacho:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Asigna conductor a despacho
   */
  async asignarConductor(despachoId, conductorId) {
    await api.dbQuery(
      'UPDATE despachos SET conductor_id = ?, estado = "Asignado" WHERE id = ?',
      [conductorId, despachoId]
    );
    return { success: true };
  }

  /**
   * Inicia un despacho
   */
  async iniciarDespacho(despachoId) {
    await api.dbQuery(
      `UPDATE despachos 
       SET estado = 'En Camino', fecha_salida = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [despachoId]
    );
    return { success: true };
  }

  /**
   * Completa un despacho
   */
  async completarDespacho(despachoId, observacionesEntrega) {
    await api.dbQuery(
      `UPDATE despachos 
       SET estado = 'Completado', 
           fecha_entrega = CURRENT_TIMESTAMP,
           observaciones_entrega = ?
       WHERE id = ?`,
      [observacionesEntrega, despachoId]
    );

    // Usar tabla venta (singular) según esquema IMAXPOS
    const despacho = await api.dbQuery(
      "SELECT venta_id FROM venta WHERE venta_id = ? AND delivery = 1",
      [despachoId]
    );
    if (despacho.length > 0) {
      await api.dbQuery(
        'UPDATE ventas SET estado_despacho = "Entregado" WHERE id = ?',
        [despacho[0].venta_id]
      );
    }

    return { success: true };
  }
}

// Crear y exportar instancia singleton
export const despachosService = new DespachosService();

// Exportar también como default
export default despachosService;
