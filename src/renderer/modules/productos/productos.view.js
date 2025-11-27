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
        .status-activo {
          color: #28a745;
          font-weight: 600;
        }
        .status-inactivo {
          color: #dc3545;
          font-weight: 600;
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
        .productos-table th:first-child {
          display: none;
        }
        .productos-table td:first-child {
          display: none;
        }
        .dropdown-menu {
          position: absolute;
          transform: translate3d(-165px, -78px, 0px);
          top: 0px;
          left: 0px;
          will-change: transform;
        }
        .nav-tabs {
          border-bottom: 2px solid #dee2e6;
          margin-bottom: 20px;
        }
        .nav-tabs li {
          list-style: none;
          margin: 0 10px;
        }
        .nav-tabs a {
          padding: 10px 20px;
          display: block;
          text-decoration: none;
          color: #495057;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.3s;
        }
        .nav-tabs li.active a,
        .nav-tabs a:hover {
          border-bottom: 2px solid #1BBAE1;
          color: #1BBAE1;
        }
        .tab-pane {
          display: none;
        }
        .tab-pane.active {
          display: block;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 3fr;
          gap: 15px;
          margin-bottom: 15px;
        }
        .input-group {
          display: flex;
        }
        .input-group-addon {
          padding: 8px 12px;
          background: #e9ecef;
          border: 1px solid #ced4da;
          border-left: 0;
          display: flex;
          align-items: center;
        }
        .input-group .form-control {
          border-right: 0;
        }
        .input-group .form-control:last-child {
          border-right: 1px solid #ced4da;
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
                    <th>ID</th>
                    <th>Imagen</th>
                    <th>Código de barra</th>
                    <th>Nombre del producto</th>
                    <th>Proveedor</th>
                    <th>Stock Mínimo</th>
                    <th>Impuesto</th>
                    <th>Fecha de Venc.</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th style="text-align: center; width: 5%;">Opciones</th>
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

      <!-- Modal para Nuevo/Editar Producto (Igual a imaxpos2) -->
      <div id="modal-producto" class="modal-backdrop hidden">
        <div class="modal" style="max-width: 90%; width: 90%;">
          <div class="modal-header">
            <h2 id="modal-producto-titulo">Agregar producto</h2>
            <button id="btn-cerrar-modal" class="modal-close-btn">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
            <div id="mensaje"></div>
            <center>
              <ul class="nav nav-tabs text-center" role="tablist" style="display: flex; justify-content: center; border-bottom: 2px solid #dee2e6; margin-bottom: 20px;">
                <li class="tab-item active" role="lista" id="ul_lista" style="list-style: none; margin: 0 10px;">
                  <a href="#lista" data-tab="lista" style="padding: 10px 20px; display: block; text-decoration: none; color: #495057; border-bottom: 2px solid transparent; cursor: pointer;">Datos Generales</a>
                </li>
                <li class="tab-item" role="precios" id="ul_precios" style="list-style: none; margin: 0 10px;">
                  <a href="#precios" data-tab="precios" style="padding: 10px 20px; display: block; text-decoration: none; color: #495057; border-bottom: 2px solid transparent; cursor: pointer;">Unidades y Precios</a>
                </li>
                <li class="tab-item" role="stockinicial" id="ul_stockinicial" style="list-style: none; margin: 0 10px;">
                  <a href="#stockinicial" data-tab="stockinicial" style="padding: 10px 20px; display: block; text-decoration: none; color: #495057; border-bottom: 2px solid transparent; cursor: pointer;">Local y Stock inicial</a>
                </li>
                <li class="tab-item" role="imagenes" id="ul_imagenes" style="list-style: none; margin: 0 10px;">
                  <a href="#imagenes" data-tab="imagenes" style="padding: 10px 20px; display: block; text-decoration: none; color: #495057; border-bottom: 2px solid transparent; cursor: pointer;">Imagenes</a>
                </li>
              </ul>
            </center>

            <form id="form-producto">
              <input type="hidden" name="editando" id="editando" value="0">
              <input type="hidden" name="id" id="iddos" value=""/>
              
              <div class="tab-content">
                <!-- PESTAÑA 1: DATOS GENERALES -->
                <div class="tab-pane active" role="tabpanel" id="lista">
                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Tipo de producto:</label>
                </div>
                    <div>
                      <select class="form-control" id="producto_tipo" name="producto_tipo" style="width: 100%;">
                        <option value="PRODUCTO">PRODUCTO</option>
                        <option value="SERVICIO">SERVICIO</option>
                        <option value="COMBO">COMBO</option>
                        <option value="MATERIA">MATERIA PRIMA</option>
                      </select>
                </div>
                </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Código de barra:</label>
                </div>
                    <div>
                      <input type="text" name="producto_codigo_barra" id="codigodebarra" class="form-control" maxlength="25" value="">
                </div>
                </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Nombre del producto:</label>
                </div>
                    <div>
                      <input type="text" name="producto_nombre" required id="producto_nombre" class="form-control" maxlength="100" value="">
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Descripción:</label>
                    </div>
                    <div>
                      <input type="text" name="producto_descripcion" id="producto_descripcion" class="form-control" maxlength="500" value="">
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Marca:</label>
                    </div>
                    <div style="display: flex;">
                      <select name="producto_marca" id="producto_marca" class="form-control" style="flex: 1;">
                        <option value="">Seleccione</option>
                      </select>
                      <button type="button" class="btn btn-success" style="margin-left: 5px; padding: 8px 12px;" onclick="alert('Agregar marca - Por implementar')">
                        <span style="font-size: 14px;">+</span>
                      </button>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Categoría:</label>
                    </div>
                    <div style="display: flex;">
                      <select name="produto_grupo" id="produto_grupo" class="form-control" style="flex: 1;">
                        <option value="">Seleccione</option>
                      </select>
                      <button type="button" class="btn btn-success" style="margin-left: 5px; padding: 8px 12px;" onclick="alert('Agregar categoría - Por implementar')">
                        <span style="font-size: 14px;">+</span>
                      </button>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Familia:</label>
                    </div>
                    <div style="display: flex;">
                      <select name="producto_familia" id="producto_familia" class="form-control" style="flex: 1;">
                        <option value="">Seleccione</option>
                      </select>
                      <button type="button" class="btn btn-success" style="margin-left: 5px; padding: 8px 12px;" onclick="alert('Agregar familia - Por implementar')">
                        <span style="font-size: 14px;">+</span>
                      </button>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Línea:</label>
                    </div>
                    <div style="display: flex;">
                      <select name="producto_linea" id="producto_linea" class="form-control" style="flex: 1;">
                        <option value="">Seleccione</option>
                      </select>
                      <button type="button" class="btn btn-success" style="margin-left: 5px; padding: 8px 12px;" onclick="alert('Agregar línea - Por implementar')">
                        <span style="font-size: 14px;">+</span>
                      </button>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Proveedor:</label>
                    </div>
                    <div style="display: flex;">
                      <select name="producto_proveedor" id="producto_proveedor" class="form-control" style="flex: 1;">
                        <option value="">Seleccione</option>
                      </select>
                      <button type="button" class="btn btn-success" style="margin-left: 5px; padding: 8px 12px;" onclick="alert('Agregar proveedor - Por implementar')">
                        <span style="font-size: 14px;">+</span>
                      </button>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Stock Mínimo:</label>
                    </div>
                    <div>
                      <input type="number" class="form-control" name="producto_stockminimo" id="producto_stockminimo" maxlength="11" value="0" step="0.01">
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Fecha de Vencimiento:</label>
                    </div>
                    <div>
                      <input type="date" class="form-control" name="producto_vencimiento" id="producto_vencimiento" value="">
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Impuesto:</label>
                    </div>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                      <select name="producto_impuesto" id="producto_impuesto" class="form-control">
                        <option value="">Seleccione</option>
                      </select>
                      <div class="input-group">
                        <input type="text" style="text-align: right;" class="form-control" name="valor_importe" id="valor_importe" readonly>
                        <div class="input-group-addon" style="padding: 8px 12px; background: #e9ecef; border: 1px solid #ced4da; border-left: 0;">%</div>
                      </div>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Estado:</label>
                      <div style="display: flex; gap: 20px;">
                        <label style="display: flex; align-items: center; gap: 5px;">
                          <input type="radio" name="producto_estado" id="producto_estado_1" value="1" checked style="width: auto;">
                          <span>Activo</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px;">
                          <input type="radio" name="producto_estado" id="producto_estado_0" value="0" style="width: auto;">
                          <span>Inactivo</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Disponible para la venta:</label>
                      <div style="display: flex; gap: 20px;">
                        <label style="display: flex; align-items: center; gap: 5px;">
                          <input type="radio" name="producto_venta" id="producto_venta_1" value="1" checked style="width: auto;">
                          <span>Si</span>
                        </label>
                        <label style="display: flex; align-items: center; gap: 5px;">
                          <input type="radio" name="producto_venta" id="producto_venta_0" value="0" style="width: auto;">
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- PESTAÑA 2: UNIDADES Y PRECIOS -->
                <div class="tab-pane" role="tabpanel" id="precios" style="display: none;">
                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Costo Unitario:</label>
                    </div>
                    <div>
                      <div class="input-group">
                        <div class="input-group-addon" style="padding: 8px 12px; background: #e9ecef; border: 1px solid #ced4da; border-right: 0;">RD$</div>
                        <input type="number" name="costo_unitario" id="costo_unitario" class="form-control" value="0.00" step="0.01">
                      </div>
                    </div>
                  </div>

                  <hr style="margin: 20px 0;">

                  <div class="table-responsive">
                    <table class="table" id="tabla_precios" style="width: 100%;">
                      <thead>
                        <tr>
                          <th width="20%">Presentación</th>
                          <th width="10%">Cantidad</th>
                          <th width="10%">PRECIO DE VENTA</th>
                          <th width="10%" class="desktop">Opciones</th>
                        </tr>
                      </thead>
                      <tbody id="unidadescontainer">
                        <tr id="trunidad0">
                          <td width="20%">
                            <select name="medida[0]" id="medida0" class="form-control unidad_select" data-row="0" style="max-width: 200px;">
                              <option value="">Seleccione</option>
                            </select>
                          </td>
                          <td width="10%">
                            <input type="number" class="form-control unidades" required min="1" value="1" data-row="0" name="unidad[0]" id="unidad0" style="max-width: 90px;">
                          </td>
                          <td width="10%">
                            <input type="number" style="width: 80px;" id="precio_venta0" min="1" data-row="0" data-nombre_precio="precio_venta" type="number" class="form-control precio_venta" required value="0.00" name="precio_valor_0[0]">
                            <input type="hidden" value="1" name="precio_id_0[0]">
                          </td>
                          <td class="center" width="10%">
                            <div class="btn-group">
                              <button type="button" class="btn btn-sm btn-danger" onclick="eliminarunidad(0);">
                                <span style="font-size: 12px;">🗑️</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <button type="button" class="btn btn-sm btn-primary" id="btn-agregar-unidad" style="margin-top: 10px;">
                      <span style="font-size: 14px;">+</span> Agregar Unidad
                    </button>
                  </div>
                </div>

                <!-- PESTAÑA 3: LOCAL Y STOCK INICIAL -->
                <div class="tab-pane" role="tabpanel" id="stockinicial" style="display: none;">
                  <div class="form-row" style="margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 10px; font-weight: 600;">Local:</label>
                      <div id="locales-container" style="display: flex; flex-wrap: wrap; gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 5px;">
                          <input type="checkbox" name="locales_all" id="locales_all" style="width: auto;">
                          <span>Todos</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Serie:</label>
                    </div>
                    <div>
                      <input type="text" class="form-control" name="serie_doc" id="serie_doc">
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Número:</label>
                    </div>
                    <div>
                      <input type="text" class="form-control" name="numero_doc" id="numero_doc">
                    </div>
                  </div>

                  <div class="form-row" style="display: grid; grid-template-columns: 1fr 3fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                      <label class="control-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Cantidad:</label>
                    </div>
                    <div>
                      <input type="number" min="0" value="0" class="form-control" name="stock_inicial" id="stock_inicial">
                    </div>
                  </div>
                </div>

                <!-- PESTAÑA 4: IMAGENES -->
                <div class="tab-pane" role="tabpanel" id="imagenes" style="display: none;">
                  <div style="margin-bottom: 15px; text-align: right;">
                    <button type="button" id="agregar_img" class="btn btn-sm btn-primary" title="Agregar otra imagen">
                      <span style="font-size: 14px;">+</span> Agregar Imagen
                    </button>
                  </div>
                  <hr style="margin: 20px 0;">
                  <div id="imagenes-container" style="display: flex; flex-wrap: wrap; gap: 15px;">
                    <div style="position: relative;">
                      <label for="input_imagen0" style="cursor: pointer;">
                        <img id="imgSalida0" data-count="0" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23ddd' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EImagen%3C/text%3E%3C/svg%3E" height="150" width="150" style="border: 2px solid #dee2e6; border-radius: 4px;">
                      </label>
                      <input type="file" onchange="asignar_imagen(0)" class="form-control input_imagen" data-count="0" name="userfile[]" accept="image/*" id="input_imagen0" style="display: none;">
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <div class="btn-group">
              <button type="button" class="btn btn-sm btn-success" id="save_productos_combo">GUARDAR</button>
              <button type="button" class="btn btn-sm btn-danger" id="btn-cancelar-producto">CERRAR</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async init() {
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
      .getElementById("save_productos_combo")
      .addEventListener("click", () => this.guardarProducto());

    // Manejo de pestañas
    document.querySelectorAll(".nav-tabs a[data-tab]").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        const tabName = tab.getAttribute("data-tab");
        this.cambiarPestaña(tabName);
      });
    });

    // Agregar unidad
    document
      .getElementById("btn-agregar-unidad")
      ?.addEventListener("click", () => this.agregarUnidad());

    // Manejo de impuesto para mostrar porcentaje
    document
      .getElementById("producto_impuesto")
      ?.addEventListener("change", (e) =>
        this.actualizarPorcentajeImpuesto(e.target.value)
      );

    // Manejo de locales (todos)
    document
      .getElementById("locales_all")
      ?.addEventListener("change", (e) =>
        this.toggleTodosLocales(e.target.checked)
      );
  },

  cambiarPestaña(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll(".tab-pane").forEach((pane) => {
      pane.style.display = "none";
      pane.classList.remove("active");
    });

    // Desactivar todos los tabs
    document.querySelectorAll(".nav-tabs li").forEach((li) => {
      li.classList.remove("active");
      const a = li.querySelector("a");
      if (a) {
        a.style.borderBottom = "2px solid transparent";
        a.style.color = "#495057";
      }
    });

    // Mostrar la pestaña seleccionada
    const pane = document.getElementById(tabName);
    if (pane) {
      pane.style.display = "block";
      pane.classList.add("active");
    }

    // Activar el tab
    const tabLink = document.querySelector(`a[data-tab="${tabName}"]`);
    if (tabLink) {
      const tabLi = tabLink.closest("li");
      if (tabLi) {
        tabLi.classList.add("active");
        tabLink.style.borderBottom = "2px solid #1BBAE1";
        tabLink.style.color = "#1BBAE1";
      }
    }
  },

  async cargarCategorias() {
    try {
      // Cargar grupos (categorías) - igual que PHP
      const grupos = await api.dbQuery(
        "SELECT id_grupo, nombre_grupo FROM grupos WHERE estatus_grupo = 1 ORDER BY nombre_grupo"
      );
      const select = document.getElementById("produto_grupo");
      if (select) {
        select.innerHTML =
          '<option value="">Seleccione</option>' +
          grupos
            .map(
              (g) => `<option value="${g.id_grupo}">${g.nombre_grupo}</option>`
            )
            .join("");
      }
    } catch (error) {
      console.error("Error cargando categorías:", error);
      toast.error("Error al cargar categorías");
    }
  },

  async cargarDatosFormulario() {
    try {
      // Cargar marcas
      const marcas = await api.dbQuery(
        "SELECT id_marca, nombre_marca FROM marcas WHERE estatus_marca = 1 ORDER BY nombre_marca"
      );
      const selectMarca = document.getElementById("producto_marca");
      if (selectMarca) {
        selectMarca.innerHTML =
          '<option value="">Seleccione</option>' +
          marcas
            .map(
              (m) => `<option value="${m.id_marca}">${m.nombre_marca}</option>`
            )
            .join("");
      }

      // Cargar grupos (categorías)
      await this.cargarCategorias();

      // Cargar familias
      const familias = await api.dbQuery(
        "SELECT id_familia, nombre_familia FROM familia WHERE estatus_familia = 1 ORDER BY nombre_familia"
      );
      const selectFamilia = document.getElementById("producto_familia");
      if (selectFamilia) {
        selectFamilia.innerHTML =
          '<option value="">Seleccione</option>' +
          familias
            .map(
              (f) =>
                `<option value="${f.id_familia}">${f.nombre_familia}</option>`
            )
            .join("");
      }

      // Cargar líneas
      const lineas = await api.dbQuery(
        "SELECT id_linea, nombre_linea FROM lineas WHERE estatus_linea = 1 ORDER BY nombre_linea"
      );
      const selectLinea = document.getElementById("producto_linea");
      if (selectLinea) {
        selectLinea.innerHTML =
          '<option value="">Seleccione</option>' +
          lineas
            .map(
              (l) => `<option value="${l.id_linea}">${l.nombre_linea}</option>`
            )
            .join("");
      }

      // Cargar proveedores
      const proveedores = await api.dbQuery(
        "SELECT id_proveedor, nombre_comercial, razon_social FROM proveedor WHERE estado = 1 ORDER BY nombre_comercial, razon_social"
      );
      const selectProveedor = document.getElementById("producto_proveedor");
      if (selectProveedor) {
        selectProveedor.innerHTML =
          '<option value="">Seleccione</option>' +
          proveedores
            .map(
              (p) =>
                `<option value="${p.id_proveedor}">${
                  p.nombre_comercial || p.razon_social
                }</option>`
            )
            .join("");
      }

      // Cargar impuestos
      const impuestos = await api.dbQuery(
        "SELECT id_impuesto, nombre_impuesto, porcentaje_impuesto FROM impuestos WHERE estatus_impuesto = 1 ORDER BY nombre_impuesto"
      );
      const selectImpuesto = document.getElementById("producto_impuesto");
      if (selectImpuesto) {
        selectImpuesto.innerHTML =
          '<option value="">Seleccione</option>' +
          impuestos
            .map(
              (i) =>
                `<option value="${i.id_impuesto}" data-porcentaje="${
                  i.porcentaje_impuesto || 0
                }">${i.nombre_impuesto}</option>`
            )
            .join("");
      }

      // Cargar unidades
      const unidades = await api.dbQuery(
        "SELECT id_unidad, descripcion_unidad FROM unidades ORDER BY descripcion_unidad"
      );
      // Cargar en todos los selects de unidades
      document.querySelectorAll(".unidad_select").forEach((select) => {
        select.innerHTML =
          '<option value="">Seleccione</option>' +
          unidades
            .map(
              (u) =>
                `<option value="${u.id_unidad}">${u.descripcion_unidad}</option>`
            )
            .join("");
      });

      // Cargar locales
      const locales = await api.dbQuery(
        "SELECT id_local, local_nombre FROM local WHERE local_estado = 1 ORDER BY local_nombre"
      );
      const containerLocales = document.getElementById("locales-container");
      if (containerLocales) {
        const localesHTML = locales
          .map(
            (local) => `
          <label style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" class="data-check-local" value="${
              local.id_local
            }" name="locales_id[]" ${
              local.id_local === 1 ? "checked" : ""
            } style="width: auto;">
            <span>${local.local_nombre}</span>
          </label>
        `
          )
          .join("");
        containerLocales.innerHTML = containerLocales.innerHTML + localesHTML;
      }
    } catch (error) {
      console.error("Error cargando datos del formulario:", error);
      toast.error("Error al cargar datos del formulario");
    }
  },

  actualizarPorcentajeImpuesto(impuestoId) {
    const select = document.getElementById("producto_impuesto");
    const option = select?.querySelector(`option[value="${impuestoId}"]`);
    const porcentaje = option?.getAttribute("data-porcentaje") || "0";
    const inputPorcentaje = document.getElementById("valor_importe");
    if (inputPorcentaje) {
      inputPorcentaje.value = porcentaje;
    }
  },

  toggleTodosLocales(checked) {
    document.querySelectorAll(".data-check-local").forEach((checkbox) => {
      checkbox.checked = checked;
    });
  },

  agregarUnidad() {
    const tbody = document.getElementById("unidadescontainer");
    if (!tbody) return;

    const rowCount = tbody.querySelectorAll("tr").length;
    const unidades = Array.from(
      document.querySelectorAll(".unidad_select option")
    )
      .map((opt) => ({
        value: opt.value,
        text: opt.textContent,
      }))
      .filter((opt) => opt.value !== "");

    const unidadesOptions = unidades
      .map((u) => `<option value="${u.value}">${u.text}</option>`)
      .join("");

    const newRow = document.createElement("tr");
    newRow.id = `trunidad${rowCount}`;
    newRow.innerHTML = `
      <td width="20%">
        <select name="medida[${rowCount}]" id="medida${rowCount}" class="form-control unidad_select" data-row="${rowCount}" style="max-width: 200px;">
          <option value="">Seleccione</option>
          ${unidadesOptions}
        </select>
      </td>
      <td width="10%">
        <input type="number" class="form-control unidades" required min="1" value="1" data-row="${rowCount}" name="unidad[${rowCount}]" id="unidad${rowCount}" style="max-width: 90px;">
      </td>
      <td width="10%">
        <input type="number" style="width: 80px;" id="precio_venta${rowCount}" min="1" data-row="${rowCount}" data-nombre_precio="precio_venta" class="form-control precio_venta" required value="0.00" name="precio_valor_${rowCount}[0]">
        <input type="hidden" value="1" name="precio_id_${rowCount}[0]">
      </td>
      <td class="center" width="10%">
        <div class="btn-group">
          <button type="button" class="btn btn-sm btn-danger" onclick="window.ProductosView.eliminarUnidad(${rowCount});">
            <span style="font-size: 12px;">🗑️</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(newRow);
  },

  eliminarUnidad(rowIndex) {
    const row = document.getElementById(`trunidad${rowIndex}`);
    if (row) {
      row.remove();
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
        '<tr><td colspan="11" style="text-align: center; padding: 20px;">No se encontraron productos</td></tr>';
      return;
    }

    // Función para formatear fecha (igual que PHP: d-m-Y)
    const formatDate = (dateStr) => {
      if (!dateStr || dateStr === "" || dateStr === "0000-00-00") return "-";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      } catch {
        return dateStr;
      }
    };

    // Función para obtener imagen (replicar get_product_image de PHP)
    const getProductImage = (productoId, productoNombre) => {
      // En PHP busca en: uploads/{id}/foto{id}.jpg
      // Por ahora retornamos placeholder, pero se puede implementar la lógica completa
      const imagenUrl = null; // TODO: Implementar búsqueda de imagen
      if (imagenUrl) {
        return `<img src="${imagenUrl}" alt="${
          productoNombre || ""
        }" class="producto-imagen" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="producto-imagen-placeholder" style="display: none;">📦</span>`;
      }
      return `<span class="producto-imagen-placeholder">📦</span>`;
    };

    tbody.innerHTML = this.productos
      .map((p) => {
        const estadoValue =
          p.producto_estado !== null && p.producto_estado !== undefined
            ? p.producto_estado
            : 1;
        const estadoText = estadoValue === 1 ? "ACTIVO" : "INACTIVO";
        const estadoClass =
          estadoValue === 1 ? "status-activo" : "status-inactivo";

        return `
      <tr id="${p.id}">
        <td style="display: none;">${p.id}</td>
        <td style="text-align: center;">
          ${getProductImage(p.id, p.producto_nombre)}
        </td>
        <td style="white-space: nowrap;">${p.producto_codigo_barra || "-"}</td>
        <td style="font-weight: 500;">${p.producto_nombre || "-"}</td>
        <td>${p.producto_proveedor || "-"}</td>
        <td style="text-align: center;">${p.producto_stockminimo || 0}</td>
        <td>${p.producto_impuesto || "-"}</td>
        <td style="white-space: nowrap;">${formatDate(
          p.producto_vencimiento
        )}</td>
        <td>
          <span class="badge badge-secondary" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
            ${p.producto_tipo || "PRODUCTO"}
          </span>
        </td>
        <td>
          <span class="${estadoClass}" style="padding: 4px 8px; border-radius: 4px; font-size: 0.85em;">
            ${estadoText}
          </span>
        </td>
        <td style="text-align: center;">
          <div class="btn-group">
            <button type="button" class="btn btn-sm btn-primary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
              <i class="fa fa-list-ul fa-sm"></i>
            </button>
            <div class="dropdown-menu" style="text-align: left;">
              <a class="dropdown-item" onclick="this.closest('tr').querySelector('.btn-editar').click();">
                <i class="fa fa-pencil" style="padding-right: 5px;"></i> Editar
              </a>
              <a class="dropdown-item" href="#">
                <i class="fa fa-list" style="padding-right: 5px;"></i> Detalles
              </a>
              <a class="dropdown-item" href="#">
                <i class="fa fa-copy" style="padding-right: 5px;"></i> Duplicar
              </a>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item" onclick="this.closest('tr').querySelector('.btn-eliminar').click();">
                <i class="fa fa-trash-o" style="padding-right: 5px;"></i> Eliminar
              </a>
            </div>
          </div>
          <button class="btn btn-sm btn-secondary btn-editar" data-id="${
            p.id
          }" style="display: none;">
            <span class="material-icons" style="font-size: 18px;">edit</span>
          </button>
          <button class="btn btn-sm btn-danger btn-eliminar" data-id="${
            p.id
          }" style="display: none;">
            <span class="material-icons" style="font-size: 18px;">delete</span>
          </button>
        </td>
      </tr>
    `;
      })
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

  async mostrarModalNuevo() {
    this.editandoId = null;
    document.getElementById("editando").value = "0";
    document.getElementById("iddos").value = "";
    document.getElementById("modal-producto-titulo").textContent =
      "Agregar producto";
    document.getElementById("form-producto").reset();

    // Cargar todos los datos del formulario
    await this.cargarDatosFormulario();

    // Resetear pestaña a la primera
    this.cambiarPestaña("lista");

    // Limpiar unidades (dejar solo una)
    const tbody = document.getElementById("unidadescontainer");
    if (tbody) {
      tbody.innerHTML = `
        <tr id="trunidad0">
          <td width="20%">
            <select name="medida[0]" id="medida0" class="form-control unidad_select" data-row="0" style="max-width: 200px;">
              <option value="">Seleccione</option>
            </select>
          </td>
          <td width="10%">
            <input type="number" class="form-control unidades" required min="1" value="1" data-row="0" name="unidad[0]" id="unidad0" style="max-width: 90px;">
          </td>
          <td width="10%">
            <input type="number" style="width: 80px;" id="precio_venta0" min="1" data-row="0" data-nombre_precio="precio_venta" class="form-control precio_venta" required value="0.00" name="precio_valor_0[0]">
            <input type="hidden" value="1" name="precio_id_0[0]">
          </td>
          <td class="center" width="10%">
            <div class="btn-group">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.ProductosView.eliminarUnidad(0);">
                <span style="font-size: 12px;">🗑️</span>
              </button>
            </div>
          </td>
        </tr>
      `;
      // Recargar opciones de unidades
      const unidades = await api.dbQuery(
        "SELECT id_unidad, descripcion_unidad FROM unidades ORDER BY descripcion_unidad"
      );
      const select = document.getElementById("medida0");
      if (select) {
        select.innerHTML =
          '<option value="">Seleccione</option>' +
          unidades
            .map(
              (u) =>
                `<option value="${u.id_unidad}">${u.descripcion_unidad}</option>`
            )
            .join("");
      }
    }

    document.getElementById("modal-producto").classList.remove("hidden");
  },

  async editarProducto(id) {
    try {
      // Obtener producto completo de la BD
      const productos = await api.dbQuery(
        `SELECT p.*, 
         prov.id_proveedor, prov.nombre_comercial, prov.razon_social,
         i.id_impuesto, i.nombre_impuesto, i.porcentaje_impuesto
         FROM producto p
         LEFT JOIN proveedor prov ON prov.id_proveedor = p.producto_proveedor
         LEFT JOIN impuestos i ON i.id_impuesto = p.producto_impuesto
         WHERE p.producto_id = ? AND p.producto_estatus = 1`,
        [id]
      );

      if (!productos || productos.length === 0) {
        toast.error("Producto no encontrado");
        return;
      }

      const producto = productos[0];
      this.editandoId = id;

      // Cargar datos del formulario
      await this.cargarDatosFormulario();

      document.getElementById("editando").value = "1";
      document.getElementById("iddos").value = producto.producto_id;
      document.getElementById("modal-producto-titulo").textContent =
        "Actualizar producto";

      // Llenar campos del formulario
      document.getElementById("producto_tipo").value =
        producto.producto_tipo || "PRODUCTO";
      document.getElementById("codigodebarra").value =
        producto.producto_codigo_barra || "";
      document.getElementById("producto_nombre").value =
        producto.producto_nombre || "";
      document.getElementById("producto_descripcion").value =
        producto.producto_descripcion || "";
      document.getElementById("producto_marca").value =
        producto.producto_marca || "";
      document.getElementById("produto_grupo").value =
        producto.produto_grupo || "";
      document.getElementById("producto_familia").value =
        producto.producto_familia || "";
      document.getElementById("producto_linea").value =
        producto.producto_linea || "";
      document.getElementById("producto_proveedor").value =
        producto.producto_proveedor || "";
      document.getElementById("producto_stockminimo").value =
        producto.producto_stockminimo || 0;
      document.getElementById("producto_vencimiento").value =
        producto.producto_vencimiento
          ? producto.producto_vencimiento.split(" ")[0]
          : "";
      document.getElementById("producto_impuesto").value =
        producto.producto_impuesto || "";
      document.getElementById("costo_unitario").value =
        producto.producto_costo_unitario || 0;

      // Actualizar porcentaje de impuesto
      if (producto.producto_impuesto) {
        this.actualizarPorcentajeImpuesto(producto.producto_impuesto);
      }

      // Estado
      const estadoRadio = document.querySelector(
        `input[name="producto_estado"][value="${
          producto.producto_estado || 1
        }"]`
      );
      if (estadoRadio) estadoRadio.checked = true;

      // Disponible para venta
      const ventaRadio = document.querySelector(
        `input[name="producto_venta"][value="${
          producto.producto_venta !== undefined ? producto.producto_venta : 1
        }"]`
      );
      if (ventaRadio) ventaRadio.checked = true;

      // Cargar unidades y precios del producto
      await this.cargarUnidadesProducto(id);

      // Resetear pestaña a la primera
      this.cambiarPestaña("lista");

      document.getElementById("modal-producto").classList.remove("hidden");
    } catch (error) {
      console.error("Error cargando producto para editar:", error);
      toast.error("Error al cargar el producto");
    }
  },

  async cargarUnidadesProducto(productoId) {
    try {
      // Obtener unidades del producto
      const unidadesProducto = await api.dbQuery(
        `SELECT uhp.*, u.descripcion_unidad 
         FROM unidades_has_producto uhp
         LEFT JOIN unidades u ON u.id_unidad = uhp.id_unidad
         WHERE uhp.producto_id = ?
         ORDER BY uhp.orden`,
        [productoId]
      );

      // Obtener precios del producto
      const preciosProducto = await api.dbQuery(
        `SELECT uhp.*, p.descripcion as nombre_precio, p.id_precio
         FROM unidades_has_precio uhp
         LEFT JOIN precios p ON p.id_precio = uhp.id_precio
         WHERE uhp.id_producto = ? AND (p.estado = 1 OR p.estado IS NULL)
         ORDER BY uhp.id_unidad, p.id_precio`,
        [productoId]
      );

      const tbody = document.getElementById("unidadescontainer");
      if (!tbody) return;

      // Limpiar tbody
      tbody.innerHTML = "";

      // Agregar filas para cada unidad
      for (let i = 0; i < unidadesProducto.length; i++) {
        const unidad = unidadesProducto[i];
        const unidades = await api.dbQuery(
          "SELECT id_unidad, descripcion_unidad FROM unidades ORDER BY descripcion_unidad"
        );
        const unidadesOptions = unidades
          .map(
            (u) =>
              `<option value="${u.id_unidad}" ${
                u.id_unidad == unidad.id_unidad ? "selected" : ""
              }>${u.descripcion_unidad}</option>`
          )
          .join("");

        // Obtener precio de venta para esta unidad
        const precioVenta = preciosProducto.find(
          (p) => p.id_unidad === unidad.id_unidad && p.id_precio === 1
        );
        const precioValor = precioVenta ? precioVenta.precio : 0;

        const row = document.createElement("tr");
        row.id = `trunidad${i}`;
        row.innerHTML = `
          <td width="20%">
            <select name="medida[${i}]" id="medida${i}" class="form-control unidad_select" data-row="${i}" style="max-width: 200px;">
              <option value="">Seleccione</option>
              ${unidadesOptions}
            </select>
          </td>
          <td width="10%">
            <input type="number" class="form-control unidades" required min="1" value="${
              unidad.unidades || 1
            }" data-row="${i}" name="unidad[${i}]" id="unidad${i}" style="max-width: 90px;">
          </td>
          <td width="10%">
            <input type="number" style="width: 80px;" id="precio_venta${i}" min="1" data-row="${i}" data-nombre_precio="precio_venta" class="form-control precio_venta" required value="${precioValor}" name="precio_valor_${i}[0]">
            <input type="hidden" value="1" name="precio_id_${i}[0]">
          </td>
          <td class="center" width="10%">
            <div class="btn-group">
              <button type="button" class="btn btn-sm btn-danger" onclick="window.ProductosView.eliminarUnidad(${i});">
                <span style="font-size: 12px;">🗑️</span>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      }

      // Si no hay unidades, agregar una fila vacía
      if (unidadesProducto.length === 0) {
        await this.agregarUnidad();
      }
    } catch (error) {
      console.error("Error cargando unidades del producto:", error);
    }
  },

  ocultarModal() {
    document.getElementById("modal-producto").classList.add("hidden");
  },

  async guardarProducto() {
    try {
      const editando = document.getElementById("editando").value === "1";
      const id = document.getElementById("iddos").value;

      // Obtener valores del formulario (igual que PHP)
      const codigo_barra = document
        .getElementById("codigodebarra")
        .value.trim();
      const producto_nombre = document
        .getElementById("producto_nombre")
        .value.trim();
      const producto_descripcion = document
        .getElementById("producto_descripcion")
        .value.trim();
      const producto_marca =
        document.getElementById("producto_marca").value || null;
      const producto_linea =
        document.getElementById("producto_linea").value || null;
      const producto_familia =
        document.getElementById("producto_familia").value || null;
      const produto_grupo =
        document.getElementById("produto_grupo").value || null;
      const producto_proveedor =
        document.getElementById("producto_proveedor").value || null;
      const producto_stockminimo =
        parseFloat(document.getElementById("producto_stockminimo").value) || 0;
      const producto_impuesto =
        document.getElementById("producto_impuesto").value || null;
      const producto_vencimiento =
        document.getElementById("producto_vencimiento").value || null;
      const producto_tipo =
        document.getElementById("producto_tipo").value || "PRODUCTO";
      const producto_estado =
        document.querySelector('input[name="producto_estado"]:checked')
          ?.value || 1;
      const producto_venta =
        document.querySelector('input[name="producto_venta"]:checked')?.value ||
        1;
      const costo_unitario =
        parseFloat(document.getElementById("costo_unitario").value) || 0;

      // Validar código de barra único (igual que PHP)
      if (codigo_barra) {
        let codigoExiste;
        if (!editando) {
          codigoExiste = await api.dbQuery(
            "SELECT producto_id FROM producto WHERE producto_codigo_barra = ? AND producto_estatus = 1",
            [codigo_barra]
          );
        } else {
          codigoExiste = await api.dbQuery(
            "SELECT producto_id FROM producto WHERE producto_codigo_barra = ? AND producto_estatus = 1 AND producto_id != ?",
            [codigo_barra, id]
          );
        }

        if (codigoExiste && codigoExiste.length > 0) {
          toast.error("El codigo de barra ya existe");
          return;
        }
      }

      // Validar nombre requerido
      if (!producto_nombre || producto_nombre.trim() === "") {
        toast.error("El nombre del producto es requerido");
        return;
      }

      // Preparar datos del producto (igual que PHP)
      const productoData = {
        producto_codigo_barra: codigo_barra || null,
        producto_nombre: producto_nombre,
        producto_descripcion: producto_descripcion || null,
        producto_marca: producto_marca,
        producto_linea: producto_linea,
        producto_familia: producto_familia,
        produto_grupo: produto_grupo,
        producto_proveedor: producto_proveedor,
        producto_stockminimo: producto_stockminimo,
        producto_impuesto: producto_impuesto,
        producto_vencimiento: producto_vencimiento
          ? producto_vencimiento
          : null,
        producto_tipo: producto_tipo,
        producto_estado: parseInt(producto_estado),
        producto_venta: parseInt(producto_venta),
        producto_costo_unitario: costo_unitario,
        producto_estatus: 1,
      };

      // Obtener medidas y unidades
      const medidas = Array.from(
        document.querySelectorAll('select[name^="medida"]')
      ).map((sel) => sel.value);
      const unidades = Array.from(
        document.querySelectorAll('input[name^="unidad"]')
      ).map((inp) => parseFloat(inp.value) || 1);

      // Obtener precios
      const precios = [];
      document
        .querySelectorAll('input[name^="precio_valor"]')
        .forEach((inp, idx) => {
          const row = inp.getAttribute("data-row");
          const precioId =
            document.querySelector(`input[name="precio_id_${row}[0]"]`)
              ?.value || 1;
          precios.push({
            row: parseInt(row),
            precio_id: parseInt(precioId),
            precio: parseFloat(inp.value) || 0,
          });
        });

      let productoId;

      if (editando && id) {
        // ACTUALIZAR (igual que PHP)
        productoData.producto_id = parseInt(id);

        // Actualizar producto
        const updateFields = Object.keys(productoData)
          .filter((key) => key !== "producto_id")
          .map((key) => `${key} = ?`)
          .join(", ");
        const updateValues = Object.keys(productoData)
          .filter((key) => key !== "producto_id")
          .map((key) => productoData[key]);
        updateValues.push(parseInt(id));

        await api.dbQuery(
          `UPDATE producto SET ${updateFields} WHERE producto_id = ?`,
          updateValues
        );

        productoId = parseInt(id);

        // Eliminar unidades y precios existentes
        await api.dbQuery(
          "DELETE FROM unidades_has_producto WHERE producto_id = ?",
          [productoId]
        );
        await api.dbQuery(
          "DELETE FROM unidades_has_precio WHERE id_producto = ?",
          [productoId]
        );

        // Insertar nuevas unidades y precios
        for (let i = 0; i < medidas.length; i++) {
          if (medidas[i]) {
            await api.dbQuery(
              "INSERT INTO unidades_has_producto (producto_id, id_unidad, unidades, orden) VALUES (?, ?, ?, ?)",
              [productoId, medidas[i], unidades[i], i + 1]
            );

            // Insertar precio de venta (id_precio = 1)
            const precioVenta = precios.find((p) => p.row === i);
            if (precioVenta) {
              await api.dbQuery(
                "INSERT INTO unidades_has_precio (id_producto, id_unidad, id_precio, precio) VALUES (?, ?, ?, ?)",
                [productoId, medidas[i], 1, precioVenta.precio]
              );
            }
          }
        }

        toast.success("Producto actualizado correctamente");
      } else {
        // CREAR (igual que PHP)
        const insertFields = Object.keys(productoData).join(", ");
        const insertPlaceholders = Object.keys(productoData)
          .map(() => "?")
          .join(", ");
        const insertValues = Object.values(productoData);

        const result = await api.dbQuery(
          `INSERT INTO producto (${insertFields}) VALUES (${insertPlaceholders})`,
          insertValues
        );

        productoId = result.lastInsertRowid;

        // Insertar unidades y precios
        for (let i = 0; i < medidas.length; i++) {
          if (medidas[i]) {
            await api.dbQuery(
              "INSERT INTO unidades_has_producto (producto_id, id_unidad, unidades, orden) VALUES (?, ?, ?, ?)",
              [productoId, medidas[i], unidades[i], i + 1]
            );

            // Insertar precio de venta (id_precio = 1)
            const precioVenta = precios.find((p) => p.row === i);
            if (precioVenta) {
              await api.dbQuery(
                "INSERT INTO unidades_has_precio (id_producto, id_unidad, id_precio, precio) VALUES (?, ?, ?, ?)",
                [productoId, medidas[i], 1, precioVenta.precio]
              );
            }
          }
        }

        // Manejar stock inicial y locales
        const stockInicial =
          parseFloat(document.getElementById("stock_inicial").value) || 0;
        const localesSeleccionados = Array.from(
          document.querySelectorAll('input[name="locales_id[]"]:checked')
        ).map((cb) => parseInt(cb.value));

        if (localesSeleccionados.length > 0 && stockInicial > 0) {
          for (const localId of localesSeleccionados) {
            await api.dbQuery(
              "INSERT OR REPLACE INTO producto_almacen (id_local, id_producto, cantidad, fraccion) VALUES (?, ?, ?, ?)",
              [localId, productoId, stockInicial, 0]
            );
          }
        }

        toast.success("Producto creado correctamente");
      }

      this.ocultarModal();
      await this.cargarProductos();
    } catch (error) {
      console.error("Error guardando producto:", error);
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
      // Igual que PHP: actualizar nombre y estatus
      const producto = await api.dbQuery(
        "SELECT producto_nombre FROM producto WHERE producto_id = ?",
        [id]
      );
      if (producto && producto.length > 0) {
        const nombre = producto[0].producto_nombre;
        const fecha = new Date().toLocaleDateString("es-ES");
        await api.dbQuery(
          "UPDATE producto SET producto_nombre = ?, producto_estatus = 0 WHERE producto_id = ?",
          [`${nombre} ELIMINADO: ${fecha}`, id]
        );
        toast.success("Producto eliminado correctamente");
        await this.cargarProductos();
      }
    } catch (error) {
      console.error("Error eliminando producto:", error);
      toast.error("Error al eliminar el producto");
    }
  },
};

// Exponer globalmente para funciones onclick
window.ProductosView = ProductosView;

// Funciones globales para el formulario
window.asignar_imagen = function (count) {
  const input = document.getElementById(`input_imagen${count}`);
  const img = document.getElementById(`imgSalida${count}`);
  if (input && input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function (e) {
      img.src = e.target.result;
    };
    reader.readAsDataURL(input.files[0]);
  }
};

window.eliminarunidad = function (index) {
  window.ProductosView.eliminarUnidad(index);
};

export default ProductosView;
