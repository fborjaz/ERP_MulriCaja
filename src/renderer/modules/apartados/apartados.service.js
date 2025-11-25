/**
 * Servicio de Apartados - Lógica de Negocio
 * @module renderer/modules/apartados/apartados.service
 */

import { api } from "../../core/api.js";

export class ApartadosService {
  /**
   * Crea un nuevo apartado
   */
  async crearApartado(clienteId, productos, fechaLimite, observaciones) {
    try {
      for (const producto of productos) {
        // Obtener stock desde producto_almacen
        const stock = await api.dbQuery(
          `SELECT COALESCE(pa.cantidad, 0) as stock_actual 
           FROM producto p
           LEFT JOIN producto_almacen pa ON pa.id_producto = p.producto_id AND pa.id_local = 1
           WHERE p.producto_id = ?`,
          [producto.producto_id]
        );

        if (stock.length === 0) {
          throw new Error(`Producto ${producto.producto_id} no encontrado`);
        }

        const stockDisponible = parseFloat(stock[0].stock_actual);
        const stockApartado = await this.getStockApartado(producto.producto_id);
        const stockReal = stockDisponible - stockApartado;

        if (producto.cantidad > stockReal) {
          throw new Error(
            `Stock insuficiente para producto ${producto.producto_id}. Disponible: ${stockReal}`
          );
        }
      }

      const numeroApartado = `APT-${Date.now()}`;
      const resultado = await api.dbQuery(
        `INSERT INTO apartados 
         (numero_apartado, cliente_id, fecha_limite, observaciones, estado, fecha_creacion)
         VALUES (?, ?, ?, ?, 'Activo', CURRENT_TIMESTAMP)`,
        [numeroApartado, clienteId, fechaLimite, observaciones]
      );

      const apartadoId = resultado.lastInsertRowid;

      let total = 0;
      for (const producto of productos) {
        // Obtener precio desde unidades_has_precio o producto_costo_unitario
        const precioQuery = await api.dbQuery(
          `SELECT precio FROM unidades_has_precio 
           WHERE id_producto = ? AND id_precio = 1 LIMIT 1`,
          [producto.producto_id]
        );
        
        let precio = parseFloat(precioQuery[0]?.precio || 0);
        if (precio === 0) {
          const costoQuery = await api.dbQuery(
            `SELECT costo FROM producto_costo_unitario 
             WHERE producto_id = ? AND moneda_id = 1 LIMIT 1`,
            [producto.producto_id]
          );
          precio = parseFloat(costoQuery[0]?.costo || 0);
        }
        
        const subtotal = precio * producto.cantidad;
        total += subtotal;

        await api.dbQuery(
          `INSERT INTO apartados_detalle 
           (apartado_id, producto_id, cantidad, precio_unitario, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [
            apartadoId,
            producto.producto_id,
            producto.cantidad,
            precio,
            subtotal,
          ]
        );

        // Nota: En IMAXPOS no hay campo stock_apartado, se maneja en apartados_detalle
        // El stock disponible se calcula restando los apartados activos
      }

      await api.dbQuery("UPDATE apartados SET total = ? WHERE id = ?", [
        total,
        apartadoId,
      ]);

      return {
        success: true,
        apartado_id: apartadoId,
        numero_apartado: numeroApartado,
        total: total,
      };
    } catch (error) {
      console.error("Error creando apartado:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Obtiene stock apartado de un producto
   */
  async getStockApartado(productoId) {
    const resultado = await api.dbQuery(
      `SELECT COALESCE(SUM(ad.cantidad), 0) as total_apartado
       FROM apartados_detalle ad
       JOIN apartados a ON a.id = ad.apartado_id
       WHERE ad.producto_id = ?
       AND a.estado = 'Activo'`,
      [productoId]
    );
    return parseFloat(resultado[0]?.total_apartado || 0);
  }

  /**
   * Convierte apartado a venta
   */
  async convertirAVenta(apartadoId, metodoPago, efectivoRecibido = 0) {
    try {
      const apartado = await api.dbQuery(
        "SELECT * FROM apartados WHERE id = ?",
        [apartadoId]
      );
      if (apartado.length === 0) {
        throw new Error("Apartado no encontrado");
      }

      if (apartado[0].estado !== "Activo") {
        throw new Error("El apartado no está activo");
      }

      const productos = await api.dbQuery(
        "SELECT * FROM apartados_detalle WHERE apartado_id = ?",
        [apartadoId]
      );

      const numeroFactura = `FAC-${Date.now()}`;
      const subtotal = apartado[0].total;
      const itbis = subtotal * 0.18;
      const total = subtotal + itbis;
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
          apartado[0].cliente_id,
          1, // id_vendedor
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
            producto.subtotal * 0.18,
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
        'UPDATE apartados SET estado = "Convertido", venta_id = ? WHERE id = ?',
        [ventaId, apartadoId]
      );

      return {
        success: true,
        venta_id: ventaId,
        numero_factura: numeroFactura,
      };
    } catch (error) {
      console.error("Error convirtiendo apartado:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancela un apartado
   */
  async cancelarApartado(apartadoId, motivo) {
    try {
      const apartado = await api.dbQuery(
        "SELECT * FROM apartados WHERE id = ?",
        [apartadoId]
      );
      if (apartado.length === 0) {
        throw new Error("Apartado no encontrado");
      }

      const productos = await api.dbQuery(
        "SELECT * FROM apartados_detalle WHERE apartado_id = ?",
        [apartadoId]
      );

      // Nota: En IMAXPOS el stock apartado se maneja en apartados_detalle
      // Al cancelar, simplemente se marca el apartado como cancelado
      // El stock disponible se recalcula automáticamente

      await api.dbQuery(
        'UPDATE apartados SET estado = "Cancelado", motivo_cancelacion = ? WHERE id = ?',
        [motivo, apartadoId]
      );

      return { success: true };
    } catch (error) {
      console.error("Error cancelando apartado:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Crear y exportar instancia singleton
export const apartadosService = new ApartadosService();

// Exportar también como default
export default apartadosService;
