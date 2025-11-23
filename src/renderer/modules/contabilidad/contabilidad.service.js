/**
 * Servicio de Contabilidad - República Dominicana
 * @module renderer/modules/contabilidad/contabilidad.service
 */

import { api } from "../../core/api.js";

export class ContabilidadService {
  /**
   * Crea un asiento contable
   */
  async crearAsiento(
    fecha,
    concepto,
    detalles,
    tipo = "Manual",
    moduloOrigen = null,
    referenciaId = null
  ) {
    try {
      const totalDebe = detalles.reduce(
        (sum, d) => sum + parseFloat(d.debe || 0),
        0
      );
      const totalHaber = detalles.reduce(
        (sum, d) => sum + parseFloat(d.haber || 0),
        0
      );

      if (Math.abs(totalDebe - totalHaber) > 0.01) {
        throw new Error("El asiento no está balanceado. Debe = Haber");
      }

      const numeroAsiento = `AS-${Date.now()}`;
      const usuarioId = 1;

      const asientoResult = await api.dbQuery(
        `INSERT INTO asientos_contables 
         (numero_asiento, fecha, concepto, tipo, modulo_origen, referencia_id, 
          total_debe, total_haber, estado, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Aprobado', ?)`,
        [
          numeroAsiento,
          fecha,
          concepto,
          tipo,
          moduloOrigen,
          referenciaId,
          totalDebe,
          totalHaber,
          usuarioId,
        ]
      );

      const asientoId = asientoResult.lastInsertRowid;

      for (const detalle of detalles) {
        await api.dbQuery(
          `INSERT INTO asientos_contables_detalle 
           (asiento_id, cuenta_id, debe, haber, concepto)
           VALUES (?, ?, ?, ?, ?)`,
          [
            asientoId,
            detalle.cuenta_id,
            detalle.debe || 0,
            detalle.haber || 0,
            detalle.concepto || concepto,
          ]
        );

        await this.actualizarLibroMayor(
          detalle.cuenta_id,
          fecha,
          numeroAsiento,
          concepto,
          detalle.debe || 0,
          detalle.haber || 0
        );
      }

      return {
        success: true,
        asiento_id: asientoId,
        numero_asiento: numeroAsiento,
      };
    } catch (error) {
      console.error("Error creando asiento:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Actualiza el libro mayor
   */
  async actualizarLibroMayor(
    cuentaId,
    fecha,
    numeroAsiento,
    concepto,
    debe,
    haber
  ) {
    const saldoAnterior = await api.dbQuery(
      `SELECT saldo FROM libro_mayor 
       WHERE cuenta_id = ? 
       ORDER BY fecha DESC, id DESC 
       LIMIT 1`,
      [cuentaId]
    );

    const saldoPrev = parseFloat(saldoAnterior[0]?.saldo || 0);
    const cuenta = await api.dbQuery(
      "SELECT naturaleza FROM plan_cuentas WHERE id = ?",
      [cuentaId]
    );
    const naturaleza = cuenta[0]?.naturaleza || "Deudora";

    let nuevoSaldo = saldoPrev;
    if (naturaleza === "Deudora") {
      nuevoSaldo = saldoPrev + debe - haber;
    } else {
      nuevoSaldo = saldoPrev + haber - debe;
    }

    await api.dbQuery(
      `INSERT INTO libro_mayor 
       (cuenta_id, fecha, numero_asiento, concepto, debe, haber, saldo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cuentaId, fecha, numeroAsiento, concepto, debe, haber, nuevoSaldo]
    );
  }

  /**
   * Genera balance de comprobación
   */
  async generarBalanceComprobacion(fechaDesde, fechaHasta) {
    const cuentas = await api.dbQuery(
      `SELECT DISTINCT cuenta_id 
       FROM libro_mayor 
       WHERE fecha BETWEEN ? AND ?
       ORDER BY cuenta_id`,
      [fechaDesde, fechaHasta]
    );

    const balance = [];

    for (const cuenta of cuentas) {
      const movimientos = await api.dbQuery(
        `SELECT SUM(debe) as total_debe, SUM(haber) as total_haber
         FROM libro_mayor
         WHERE cuenta_id = ? AND fecha BETWEEN ? AND ?`,
        [cuenta.cuenta_id, fechaDesde, fechaHasta]
      );

      const cuentaInfo = await api.dbQuery(
        "SELECT * FROM plan_cuentas WHERE id = ?",
        [cuenta.cuenta_id]
      );
      const saldoDeudor = parseFloat(movimientos[0]?.total_debe || 0);
      const saldoAcreedor = parseFloat(movimientos[0]?.total_haber || 0);

      balance.push({
        cuenta_id: cuenta.cuenta_id,
        codigo: cuentaInfo[0].codigo,
        nombre: cuentaInfo[0].nombre,
        saldo_deudor: saldoDeudor,
        saldo_acreedor: saldoAcreedor,
        saldo: saldoDeudor - saldoAcreedor,
      });
    }

    return {
      periodo: `${fechaDesde} a ${fechaHasta}`,
      fecha_generacion: new Date().toISOString().split("T")[0],
      registros: balance,
      total_debe: balance.reduce((sum, b) => sum + b.saldo_deudor, 0),
      total_haber: balance.reduce((sum, b) => sum + b.saldo_acreedor, 0),
    };
  }

  /**
   * Genera estado de resultados
   */
  async generarEstadoResultados(fechaDesde, fechaHasta) {
    const ingresos = await api.dbQuery(
      `SELECT 
        pc.id,
        pc.codigo,
        pc.nombre,
        COALESCE(SUM(lm.haber - lm.debe), 0) as total
       FROM plan_cuentas pc
       LEFT JOIN libro_mayor lm ON lm.cuenta_id = pc.id AND lm.fecha BETWEEN ? AND ?
       WHERE pc.tipo = 'Ingreso'
       GROUP BY pc.id
       HAVING total > 0`,
      [fechaDesde, fechaHasta]
    );

    const gastos = await api.dbQuery(
      `SELECT 
        pc.id,
        pc.codigo,
        pc.nombre,
        COALESCE(SUM(lm.debe - lm.haber), 0) as total
       FROM plan_cuentas pc
       LEFT JOIN libro_mayor lm ON lm.cuenta_id = pc.id AND lm.fecha BETWEEN ? AND ?
       WHERE pc.tipo = 'Gasto'
       GROUP BY pc.id
       HAVING total > 0`,
      [fechaDesde, fechaHasta]
    );

    const totalIngresos = ingresos.reduce(
      (sum, i) => sum + parseFloat(i.total || 0),
      0
    );
    const totalGastos = gastos.reduce(
      (sum, g) => sum + parseFloat(g.total || 0),
      0
    );
    const utilidadNeta = totalIngresos - totalGastos;

    return {
      periodo: `${fechaDesde} a ${fechaHasta}`,
      fecha_generacion: new Date().toISOString().split("T")[0],
      ingresos: ingresos,
      gastos: gastos,
      total_ingresos: totalIngresos,
      total_gastos: totalGastos,
      utilidad_neta: utilidadNeta,
    };
  }
}

// Crear y exportar instancia singleton
export const contabilidadService = new ContabilidadService();

// Exportar también como default
export default contabilidadService;
