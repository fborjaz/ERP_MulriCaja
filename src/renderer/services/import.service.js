/**
 * Servicio de Importación
 * @module renderer/services/import.service
 */

import { api } from "../core/api.js";

export class ImportService {
  /**
   * Importa productos desde CSV/Excel
   * @param {File} file - Archivo a importar
   * @returns {Promise<Object>} Resultado de la importación
   */
  async importarProductos(file) {
    try {
      // Leer archivo
      const data = await this.leerArchivo(file);

      let importados = 0;
      let errores = [];

      for (const row of data) {
        try {
          // Validar datos requeridos
          if (!row.codigo || !row.nombre || !row.precio_venta) {
            errores.push(`Fila ${importados + 1}: Faltan datos requeridos`);
            continue;
          }

          // Buscar o crear categoría
          let categoriaId = 1; // Categoría por defecto
          if (row.categoria) {
            const categorias = await api.dbQuery(
              "SELECT id FROM categorias WHERE nombre = ?",
              [row.categoria]
            );
            if (categorias.length > 0) {
              categoriaId = categorias[0].id;
            }
          }

          // Insertar producto
          await api.dbQuery(
            `INSERT INTO productos 
             (codigo, nombre, descripcion, categoria_id, precio_costo, precio_venta, stock_actual, stock_minimo, aplica_itbis)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.codigo,
              row.nombre,
              row.descripcion || "",
              categoriaId,
              parseFloat(row.precio_costo || 0),
              parseFloat(row.precio_venta),
              parseFloat(row.stock_actual || 0),
              parseFloat(row.stock_minimo || 5),
              row.aplica_itbis !== "false" ? 1 : 0,
            ]
          );

          importados++;
        } catch (error) {
          errores.push(`Fila ${importados + 1}: ${error.message}`);
        }
      }

      return {
        success: true,
        importados,
        errores,
        mensaje: `Se importaron ${importados} productos. ${errores.length} errores.`,
      };
    } catch (error) {
      console.error("Error importando productos:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Importa clientes desde CSV/Excel
   * @param {File} file - Archivo a importar
   * @returns {Promise<Object>} Resultado de la importación
   */
  async importarClientes(file) {
    try {
      const data = await this.leerArchivo(file);

      let importados = 0;
      let errores = [];

      for (const row of data) {
        try {
          if (!row.nombre) {
            errores.push(`Fila ${importados + 1}: Falta nombre`);
            continue;
          }

          const codigo = `CLI-${Date.now()}-${importados}`;

          await api.dbQuery(
            `INSERT INTO clientes 
             (codigo, tipo_cliente, cedula, rnc, nombre, apellido, telefono, email, direccion)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              codigo,
              row.tipo_cliente || "Persona Fisica",
              row.cedula || null,
              row.rnc || null,
              row.nombre,
              row.apellido || "",
              row.telefono || "",
              row.email || "",
              row.direccion || "",
            ]
          );

          importados++;
        } catch (error) {
          errores.push(`Fila ${importados + 1}: ${error.message}`);
        }
      }

      return {
        success: true,
        importados,
        errores,
        mensaje: `Se importaron ${importados} clientes. ${errores.length} errores.`,
      };
    } catch (error) {
      console.error("Error importando clientes:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Lee un archivo CSV o Excel
   * @param {File} file - Archivo a leer
   * @returns {Promise<Array>} Datos del archivo
   */
  async leerArchivo(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split("\n");
          const headers = lines[0].split(",").map((h) => h.trim());

          const data = [];
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;

            const values = lines[i].split(",");
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index]?.trim() || "";
            });
            data.push(row);
          }

          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error("Error leyendo archivo"));
      reader.readAsText(file);
    });
  }
}

// Crear y exportar instancia singleton
export const importService = new ImportService();

// Exportar también como default
export default importService;
