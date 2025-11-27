/**
 * Vista del Módulo de Productos
 * @module renderer/modules/productos/productos.view
 */

import { api } from "../../core/api.js";
import { db } from "../../services/database.service.js";
import { toast } from "../../components/notifications/toast.js";
import { debounce } from "../../utils/helpers.js";
import { formatCurrency } from "../../utils/helpers.js";
import { Validator } from "../../utils/validator.util.js";
import { handleError } from "../../utils/error-handler.js";

export const ProductosView = {
  productos: [],
  categorias: [],
  editandoId: null,

  render() {
    return `
      <style>
        .productos-table {
          width: 100%;
          border-collapse: collapse;
        }
        .productos-table thead tr {
          background-color: #f8f9fa;
          border-bottom: 2px solid #dee2e6;
        }
        .productos-table th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          white-space: nowrap;
          color: #495057;
          font-size: 0.9rem;
        }
        .productos-table td {
          padding: 12px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: middle;
        }
        .productos-table tbody tr:hover {
          background-color: #f8f9fa;
        }
        .badge-success {
          background-color: #28a745;
          color: white;
        }
        .badge-danger {
          background-color: #dc3545;
          color: white;
        }
        .badge-secondary {
          background-color: #6c757d;
          color: white;
        }
        .producto-imagen {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 4px;
          border: 1px solid #dee2e6;
        }
        .producto-imagen-placeholder {
          font-size: 24px;
          color: #6c757d;
          display: inline-block;
        }
      </style>
      <div class="view-container">
        <div class="view-header">
          <h1>Gestión de Productos</h1>
          <div class="header-actions">
            <input type="search" id="productos-search" class="form-control" placeholder="Buscar producto...">
            <button id="btn-nuevo-producto" class="btn btn-primary">Nuevo Producto</button>
          </div>
        </div>
        
        <div class="card">
          <div class="card-body">
            <div class="table-responsive" style="overflow-x: auto;">
              <table class="table productos-table">
                <thead>
                  <tr>
                    <th>Imagen</th>
                    <th>Código de Barra</th>
                    <th>Nombre del Producto</th>
                    <th>Proveedor</th>
                    <th>Stock Mínimo</th>
                    <th>Impuesto</th>
                    <th>Fecha de Vencimiento</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th style="text-align: center;">Opciones</th>
                  </tr>
                </thead>
                <tbody id="productos-table-body">
                  <!-- Los productos se cargarán aquí -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal para Nuevo/Editar Producto -->
      <div id="modal-producto" class="modal-backdrop hidden">
        <div class="modal">
          <div class="modal-header">
            <h2 id="modal-producto-titulo">Nuevo Producto</h2>
            <button id="btn-cerrar-modal" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <form id="form-producto">
              <input type="hidden" id="producto-id-form">
              <div class="form-grid">
                <div class="form-group">
                  <label for="producto-codigo">Código</label>
                  <input type="text" id="producto-codigo" class="form-control" required>
                </div>
                <div class="form-group">
                  <label for="producto-nombre">Nombre</label>
                  <input type="text" id="producto-nombre-form" class="form-control" required>
                </div>
                <div class="form-group">
                  <label for="producto-categoria">Categoría</label>
                  <select id="producto-categoria" class="form-control" required></select>
                </div>
                <div class="form-group">
                  <label for="producto-precio-costo">Precio Costo</label>
                  <input type="number" id="producto-precio-costo" class="form-control" required step="0.01">
                </div>
                <div class="form-group">
                  <label for="producto-precio-venta">Precio Venta</label>
                  <input type="number" id="producto-precio-venta" class="form-control" required step="0.01">
                </div>
                <div class="form-group">
                  <label for="producto-stock-actual">Stock Actual</label>
                  <input type="number" id="producto-stock-actual" class="form-control" required>
                </div>
                <div class="form-group">
                  <label for="producto-stock-minimo">Stock Mínimo</label>
                  <input type="number" id="producto-stock-minimo" class="form-control" required>
                </div>
                <div class="form-group full-width">
                  <label for="producto-descripcion">Descripción</label>
                  <textarea id="producto-descripcion" class="form-control" rows="3"></textarea>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" id="btn-cancelar-producto" class="btn">Cancelar</button>
            <button type="button" id="btn-guardar-producto" class="btn btn-primary">Guardar</button>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
    await this.cargarCategorias();
    await this.cargarProductos();
    this.setupEventListeners();
  },

  setupEventListeners() {
    document
      .getElementById("btn-nuevo-producto")
      .addEventListener("click", () => this.mostrarModalNuevo());
    const searchInput = document.getElementById("productos-search");
    searchInput.addEventListener(
      "input",
      debounce(() => this.filtrarProductos(searchInput.value), 300)
    );

    // Modal listeners
    document
      .getElementById("btn-cerrar-modal")
      .addEventListener("click", () => this.ocultarModal());
    document
      .getElementById("btn-cancelar-producto")
      .addEventListener("click", () => this.ocultarModal());
    document.getElementById("modal-producto").addEventListener("click", (e) => {
      if (e.target.id === "modal-producto") this.ocultarModal();
    });
    document
      .getElementById("btn-guardar-producto")
      .addEventListener("click", () => this.guardarProducto());
  },

  async cargarCategorias() {
    try {
      this.categorias = await api.dbQuery(
        "SELECT * FROM categorias ORDER BY nombre"
      );
      const select = document.getElementById("producto-categoria");
      select.innerHTML = this.categorias
        .map((c) => `<option value="${c.id}">${c.nombre}</option>`)
        .join("");
    } catch (error) {
      console.error("Error cargando categorías:", error);
      toast.error("Error al cargar categorías");
    }
  },

  async cargarProductos(filtro = "") {
    try {
      this.productos = await db.getProductos(filtro);
      this.mostrarProductos();
    } catch (error) {
      console.error("Error cargando productos:", error);
      toast.error("Error cargando productos");
    }
  },

  mostrarProductos() {
    const tbody = document.getElementById("productos-table-body");
    if (this.productos.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="10" style="text-align: center; padding: 20px;">No se encontraron productos</td></tr>';
      return;
    }
    
    // Función para formatear fecha
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === '') return '-';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
      } catch {
        return dateStr;
      }
    };

    // Función para obtener URL de imagen
    const getImageUrl = (imagenUrl, imagenTitulo) => {
      if (imagenUrl && imagenUrl.trim() !== '') {
        // Si es una URL completa, usarla directamente
        if (imagenUrl.startsWith('http://') || imagenUrl.startsWith('https://')) {
          return imagenUrl;
        }
        // Si es una ruta relativa, construir URL completa (ajustar según tu estructura)
        return imagenUrl;
      }
      return null;
    };

    tbody.innerHTML = this.productos
      .map(
        (p) => {
          const imagenUrl = getImageUrl(p.imagen_url, p.imagen_titulo);
          const estadoValue = p.estado !== null && p.estado !== undefined ? p.estado : (p.estatus || 1);
          const estadoClass = estadoValue === 1 || estadoValue === true ? 'badge-success' : 'badge-danger';
          const estadoText = estadoValue === 1 || estadoValue === true ? 'Activo' : 'Inactivo';
          
          return `
      <tr class="${(p.stock_actual || 0) <= (p.stock_minimo || 0) ? "text-danger" : ""}">
        <td style="text-align: center;">
          ${imagenUrl 
            ? `<img src="${imagenUrl}" alt="${p.nombre || ''}" class="producto-imagen" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
               <span class="producto-imagen-placeholder" style="display: none;">📦</span>`
            : `<span class="producto-imagen-placeholder">📦</span>`
          }
        </td>
        <td style="white-space: nowrap;">${p.codigo_barra || "-"}</td>
        <td style="font-weight: 500;">${p.nombre || "-"}</td>
        <td>${p.proveedor_nombre || "-"}</td>
        <td style="text-align: center;">${p.stock_minimo || 0}</td>
        <td>
          ${p.impuesto_nombre || "-"}
          ${p.impuesto_porcentaje > 0 ? `<span style="color: #6c757d; font-size: 0.85em; margin-left: 4px;">(${p.impuesto_porcentaje}%)</span>` : ''}
        </td>
        <td style="white-space: nowrap;">${formatDate(p.fecha_vencimiento)}</td>
        <td>
          <span class="badge badge-secondary" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
            ${p.tipo || "PRODUCTO"}
          </span>
        </td>
        <td>
          <span class="badge ${estadoClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
            ${estadoText}
          </span>
        </td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-secondary btn-editar" data-id="${
            p.id
          }" style="margin-right: 4px;" title="Editar">
            <span class="material-icons" style="font-size: 18px;">edit</span>
          </button>
          <button class="btn btn-sm btn-danger btn-eliminar" data-id="${
            p.id
          }" title="Eliminar">
            <span class="material-icons" style="font-size: 18px;">delete</span>
          </button>
        </td>
      </tr>
    `;
        }
      )
      .join("");

    tbody
      .querySelectorAll(".btn-editar")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.editarProducto(parseInt(btn.dataset.id))
        )
      );
    tbody
      .querySelectorAll(".btn-eliminar")
      .forEach((btn) =>
        btn.addEventListener("click", () =>
          this.eliminarProducto(parseInt(btn.dataset.id))
        )
      );
  },

  filtrarProductos(filtro) {
    this.cargarProductos(filtro);
  },

  mostrarModalNuevo() {
    this.editandoId = null;
    document.getElementById("modal-producto-titulo").textContent =
      "Nuevo Producto";
    document.getElementById("form-producto").reset();
    document.getElementById("modal-producto").classList.remove("hidden");
  },

  async editarProducto(id) {
    const producto = this.productos.find((p) => p.id === id);
    if (!producto) {
      toast.error("Producto no encontrado");
      return;
    }
    this.editandoId = id;
    document.getElementById("modal-producto-titulo").textContent =
      "Editar Producto";
    document.getElementById("producto-id-form").value = producto.id;
    document.getElementById("producto-codigo").value = producto.codigo;
    document.getElementById("producto-nombre-form").value = producto.nombre;
    document.getElementById("producto-categoria").value = producto.categoria_id;
    document.getElementById("producto-precio-costo").value =
      producto.precio_costo;
    document.getElementById("producto-precio-venta").value =
      producto.precio_venta;
    document.getElementById("producto-stock-actual").value =
      producto.stock_actual;
    document.getElementById("producto-stock-minimo").value =
      producto.stock_minimo;
    document.getElementById("producto-descripcion").value =
      producto.descripcion;
    document.getElementById("modal-producto").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-producto").classList.add("hidden");
  },

  async guardarProducto() {
    try {
      // Obtener valores del formulario
      const producto = {
        id: this.editandoId,
        codigo: document.getElementById("producto-codigo").value.trim(),
        nombre: document.getElementById("producto-nombre-form").value.trim(),
        categoria_id: parseInt(
          document.getElementById("producto-categoria").value
        ),
        precio_costo: parseFloat(
          document.getElementById("producto-precio-costo").value
        ),
        precio_venta: parseFloat(
          document.getElementById("producto-precio-venta").value
        ),
        stock_actual: parseInt(
          document.getElementById("producto-stock-actual").value
        ),
        stock_minimo: parseInt(
          document.getElementById("producto-stock-minimo").value
        ),
        descripcion: document
          .getElementById("producto-descripcion")
          .value.trim(),
      };

      // ===== VALIDACIONES =====

      // 1. Validar campos requeridos
      if (!Validator.isNotEmpty(producto.codigo)) {
        toast.error("El código del producto es requerido");
        return;
      }

      if (!Validator.isNotEmpty(producto.nombre)) {
        toast.error("El nombre del producto es requerido");
        return;
      }

      // 2. Validar longitud de campos
      if (!Validator.isValidLength(producto.codigo, 1, 50)) {
        toast.error("El código debe tener entre 1 y 50 caracteres");
        return;
      }

      if (!Validator.isValidLength(producto.nombre, 1, 200)) {
        toast.error("El nombre debe tener entre 1 y 200 caracteres");
        return;
      }

      // 3. Validar que los precios sean números positivos
      if (!Validator.isPositiveNumber(producto.precio_costo)) {
        toast.error("El precio de costo debe ser un número positivo");
        return;
      }

      if (!Validator.isPositiveNumber(producto.precio_venta)) {
        toast.error("El precio de venta debe ser un número positivo");
        return;
      }

      // 4. Validar que precio de venta sea mayor que precio de costo
      if (
        !Validator.isValidPricing(producto.precio_venta, producto.precio_costo)
      ) {
        toast.error("El precio de venta debe ser mayor que el precio de costo");
        return;
      }

      // 5. Validar stock (números no negativos)
      if (!Validator.isNonNegativeNumber(producto.stock_actual)) {
        toast.error("El stock actual debe ser un número no negativo");
        return;
      }

      if (!Validator.isNonNegativeNumber(producto.stock_minimo)) {
        toast.error("El stock mínimo debe ser un número no negativo");
        return;
      }

      // 6. Validar que stock mínimo sea lógico
      if (producto.stock_minimo > producto.stock_actual + 1000) {
        toast.error(
          "El stock mínimo parece demasiado alto comparado con el stock actual"
        );
        return;
      }

      // 7. Validar código único (solo al crear o si se cambió el código)
      if (
        !this.editandoId ||
        producto.codigo !==
          this.productos.find((p) => p.id === this.editandoId)?.codigo
      ) {
        // Usar tabla producto (singular) con columnas IMAXPOS
        const codigoExiste = await api.dbQuery(
          "SELECT producto_id FROM producto WHERE producto_codigo_interno = ? AND producto_estatus = 1",
          [producto.codigo]
        );

        if (codigoExiste.length > 0) {
          toast.error(
            `El código "${producto.codigo}" ya está en uso por otro producto`
          );
          return;
        }
      }

      // 8. Sanitizar entrada
      producto.codigo = Validator.sanitizeInput(producto.codigo);
      producto.nombre = Validator.sanitizeInput(producto.nombre);
      producto.descripcion = Validator.sanitizeInput(producto.descripcion);

      // ===== GUARDAR EN BASE DE DATOS =====

      if (this.editandoId) {
        // Actualizar producto existente (tabla producto según esquema IMAXPOS)
        await api.dbQuery(
          `UPDATE producto 
           SET producto_codigo_interno = ?, producto_nombre = ?, 
               producto_estatus = 1
           WHERE producto_id = ?`,
          [
            producto.codigo,
            producto.nombre,
            producto.id,
          ]
        );
        
        // Actualizar stock en producto_almacen
        await api.dbQuery(
          `INSERT OR REPLACE INTO producto_almacen (id_local, id_producto, cantidad)
           VALUES (1, ?, ?)`,
          [producto.id, producto.stock_actual || 0]
        );
        toast.success("Producto actualizado correctamente");
      } else {
        // Crear nuevo producto (tabla producto según esquema IMAXPOS)
        const result = await api.dbQuery(
          `INSERT INTO producto 
           (producto_codigo_interno, producto_nombre, producto_estatus) 
           VALUES (?, ?, 1)`,
          [
            producto.codigo,
            producto.nombre,
          ]
        );
        
        const productoId = result.lastInsertRowid;
        
        // Insertar stock en producto_almacen
        if (productoId && producto.stock_actual) {
          await api.dbQuery(
            `INSERT INTO producto_almacen (id_local, id_producto, cantidad)
             VALUES (1, ?, ?)`,
            [productoId, producto.stock_actual]
          );
        }
        toast.success("Producto creado correctamente");
      }

      this.ocultarModal();
      await this.cargarProductos();
    } catch (error) {
      handleError(error, "Error al guardar el producto");
    }
  },

  async eliminarProducto(id) {
    if (
      !confirm(
        "¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer."
      )
    )
      return;
    try {
      // Usar tabla producto (singular) según esquema IMAXPOS
      await api.dbQuery("UPDATE producto SET producto_estatus = 0 WHERE producto_id = ?", [id]);
      toast.success("Producto eliminado correctamente");
      await this.cargarProductos();
    } catch (error) {
      console.error("Error eliminando producto:", error);
      toast.error("Error al eliminar el producto");
    }
  },
};

export default ProductosView;
