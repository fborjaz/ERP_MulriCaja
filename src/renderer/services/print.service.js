/**
 * Servicio de Impresión
 * @module renderer/services/print.service
 */

import { api } from "../core/api.js";

export class PrintService {
  /**
   * Imprime una factura
   * @param {Object} venta - Datos de la venta
   * @returns {Promise<void>}
   */
  async imprimirFactura(venta) {
    try {
      // Obtener detalles de la venta
      const detalles = await api.dbQuery(
        `SELECT vd.*, p.nombre as producto_nombre
         FROM ventas_detalle vd
         JOIN productos p ON p.id = vd.producto_id
         WHERE vd.venta_id = ?`,
        [venta.id]
      );

      // Generar HTML para impresión
      const html = this.generarHTMLFactura(venta, detalles);

      // Abrir ventana de impresión
      const printWindow = window.open("", "_blank");
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error("Error imprimiendo factura:", error);
      throw error;
    }
  }

  /**
   * Genera HTML para factura
   * @param {Object} venta - Datos de la venta
   * @param {Array} detalles - Detalles de la venta
   * @returns {string} HTML generado
   */
  generarHTMLFactura(venta, detalles) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Factura ${venta.numero_factura}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .totales { margin-top: 20px; text-align: right; }
          .total { font-size: 18px; font-weight: bold; }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>ERP Multicajas RD</h1>
          <h2>Factura ${venta.numero_factura}</h2>
        </div>
        
        <div class="info">
          <p><strong>Fecha:</strong> ${new Date(venta.fecha).toLocaleString(
            "es-DO"
          )}</p>
          <p><strong>Cliente:</strong> ${
            venta.cliente_nombre || "Cliente Genérico"
          }</p>
          <p><strong>Caja:</strong> ${venta.caja_nombre}</p>
          <p><strong>Vendedor:</strong> ${venta.usuario_nombre}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Subtotal</th>
              <th>ITBIS</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${detalles
              .map(
                (d) => `
              <tr>
                <td>${d.producto_nombre}</td>
                <td>${d.cantidad}</td>
                <td>RD$ ${d.precio_unitario.toFixed(2)}</td>
                <td>RD$ ${d.subtotal.toFixed(2)}</td>
                <td>RD$ ${d.itbis.toFixed(2)}</td>
                <td>RD$ ${d.total.toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        
        <div class="totales">
          <p><strong>Subtotal:</strong> RD$ ${venta.subtotal.toFixed(2)}</p>
          <p><strong>ITBIS (18%):</strong> RD$ ${venta.itbis.toFixed(2)}</p>
          <p class="total"><strong>TOTAL:</strong> RD$ ${venta.total.toFixed(
            2
          )}</p>
          ${
            venta.metodo_pago === "Efectivo"
              ? `
            <p><strong>Efectivo Recibido:</strong> RD$ ${venta.efectivo_recibido.toFixed(
              2
            )}</p>
            <p><strong>Cambio:</strong> RD$ ${venta.cambio.toFixed(2)}</p>
          `
              : ""
          }
        </div>
        
        <div style="margin-top: 40px; text-align: center;">
          <p>¡Gracias por su compra!</p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Imprime reporte de inventario
   * @param {Array} productos - Lista de productos
   * @returns {Promise<void>}
   */
  async imprimirInventario(productos) {
    try {
      const html = this.generarHTMLInventario(productos);
      const printWindow = window.open("", "_blank");
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error("Error imprimiendo inventario:", error);
      throw error;
    }
  }

  /**
   * Genera HTML para inventario
   * @param {Array} productos - Lista de productos
   * @returns {string} HTML generado
   */
  generarHTMLInventario(productos) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Inventario</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .bajo-stock { background-color: #ffebee; }
        </style>
      </head>
      <body>
        <h1>Reporte de Inventario</h1>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString("es-DO")}</p>
        
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Stock Actual</th>
              <th>Stock Mínimo</th>
              <th>Precio Venta</th>
            </tr>
          </thead>
          <tbody>
            ${productos
              .map(
                (p) => `
              <tr class="${
                p.stock_actual <= p.stock_minimo ? "bajo-stock" : ""
              }">
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>${p.categoria_nombre || p.categoria}</td>
                <td>${p.stock_actual}</td>
                <td>${p.stock_minimo}</td>
                <td>RD$ ${p.precio_venta.toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }
}

// Crear y exportar instancia singleton
export const printService = new PrintService();

// Exportar también como default
export default printService;
