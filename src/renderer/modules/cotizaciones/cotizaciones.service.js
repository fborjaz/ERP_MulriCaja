/**
 * Servicio de Cotizaciones - Lógica de Negocio
 * @module renderer/modules/cotizaciones/cotizaciones.service
 */

import { api } from "../../core/api.js";

export class CotizacionesService {
  /**
   * Crea una nueva cotización
   */
  async crearCotizacion(clienteId, productos, fechaVencimiento, observaciones) {
    try {
      for (const producto of productos) {
        const prod = await api.dbQuery("SELECT * FROM productos WHERE id = ?", [
          producto.producto_id,
        ]);

        if (prod.length === 0) {
          throw new Error(`Producto ${producto.producto_id} no encontrado`);
        }
      }

      const numeroCotizacion = `COT-${Date.now()}`;
      const resultado = await api.dbQuery(
        `INSERT INTO cotizaciones 
         (numero_cotizacion, cliente_id, fecha_vencimiento, observaciones, estado, fecha_creacion)
         VALUES (?, ?, ?, ?, 'Pendiente', CURRENT_TIMESTAMP)`,
        [numeroCotizacion, clienteId, fechaVencimiento, observaciones]
      );

      const cotizacionId = resultado.lastInsertRowid;

      let subtotal = 0;
      for (const producto of productos) {
        const prod = await api.dbQuery(
          "SELECT precio_venta FROM productos WHERE id = ?",
          [producto.producto_id]
        );

        const precio = parseFloat(prod[0].precio_venta);
        const descuento = parseFloat(producto.descuento || 0);
        const precioFinal = precio * (1 - descuento / 100);
        const itemSubtotal = precioFinal * producto.cantidad;
        subtotal += itemSubtotal;

        await api.dbQuery(
          `INSERT INTO cotizaciones_detalle 
           (cotizacion_id, producto_id, cantidad, precio_unitario, descuento, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            cotizacionId,
            producto.producto_id,
            producto.cantidad,
            precio,
            descuento,
            itemSubtotal,
          ]
        );
      }

      const itbis = subtotal * 0.18;
      const total = subtotal + itbis;

      await api.dbQuery(
        "UPDATE cotizaciones SET subtotal = ?, itbis = ?, total = ? WHERE id = ?",
        [subtotal, itbis, total, cotizacionId]
      );

      return {
        success: true,
        cotizacion_id: cotizacionId,
        numero_cotizacion: numeroCotizacion,
        total: total,
      };
    } catch (error) {
      console.error("Error creando cotización:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Convierte cotización a venta
   */
  async convertirAVenta(cotizacionId, metodoPago, efectivoRecibido = 0) {
    try {
      const cotizacion = await api.dbQuery(
        "SELECT * FROM cotizaciones WHERE id = ?",
        [cotizacionId]
      );
      if (cotizacion.length === 0) {
        throw new Error("Cotización no encontrada");
      }

      if (
        cotizacion[0].estado !== "Pendiente" &&
        cotizacion[0].estado !== "Aprobada"
      ) {
        throw new Error("La cotización no puede ser convertida");
      }

      const productos = await api.dbQuery(
        "SELECT * FROM cotizaciones_detalle WHERE cotizacion_id = ?",
        [cotizacionId]
      );

      for (const producto of productos) {
        const prod = await api.dbQuery(
          "SELECT stock_actual FROM productos WHERE id = ?",
          [producto.producto_id]
        );

        if (prod[0].stock_actual < producto.cantidad) {
          throw new Error(
            `Stock insuficiente para producto ${producto.producto_id}`
          );
        }
      }

      const numeroFactura = `FAC-${Date.now()}`;
      const subtotal = cotizacion[0].subtotal;
      const itbis = cotizacion[0].itbis;
      const total = cotizacion[0].total;
      const cambio = efectivoRecibido - total;

      const ventaResult = await api.dbQuery(
        `INSERT INTO ventas 
         (numero_factura, caja_id, usuario_id, cliente_id, subtotal, itbis, total, 
          metodo_pago, efectivo_recibido, cambio, estado, origen_cotizacion)
         VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?, 'Completada', ?)`,
        [
          numeroFactura,
          cotizacion[0].cliente_id,
          subtotal,
          itbis,
          total,
          metodoPago,
          efectivoRecibido,
          cambio,
          cotizacionId,
        ]
      );

      const ventaId = ventaResult.lastInsertRowid;

      for (const producto of productos) {
        await api.dbQuery(
          `INSERT INTO ventas_detalle 
           (venta_id, producto_id, cantidad, precio_unitario, subtotal, itbis, total)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            producto.producto_id,
            producto.cantidad,
            producto.precio_unitario,
            producto.subtotal,
            producto.subtotal * 0.18,
            producto.subtotal * 1.18,
          ]
        );

        await api.dbQuery(
          "UPDATE productos SET stock_actual = stock_actual - ? WHERE id = ?",
          [producto.cantidad, producto.producto_id]
        );
      }

      await api.dbQuery(
        'UPDATE cotizaciones SET estado = "Convertida", venta_id = ? WHERE id = ?',
        [ventaId, cotizacionId]
      );

      return {
        success: true,
        venta_id: ventaId,
        numero_factura: numeroFactura,
      };
    } catch (error) {
      console.error("Error convirtiendo cotización:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Aprueba una cotización
   */
  async aprobarCotizacion(cotizacionId) {
    await api.dbQuery(
      'UPDATE cotizaciones SET estado = "Aprobada" WHERE id = ?',
      [cotizacionId]
    );
    return { success: true };
  }

  /**
   * Rechaza una cotización
   */
  async rechazarCotizacion(cotizacionId, motivo) {
    await api.dbQuery(
      'UPDATE cotizaciones SET estado = "Rechazada", motivo_rechazo = ? WHERE id = ?',
      [motivo, cotizacionId]
    );
    return { success: true };
  }
}

// Crear y exportar instancia singleton
export const cotizacionesService = new CotizacionesService();

// Exportar también como default
export default cotizacionesService;
