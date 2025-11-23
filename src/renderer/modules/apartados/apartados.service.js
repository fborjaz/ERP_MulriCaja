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
        const prod = await api.dbQuery(
          "SELECT stock_actual FROM productos WHERE id = ?",
          [producto.producto_id]
        );

        if (prod.length === 0) {
          throw new Error(`Producto ${producto.producto_id} no encontrado`);
        }

        const stockDisponible = prod[0].stock_actual;
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
        const prod = await api.dbQuery(
          "SELECT precio_venta FROM productos WHERE id = ?",
          [producto.producto_id]
        );

        const precio = parseFloat(prod[0].precio_venta);
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

        await api.dbQuery(
          `UPDATE productos 
           SET stock_apartado = COALESCE(stock_apartado, 0) + ? 
           WHERE id = ?`,
          [producto.cantidad, producto.producto_id]
        );
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

      const ventaResult = await api.dbQuery(
        `INSERT INTO ventas 
         (numero_factura, caja_id, usuario_id, cliente_id, subtotal, itbis, total, 
          metodo_pago, efectivo_recibido, cambio, estado, origen_apartado)
         VALUES (?, 1, 1, ?, ?, ?, ?, ?, ?, ?, 'Completada', ?)`,
        [
          numeroFactura,
          apartado[0].cliente_id,
          subtotal,
          itbis,
          total,
          metodoPago,
          efectivoRecibido,
          cambio,
          apartadoId,
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
          `UPDATE productos 
           SET stock_actual = stock_actual - ?,
               stock_apartado = COALESCE(stock_apartado, 0) - ?
           WHERE id = ?`,
          [producto.cantidad, producto.cantidad, producto.producto_id]
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

      for (const producto of productos) {
        await api.dbQuery(
          `UPDATE productos 
           SET stock_apartado = COALESCE(stock_apartado, 0) - ?
           WHERE id = ?`,
          [producto.cantidad, producto.producto_id]
        );
      }

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
