/**
 * Módulo de Facturas Modernas
 * @module renderer/modules/facturacion/facturas-modernas
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";

export class FacturasModernasService {
  /**
   * Genera factura moderna con diseño profesional
   */
  async generarFacturaModerna(ventaId) {
    try {
      const venta = await api.dbQuery("SELECT * FROM ventas WHERE id = ?", [
        ventaId,
      ]);
      if (venta.length === 0) {
        throw new Error("Venta no encontrada");
      }

      const factura = venta[0];

      let cliente = null;
      if (factura.cliente_id) {
        const clientes = await api.dbQuery(
          "SELECT * FROM clientes WHERE id = ?",
          [factura.cliente_id]
        );
        cliente = clientes[0] || null;
      }

      const productos = await api.dbQuery(
        `SELECT vd.*, p.nombre as producto_nombre, p.codigo, p.unidad_medida
         FROM ventas_detalle vd
         JOIN productos p ON p.id = vd.producto_id
         WHERE vd.venta_id = ?`,
        [ventaId]
      );

      const config = await api.dbQuery(
        'SELECT * FROM configuracion WHERE clave IN ("NOMBRE_EMPRESA", "RNC", "DIRECCION", "TELEFONO", "EMAIL")'
      );
      const empresa = {};
      config.forEach((c) => {
        empresa[c.clave] = c.valor;
      });

      const html = this.generarHTMLFactura(
        factura,
        cliente,
        productos,
        empresa
      );

      return {
        success: true,
        html: html,
        venta: factura,
      };
    } catch (error) {
      console.error("Error generando factura moderna:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Genera HTML de factura moderna
   */
  generarHTMLFactura(factura, cliente, productos, empresa) {
    const fecha = new Date(factura.fecha).toLocaleString("es-DO");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Factura ${factura.numero_factura}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .factura-container { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-radius: 10px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; padding: 30px; background: #fafafa; }
    .info-box { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
    .info-box h3 { color: #667eea; margin-bottom: 15px; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
    .info-box p { margin: 8px 0; color: #333; font-size: 14px; }
    .productos-section { padding: 30px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead { background: #667eea; color: white; }
    th { padding: 15px; text-align: left; font-weight: 600; }
    td { padding: 12px 15px; border-bottom: 1px solid #eee; }
    tbody tr:hover { background: #f9f9f9; }
    .totales { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 16px; }
    .total-final { font-size: 24px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid rgba(255,255,255,0.3); }
    .footer { padding: 30px; text-align: center; background: #fafafa; color: #666; font-size: 12px; }
    @media print { body { background: white; padding: 0; } .factura-container { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="factura-container">
    <div class="header">
      <h1>${empresa.NOMBRE_EMPRESA || "Mi Empresa"}</h1>
      <p>${empresa.DIRECCION || ""}</p>
      <p>Tel: ${empresa.TELEFONO || ""} | RNC: ${empresa.RNC || ""}</p>
    </div>
    <div class="info-section">
      <div class="info-box">
        <h3>Información de Factura</h3>
        <p><strong>Número:</strong> ${factura.numero_factura}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        ${factura.ncf ? `<p><strong>NCF:</strong> ${factura.ncf}</p>` : ""}
        <p><strong>Estado:</strong> ${factura.estado}</p>
      </div>
      <div class="info-box">
        <h3>Información del Cliente</h3>
        <p><strong>Nombre:</strong> ${
          cliente
            ? cliente.nombre + " " + (cliente.apellido || "")
            : "Cliente General"
        }</p>
        ${
          cliente?.cedula
            ? `<p><strong>Cédula:</strong> ${cliente.cedula}</p>`
            : ""
        }
        ${cliente?.rnc ? `<p><strong>RNC:</strong> ${cliente.rnc}</p>` : ""}
        ${
          cliente?.telefono
            ? `<p><strong>Teléfono:</strong> ${cliente.telefono}</p>`
            : ""
        }
      </div>
    </div>
    <div class="productos-section">
      <h2>Productos y Servicios</h2>
      <table>
        <thead>
          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th style="text-align: center;">Cantidad</th>
            <th style="text-align: right;">Precio Unit.</th>
            <th style="text-align: right;">Subtotal</th>
            <th style="text-align: right;">ITBIS</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${productos
            .map(
              (p) => `
            <tr>
              <td>${p.codigo}</td>
              <td>${p.producto_nombre}</td>
              <td style="text-align: center;">${p.cantidad} ${
                p.unidad_medida || ""
              }</td>
              <td style="text-align: right;">RD$ ${parseFloat(
                p.precio_unitario
              ).toFixed(2)}</td>
              <td style="text-align: right;">RD$ ${parseFloat(
                p.subtotal
              ).toFixed(2)}</td>
              <td style="text-align: right;">RD$ ${parseFloat(p.itbis).toFixed(
                2
              )}</td>
              <td style="text-align: right; font-weight: bold;">RD$ ${parseFloat(
                p.total
              ).toFixed(2)}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
      <div class="totales">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>RD$ ${parseFloat(factura.subtotal).toFixed(2)}</span>
        </div>
        <div class="total-row">
          <span>ITBIS (18%):</span>
          <span>RD$ ${parseFloat(factura.itbis).toFixed(2)}</span>
        </div>
        <div class="total-row total-final">
          <span>TOTAL:</span>
          <span>RD$ ${parseFloat(factura.total).toFixed(2)}</span>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Gracias por su compra</p>
      <p>Esta factura es válida para efectos fiscales</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Muestra factura en ventana nueva
   */
  async mostrarFactura(ventaId) {
    const resultado = await this.generarFacturaModerna(ventaId);
    if (!resultado.success) {
      toast.error("Error: " + resultado.error);
      return;
    }

    const ventana = window.open("", "_blank");
    ventana.document.write(resultado.html);
    ventana.document.close();
  }

  /**
   * Imprime factura moderna
   */
  async imprimirFacturaModerna(ventaId) {
    const resultado = await this.generarFacturaModerna(ventaId);
    if (!resultado.success) {
      toast.error("Error: " + resultado.error);
      return;
    }

    const printWindow = window.open("", "_blank");
    printWindow.document.write(resultado.html);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

// Crear y exportar instancia singleton
export const facturasModernas = new FacturasModernasService();

// Exportar también como default
export default facturasModernas;
