/**
 * Vista del Módulo de Productos
 * @module renderer/modules/productos/productos.view
 */

import { api } from "../../core/api.js";
import { db } from "../../services/database.service.js";
import { toast } from "../../components/notifications/toast.js";
import { debounce } from "../../utils/helpers.js";
import { formatCurrency } from "../../utils/helpers.js";

export const ProductosView = {
  productos: [],
  categorias: [],
  editandoId: null,

  render() {
    return `
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
            <div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Categoría</th>
                    <th>Costo</th>
                    <th>Precio Venta</th>
                    <th>Stock</th>
                    <th>Stock Mín.</th>
                    <th>Acciones</th>
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
    document.getElementById("btn-nuevo-producto").addEventListener("click", () => this.mostrarModalNuevo());
    const searchInput = document.getElementById("productos-search");
    searchInput.addEventListener("input", debounce(() => this.filtrarProductos(searchInput.value), 300));

    // Modal listeners
    document.getElementById("btn-cerrar-modal").addEventListener("click", () => this.ocultarModal());
    document.getElementById("btn-cancelar-producto").addEventListener("click", () => this.ocultarModal());
    document.getElementById("modal-producto").addEventListener("click", (e) => {
        if (e.target.id === "modal-producto") this.ocultarModal();
    });
    document.getElementById("btn-guardar-producto").addEventListener("click", () => this.guardarProducto());
  },

  async cargarCategorias() {
    try {
      this.categorias = await api.dbQuery("SELECT * FROM categorias ORDER BY nombre");
      const select = document.getElementById("producto-categoria");
      select.innerHTML = this.categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
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
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No se encontraron productos</td></tr>';
      return;
    }
    tbody.innerHTML = this.productos.map(p => `
      <tr class="${p.stock_actual <= p.stock_minimo ? "text-danger" : ""}">
        <td>${p.codigo || 'N/A'}</td>
        <td>${p.nombre}</td>
        <td>${p.categoria_nombre}</td>
        <td>${formatCurrency(p.precio_costo)}</td>
        <td>${formatCurrency(p.precio_venta)}</td>
        <td>${p.stock_actual}</td>
        <td>${p.stock_minimo}</td>
        <td>
          <button class="btn btn-sm btn-secondary btn-editar" data-id="${p.id}"><span class="material-icons">edit</span></button>
          <button class="btn btn-sm btn-danger btn-eliminar" data-id="${p.id}"><span class="material-icons">delete</span></button>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".btn-editar").forEach(btn => btn.addEventListener("click", () => this.editarProducto(parseInt(btn.dataset.id))));
    tbody.querySelectorAll(".btn-eliminar").forEach(btn => btn.addEventListener("click", () => this.eliminarProducto(parseInt(btn.dataset.id))));
  },

  filtrarProductos(filtro) {
    this.cargarProductos(filtro);
  },

  mostrarModalNuevo() {
    this.editandoId = null;
    document.getElementById("modal-producto-titulo").textContent = "Nuevo Producto";
    document.getElementById("form-producto").reset();
    document.getElementById("modal-producto").classList.remove("hidden");
  },

  async editarProducto(id) {
    const producto = this.productos.find(p => p.id === id);
    if (!producto) {
      toast.error("Producto no encontrado");
      return;
    }
    this.editandoId = id;
    document.getElementById("modal-producto-titulo").textContent = "Editar Producto";
    document.getElementById("producto-id-form").value = producto.id;
    document.getElementById("producto-codigo").value = producto.codigo;
    document.getElementById("producto-nombre-form").value = producto.nombre;
    document.getElementById("producto-categoria").value = producto.categoria_id;
    document.getElementById("producto-precio-costo").value = producto.precio_costo;
    document.getElementById("producto-precio-venta").value = producto.precio_venta;
    document.getElementById("producto-stock-actual").value = producto.stock_actual;
    document.getElementById("producto-stock-minimo").value = producto.stock_minimo;
    document.getElementById("producto-descripcion").value = producto.descripcion;
    document.getElementById("modal-producto").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-producto").classList.add("hidden");
  },

  async guardarProducto() {
    const producto = {
      id: this.editandoId,
      codigo: document.getElementById("producto-codigo").value,
      nombre: document.getElementById("producto-nombre-form").value,
      categoria_id: document.getElementById("producto-categoria").value,
      precio_costo: parseFloat(document.getElementById("producto-precio-costo").value),
      precio_venta: parseFloat(document.getElementById("producto-precio-venta").value),
      stock_actual: parseInt(document.getElementById("producto-stock-actual").value),
      stock_minimo: parseInt(document.getElementById("producto-stock-minimo").value),
      descripcion: document.getElementById("producto-descripcion").value,
    };

    if (!producto.nombre || !producto.codigo) {
        toast.error("El código y el nombre son obligatorios.");
        return;
    }

    try {
      if (this.editandoId) {
        // Actualizar producto
        await api.dbQuery(`UPDATE productos SET codigo=?, nombre=?, categoria_id=?, precio_costo=?, precio_venta=?, stock_actual=?, stock_minimo=?, descripcion=? WHERE id=?`, 
        [producto.codigo, producto.nombre, producto.categoria_id, producto.precio_costo, producto.precio_venta, producto.stock_actual, producto.stock_minimo, producto.descripcion, producto.id]);
        toast.success("Producto actualizado correctamente");
      } else {
        // Crear producto
        await api.dbQuery(`INSERT INTO productos (codigo, nombre, categoria_id, precio_costo, precio_venta, stock_actual, stock_minimo, descripcion, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [producto.codigo, producto.nombre, producto.categoria_id, producto.precio_costo, producto.precio_venta, producto.stock_actual, producto.stock_minimo, producto.descripcion]);
        toast.success("Producto creado correctamente");
      }
      this.ocultarModal();
      await this.cargarProductos();
    } catch (error) {
      console.error("Error guardando producto:", error);
      toast.error("Error al guardar el producto");
    }
  },

  async eliminarProducto(id) {
    if (!confirm("¿Está seguro de que desea eliminar este producto? Esta acción no se puede deshacer.")) return;
    try {
      await api.dbQuery("UPDATE productos SET activo = 0 WHERE id = ?", [id]);
      toast.success("Producto eliminado correctamente");
      await this.cargarProductos();
    } catch (error) {
      console.error("Error eliminando producto:", error);
      toast.error("Error al eliminar el producto");
    }
  },
};

export default ProductosView;