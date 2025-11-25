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
        // Usar tabla producto (singular) según esquema IMAXPOS
        const prod = await api.dbQuery("SELECT * FROM producto WHERE producto_id = ?", [
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
        // Obtener precio desde precios o producto_costo_unitario
        const prod = await api.dbQuery(
          `SELECT pcu.costo as precio_venta 
           FROM producto p
           LEFT JOIN producto_costo_unitario pcu ON pcu.producto_id = p.producto_id AND pcu.moneda_id = 1
           WHERE p.producto_id = ?`,
          [producto.producto_id]
        );

        // Si no hay precio, usar costo unitario del producto
        let precio = parseFloat(prod[0]?.precio_venta || 0);
        if (precio === 0) {
          // Intentar obtener desde unidades_has_precio
          const precioAlt = await api.dbQuery(
            `SELECT precio FROM unidades_has_precio 
             WHERE id_producto = ? AND id_precio = 1 LIMIT 1`,
            [producto.producto_id]
          );
          precio = parseFloat(precioAlt[0]?.precio || 0);
        }
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
        // Obtener stock desde producto_almacen
        const stock = await api.dbQuery(
          `SELECT COALESCE(pa.cantidad, 0) as stock_actual 
           FROM producto p
           LEFT JOIN producto_almacen pa ON pa.id_producto = p.producto_id AND pa.id_local = 1
           WHERE p.producto_id = ?`,
          [producto.producto_id]
        );

        if (stock.length === 0 || parseFloat(stock[0].stock_actual) < producto.cantidad) {
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

      // Usar tabla venta (singular) según esquema IMAXPOS
      const ventaResult = await api.dbQuery(
        `INSERT INTO venta 
         (local_id, id_documento, venta_status, id_cliente, id_vendedor,
          subtotal, total_impuesto, descuento, total, pagado, vuelto, fecha,
          NumeroOrdenCompra, FechaEntrega, FechaOrdenCompra, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_DATE, CURRENT_TIMESTAMP)`,
        [
          1, // local_id
          1, // id_documento
          'Completada', // venta_status
          cotizacion[0].cliente_id,
          1, // id_vendedor (usuario actual)
          subtotal,
          itbis,
          0, // descuento
          total,
          efectivoRecibido,
          cambio,
          numeroFactura, // NumeroOrdenCompra
          new Date().toISOString().split('T')[0], // FechaEntrega
        ]
      );

      const ventaId = ventaResult.lastInsertRowid;

      for (const producto of productos) {
        // Usar tabla detalle_venta según esquema IMAXPOS
        await api.dbQuery(
          `INSERT INTO detalle_venta 
           (id_venta, id_producto, cantidad, precio, precio_venta, descuento, impuesto_porciento, impuesto_total, subtotal, total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ventaId,
            producto.producto_id,
            producto.cantidad,
            producto.precio_unitario,
            producto.precio_unitario,
            0, // descuento
            18, // impuesto_porciento
            producto.subtotal * 0.18, // impuesto_total
            producto.subtotal,
            producto.subtotal * 1.18,
          ]
        );

        // Actualizar stock en producto_almacen
        await api.dbQuery(
          `UPDATE producto_almacen 
           SET cantidad = cantidad - ? 
           WHERE id_producto = ? AND id_local = 1`,
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
