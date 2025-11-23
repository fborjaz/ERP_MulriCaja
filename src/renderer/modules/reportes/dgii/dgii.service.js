/**
 * Reportes DGII - República Dominicana
 * @module renderer/modules/reportes/dgii
 */

import { api } from "../../../core/api.js";

export class ReportesDGIIService {
  /**
   * Genera Reporte 609 - Ventas
   */
  async generarReporte609(fechaDesde, fechaHasta) {
    try {
      const ventas = await api.dbQuery(
        `SELECT 
          v.numero_factura,
          v.fecha,
          v.ncf,
          COALESCE(c.rnc, c.cedula, '00000000000') as identificacion_cliente,
          COALESCE(c.razon_social, c.nombre || ' ' || COALESCE(c.apellido, '')) as nombre_cliente,
          v.subtotal,
          v.itbis,
          v.total,
          v.metodo_pago
         FROM ventas v
         LEFT JOIN clientes c ON c.id = v.cliente_id
         WHERE DATE(v.fecha) BETWEEN ? AND ?
         AND v.estado = 'Completada'
         ORDER BY v.fecha`,
        [fechaDesde, fechaHasta]
      );

      return {
        tipo: "609",
        periodo: `${fechaDesde} a ${fechaHasta}`,
        total_registros: ventas.length,
        total_ventas: ventas.reduce((sum, v) => sum + parseFloat(v.total), 0),
        total_itbis: ventas.reduce((sum, v) => sum + parseFloat(v.itbis), 0),
        datos: ventas,
      };
    } catch (error) {
      console.error("Error generando reporte 609:", error);
      throw error;
    }
  }

  /**
   * Genera Reporte IT1 - Compras
   */
  async generarReporteIT1(fechaDesde, fechaHasta) {
    try {
      const compras = await api.dbQuery(
        `SELECT 
          c.numero_factura,
          c.fecha,
          p.rnc as rnc_proveedor,
          p.nombre as nombre_proveedor,
          c.subtotal,
          c.itbis,
          c.total
         FROM compras c
         JOIN proveedores p ON p.id = c.proveedor_id
         WHERE DATE(c.fecha) BETWEEN ? AND ?
         AND c.estado = 'Completada'
         ORDER BY c.fecha`,
        [fechaDesde, fechaHasta]
      );

      return {
        tipo: "IT1",
        periodo: `${fechaDesde} a ${fechaHasta}`,
        total_registros: compras.length,
        total_compras: compras.reduce((sum, c) => sum + parseFloat(c.total), 0),
        total_itbis: compras.reduce((sum, c) => sum + parseFloat(c.itbis), 0),
        datos: compras,
      };
    } catch (error) {
      console.error("Error generando reporte IT1:", error);
      throw error;
    }
  }

  /**
   * Exporta reporte a formato TXT (DGII)
   */
  exportarTXT(reporte, formato = "609") {
    let contenido = "";

    if (formato === "609") {
      contenido += `REPORTE 609 - VENTAS\n`;
      contenido += `PERIODO: ${reporte.periodo}\n`;
      contenido += `TOTAL REGISTROS: ${reporte.total_registros}\n`;
      contenido += `TOTAL VENTAS: ${reporte.total_ventas.toFixed(2)}\n`;
      contenido += `TOTAL ITBIS: ${reporte.total_itbis.toFixed(2)}\n\n`;

      contenido += `NUMERO_FACTURA|FECHA|NCF|IDENTIFICACION|NOMBRE|SUBTOTAL|ITBIS|TOTAL|METODO_PAGO\n`;

      reporte.datos.forEach((v) => {
        contenido += `${v.numero_factura}|${v.fecha}|${v.ncf || ""}|${
          v.identificacion_cliente
        }|${v.nombre_cliente}|${v.subtotal.toFixed(2)}|${v.itbis.toFixed(
          2
        )}|${v.total.toFixed(2)}|${v.metodo_pago}\n`;
      });
    }

    return contenido;
  }

  /**
   * Exporta reporte a formato CSV
   */
  exportarCSV(reporte) {
    let csv = "";

    if (reporte.tipo === "609") {
      csv +=
        "Numero Factura,Fecha,NCF,Identificacion,Nombre,Subtotal,ITBIS,Total,Metodo Pago\n";
      reporte.datos.forEach((v) => {
        csv += `${v.numero_factura},${v.fecha},${v.ncf || ""},${
          v.identificacion_cliente
        },${v.nombre_cliente},${v.subtotal},${v.itbis},${v.total},${
          v.metodo_pago
        }\n`;
      });
    }

    return csv;
  }
}

// Crear y exportar instancia singleton
export const reportesDGII = new ReportesDGIIService();

// Exportar también como default
export default reportesDGII;
