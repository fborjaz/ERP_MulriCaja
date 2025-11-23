/**
 * Módulo de Recursos Humanos
 * @module renderer/modules/rrhh/rrhh
 */

import { api } from "../../core/api.js";

export class RRHHService {
  /**
   * Obtiene empleados activos
   */
  async getEmpleados() {
    try {
      return await api.dbQuery(
        "SELECT * FROM empleados WHERE activo = 1 ORDER BY nombre"
      );
    } catch (error) {
      console.error("Error obteniendo empleados:", error);
      return [];
    }
  }

  /**
   * Registra asistencia de empleado
   */
  async registrarAsistencia(empleadoId, fecha, tipo = "Entrada") {
    try {
      await api.dbQuery(
        "INSERT INTO asistencias (empleado_id, fecha, hora, tipo) VALUES (?, ?, TIME('now'), ?)",
        [empleadoId, fecha, tipo]
      );
      return { success: true };
    } catch (error) {
      console.error("Error registrando asistencia:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene reporte de asistencias
   */
  async getReporteAsistencias(fechaDesde, fechaHasta) {
    try {
      return await api.dbQuery(
        `SELECT a.*, e.nombre as empleado_nombre
         FROM asistencias a
         JOIN empleados e ON e.id = a.empleado_id
         WHERE DATE(a.fecha) BETWEEN ? AND ?
         ORDER BY a.fecha DESC, a.hora DESC`,
        [fechaDesde, fechaHasta]
      );
    } catch (error) {
      console.error("Error obteniendo reporte de asistencias:", error);
      return [];
    }
  }

  /**
   * Calcula horas trabajadas
   */
  async calcularHorasTrabajadas(empleadoId, mes, año) {
    try {
      const asistencias = await api.dbQuery(
        `SELECT * FROM asistencias
         WHERE empleado_id = ?
         AND strftime('%m', fecha) = ?
         AND strftime('%Y', fecha) = ?
         ORDER BY fecha, hora`,
        [empleadoId, mes.toString().padStart(2, "0"), año.toString()]
      );

      let totalHoras = 0;
      let entrada = null;

      asistencias.forEach((a) => {
        if (a.tipo === "Entrada") {
          entrada = a.hora;
        } else if (a.tipo === "Salida" && entrada) {
          const horaEntrada = new Date(`2000-01-01 ${entrada}`);
          const horaSalida = new Date(`2000-01-01 ${a.hora}`);
          const horas = (horaSalida - horaEntrada) / (1000 * 60 * 60);
          totalHoras += horas;
          entrada = null;
        }
      });

      return totalHoras;
    } catch (error) {
      console.error("Error calculando horas trabajadas:", error);
      return 0;
    }
  }
}

// Crear y exportar instancia singleton
export const rrhhService = new RRHHService();

// Exportar también como default
export default rrhhService;
