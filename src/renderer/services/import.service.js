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

          // Insertar producto (tabla producto según esquema IMAXPOS)
          const productoResult = await api.dbQuery(
            `INSERT INTO producto 
             (producto_codigo_interno, producto_nombre, producto_descripcion, producto_estatus, producto_stockminimo)
             VALUES (?, ?, ?, 1, ?)`,
            [
              row.codigo,
              row.nombre,
              row.descripcion || "",
              parseFloat(row.stock_minimo || 5),
            ]
          );
          
          const productoId = productoResult.lastInsertRowid;
          
          // Insertar precio en unidades_has_precio
          if (row.precio_venta) {
            await api.dbQuery(
              `INSERT INTO unidades_has_precio (id_precio, id_unidad, id_producto, precio)
               VALUES (1, 1, ?, ?)`,
              [productoId, parseFloat(row.precio_venta)]
            );
          }
          
          // Insertar costo en producto_costo_unitario
          if (row.precio_costo) {
            await api.dbQuery(
              `INSERT INTO producto_costo_unitario (producto_id, moneda_id, costo)
               VALUES (?, 1, ?)`,
              [productoId, parseFloat(row.precio_costo || 0)]
            );
          }
          
          // Insertar stock en producto_almacen
          if (row.stock_actual) {
            await api.dbQuery(
              `INSERT INTO producto_almacen (id_local, id_producto, cantidad)
               VALUES (1, ?, ?)`,
              [productoId, parseFloat(row.stock_actual || 0)]
            );
          }

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

          // Insertar cliente (tabla cliente según esquema IMAXPOS)
          await api.dbQuery(
            `INSERT INTO cliente 
             (codigo, tipo_cliente, identificacion, ruc, nombre_comercial, razon_social, telefono1, email, direccion, cliente_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
              codigo,
              row.tipo_cliente || "Persona Fisica",
              row.cedula || row.identificacion || null,
              row.rnc || row.ruc || null,
              row.nombre || row.nombre_comercial || '',
              row.razon_social || row.nombre || '',
              row.telefono || row.telefono1 || '',
              row.email || '',
              row.direccion || '',
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
