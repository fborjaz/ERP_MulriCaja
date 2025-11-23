/**
 * Módulo de Nómina
 * @module renderer/modules/rrhh/nomina
 */

import { api } from "../../core/api.js";

export class NominaService {
  /**
   * Calcula nómina de empleados
   */
  async calcularNomina(mes, año) {
    try {
      const empleados = await api.dbQuery(
        "SELECT * FROM empleados WHERE activo = 1"
      );

      const nomina = [];

      for (const empleado of empleados) {
        const salarioBruto = empleado.salario;
        const afp = salarioBruto * 0.0287; // 2.87%
        const sfs = salarioBruto * 0.0304; // 3.04%
        const isr = this.calcularISR(salarioBruto);

        const totalDescuentos = afp + sfs + isr;
        const salarioNeto = salarioBruto - totalDescuentos;

        nomina.push({
          empleado_id: empleado.id,
          nombre: empleado.nombre,
          salario_bruto: salarioBruto,
          afp: afp,
          sfs: sfs,
          isr: isr,
          total_descuentos: totalDescuentos,
          salario_neto: salarioNeto,
          mes: mes,
          año: año,
        });
      }

      return nomina;
    } catch (error) {
      console.error("Error calculando nómina:", error);
      return [];
    }
  }

  /**
   * Calcula ISR según escala RD
   */
  calcularISR(salarioAnual) {
    const salarioMensual = salarioAnual;
    const salarioAnualTotal = salarioMensual * 12;

    if (salarioAnualTotal <= 416220) return 0;
    if (salarioAnualTotal <= 624329) return (salarioAnualTotal - 416220) * 0.15;
    if (salarioAnualTotal <= 867123)
      return 31216 + (salarioAnualTotal - 624329) * 0.2;
    return 79776 + (salarioAnualTotal - 867123) * 0.25;
  }

  /**
   * Genera reporte de nómina
   */
  async generarReporteNomina(mes, año) {
    const nomina = await this.calcularNomina(mes, año);

    const totales = {
      total_bruto: nomina.reduce((sum, n) => sum + n.salario_bruto, 0),
      total_afp: nomina.reduce((sum, n) => sum + n.afp, 0),
      total_sfs: nomina.reduce((sum, n) => sum + n.sfs, 0),
      total_isr: nomina.reduce((sum, n) => sum + n.isr, 0),
      total_descuentos: nomina.reduce((sum, n) => sum + n.total_descuentos, 0),
      total_neto: nomina.reduce((sum, n) => sum + n.salario_neto, 0),
    };

    return {
      nomina: nomina,
      totales: totales,
      mes: mes,
      año: año,
    };
  }
}

// Crear y exportar instancia singleton
export const nominaService = new NominaService();

// Exportar también como default
export default nominaService;
