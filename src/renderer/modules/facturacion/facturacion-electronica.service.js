/**
 * Módulo de Facturación Electrónica - República Dominicana
 * @module renderer/modules/facturacion/facturacion-electronica
 */

import { api } from "../../core/api.js";

export class FacturacionElectronicaService {
  /**
   * Genera un NCF (Número de Comprobante Fiscal)
   * @param {string} tipoNCF - Tipo de NCF según DGII
   * @returns {Promise<string>} NCF generado
   */
  async generarNCF(tipoNCF = "B01") {
    try {
      const tiposNCF = {
        B01: "Factura de Crédito Fiscal",
        B02: "Factura de Consumo",
        B03: "Nota de Débito",
        B04: "Nota de Crédito",
        B14: "Registro Único de Ingresos",
        B15: "Registro de Gastos Menores",
      };

      const secuencial = await this.obtenerSecuencialNCF(tipoNCF);
      const ncf = `${tipoNCF}-${String(secuencial).padStart(9, "0")}`;

      await api.dbQuery(
        'INSERT INTO ncf (numero_ncf, tipo_ncf, estado) VALUES (?, ?, "Disponible")',
        [ncf, tipoNCF]
      );

      return ncf;
    } catch (error) {
      console.error("Error generando NCF:", error);
      throw error;
    }
  }

  /**
   * Obtiene el siguiente secuencial para un tipo de NCF
   */
  async obtenerSecuencialNCF(tipoNCF) {
    const result = await api.dbQuery(
      "SELECT COUNT(*) as total FROM ncf WHERE tipo_ncf = ?",
      [tipoNCF]
    );
    return (result[0]?.total || 0) + 1;
  }

  /**
   * Genera XML según formato DGII
   */
  generarXML(venta, empresa, cliente) {
    const fecha = new Date(venta.fecha).toISOString();
    const fechaFormateada = fecha.split("T")[0];
    const horaFormateada = fecha.split("T")[1].split(".")[0];

    return `<?xml version="1.0" encoding="UTF-8"?>
<e-CF>
  <Encabezado>
    <Version>1.0</Version>
    <eNCF>${venta.ncf || ""}</eNCF>
    <FechaEmision>${fechaFormateada}</FechaEmision>
    <HoraEmision>${horaFormateada}</HoraEmision>
    <TipoIngreso>1</TipoIngreso>
  </Encabezado>
  <Emisor>
    <RNC>${empresa.RNC || ""}</RNC>
    <RazonSocial>${empresa.NOMBRE_EMPRESA || ""}</RazonSocial>
    <NombreComercial>${empresa.NOMBRE_EMPRESA || ""}</NombreComercial>
    <DireccionEmisor>
      <Calle>${empresa.DIRECCION || ""}</Calle>
      <Ciudad>Santo Domingo</Ciudad>
      <Provincia>Distrito Nacional</Provincia>
      <Pais>DO</Pais>
    </DireccionEmisor>
    <Telefono>${empresa.TELEFONO || ""}</Telefono>
    <CorreoEmisor>${empresa.EMAIL || ""}</CorreoEmisor>
  </Emisor>
  <Comprador>
    <RNCComprador>${
      cliente?.rnc || cliente?.cedula || "00000000000"
    }</RNCComprador>
    <RazonSocialComprador>${
      cliente?.razon_social || cliente?.nombre || "Cliente General"
    }</RazonSocialComprador>
    <ContactoComprador>
      <Email>${cliente?.email || ""}</Email>
      <Telefono>${cliente?.telefono || ""}</Telefono>
    </ContactoComprador>
  </Comprador>
  <Totales>
    <MontoGravadoTotal>${venta.subtotal.toFixed(2)}</MontoGravadoTotal>
    <MontoGravadoI1>${venta.subtotal.toFixed(2)}</MontoGravadoI1>
    <MontoImpuestoI1>${venta.itbis.toFixed(2)}</MontoImpuestoI1>
    <TasaImpuestoI1>18.00</TasaImpuestoI1>
    <MontoTotal>${venta.total.toFixed(2)}</MontoTotal>
  </Totales>
</e-CF>`;
  }

  /**
   * Genera factura electrónica completa
   */
  async generarFacturaElectronica(ventaId) {
    try {
      const ventas = await api.dbQuery("SELECT * FROM ventas WHERE id = ?", [
        ventaId,
      ]);
      if (ventas.length === 0) {
        throw new Error("Venta no encontrada");
      }
      const venta = ventas[0];

      // Usar tabla cliente (singular) según esquema IMAXPOS
      let cliente = null;
      if (venta.cliente_id) {
        const clientes = await api.dbQuery(
          "SELECT * FROM cliente WHERE id_cliente = ?",
          [venta.cliente_id]
        );
        cliente = clientes[0] || null;
      }

      const config = await api.dbQuery(
        'SELECT * FROM configuracion WHERE clave IN ("NOMBRE_EMPRESA", "RNC", "DIRECCION", "TELEFONO", "EMAIL")'
      );
      const empresa = {};
      config.forEach((c) => {
        empresa[c.clave] = c.valor;
      });

      if (!venta.ncf) {
        const ncf = await this.generarNCF("B02");
        await api.dbQuery("UPDATE ventas SET ncf = ? WHERE id = ?", [
          ncf,
          ventaId,
        ]);
        venta.ncf = ncf;
      }

      const xml = this.generarXML(venta, empresa, cliente);

      await api.dbQuery(
        'UPDATE ncf SET estado = "Usado", fecha_uso = CURRENT_DATE, venta_id = ? WHERE numero_ncf = ?',
        [ventaId, venta.ncf]
      );

      return {
        success: true,
        ncf: venta.ncf,
        xml: xml,
      };
    } catch (error) {
      console.error("Error generando factura electrónica:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// Crear y exportar instancia singleton
export const facturacionElectronica = new FacturacionElectronicaService();

// Exportar también como default
export default facturacionElectronica;
