/**
 * Servicio de Base de Datos
 * @module renderer/services/database.service
 */

import { api } from "../core/api.js";

export class DatabaseService {
  /**
   * Ejecuta una consulta SQL
   * @param {string} sql - Consulta SQL
   * @param {Array} params - Parámetros
   * @returns {Promise<Array|Object>} Resultado
   */
  async query(sql, params = []) {
    try {
      return await api.dbQuery(sql, params);
    } catch (error) {
      console.error("Error en query:", error);
      throw error;
    }
  }

  /**
   * Ejecuta un script SQL
   * @param {string} sql - Script SQL
   * @returns {Promise<void>}
   */
  async exec(sql) {
    try {
      return await api.dbExec(sql);
    } catch (error) {
      console.error("Error en exec:", error);
      throw error;
    }
  }

  /**
   * Realiza un backup de la base de datos
   * @returns {Promise<Object>} Resultado del backup
   */
  async backup() {
    return await api.dbBackup();
  }

  /**
   * Restaura la base de datos desde un backup
   * @param {string} backupPath - Ruta del backup
   * @returns {Promise<Object>} Resultado de la restauración
   */
  async restore(backupPath) {
    return await api.dbRestore(backupPath);
  }

  // ==================== PRODUCTOS ====================

  /**
   * Obtiene productos con filtro opcional
   * @param {string} filtro - Filtro de búsqueda
   * @returns {Promise<Array>} Lista de productos
   */
  async getProductos(filtro = "") {
    // Usar tabla producto (singular) según esquema IMAXPOS
    // Hacer JOINs para obtener proveedor, impuesto y otros datos
    let sql = `
      SELECT 
        p.producto_id as id,
        COALESCE(p.producto_codigo_interno, '') as codigo,
        COALESCE(p.producto_codigo_barra, '') as codigo_barra,
        COALESCE(p.producto_nombre, '') as nombre,
        COALESCE(p.producto_descripcion, '') as descripcion,
        COALESCE(p.producto_costo_unitario, 0) as precio_costo,
        COALESCE(p.producto_stockminimo, 0) as stock_minimo,
        COALESCE(p.producto_estatus, 1) as estatus,
        COALESCE(p.producto_estado, 1) as estado,
        COALESCE(p.producto_vencimiento, '') as fecha_vencimiento,
        COALESCE(p.producto_tipo, 'PRODUCTO') as tipo,
        COALESCE(p.producto_titulo_imagen, '') as imagen_titulo,
        COALESCE(p.producto_descripcion_img, '') as imagen_url,
        COALESCE(prov.nombre_comercial, prov.razon_social, 'Sin proveedor') as proveedor_nombre,
        COALESCE(i.nombre_impuesto, 'Sin impuesto') as impuesto_nombre,
        COALESCE(i.porcentaje_impuesto, 0) as impuesto_porcentaje
      FROM producto p
      LEFT JOIN proveedor prov ON prov.id_proveedor = p.producto_proveedor
      LEFT JOIN impuestos i ON i.id_impuesto = p.producto_impuesto
      WHERE COALESCE(p.producto_estatus, 1) = 1
    `;
    let params = [];

    if (filtro) {
      sql +=
        " AND (p.producto_codigo_interno LIKE ? OR p.producto_nombre LIKE ? OR p.producto_codigo_barra LIKE ?)";
      const search = `%${filtro}%`;
      params = [search, search, search];
    }

    sql += " ORDER BY p.producto_nombre";
    return await this.query(sql, params);
  }

  /**
   * Obtiene un producto por ID
   * @param {number} id - ID del producto
   * @returns {Promise<Object>} Producto
   */
  async getProducto(id) {
    const result = await this.query(
      "SELECT * FROM producto WHERE producto_id = ?",
      [id]
    );
    return result[0];
  }

  /**
   * Obtiene productos con stock bajo
   * @returns {Promise<Array>} Productos con stock bajo
   */
  async getProductosBajoStock() {
    // Verificar stock desde producto_almacen
    return await this.query(
      `SELECT p.*, pa.cantidad as stock_actual 
       FROM producto p 
       LEFT JOIN producto_almacen pa ON pa.id_producto = p.producto_id 
       WHERE p.producto_estatus = 1 
       AND (pa.cantidad IS NULL OR pa.cantidad <= p.producto_stockminimo)
       ORDER BY COALESCE(pa.cantidad, 0)`
    );
  }

  // ==================== CLIENTES ====================

  /**
   * Obtiene clientes
   * @returns {Promise<Array>} Lista de clientes
   */
  async getClientes() {
    // Usar tabla cliente (singular) según esquema IMAXPOS
    // Mapear columnas para compatibilidad con las vistas
    return await this.query(
      `SELECT 
        id_cliente as id,
        identificacion,
        razon_social,
        nombre_comercial as nombre,
        tipo_cliente,
        identificacion as cedula,
        COALESCE(identificacion, ruc) as rnc,
        COALESCE(telefono1, telefono2) as telefono,
        email,
        direccion
      FROM cliente 
      WHERE cliente_status = 1 
      ORDER BY nombre_comercial`
    );
  }

  /**
   * Obtiene un cliente por ID
   * @param {number} id - ID del cliente
   * @returns {Promise<Object>} Cliente
   */
  async getCliente(id) {
    const result = await this.query(
      "SELECT * FROM cliente WHERE id_cliente = ?",
      [id]
    );
    return result[0];
  }

  // ==================== VENTAS ====================

  /**
   * Obtiene ventas en un rango de fechas
   * @param {string} fechaDesde - Fecha inicial
   * @param {string} fechaHasta - Fecha final
   * @returns {Promise<Array>} Lista de ventas
   */
  async getVentas(fechaDesde, fechaHasta) {
    return await this.query(
      `SELECT v.*, u.nombre as usuario_nombre, c.nombre as cliente_nombre, 
       cj.nombre as caja_nombre
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN cajas cj ON cj.id = v.caja_id
       WHERE DATE(v.fecha) BETWEEN ? AND ?
       ORDER BY v.fecha DESC`,
      [fechaDesde, fechaHasta]
    );
  }

  /**
   * Obtiene una venta por ID
   * @param {number} id - ID de la venta
   * @returns {Promise<Object>} Venta con detalles
   */
  async getVenta(id) {
    const venta = await this.query(
      `SELECT v.*, u.nombre as usuario_nombre, c.nombre as cliente_nombre,
       cj.nombre as caja_nombre
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN clientes c ON c.id = v.cliente_id
       LEFT JOIN cajas cj ON cj.id = v.caja_id
       WHERE v.id = ?`,
      [id]
    );

    if (venta.length === 0) return null;

    const detalles = await this.query(
      `SELECT vd.*, p.nombre as producto_nombre
       FROM ventas_detalle vd
       JOIN productos p ON p.id = vd.producto_id
       WHERE vd.venta_id = ?`,
      [id]
    );

    return {
      ...venta[0],
      detalles: detalles,
    };
  }

  /**
   * Crea una nueva venta
   * @param {Object} ventaData - Datos de la venta
   * @returns {Promise<Object>} Venta creada
   */
  async crearVenta(ventaData) {
    const {
      caja_id,
      usuario_id,
      cliente_id,
      items,
      metodo_pago,
      efectivo_recibido,
    } = ventaData;

    // Calcular totales
    let subtotal = 0;
    items.forEach((item) => {
      subtotal += item.cantidad * item.precio_unitario;
    });

    const itbis = subtotal * 0.18;
    const total = subtotal + itbis;

    // Generar número de factura
    const numeroFactura = `FAC-${Date.now()}`;

    // Insertar venta
    const ventaResult = await this.query(
      `INSERT INTO ventas (numero_factura, caja_id, usuario_id, cliente_id, 
       subtotal, itbis, total, metodo_pago, efectivo_recibido, cambio, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Completada')`,
      [
        numeroFactura,
        caja_id,
        usuario_id,
        cliente_id,
        subtotal,
        itbis,
        total,
        metodo_pago,
        efectivo_recibido,
        efectivo_recibido - total,
      ]
    );

    const ventaId = ventaResult.lastInsertRowid;

    // Insertar detalles y actualizar stock
    for (const item of items) {
      await this.query(
        `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, 
         precio_unitario, subtotal, itbis, total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio_unitario,
          item.cantidad * item.precio_unitario,
          item.cantidad * item.precio_unitario * 0.18,
          item.cantidad * item.precio_unitario * 1.18,
        ]
      );

      // Actualizar stock en producto_almacen
      await this.query(
        `UPDATE producto_almacen 
         SET cantidad = cantidad - ? 
         WHERE id_producto = ? AND id_local = 1`,
        [item.cantidad, item.producto_id]
      );
    }

    return {
      id: ventaId,
      numero_factura: numeroFactura,
      total: total,
    };
  }

  // ==================== ESTADÍSTICAS ====================

  /**
   * Obtiene estadísticas del dashboard
   * @returns {Promise<Object>} Estadísticas
   */
  async getEstadisticas() {
    const hoy = new Date().toISOString().split("T")[0];

    const ventasHoy = await this.query(
      `SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as ingresos
       FROM venta
       WHERE DATE(fecha) = ? AND venta_status = 'Completada'`,
      [hoy]
    );

    const totalProductos = await this.query(
      "SELECT COUNT(*) as total FROM producto WHERE producto_estatus = 1"
    );

    return {
      ventas_hoy: ventasHoy[0].total,
      ingresos_hoy: ventasHoy[0].ingresos,
      total_productos: totalProductos[0].total,
    };
  }
}

// Crear y exportar instancia singleton
export const db = new DatabaseService();

// Exportar también como default
export default db;
