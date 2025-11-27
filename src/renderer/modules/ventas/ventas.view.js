/**
 * Vista del Módulo de Ventas (Punto de Venta)
 * Replicado de imaxpos2 para mantener la misma funcionalidad
 * @module renderer/modules/ventas/ventas.view
 */

import { api } from "../../core/api.js";
import { db } from "../../services/database.service.js";
import { toast } from "../../components/notifications/toast.js";
import { debounce, formatCurrency } from "../../utils/helpers.js";
import { printService } from "../../services/print.service.js";
import { authService } from "../../services/auth.service.js";
import { Validator } from "../../utils/validator.util.js";
import { handleError } from "../../utils/error-handler.js";

export const VentasView = {
  carrito: [],
  clienteSeleccionado: null,
  localSeleccionado: null,
  productoSeleccionado: null,
  descuentoGeneral: 0,
  tipoDescuentoGeneral: 1, // 1 = porcentaje, 2 = monto
  tipoImpuesto: 1, // 1 = Incluye impuesto, 2 = Agregar impuesto, 3 = No considerar impuesto
  productosLista: [], // Lista completa de productos para el grid
  productosFiltrados: [], // Productos filtrados por búsqueda

  render() {
    return `
      <style>
        .venta-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 60px);
          background: #f3f4f6;
        }
        .venta-header {
          background: white;
          padding: 15px;
          border-bottom: 1px solid #dee2e6;
        }
              .venta-header-row {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
                align-items: end;
              }
              .productos-list {
                padding: 0;
                overflow-y: auto;
                background: white;
              }
              .producto-list-item {
                display: grid;
                grid-template-columns: 50px 1fr 120px 120px 100px 80px;
                gap: 10px;
                padding: 12px 15px;
                border-bottom: 1px solid #dee2e6;
                cursor: pointer;
                transition: all 0.2s;
                align-items: center;
              }
              .producto-list-item:hover {
                background: #f8f9fa;
              }
              .producto-list-item.selected {
                background: #e7f3ff;
                border-left: 3px solid #6366f1;
              }
              .producto-list-item img {
                width: 40px;
                height: 40px;
                object-fit: contain;
                border-radius: 4px;
                background: #f8f9fa;
              }
              .producto-list-item .producto-nombre {
                font-weight: 500;
                font-size: 14px;
              }
              .producto-list-item .producto-codigo {
                font-size: 12px;
                color: #6c757d;
                margin-top: 2px;
              }
              .producto-list-item .producto-precio {
                font-size: 14px;
                font-weight: bold;
                color: #28a745;
                text-align: right;
              }
              .producto-list-item .producto-stock {
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                text-align: center;
                display: inline-block;
              }
              .producto-list-item .producto-stock.disponible {
                background: #d4edda;
                color: #155724;
              }
              .producto-list-item .producto-stock.bajo {
                background: #fff3cd;
                color: #856404;
              }
              .producto-list-item .producto-stock.agotado {
                background: #f8d7da;
                color: #721c24;
              }
              .productos-list-header {
                display: grid;
                grid-template-columns: 50px 1fr 120px 120px 100px 80px;
                gap: 10px;
                padding: 10px 15px;
                background: #f8f9fa;
                border-bottom: 2px solid #dee2e6;
                font-weight: 600;
                font-size: 12px;
                color: #6c757d;
                text-transform: uppercase;
              }
        .venta-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .venta-right {
          width: 350px;
          background: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .venta-buttons {
          width: 80px;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px 10px;
          gap: 10px;
          margin-left: 10px;
        }
        .btn-venta-action {
          width: 100%;
          padding: 15px 10px;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .btn-venta-action:hover {
          background: #f8f9fa;
          border-color: #6366f1;
        }
        .btn-venta-action i {
          font-size: 24px;
        }
        .productos-section {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
        }
        .table-productos {
          width: 100%;
          border-collapse: collapse;
        }
        .table-productos thead {
          background: #f8f9fa;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .table-productos th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }
        .table-productos td {
          padding: 10px 12px;
          border-bottom: 1px solid #dee2e6;
        }
        .table-productos tbody tr:hover {
          background: #f8f9fa;
        }
        .totals-section {
          background: white;
          padding: 15px;
          border-top: 1px solid #dee2e6;
        }
        .total-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .total-item.final {
          font-size: 20px;
          font-weight: bold;
          color: #28a745;
          border-bottom: 2px solid #28a745;
          padding: 12px 0;
        }
        .block-producto-form {
          display: none;
          padding: 15px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        .block-producto-form.active {
          display: block;
        }
        .input-group-inline {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .form-control-small {
          width: 100px;
        }
        .search-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: white;
          margin-top: 2px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .producto-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: white;
          margin-top: 2px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .producto-select-item {
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .producto-select-item:hover {
          background: #f8f9fa;
        }
        .producto-select-item:last-child {
          border-bottom: none;
        }
        .producto-select-item .producto-name {
          flex: 1;
          font-weight: 500;
        }
        .producto-select-item .producto-price {
          font-weight: bold;
          color: #28a745;
          margin-left: 10px;
        }
        .search-result-item {
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .search-result-item:hover {
          background: #f8f9fa;
        }
        .search-result-item:last-child {
          border-bottom: none;
        }
        .search-result-item .producto-info {
          flex: 1;
        }
        .search-result-item .producto-nombre {
          font-weight: 500;
          margin-bottom: 2px;
        }
        .search-result-item .producto-codigo {
          font-size: 12px;
          color: #6c757d;
        }
        .search-result-item .producto-precio {
          font-weight: bold;
          color: #28a745;
          margin-left: 10px;
        }
        .producto-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1000;
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: white;
          margin-top: 2px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .producto-select-item {
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .producto-select-item:hover {
          background: #f8f9fa;
        }
        .producto-select-item:last-child {
          border-bottom: none;
        }
        .producto-select-item .producto-name {
          flex: 1;
          font-weight: 500;
        }
        .producto-select-item .producto-price {
          font-weight: bold;
          color: #28a745;
          margin-left: 10px;
        }
        .select-search-wrapper {
          position: relative;
        }
        .select-search {
          width: 100%;
        }
        .select-search-overlay {
          display: none;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 10000;
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          margin-top: 2px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          max-height: 400px;
          overflow: hidden;
          flex-direction: column;
        }
        .select-search-overlay.open {
          display: flex;
        }
        .select-search-header {
          padding: 8px;
          border-bottom: 1px solid #dee2e6;
          background: #f8f9fa;
        }
        .select-search-header input {
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 14px;
        }
        .select-search-options {
          overflow-y: auto;
          max-height: 340px;
        }
        .select-search-option {
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .select-search-option:hover {
          background: #f8f9fa;
        }
        .select-search-option.selected {
          background: #e7f3ff;
        }
        .select-search-option:last-child {
          border-bottom: none;
        }
        .select-search-option .option-text {
          flex: 1;
          font-weight: 500;
        }
        .select-search-option .option-price {
          font-weight: bold;
          color: #28a745;
          margin-left: 10px;
        }
      </style>
      
      <form id="form_venta">
        <input type="hidden" name="edit_venta" id="edit_venta" value="0">
        <input type="hidden" name="venta_id" id="venta_id" value="">
        
        <div class="venta-container">
          <!-- HEADER: Local de venta, Local del producto, Vendedor, Forma de pago -->
          <div class="venta-header">
            <div class="venta-header-row">
              <div class="form-group">
                <label class="control-label">Local de venta</label>
                <select name="local_venta_id" id="local_venta_id" class="form-control">
                  <option value="">Cargando...</option>
                </select>
              </div>
              
                <div class="form-group">
                <label class="control-label">Local del producto</label>
                <select name="local_id" id="local_id" class="form-control">
                  <option value="">Cargando...</option>
                </select>
                </div>
              
                  <div class="form-group">
                <label class="control-label">Vendedor</label>
                <select name="vendedor_id" id="vendedor_id" class="form-control">
                  <option value="">Cargando...</option>
                </select>
                  </div>
              
                  <div class="form-group">
                <label class="control-label">Forma de pago</label>
                <select name="tipo_pago" id="tipo_pago" class="form-control">
                  <option value="1">Contado</option>
                  <option value="2">Crédito</option>
                </select>
                  </div>
                </div>
                </div>

          <!-- SECCIÓN CLIENTE Y PRODUCTO: Dos líneas -->
          <div style="background: white; padding: 15px; border-bottom: 1px solid #dee2e6;">
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 15px; align-items: end;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="control-label">Cliente</label>
                <select name="cliente_id" id="cliente_id" class="form-control">
                  <option value="1">CONTADO</option>
                </select>
            </div>
              <div class="form-group" style="margin-bottom: 0; position: relative;">
                <label class="control-label">Producto</label>
                <div class="select-search-wrapper">
                  <select name="producto_id" id="producto_id" class="form-control select-search" size="1">
                    <option value="">Seleccione un producto</option>
                  </select>
                  <div class="select-search-overlay" id="producto-select-overlay">
                    <div class="select-search-header">
                      <input type="text" id="producto-search-input" class="form-control" 
                        placeholder="Buscar producto..." autocomplete="off">
                    </div>
                    <div class="select-search-options" id="producto-select-options"></div>
                  </div>
                </div>
              </div>
              <div>
                <button type="button" class="btn btn-success" id="btn-nuevo-cliente" title="Agregar cliente">
                  <span class="material-icons">add</span> Nuevo Cliente
                </button>
              </div>
          </div>
        </div>

          <!-- BODY: Carrito de Venta -->
          <div class="venta-body">
            <!-- SECCIÓN IZQUIERDA: Carrito de Productos Agregados -->
            <div style="flex: 1; background: white; margin-right: 10px; display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid #dee2e6;">
              <div style="padding: 15px; border-bottom: 1px solid #dee2e6; background: #f8f9fa;">
                <h3 style="margin: 0; font-size: 18px;">Carrito de Compra</h3>
            </div>
              
              <!-- Formulario para Agregar/Editar Producto (oculto por defecto) -->
              <div class="block-producto-form" id="block-producto-form" style="padding: 15px; border-bottom: 1px solid #dee2e6; background: #f8f9fa;">
                <div style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                  <div>
                    <label class="control-label">Producto</label>
                    <input type="text" id="producto-nombre-display" class="form-control" readonly>
                    <input type="hidden" id="producto-id">
                    <small id="producto-stock-info" class="text-info"></small>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px;">
                    <div>
                      <label class="control-label">Cantidad</label>
                      <input type="number" id="producto-cantidad" class="form-control" value="1" min="0.01" step="0.01">
                    </div>
                    
                    <div>
                      <label class="control-label">Precio</label>
                      <input type="number" id="producto-precio" class="form-control" step="0.01" readonly>
                    </div>
                    
                    <div>
                      <label class="control-label">Subtotal</label>
                      <input type="text" id="producto-subtotal" class="form-control" readonly>
                    </div>
                  </div>
                  
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                      <label class="control-label">Descuento</label>
                      <div class="input-group-inline" style="margin-bottom: 5px;">
                        <input type="radio" name="t_descuento" id="t_descuento_por" value="1" checked>
                        <label for="t_descuento_por" style="margin: 0 10px 0 5px;">%</label>
                        <input type="radio" name="t_descuento" id="t_descuento_mon" value="2">
                        <label for="t_descuento_mon" style="margin: 0;">$</label>
                      </div>
                      <input type="number" id="producto-descuento" class="form-control" value="0" min="0" step="0.01">
                    </div>
                    
                    <div style="display: flex; align-items: flex-end; gap: 5px;">
                      <button type="button" id="btn-agregar-producto" class="btn btn-success" style="flex: 1;">
                        <span class="material-icons">add</span> Agregar
                      </button>
                      <button type="button" id="btn-cerrar-producto-form" class="btn btn-secondary">
                        <span class="material-icons">close</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Tabla de Productos Agregados -->
              <div style="flex: 1; overflow-y: auto;">
                <table class="table-productos">
                  <thead>
                    <tr>
                      <th style="width: 5%;">#</th>
                      <th style="width: 35%;">Producto</th>
                      <th style="width: 12%;">Cant.</th>
                      <th style="width: 15%;">Precio</th>
                      <th style="width: 15%;">Subtotal</th>
                      <th style="width: 18%;">Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="body-productos">
                    <tr>
                      <td colspan="6" style="text-align: center; padding: 30px; color: #6c757d;">
                        <span class="material-icons" style="font-size: 48px; display: block; margin-bottom: 10px;">shopping_cart</span>
                        Carrito vacío. Seleccione productos de la lista.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              </div>

            <!-- SECCIÓN DERECHA: Totales y Configuración -->
            <div class="venta-right">
              <div style="padding: 15px; border-bottom: 1px solid #dee2e6;">
              <div class="form-group">
                  <label class="control-label">Tipo de Impuesto</label>
                  <select name="tipo_impuesto" id="tipo_impuesto" class="form-control">
                    <option value="1">Incluye impuesto</option>
                    <option value="2">Agregar impuesto</option>
                    <option value="3">No considerar impuesto</option>
                </select>
              </div>
                
                <div class="form-group">
                  <label class="control-label">Descuento General</label>
                  <div class="input-group-inline" style="margin-bottom: 5px;">
                    <input type="radio" name="t_descuento_venta" id="t_descuento_venta_por" value="1" checked>
                    <label for="t_descuento_venta_por" style="margin: 0;">%</label>
                    <input type="radio" name="t_descuento_venta" id="t_descuento_venta_mon" value="2">
                    <label for="t_descuento_venta_mon" style="margin: 0;">$</label>
              </div>
                  <input type="number" id="descuento-ventas" class="form-control" value="0" min="0" step="0.01">
              </div>

                <div class="form-group">
                  <label class="control-label">Fecha de venta</label>
                  <input type="date" name="fecha_venta" id="fecha_venta" class="form-control" value="${
                    new Date().toISOString().split("T")[0]
                  }">
            </div>
          </div>

              <!-- Totales -->
              <div class="totals-section">
                <div class="total-item">
                  <span>Subtotal:</span>
                  <span id="subtotal">RD$ 0.00</span>
        </div>
                <div class="total-item">
                  <span>Descuento:</span>
                  <span id="total-descuento">RD$ 0.00</span>
      </div>
                <div class="total-item">
                  <span>Impuesto:</span>
                  <span id="impuesto">RD$ 0.00</span>
                </div>
                <div class="total-item final">
                  <span>Total a Pagar:</span>
                  <span id="total-importe">RD$ 0.00</span>
                </div>
                <input type="hidden" name="subtotal" id="subtotal-hidden" value="0.00">
                <input type="hidden" name="total_descuento" id="total_descuento-hidden" value="0.00">
                <input type="hidden" name="total_impuesto" id="impuesto-hidden" value="0.00">
                <input type="hidden" name="total_importe" id="total-importe-hidden" value="0.00">
              </div>

              <!-- Botones de Acción -->
              <div style="padding: 15px; border-top: 1px solid #dee2e6;">
                <button type="button" id="btn-terminar-venta" class="btn btn-success btn-lg btn-block">
                  <span class="material-icons">save</span> GUARDAR (F6)
                </button>
                <button type="button" id="btn-hold-venta" class="btn btn-info btn-block" style="margin-top: 10px;">
                  <span class="material-icons">pause</span> EN ESPERA
                </button>
                <button type="button" id="btn-reiniciar" class="btn btn-warning btn-block" style="margin-top: 10px;">
                  <span class="material-icons">refresh</span> REINICIAR
                </button>
              </div>
            </div>

            <!-- BOTONES DE ACCIÓN LATERALES -->
            <div class="venta-buttons">
              <button type="button" id="btn-nota" class="btn-venta-action" title="Agregar nota">
                <span class="material-icons">note</span>
                <span style="font-size: 11px;">NOTA</span>
              </button>
              <button type="button" id="btn-terminar-venta-side" class="btn-venta-action" title="Guardar venta (F6)">
                <span class="material-icons" style="color: #28a745;">save</span>
                <span style="font-size: 11px;">GUARDAR</span>
              </button>
              <button type="button" id="btn-hold-venta-side" class="btn-venta-action" title="Poner en espera">
                <span class="material-icons" style="color: #17a2b8;">pause</span>
                <span style="font-size: 11px;">ESPERA</span>
              </button>
              <button type="button" id="btn-reiniciar-side" class="btn-venta-action" title="Reiniciar venta">
                <span class="material-icons" style="color: #ffc107;">refresh</span>
                <span style="font-size: 11px;">REINICIAR</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal para Dialog de Pago Contado -->
        <div id="modal-pago-contado" class="modal-backdrop hidden">
          <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
              <h2>Terminar Venta - Contado</h2>
              <button type="button" class="modal-close-btn" id="btn-cerrar-modal-pago">&times;</button>
            </div>
            <div class="modal-body">
              <div id="pago-contado-content">
                <!-- Contenido se carga dinámicamente -->
              </div>
            </div>
          </div>
        </div>

        <!-- Modal para Dialog de Pago Crédito -->
        <div id="modal-pago-credito" class="modal-backdrop hidden">
          <div class="modal" style="max-width: 600px;">
            <div class="modal-header">
              <h2>Terminar Venta - Crédito</h2>
              <button type="button" class="modal-close-btn" id="btn-cerrar-modal-credito">&times;</button>
            </div>
            <div class="modal-body">
              <div id="pago-credito-content">
                <!-- Contenido se carga dinámicamente -->
              </div>
            </div>
          </div>
        </div>

        <!-- Modal para Agregar Cliente Rápido -->
        <div id="modal-nuevo-cliente" class="modal-backdrop hidden">
          <div class="modal">
            <div class="modal-header">
              <h2>Agregar Cliente</h2>
              <button type="button" class="modal-close-btn" id="btn-cerrar-modal-cliente">&times;</button>
            </div>
            <div class="modal-body">
              <form id="form-nuevo-cliente-rapido">
                <div class="form-group">
                  <label>Nombre Comercial *</label>
                  <input type="text" id="cliente-nombre-rapido" class="form-control" required>
                </div>
                <div class="form-group">
                  <label>RNC / Cédula</label>
                  <input type="text" id="cliente-identificacion-rapido" class="form-control">
                </div>
                <div class="form-group">
                  <label>Teléfono</label>
                  <input type="text" id="cliente-telefono-rapido" class="form-control">
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="cliente-email-rapido" class="form-control">
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" id="btn-guardar-cliente-rapido" class="btn btn-success">Guardar</button>
              <button type="button" id="btn-cancelar-cliente-rapido" class="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>

        <!-- Modal para Agregar Nota -->
        <div id="modal-nota" class="modal-backdrop hidden">
          <div class="modal" style="max-width: 500px;">
            <div class="modal-header">
              <h2>Agregar Nota</h2>
              <button type="button" class="modal-close-btn" id="btn-cerrar-modal-nota">&times;</button>
            </div>
            <div class="modal-body">
              <textarea id="venta-nota" class="form-control" rows="4" placeholder="Nota para la venta..."></textarea>
            </div>
            <div class="modal-footer">
              <button type="button" id="btn-guardar-nota" class="btn btn-success">Guardar</button>
              <button type="button" id="btn-cancelar-nota" class="btn btn-secondary">Cancelar</button>
            </div>
          </div>
        </div>
      </form>
    `;
  },

  /**
   * Inicializa la vista de ventas
   */
  async init() {
    this.limpiarCarrito();
    await this.cargarDatosIniciales();
    await this.cargarProductos();
    this.setupEventListeners();
    this.actualizarTotales();
  },

  /**
   * Carga datos iniciales (locales, clientes, condiciones de pago)
   */
  async cargarDatosIniciales() {
    try {
      // Cargar locales (usar columnas correctas: id_local, nombre_local, estado)
      const locales = await api.dbQuery(
        "SELECT * FROM local WHERE estado = 1 ORDER BY nombre_local"
      );
      const localSelect = document.getElementById("local_venta_id");
      const localProductoSelect = document.getElementById("local_id");

      if (locales && locales.length > 0) {
        localSelect.innerHTML = locales
          .map(
            (l) => `<option value="${l.id_local}">${l.nombre_local}</option>`
          )
          .join("");
        localProductoSelect.innerHTML = locales
          .map(
            (l) => `<option value="${l.id_local}">${l.nombre_local}</option>`
          )
          .join("");

        // Seleccionar el primer local por defecto
        if (locales[0]) {
          this.localSeleccionado = locales[0].id_local;
          localSelect.value = locales[0].id_local;
          localProductoSelect.value = locales[0].id_local;
        }
      }

      // Cargar clientes
      const clientes = await db.getClientes();
      const clienteSelect = document.getElementById("cliente_id");
      if (clientes && clientes.length > 0) {
        clienteSelect.innerHTML = clientes
          .map((c) => {
            const nombre = c.nombre || c.razon_social || "Sin nombre";
            const ident = c.cedula || c.rnc || c.identificacion || "";
            return `<option value="${c.id}" data-descuento="${
              c.descuento || 0
            }" data-cprecio="${
              c.categoria_precio || 0
            }">${nombre} - ${ident}</option>`;
          })
          .join("");

        // Agregar cliente CONTADO al inicio
        clienteSelect.insertAdjacentHTML(
          "afterbegin",
          '<option value="1" selected>CONTADO</option>'
        );
        clienteSelect.value = "1";
      }

      // Cargar condiciones de pago
      const condicionesPago = await api.dbQuery(
        "SELECT * FROM condiciones_pago WHERE status_condiciones = 1 ORDER BY nombre_condiciones"
      );
      const tipoPagoSelect = document.getElementById("tipo_pago");
      if (condicionesPago && condicionesPago.length > 0) {
        tipoPagoSelect.innerHTML = condicionesPago
          .map(
            (cp) =>
              `<option value="${cp.id_condiciones}">${cp.nombre_condiciones}</option>`
          )
          .join("");
      }

      // Cargar vendedores (usar activo en lugar de estado, grupo puede ser número o NULL)
      // Primero intentar con grupo = 8 (Ventas), si no hay, cargar todos los activos
      let vendedores = await api.dbQuery(
        "SELECT * FROM usuario WHERE grupo = 8 AND activo = 1 AND COALESCE(deleted, 0) = 0 ORDER BY nombre"
      );

      // Si no hay vendedores del grupo 8, cargar todos los usuarios activos
      if (!vendedores || vendedores.length === 0) {
        vendedores = await api.dbQuery(
          "SELECT * FROM usuario WHERE activo = 1 AND COALESCE(deleted, 0) = 0 ORDER BY nombre"
        );
      }

      const vendedorSelect = document.getElementById("vendedor_id");
      if (vendedores && vendedores.length > 0) {
        vendedorSelect.innerHTML = vendedores
          .map(
            (v) =>
              `<option value="${v.nUsuCodigo || v.id_usuario || v.id}">${
                v.nombre || v.username || "Sin nombre"
              }</option>`
          )
          .join("");

        // Seleccionar el usuario actual si existe
        const user = authService.getCurrentUser();
        if (user && (user.nUsuCodigo || user.id)) {
          const userId = user.nUsuCodigo || user.id;
          const userOption = Array.from(vendedorSelect.options).find(
            (opt) => opt.value == userId
          );
          if (userOption) {
            vendedorSelect.value = userId;
          }
        }
      } else {
        // Si no hay usuarios, dejar una opción por defecto
        vendedorSelect.innerHTML =
          '<option value="">No hay vendedores disponibles</option>';
      }
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
      toast.error("Error al cargar datos iniciales");
    }
  },

  /**
   * Carga todos los productos del local seleccionado
   */
  async cargarProductos() {
    try {
      const localId =
        document.getElementById("local_id")?.value || this.localSeleccionado;
      if (!localId) {
        const listContainer = document.getElementById("productos-list");
        if (listContainer) {
          listContainer.innerHTML = `
            <div class="productos-list-header">
              <div></div>
              <div>Producto</div>
              <div style="text-align: right;">Precio</div>
              <div style="text-align: right;">Stock</div>
              <div style="text-align: center;">Estado</div>
              <div></div>
            </div>
            <div style="text-align: center; padding: 40px; color: #6c757d;">
              <span class="material-icons" style="font-size: 64px; display: block; margin-bottom: 15px;">store</span>
              Seleccione un local para ver los productos
            </div>
          `;
        }
        return;
      }

      // Obtener todos los productos del local (incluso sin stock)
      // Obtener el precio de la unidad principal (orden = 1) del producto, o cualquier precio disponible
      console.log("Cargando productos para local:", localId);

      // Depuración: Verificar si hay precios en la base de datos
      try {
        const debugPrecios = await api.dbQuery(
          "SELECT * FROM unidades_has_precio WHERE id_precio = 1 LIMIT 5"
        );
        console.log("Precios encontrados en BD (primeros 5):", debugPrecios);

        // Depuración: Verificar unidades de producto
        const debugUnidades = await api.dbQuery(
          "SELECT * FROM unidades_has_producto WHERE producto_id IN (1, 2, 3) ORDER BY producto_id, orden"
        );
        console.log("Unidades de productos 1, 2, 3:", debugUnidades);
      } catch (debugError) {
        console.warn("Error en depuración:", debugError);
      }

      // Obtener productos con precio desde producto_costo_unitario (ya que unidades_has_precio está vacía)
      const productos = await api.dbQuery(
        `
        SELECT 
          p.producto_id,
          p.producto_tipo,
          p.producto_codigo_interno,
          p.producto_codigo_barra,
          p.producto_nombre,
          p.producto_descripcion_img,
          p.producto_titulo_imagen,
          COALESCE(pa.cantidad, 0) as stock_actual,
          COALESCE(uhp.precio, p.producto_costo_unitario, 0) as precio_venta,
          COALESCE(i.porcentaje_impuesto, 0) as impuesto_porcentaje,
          COALESCE(i.nombre_impuesto, '') as impuesto_nombre,
          COALESCE(p.producto_stockminimo, 0) as stock_minimo
        FROM producto p
        LEFT JOIN producto_almacen pa ON pa.id_producto = p.producto_id AND pa.id_local = ?
        LEFT JOIN impuestos i ON i.id_impuesto = p.producto_impuesto
        LEFT JOIN unidades_has_precio uhp ON uhp.id_producto = p.producto_id AND uhp.id_precio = 1
        WHERE COALESCE(p.producto_estatus, 1) = 1
          AND COALESCE(p.producto_estado, 1) = 1
          AND COALESCE(p.producto_venta, 1) = 1
        GROUP BY p.producto_id
        ORDER BY p.producto_nombre ASC
      `,
        [localId]
      );

      console.log("Productos obtenidos:", productos?.length || 0, productos);

      // Verificar precios obtenidos
      if (productos && productos.length > 0) {
        console.log("Verificando precios de los primeros 3 productos:");
        productos.slice(0, 3).forEach((prod, idx) => {
          console.log(
            `Producto ${idx + 1} (${prod.producto_nombre}): precio_venta = ${
              prod.precio_venta
            }`
          );
        });
      }

      this.productosLista = productos || [];
      this.productosFiltrados = [...this.productosLista];

      // Cargar productos en el select
      const productoSelect = document.getElementById("producto_id");
      if (productoSelect && this.productosLista.length > 0) {
        productoSelect.innerHTML =
          '<option value="">Seleccione un producto</option>' +
          this.productosLista
            .map((p) => {
              const nombre = p.producto_nombre || "Sin nombre";
              const codigo =
                p.producto_codigo_barra || p.producto_codigo_interno || "";
              const displayText = codigo ? `${nombre} (${codigo})` : nombre;
              return `<option value="${p.producto_id}">${displayText}</option>`;
            })
            .join("");
      } else if (productoSelect) {
        productoSelect.innerHTML =
          '<option value="">No hay productos disponibles</option>';
      }

      if (this.productosLista.length === 0) {
        console.warn(
          "No se encontraron productos. Verificando si hay productos en la base de datos..."
        );
        // Intentar consulta simple para verificar
        const prueba = await api.dbQuery(
          "SELECT COUNT(*) as total FROM producto WHERE COALESCE(producto_estatus, 1) = 1"
        );
        console.log("Total de productos activos en BD:", prueba);
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
      console.error("Detalles del error:", error.message, error.stack);
      toast.error(
        "Error al cargar productos: " + (error.message || "Error desconocido")
      );
      const listContainer = document.getElementById("productos-list");
      if (listContainer) {
        listContainer.innerHTML = `
          <div class="productos-list-header">
            <div></div>
            <div>Producto</div>
            <div style="text-align: right;">Precio</div>
            <div style="text-align: right;">Stock</div>
            <div style="text-align: center;">Estado</div>
            <div></div>
          </div>
          <div style="text-align: center; padding: 40px; color: #dc3545;">
            <span class="material-icons" style="font-size: 64px; display: block; margin-bottom: 15px;">error</span>
            Error al cargar productos: ${error.message || "Error desconocido"}
          </div>
        `;
      }
    }
  },

  /**
   * Muestra la lista de productos
   */
  mostrarProductosLista() {
    const listContainer = document.getElementById("productos-list");

    if (!this.productosFiltrados || this.productosFiltrados.length === 0) {
      listContainer.innerHTML = `
        <div class="productos-list-header">
          <div></div>
          <div>Producto</div>
          <div style="text-align: right;">Precio</div>
          <div style="text-align: right;">Stock</div>
          <div style="text-align: center;">Estado</div>
          <div></div>
        </div>
        <div style="text-align: center; padding: 40px; color: #6c757d;">
          <span class="material-icons" style="font-size: 64px; display: block; margin-bottom: 15px;">search_off</span>
          No se encontraron productos
        </div>
      `;
      return;
    }

    const header = `
      <div class="productos-list-header">
        <div></div>
        <div>Producto</div>
        <div style="text-align: right;">Precio</div>
        <div style="text-align: right;">Stock</div>
        <div style="text-align: center;">Estado</div>
        <div></div>
      </div>
    `;

    const items = this.productosFiltrados
      .map((p) => {
        const stockActual = p.stock_actual || 0;
        const stockMinimo = p.stock_minimo || 0;
        let stockClass = "disponible";
        if (stockActual <= 0) {
          stockClass = "agotado";
        } else if (stockActual <= stockMinimo) {
          stockClass = "bajo";
        }

        // Obtener imagen del producto
        const imagenUrl = this.getProductImage(
          p.producto_descripcion_img || p.producto_titulo_imagen
        );

        return `
        <div class="producto-list-item" data-id="${
          p.producto_id
        }" data-stock="${stockActual}">
          <img src="${imagenUrl}" alt="${p.producto_nombre || "Sin nombre"}" 
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'150\\' height=\\'150\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'150\\' height=\\'150\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23999\\'%3E📦%3C/text%3E%3C/svg%3E'">
          <div>
            <div class="producto-nombre">${
              p.producto_nombre || "Sin nombre"
            }</div>
            <div class="producto-codigo">${
              p.producto_codigo_barra ||
              p.producto_codigo_interno ||
              "Sin código"
            }</div>
          </div>
          <div class="producto-precio">${formatCurrency(
            p.precio_venta || 0
          )}</div>
          <div style="text-align: right;">${stockActual}</div>
          <div class="producto-stock ${stockClass}" style="text-align: center;">
            ${
              stockActual <= 0
                ? "Agotado"
                : stockActual <= stockMinimo
                ? "Bajo"
                : "Disponible"
            }
          </div>
          <div></div>
        </div>
      `;
      })
      .join("");

    listContainer.innerHTML = header + items;

    // Event listeners para seleccionar producto
    listContainer.querySelectorAll(".producto-list-item").forEach((item) => {
      item.addEventListener("click", () => {
        // Remover selección anterior
        listContainer.querySelectorAll(".producto-list-item").forEach((el) => {
          el.classList.remove("selected");
        });
        // Agregar selección actual
        item.classList.add("selected");

        const productoId = parseInt(item.getAttribute("data-id"));
        this.seleccionarProducto(productoId);
      });
    });
  },

  /**
   * Muestra los resultados de búsqueda de productos en el dropdown
   */
  mostrarResultadosBusqueda(filtro) {
    const searchResults = document.getElementById("producto-search-results");
    if (!searchResults) return;

    if (!filtro || filtro.trim() === "") {
      searchResults.style.display = "none";
      searchResults.innerHTML = "";
      return;
    }

    const searchTerm = filtro.toLowerCase().trim();
    const productosFiltrados = this.productosLista.filter((p) => {
      const nombre = (p.producto_nombre || "").toLowerCase();
      const codigoBarra = (p.producto_codigo_barra || "").toLowerCase();
      const codigoInterno = (p.producto_codigo_interno || "").toLowerCase();
      return (
        nombre.includes(searchTerm) ||
        codigoBarra.includes(searchTerm) ||
        codigoInterno.includes(searchTerm)
      );
    });

    if (productosFiltrados.length === 0) {
      searchResults.innerHTML = `
        <div style="padding: 15px; text-align: center; color: #6c757d;">
          No se encontraron productos
        </div>
      `;
      searchResults.style.display = "block";
      return;
    }

    // Limitar a 10 resultados para mejor rendimiento
    const resultadosLimitados = productosFiltrados.slice(0, 10);

    searchResults.innerHTML = resultadosLimitados
      .map((p) => {
        const stockActual = p.stock_actual || 0;
        const precioVenta = formatCurrency(p.precio_venta || 0);

        return `
          <div class="search-result-item" data-id="${p.producto_id}" 
            data-nombre="${p.producto_nombre || ""}" 
            data-precio="${p.precio_venta || 0}"
            data-stock="${stockActual}">
            <div class="producto-info">
              <div class="producto-nombre">${
                p.producto_nombre || "Sin nombre"
              }</div>
              <div class="producto-codigo">${
                p.producto_codigo_barra ||
                p.producto_codigo_interno ||
                "Sin código"
              }</div>
            </div>
            <div class="producto-precio">${precioVenta}</div>
          </div>
        `;
      })
      .join("");

    // Agregar event listeners a los resultados
    searchResults.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const productoId = parseInt(item.getAttribute("data-id"));
        const productoNombre = item.getAttribute("data-nombre");

        // Actualizar el input de búsqueda con el nombre del producto
        document.getElementById("producto-search").value = productoNombre;
        document.getElementById("producto-id-selected").value = productoId;

        // Ocultar resultados
        searchResults.style.display = "none";

        // Seleccionar el producto y mostrar el formulario
        this.seleccionarProducto(productoId);
      });
    });

    searchResults.style.display = "block";
  },

  /**
   * Muestra el dropdown de productos con búsqueda
   */
  mostrarDropdownProductos(filtro) {
    const productoDropdown = document.getElementById(
      "producto-select-dropdown"
    );
    if (!productoDropdown) return;

    let productosFiltrados = this.productosLista || [];

    // Filtrar productos si hay búsqueda
    if (filtro && filtro.trim() !== "") {
      const searchTerm = filtro.toLowerCase().trim();
      productosFiltrados = this.productosLista.filter((p) => {
        const nombre = (p.producto_nombre || "").toLowerCase();
        const codigoBarra = (p.producto_codigo_barra || "").toLowerCase();
        const codigoInterno = (p.producto_codigo_interno || "").toLowerCase();
        return (
          nombre.includes(searchTerm) ||
          codigoBarra.includes(searchTerm) ||
          codigoInterno.includes(searchTerm)
        );
      });
    }

    if (productosFiltrados.length === 0) {
      productoDropdown.innerHTML = `
        <div style="padding: 15px; text-align: center; color: #6c757d;">
          No se encontraron productos
        </div>
      `;
      productoDropdown.style.display = "block";
      return;
    }

    // Limitar a 15 resultados
    const resultadosLimitados = productosFiltrados.slice(0, 15);

    productoDropdown.innerHTML = resultadosLimitados
      .map((p) => {
        const nombre = p.producto_nombre || "Sin nombre";
        const precio = formatCurrency(p.precio_venta || 0);

        return `
          <div class="producto-select-item" data-id="${p.producto_id}">
            <span class="producto-name">${nombre}</span>
            <span class="producto-price">${precio}</span>
          </div>
        `;
      })
      .join("");

    // Event listeners para seleccionar producto
    productoDropdown
      .querySelectorAll(".producto-select-item")
      .forEach((item) => {
        item.addEventListener("click", () => {
          const productoId = parseInt(item.getAttribute("data-id"));
          const producto = this.productosLista.find(
            (p) => p.producto_id === productoId
          );

          if (producto) {
            // Actualizar el input con el nombre del producto
            document.getElementById("producto-search").value =
              producto.producto_nombre || "";

            // Ocultar dropdown
            productoDropdown.style.display = "none";

            // Seleccionar el producto y mostrar el formulario
            this.seleccionarProducto(productoId);
          }
        });
      });

    productoDropdown.style.display = "block";
  },

  /**
   * Renderiza los productos en el dropdown del select con búsqueda
   */
  renderProductosEnDropdown(filtro) {
    const productoOptionsList = document.getElementById(
      "producto-select-options"
    );
    if (!productoOptionsList) {
      console.error("No se encontró el elemento producto-select-options");
      return;
    }

    let productosFiltrados = this.productosLista || [];

    // Filtrar productos si hay búsqueda
    if (filtro && filtro.trim() !== "") {
      const searchTerm = filtro.toLowerCase().trim();
      productosFiltrados = this.productosLista.filter((p) => {
        const nombre = (p.producto_nombre || "").toLowerCase();
        const codigoBarra = (p.producto_codigo_barra || "").toLowerCase();
        const codigoInterno = (p.producto_codigo_interno || "").toLowerCase();
        return (
          nombre.includes(searchTerm) ||
          codigoBarra.includes(searchTerm) ||
          codigoInterno.includes(searchTerm)
        );
      });
    }

    // Si no hay productos filtrados y hay búsqueda, mostrar mensaje
    if (productosFiltrados.length === 0) {
      if (filtro && filtro.trim() !== "") {
        productoOptionsList.innerHTML = `
          <div style="padding: 15px; text-align: center; color: #6c757d;">
            No se encontraron productos
          </div>
        `;
      } else {
        productoOptionsList.innerHTML = `
          <div style="padding: 15px; text-align: center; color: #6c757d;">
            No hay productos disponibles
          </div>
        `;
      }
      return;
    }

    // Renderizar productos con precio
    productoOptionsList.innerHTML = productosFiltrados
      .map((p) => {
        const nombre = p.producto_nombre || "Sin nombre";
        const precio = formatCurrency(p.precio_venta || 0);

        return `
          <div class="select-search-option" data-id="${p.producto_id}" data-nombre="${nombre}">
            <span class="option-text">${nombre}</span>
            <span class="option-price">${precio}</span>
          </div>
        `;
      })
      .join("");

    // Event listeners para seleccionar producto
    productoOptionsList
      .querySelectorAll(".select-search-option")
      .forEach((option) => {
        option.addEventListener("click", () => {
          const productoId = parseInt(option.getAttribute("data-id"));

          // Cerrar overlay
          const overlay = document.getElementById("producto-select-overlay");
          if (overlay) {
            overlay.classList.remove("open");
          }

          // Limpiar búsqueda
          const searchInput = document.getElementById("producto-search-input");
          if (searchInput) {
            searchInput.value = "";
          }

          // Seleccionar el producto y mostrar el formulario
          this.seleccionarProducto(productoId);
        });
      });
  },

  /**
   * Obtiene la URL de la imagen del producto
   */
  getProductImage(imagenPath) {
    if (!imagenPath) {
      return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23ddd' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E📦%3C/text%3E%3C/svg%3E";
    }

    // Si es URL completa, usar directamente
    if (imagenPath.startsWith("http://") || imagenPath.startsWith("https://")) {
      return imagenPath;
    }

    // Si es ruta relativa, construir URL completa
    // Por ahora, retornar placeholder hasta tener la lógica de servidor de imágenes
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect fill='%23ddd' width='150' height='150'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3E📦%3C/text%3E%3C/svg%3E";
  },

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Select personalizado de productos con búsqueda
    const productoSelect = document.getElementById("producto_id");
    const productoOverlay = document.getElementById("producto-select-overlay");
    const productoSearchInput = document.getElementById(
      "producto-search-input"
    );

    if (productoSelect && productoOverlay && productoSearchInput) {
      // Abrir overlay cuando se hace clic/focus en el select
      const openOverlay = () => {
        productoOverlay.classList.add("open");
        productoSearchInput.value = "";

        // Verificar que los productos estén cargados
        if (!this.productosLista || this.productosLista.length === 0) {
          // Si no hay productos, cargarlos primero
          this.cargarProductos().then(() => {
            console.log(
              "Productos cargados, renderizando en dropdown:",
              this.productosLista.length
            );
            setTimeout(() => {
              this.renderProductosEnDropdown("");
            }, 100);
          });
        } else {
          // Mostrar todos los productos al abrir inmediatamente
          console.log(
            "Mostrando todos los productos:",
            this.productosLista.length
          );
          setTimeout(() => {
            this.renderProductosEnDropdown("");
          }, 50);
        }

        // Enfocar el input de búsqueda después de un pequeño delay
        setTimeout(() => {
          productoSearchInput.focus();
        }, 150);
      };

      productoSelect.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (productoOverlay.classList.contains("open")) {
          productoOverlay.classList.remove("open");
        } else {
          openOverlay();
        }
      });

      productoSelect.addEventListener("focus", (e) => {
        if (!productoOverlay.classList.contains("open")) {
          openOverlay();
        }
      });

      productoSelect.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (productoOverlay.classList.contains("open")) {
            productoOverlay.classList.remove("open");
          } else {
            openOverlay();
          }
        }
      });

      // Búsqueda mientras se escribe
      productoSearchInput.addEventListener("input", (e) => {
        e.stopPropagation();
        const filtro = e.target.value.trim();
        console.log(
          "Buscando productos con filtro:",
          filtro,
          "Total productos:",
          this.productosLista?.length || 0
        );
        this.renderProductosEnDropdown(filtro);
      });

      // Prevenir que el evento se propague y cierre el overlay
      productoSearchInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      // Seleccionar con Enter
      productoSearchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const firstOption = document
            .getElementById("producto-select-options")
            ?.querySelector(".select-search-option");
          if (firstOption) {
            firstOption.click();
          }
        } else if (e.key === "Escape") {
          productoOverlay.classList.remove("open");
          productoSelect.blur();
        }
      });

      // Cerrar overlay al hacer click fuera
      document.addEventListener("click", (e) => {
        const wrapper = productoSelect.closest(".select-search-wrapper");
        if (wrapper && !wrapper.contains(e.target)) {
          productoOverlay.classList.remove("open");
        }
      });
    }

    // Cambio de local - recargar productos
    document
      .getElementById("local_id")
      ?.addEventListener("change", async (e) => {
        this.localSeleccionado = e.target.value;
        productoSelect.value = "";
        await this.cargarProductos();
      });

    // Cambio de cliente
    document.getElementById("cliente_id")?.addEventListener("change", (e) => {
      const option = e.target.options[e.target.selectedIndex];
      const descuento = parseFloat(option.dataset.descuento || 0);
      if (descuento > 0) {
        this.descuentoGeneral = descuento;
        this.tipoDescuentoGeneral = 1; // Porcentaje
        document.getElementById("descuento-ventas").value = descuento;
      }
      this.actualizarTotales();
    });

    // Agregar producto al carrito
    document
      .getElementById("btn-agregar-producto")
      ?.addEventListener("click", () => {
        this.agregarProductoAlCarrito();
      });

    // Cerrar formulario de producto
    document
      .getElementById("btn-cerrar-producto-form")
      ?.addEventListener("click", () => {
        this.ocultarFormularioProducto();
      });

    // Tipo de descuento del producto
    document.querySelectorAll('input[name="t_descuento"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        this.calcularSubtotalProducto();
      });
    });

    // Campos del formulario de producto
    const cantidadInput = document.getElementById("producto-cantidad");
    const precioInput = document.getElementById("producto-precio");
    const descuentoInput = document.getElementById("producto-descuento");

    [cantidadInput, precioInput, descuentoInput].forEach((input) => {
      if (input) {
        input.addEventListener("input", () => this.calcularSubtotalProducto());
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("btn-agregar-producto").click();
          }
        });
      }
    });

    // Tipo de impuesto
    document
      .getElementById("tipo_impuesto")
      ?.addEventListener("change", (e) => {
        this.tipoImpuesto = parseInt(e.target.value);
        this.actualizarTotales();
      });

    // Descuento general
    document
      .getElementById("descuento-ventas")
      ?.addEventListener("input", () => {
        this.calcularDescuentoGeneral();
        this.actualizarTotales();
      });
    document
      .querySelectorAll('input[name="t_descuento_venta"]')
      .forEach((radio) => {
        radio.addEventListener("change", () => {
          this.calcularDescuentoGeneral();
          this.actualizarTotales();
        });
      });

    // Botones de acción
    document
      .getElementById("btn-terminar-venta")
      ?.addEventListener("click", () => this.terminarVenta());
    document
      .getElementById("btn-terminar-venta-side")
      ?.addEventListener("click", () => this.terminarVenta());
    document
      .getElementById("btn-hold-venta")
      ?.addEventListener("click", () => this.holdVenta());
    document
      .getElementById("btn-hold-venta-side")
      ?.addEventListener("click", () => this.holdVenta());
    document
      .getElementById("btn-reiniciar")
      ?.addEventListener("click", () => this.reiniciar());
    document
      .getElementById("btn-reiniciar-side")
      ?.addEventListener("click", () => this.reiniciar());
    document
      .getElementById("btn-nota")
      ?.addEventListener("click", () => this.mostrarModalNota());

    // Botón nuevo cliente
    document
      .getElementById("btn-nuevo-cliente")
      ?.addEventListener("click", () => this.mostrarModalCliente());

    // Modales
    document
      .getElementById("btn-cerrar-modal-cliente")
      ?.addEventListener("click", () => {
        document.getElementById("modal-nuevo-cliente").classList.add("hidden");
      });
    document
      .getElementById("btn-cancelar-cliente-rapido")
      ?.addEventListener("click", () => {
        document.getElementById("modal-nuevo-cliente").classList.add("hidden");
      });
    document
      .getElementById("btn-guardar-cliente-rapido")
      ?.addEventListener("click", () => this.guardarClienteRapido());

    document
      .getElementById("btn-cerrar-modal-nota")
      ?.addEventListener("click", () => {
        document.getElementById("modal-nota").classList.add("hidden");
      });
    document
      .getElementById("btn-cancelar-nota")
      ?.addEventListener("click", () => {
        document.getElementById("modal-nota").classList.add("hidden");
      });
    document
      .getElementById("btn-guardar-nota")
      ?.addEventListener("click", () => {
        this.ventaNota = document.getElementById("venta-nota").value;
        document.getElementById("modal-nota").classList.add("hidden");
        toast.success("Nota guardada");
      });

    // Atajos de teclado
    document.addEventListener("keydown", (e) => {
      // F6: Guardar venta
      if (e.key === "F6") {
        e.preventDefault();
        this.terminarVenta();
      }
      // F3: Focus en búsqueda de producto
      if (e.key === "F3") {
        e.preventDefault();
        productoSearch.focus();
      }
    });
  },

  cleanup() {
    document
      .getElementById("producto-search")
      ?.removeEventListener("input", this.debouncedSearch);
  },

  /**
   * Selecciona un producto y muestra el formulario para agregarlo
   */
  seleccionarProducto(productoId) {
    try {
      // Buscar el producto en la lista cargada
      const producto = this.productosLista.find(
        (p) => p.producto_id == productoId
      );

      if (!producto) {
        toast.error("Producto no encontrado");
        return;
      }

      this.productoSeleccionado = producto;

      // Llenar formulario
      document.getElementById("producto-id").value = producto.producto_id;
      document.getElementById("producto-nombre-display").value =
        producto.producto_nombre || "Sin nombre";
      document.getElementById("producto-precio").value =
        producto.precio_venta || 0;
      document.getElementById("producto-cantidad").value = 1;
      document.getElementById("producto-descuento").value = 0;

      // Mostrar stock
      const stockInfo = document.getElementById("producto-stock-info");
      const stockActual = producto.stock_actual || 0;
      stockInfo.textContent = `Stock disponible: ${stockActual}`;
      if (stockActual <= 0) {
        stockInfo.className = "text-danger";
      } else {
        stockInfo.className = "text-info";
      }

      // Mostrar formulario
      document.getElementById("block-producto-form").classList.add("active");
      document.getElementById("producto-cantidad").focus();

      // Calcular subtotal inicial
      this.calcularSubtotalProducto();
    } catch (error) {
      console.error("Error seleccionando producto:", error);
      toast.error("Error al seleccionar producto");
    }
  },

  /**
   * Calcula el subtotal del producto en el formulario
   */
  calcularSubtotalProducto() {
    const cantidad =
      parseFloat(document.getElementById("producto-cantidad").value) || 0;
    const precio =
      parseFloat(document.getElementById("producto-precio").value) || 0;
    const descuento =
      parseFloat(document.getElementById("producto-descuento").value) || 0;
    const tipoDescuento = document.querySelector(
      'input[name="t_descuento"]:checked'
    ).value;

    let subtotal = cantidad * precio;
    let descuentoMonto = 0;

    if (descuento > 0) {
      if (tipoDescuento === "1") {
        // Porcentaje
        descuentoMonto = subtotal * (descuento / 100);
      } else {
        // Monto fijo
        descuentoMonto = descuento;
      }
      subtotal = subtotal - descuentoMonto;
    }

    document.getElementById("producto-subtotal").value = formatCurrency(
      Math.max(0, subtotal)
    );
  },

  /**
   * Oculta el formulario de producto
   */
  ocultarFormularioProducto() {
    document.getElementById("block-producto-form").classList.remove("active");
    this.productoSeleccionado = null;
    document.getElementById("producto-search").focus();
  },

  /**
   * Agrega un producto al carrito
   */
  async agregarProductoAlCarrito() {
    try {
      const productoId = parseInt(document.getElementById("producto-id").value);
      const cantidad = parseFloat(
        document.getElementById("producto-cantidad").value
      );
      const precio = parseFloat(
        document.getElementById("producto-precio").value
      );
      const descuento =
        parseFloat(document.getElementById("producto-descuento").value) || 0;
      const tipoDescuento = document.querySelector(
        'input[name="t_descuento"]:checked'
      ).value;

      // Validaciones
      if (!productoId || !this.productoSeleccionado) {
        toast.warning("Seleccione un producto primero");
        return;
      }

      if (!cantidad || cantidad <= 0) {
        toast.error("La cantidad debe ser mayor a cero");
        return;
      }

      if (!precio || precio < 0) {
        toast.error("El precio debe ser válido");
        return;
      }

      // Verificar stock
      const stockDisponible = this.productoSeleccionado.stock_actual || 0;
      const cantidadExistente =
        this.carrito.find((p) => p.producto_id === productoId)?.cantidad || 0;

      if (cantidadExistente + cantidad > stockDisponible) {
        toast.error(
          `Stock insuficiente. Disponible: ${stockDisponible}, En carrito: ${cantidadExistente}, Solicitado: ${cantidad}`
        );
        return;
      }

      // Calcular subtotal y descuento
      let subtotal = cantidad * precio;
      let descuentoMonto = 0;
      if (descuento > 0) {
        if (tipoDescuento === "1") {
          descuentoMonto = subtotal * (descuento / 100);
        } else {
          descuentoMonto = descuento;
        }
      }
      const subtotalFinal = subtotal - descuentoMonto;

      // Calcular impuesto
      const impuestoPorcentaje =
        this.productoSeleccionado.impuesto_porcentaje || 0;
      let impuestoMonto = 0;
      if (this.tipoImpuesto === 1) {
        // Incluye impuesto - calcular el impuesto del subtotal
        impuestoMonto =
          subtotalFinal * (impuestoPorcentaje / (100 + impuestoPorcentaje));
      } else if (this.tipoImpuesto === 2) {
        // Agregar impuesto
        impuestoMonto = subtotalFinal * (impuestoPorcentaje / 100);
      }
      // Si tipoImpuesto === 3, no se considera impuesto

      const total = subtotalFinal + impuestoMonto;

      // Agregar o actualizar en carrito
      const existente = this.carrito.findIndex(
        (p) => p.producto_id === productoId
      );
      if (existente >= 0) {
        // Actualizar existente
        this.carrito[existente].cantidad += cantidad;
        this.carrito[existente].precio_unitario = precio;
        this.carrito[existente].descuento = descuentoMonto;
        this.carrito[existente].tipo_descuento = tipoDescuento;
        this.carrito[existente].porcentaje_descuento =
          tipoDescuento === "1" ? descuento : 0;
      } else {
        // Agregar nuevo
        this.carrito.push({
          producto_id: productoId,
          producto_nombre: this.productoSeleccionado.producto_nombre,
          cantidad: cantidad,
          precio_unitario: precio,
          descuento: descuentoMonto,
          tipo_descuento: tipoDescuento,
          porcentaje_descuento: tipoDescuento === "1" ? descuento : 0,
          impuesto_porcentaje: impuestoPorcentaje,
          impuesto_monto: impuestoMonto,
          subtotal: subtotalFinal,
          total: total,
          unidad_medida: 1, // Default
          stock_disponible: stockDisponible,
        });
      }

      this.actualizarCarrito();
      this.ocultarFormularioProducto();
      toast.success(
        `${cantidad} x ${this.productoSeleccionado.producto_nombre} agregado`
      );
    } catch (error) {
      console.error("Error agregando producto:", error);
      toast.error("Error al agregar producto al carrito");
    }
  },

  /**
   * Actualiza el carrito de productos
   */
  actualizarCarrito() {
    const tbody = document.getElementById("body-productos");

    if (this.carrito.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 30px; color: #6c757d;">
            <span class="material-icons" style="font-size: 48px; display: block; margin-bottom: 10px;">shopping_cart</span>
            Carrito vacío. Busque y agregue productos.
          </td>
        </tr>
      `;
      this.actualizarTotales();
      return;
    }

    // Recalcular totales de cada producto
    this.carrito.forEach((item) => {
      let subtotal = item.cantidad * item.precio_unitario;
      let descuentoMonto = item.descuento || 0;

      // Recalcular descuento si es necesario
      if (item.porcentaje_descuento > 0 && item.tipo_descuento === "1") {
        descuentoMonto = subtotal * (item.porcentaje_descuento / 100);
      }

      const subtotalFinal = subtotal - descuentoMonto;

      // Recalcular impuesto
      let impuestoMonto = 0;
      if (this.tipoImpuesto === 1) {
        impuestoMonto =
          subtotalFinal *
          (item.impuesto_porcentaje / (100 + item.impuesto_porcentaje));
      } else if (this.tipoImpuesto === 2) {
        impuestoMonto = subtotalFinal * (item.impuesto_porcentaje / 100);
      }

      item.subtotal = subtotalFinal;
      item.impuesto_monto = impuestoMonto;
      item.total = subtotalFinal + impuestoMonto;
      item.descuento = descuentoMonto;
    });

    tbody.innerHTML = this.carrito
      .map((item, index) => {
        const descuentoText =
          item.tipo_descuento === "1"
            ? `${item.porcentaje_descuento}%`
            : formatCurrency(item.descuento);

        return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.producto_nombre}</td>
          <td>
            <input type="number" class="form-control form-control-small" 
              value="${item.cantidad}" min="0.01" step="0.01"
              data-index="${index}" data-field="cantidad" style="width: 80px;">
          </td>
          <td>
            <input type="number" class="form-control form-control-small" 
              value="${item.precio_unitario}" min="0" step="0.01"
              data-index="${index}" data-field="precio" style="width: 100px;">
          </td>
          <td>${descuentoText}</td>
          <td>${formatCurrency(item.subtotal)}</td>
          <td>${
            item.impuesto_porcentaje > 0
              ? `${item.impuesto_porcentaje}%`
              : "N/A"
          }</td>
          <td><strong>${formatCurrency(item.total)}</strong></td>
          <td>
            <button type="button" class="btn btn-sm btn-danger" 
              data-index="${index}" onclick="window.VentasView.eliminarProducto(${index})">
              <span class="material-icons" style="font-size: 18px;">delete</span>
            </button>
          </td>
        </tr>
      `;
      })
      .join("");

    // Event listeners para editar cantidad y precio
    tbody.querySelectorAll("input[data-field]").forEach((input) => {
      input.addEventListener("change", (e) => {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        const value = parseFloat(e.target.value) || 0;

        if (field === "cantidad") {
          // Verificar stock
          if (value > this.carrito[index].stock_disponible) {
            toast.error(
              `Stock insuficiente. Disponible: ${this.carrito[index].stock_disponible}`
            );
            e.target.value = this.carrito[index].cantidad;
            return;
          }
          this.carrito[index].cantidad = value;
        } else if (field === "precio") {
          this.carrito[index].precio_unitario = value;
        }

        // Recalcular este item
        this.recalcularItemCarrito(index);
        this.actualizarCarrito();
      });
    });

    this.actualizarTotales();
  },

  /**
   * Recalcula los totales de un item del carrito
   */
  recalcularItemCarrito(index) {
    const item = this.carrito[index];
    if (!item) return;

    let subtotal = item.cantidad * item.precio_unitario;
    let descuentoMonto = 0;

    if (item.porcentaje_descuento > 0) {
      if (item.tipo_descuento === "1") {
        descuentoMonto = subtotal * (item.porcentaje_descuento / 100);
      } else {
        descuentoMonto = item.descuento;
      }
    }

    const subtotalFinal = subtotal - descuentoMonto;

    // Recalcular impuesto
    let impuestoMonto = 0;
    if (this.tipoImpuesto === 1) {
      impuestoMonto =
        subtotalFinal *
        (item.impuesto_porcentaje / (100 + item.impuesto_porcentaje));
    } else if (this.tipoImpuesto === 2) {
      impuestoMonto = subtotalFinal * (item.impuesto_porcentaje / 100);
    }

    item.subtotal = subtotalFinal;
    item.impuesto_monto = impuestoMonto;
    item.total = subtotalFinal + impuestoMonto;
    item.descuento = descuentoMonto;
  },

  /**
   * Elimina un producto del carrito
   */
  eliminarProducto(index) {
    if (confirm("¿Eliminar este producto del carrito?")) {
      this.carrito.splice(index, 1);
      this.actualizarCarrito();
      toast.info("Producto eliminado del carrito");
    }
  },

  /**
   * Calcula el descuento general de la venta
   */
  calcularDescuentoGeneral() {
    const descuentoInput = document.getElementById("descuento-ventas");
    const descuento = parseFloat(descuentoInput.value) || 0;
    this.descuentoGeneral = descuento;
    this.tipoDescuentoGeneral = document.querySelector(
      'input[name="t_descuento_venta"]:checked'
    ).value;
  },

  /**
   * Actualiza los totales de la venta
   */
  actualizarTotales() {
    // Calcular subtotal de productos
    let subtotalProductos = this.carrito.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );

    // Calcular descuento general
    let descuentoGeneralMonto = 0;
    if (this.descuentoGeneral > 0) {
      if (this.tipoDescuentoGeneral === "1") {
        descuentoGeneralMonto =
          subtotalProductos * (this.descuentoGeneral / 100);
      } else {
        descuentoGeneralMonto = this.descuentoGeneral;
      }
    }

    const subtotalConDescuento = subtotalProductos - descuentoGeneralMonto;

    // Calcular impuesto total
    let impuestoTotal = 0;
    if (this.tipoImpuesto === 1 || this.tipoImpuesto === 2) {
      impuestoTotal = this.carrito.reduce(
        (sum, item) => sum + (item.impuesto_monto || 0),
        0
      );

      if (this.tipoImpuesto === 2) {
        // Agregar impuesto al subtotal con descuento
        impuestoTotal =
          subtotalConDescuento * (impuestoTotal / subtotalProductos);
      }
    }

    const total = subtotalConDescuento + impuestoTotal;

    // Actualizar UI
    document.getElementById("subtotal").textContent =
      formatCurrency(subtotalProductos);
    document.getElementById("total-descuento").textContent = formatCurrency(
      descuentoGeneralMonto
    );
    document.getElementById("impuesto").textContent =
      formatCurrency(impuestoTotal);
    document.getElementById("total-importe").textContent =
      formatCurrency(total);

    // Hidden fields
    document.getElementById("subtotal-hidden").value =
      subtotalProductos.toFixed(2);
    document.getElementById("total_descuento-hidden").value =
      descuentoGeneralMonto.toFixed(2);
    document.getElementById("impuesto-hidden").value = impuestoTotal.toFixed(2);
    document.getElementById("total-importe-hidden").value = total.toFixed(2);
  },

  /**
   * Limpia el carrito
   */
  limpiarCarrito() {
    this.carrito = [];
    this.clienteSeleccionado = null;
    this.productoSeleccionado = null;
    this.descuentoGeneral = 0;
    this.tipoDescuentoGeneral = 1;
    this.tipoImpuesto = 1;
    this.ventaNota = "";

    if (document.getElementById("descuento-ventas")) {
      document.getElementById("descuento-ventas").value = 0;
    }
    if (document.getElementById("tipo_impuesto")) {
      document.getElementById("tipo_impuesto").value = 1;
    }

    this.actualizarCarrito();
  },

  /**
   * Muestra el modal para agregar cliente rápido
   */
  mostrarModalCliente() {
    document.getElementById("modal-nuevo-cliente").classList.remove("hidden");
    document.getElementById("cliente-nombre-rapido").focus();
  },

  /**
   * Guarda un cliente rápido
   */
  async guardarClienteRapido() {
    try {
      const nombre = document
        .getElementById("cliente-nombre-rapido")
        .value.trim();
      if (!nombre) {
        toast.error("El nombre comercial es requerido");
        return;
      }

      const cliente = {
        nombre_comercial: nombre,
        identificacion: document
          .getElementById("cliente-identificacion-rapido")
          .value.trim(),
        telefono1: document
          .getElementById("cliente-telefono-rapido")
          .value.trim(),
        email: document.getElementById("cliente-email-rapido").value.trim(),
        tipo_cliente: "CONTADO",
        cliente_status: 1,
      };

      // Guardar cliente
      const result = await api.dbQuery(
        `
        INSERT INTO cliente (nombre_comercial, identificacion, telefono1, email, tipo_cliente, cliente_status, codigo, tipo_pago)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          cliente.nombre_comercial,
          cliente.identificacion || "",
          cliente.telefono1 || "",
          cliente.email || "",
          cliente.tipo_cliente,
          1,
          "",
          1,
        ]
      );

      const clienteId = result.lastInsertRowid;

      // Recargar select de clientes
      await this.cargarDatosIniciales();

      // Seleccionar el nuevo cliente
      document.getElementById("cliente_id").value = clienteId;

      // Cerrar modal
      document.getElementById("modal-nuevo-cliente").classList.add("hidden");

      // Limpiar formulario
      document.getElementById("form-nuevo-cliente-rapido").reset();

      toast.success("Cliente agregado exitosamente");
    } catch (error) {
      console.error("Error guardando cliente:", error);
      toast.error("Error al guardar cliente");
    }
  },

  /**
   * Muestra el modal para agregar nota
   */
  mostrarModalNota() {
    document.getElementById("venta-nota").value = this.ventaNota || "";
    document.getElementById("modal-nota").classList.remove("hidden");
    document.getElementById("venta-nota").focus();
  },

  /**
   * Termina la venta (muestra dialogs de pago)
   */
  async terminarVenta() {
    if (this.carrito.length === 0) {
      toast.warning("El carrito está vacío");
      return;
    }

    const tipoPago = document.getElementById("tipo_pago").value;

    if (tipoPago === "1") {
      // Contado
      await this.mostrarDialogPagoContado();
    } else {
      // Crédito
      await this.mostrarDialogPagoCredito();
    }
  },

  /**
   * Muestra el dialog de pago contado
   */
  async mostrarDialogPagoContado() {
    const total = parseFloat(
      document.getElementById("total-importe-hidden").value
    );

    // Obtener métodos de pago (usar columnas correctas: id, nombre, estado)
    const metodosPago = await api.dbQuery(
      "SELECT * FROM metodos_pago WHERE estado = 1 ORDER BY nombre"
    );

    const modal = document.getElementById("modal-pago-contado");
    const content = document.getElementById("pago-contado-content");

    content.innerHTML = `
      <div class="form-group">
        <label><strong>Total a Pagar:</strong></label>
        <h2 style="color: #28a745; margin: 10px 0;">${formatCurrency(
          total
        )}</h2>
      </div>
      
      <div class="form-group">
        <label>Método de Pago *</label>
        <select id="metodo-pago-contado" class="form-control" required>
          ${metodosPago
            .map((mp) => `<option value="${mp.id}">${mp.nombre}</option>`)
            .join("")}
        </select>
      </div>
      
      <div id="div-efectivo-recibido" class="form-group">
        <label>Monto Recibido *</label>
        <input type="number" id="efectivo-recibido" class="form-control" step="0.01" min="${total}" required>
      </div>
      
      <div id="div-cambio" class="form-group" style="display: none;">
        <label><strong>Cambio:</strong></label>
        <h3 id="cambio-amount" style="color: #17a2b8; margin: 10px 0;">RD$ 0.00</h3>
      </div>
      
      <div class="form-group">
        <label>Referencia (opcional)</label>
        <input type="text" id="referencia-pago" class="form-control" placeholder="Número de referencia">
      </div>
    `;

    modal.classList.remove("hidden");

    // Calcular cambio al cambiar monto recibido
    const efectivoInput = document.getElementById("efectivo-recibido");
    efectivoInput.addEventListener("input", () => {
      const recibido = parseFloat(efectivoInput.value) || 0;
      const cambio = recibido - total;
      const cambioDiv = document.getElementById("div-cambio");
      const cambioAmount = document.getElementById("cambio-amount");

      if (cambio > 0) {
        cambioDiv.style.display = "block";
        cambioAmount.textContent = formatCurrency(cambio);
      } else {
        cambioDiv.style.display = "none";
      }
    });

    efectivoInput.focus();

    // Event listener para guardar
    const btnGuardar = modal.querySelector("#btn-cerrar-modal-pago");
    if (btnGuardar) {
      btnGuardar.removeEventListener("click", this.guardarVentaContado);
    }

    // Agregar botón de guardar si no existe
    const modalFooter = modal.querySelector(".modal-footer");
    if (!modalFooter) {
      const footer = document.createElement("div");
      footer.className = "modal-footer";
      footer.innerHTML = `
        <button type="button" id="btn-guardar-venta-contado" class="btn btn-success btn-lg">
          <span class="material-icons">check</span> PROCESAR VENTA
        </button>
        <button type="button" id="btn-cerrar-modal-pago" class="btn btn-secondary">Cancelar</button>
      `;
      modal.querySelector(".modal-body").appendChild(footer);
    }

    document
      .getElementById("btn-guardar-venta-contado")
      ?.addEventListener("click", () => this.guardarVentaContado());
    document
      .getElementById("btn-cerrar-modal-pago")
      ?.addEventListener("click", () => {
        modal.classList.add("hidden");
      });
  },

  /**
   * Muestra el dialog de pago crédito
   */
  async mostrarDialogPagoCredito() {
    const total = parseFloat(
      document.getElementById("total-importe-hidden").value
    );

    const modal = document.getElementById("modal-pago-credito");
    const content = document.getElementById("pago-credito-content");

    content.innerHTML = `
      <div class="form-group">
        <label><strong>Total a Pagar:</strong></label>
        <h2 style="color: #28a745; margin: 10px 0;">${formatCurrency(
          total
        )}</h2>
      </div>
      
      <div class="form-group">
        <label>Pago Inicial *</label>
        <input type="number" id="pago-inicial" class="form-control" step="0.01" min="0" max="${total}" value="0" required>
        <small>Monto inicial a pagar en crédito</small>
      </div>
      
      <div class="form-group">
        <label>Número de Cuotas</label>
        <input type="number" id="numero-cuotas" class="form-control" min="1" value="1">
      </div>
      
      <div class="form-group">
        <label>Días de Pago</label>
        <input type="number" id="dias-pago" class="form-control" min="1" value="30">
        <small>Días entre cada pago</small>
      </div>
      
      <div class="form-group">
        <label>Tasa de Interés (%)</label>
        <input type="number" id="tasa-interes" class="form-control" step="0.01" min="0" value="0">
      </div>
    `;

    modal.classList.remove("hidden");

    // Agregar botones si no existen
    const modalFooter = modal.querySelector(".modal-footer");
    if (!modalFooter) {
      const footer = document.createElement("div");
      footer.className = "modal-footer";
      footer.innerHTML = `
        <button type="button" id="btn-guardar-venta-credito" class="btn btn-success btn-lg">
          <span class="material-icons">check</span> PROCESAR VENTA
        </button>
        <button type="button" id="btn-cerrar-modal-credito" class="btn btn-secondary">Cancelar</button>
      `;
      modal.querySelector(".modal-body").appendChild(footer);
    }

    document
      .getElementById("btn-guardar-venta-credito")
      ?.addEventListener("click", () => this.guardarVentaCredito());
    document
      .getElementById("btn-cerrar-modal-credito")
      ?.addEventListener("click", () => {
        modal.classList.add("hidden");
      });
  },

  /**
   * Guarda la venta como contado
   */
  async guardarVentaContado() {
    try {
      const total = parseFloat(
        document.getElementById("total-importe-hidden").value
      );
      const metodoPago = document.getElementById("metodo-pago-contado").value;
      const efectivoRecibido = parseFloat(
        document.getElementById("efectivo-recibido").value
      );
      const referencia = document
        .getElementById("referencia-pago")
        .value.trim();

      if (efectivoRecibido < total) {
        toast.error("El monto recibido debe ser mayor o igual al total");
        return;
      }

      const cambio = efectivoRecibido - total;

      // Guardar venta usando la lógica de imaxpos2
      await this.procesarGuardarVenta({
        tipo_pago: "1",
        metodo_pago: metodoPago,
        efectivo_recibido: efectivoRecibido,
        cambio: cambio,
        referencia: referencia,
      });
    } catch (error) {
      console.error("Error guardando venta contado:", error);
      toast.error("Error al procesar la venta");
    }
  },

  /**
   * Guarda la venta como crédito
   */
  async guardarVentaCredito() {
    try {
      const total = parseFloat(
        document.getElementById("total-importe-hidden").value
      );
      const pagoInicial =
        parseFloat(document.getElementById("pago-inicial").value) || 0;
      const numeroCuotas =
        parseInt(document.getElementById("numero-cuotas").value) || 1;
      const diasPago =
        parseInt(document.getElementById("dias-pago").value) || 30;
      const tasaInteres =
        parseFloat(document.getElementById("tasa-interes").value) || 0;

      if (pagoInicial > total) {
        toast.error("El pago inicial no puede ser mayor al total");
        return;
      }

      await this.procesarGuardarVenta({
        tipo_pago: "2",
        pago_inicial: pagoInicial,
        numero_cuotas: numeroCuotas,
        dias_pago: diasPago,
        tasa_interes: tasaInteres,
      });
    } catch (error) {
      console.error("Error guardando venta crédito:", error);
      toast.error("Error al procesar la venta");
    }
  },

  /**
   * Procesa el guardado de la venta en la base de datos
   */
  async procesarGuardarVenta(datosPago) {
    try {
      const user = authService.getCurrentUser();
      if (!user) {
        toast.error("Error de sesión. Por favor inicie sesión nuevamente.");
        return;
      }

      const localId =
        document.getElementById("local_venta_id").value ||
        document.getElementById("local_id").value;
      const clienteId = document.getElementById("cliente_id").value || 1;
      const fechaVenta =
        document.getElementById("fecha_venta").value ||
        new Date().toISOString().split("T")[0];
      const tipoPago = datosPago.tipo_pago;

      const subtotal = parseFloat(
        document.getElementById("subtotal-hidden").value
      );
      const descuentoTotal = parseFloat(
        document.getElementById("total_descuento-hidden").value
      );
      const impuestoTotal = parseFloat(
        document.getElementById("impuesto-hidden").value
      );
      const total = parseFloat(
        document.getElementById("total-importe-hidden").value
      );

      // Obtener documento por defecto (factura)
      // Nota: documentos usa id_doc, pero venta y correlativos usan id_documento
      const documentos = await api.dbQuery(
        "SELECT * FROM documentos WHERE estado_doc = 1 LIMIT 1"
      );
      const documentoId =
        documentos && documentos.length > 0 ? documentos[0].id_doc : 1;

      // Obtener siguiente número de factura
      // correlativos usa: id_local, id_documento, serie, correlativo (no numero)
      const correlativos = await api.dbQuery(
        `
        SELECT * FROM correlativos 
        WHERE id_documento = ? AND id_local = ? 
        LIMIT 1
      `,
        [documentoId, localId]
      );

      let numeroFactura = 1;
      let serieFactura = "A";

      if (correlativos && correlativos.length > 0) {
        numeroFactura = (correlativos[0].correlativo || 0) + 1;
        serieFactura = correlativos[0].serie || "A";
      }

      // Obtener moneda por defecto (usar principal, no default_moneda)
      const monedas = await api.dbQuery(
        "SELECT * FROM moneda WHERE estado = 1 ORDER BY principal DESC LIMIT 1"
      );
      const monedaId = monedas && monedas.length > 0 ? monedas[0].id_moneda : 1;

      // Insertar venta
      const ventaResult = await api.dbQuery(
        `
        INSERT INTO venta (
          local_id, id_documento, id_cliente, id_vendedor, id_moneda,
          condicion_pago, venta_status, fecha, fecha_facturacion,
          subtotal, descuento_general, total_impuesto, total, pagado, vuelto,
          serie, numero, nota, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
        [
          localId,
          documentoId,
          clienteId,
          user.nUsuCodigo || user.id || 1,
          monedaId,
          tipoPago,
          "Completada",
          fechaVenta,
          fechaVenta,
          subtotal,
          descuentoTotal,
          impuestoTotal,
          total,
          datosPago.efectivo_recibido || datosPago.pago_inicial || total,
          datosPago.cambio || 0,
          serieFactura,
          numeroFactura,
          this.ventaNota || "",
        ]
      );

      const ventaId = ventaResult.lastInsertRowid;

      // Insertar detalles de venta
      for (const item of this.carrito) {
        await api.dbQuery(
          `
          INSERT INTO detalle_venta (
            id_venta, id_producto, cantidad, precio_unitario, descuento,
            impuesto_porcentaje, impuesto_monto, subtotal, total, unidad_medida, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
          [
            ventaId,
            item.producto_id,
            item.cantidad,
            item.precio_unitario,
            item.descuento || 0,
            item.impuesto_porcentaje || 0,
            item.impuesto_monto || 0,
            item.subtotal,
            item.total,
            item.unidad_medida || 1,
          ]
        );

        // Actualizar stock en producto_almacen
        await api.dbQuery(
          `
          UPDATE producto_almacen 
          SET cantidad = cantidad - ? 
          WHERE id_producto = ? AND id_local = ?
        `,
          [item.cantidad, item.producto_id, localId]
        );
      }

      // Si es crédito, insertar registro de crédito
      if (tipoPago === "2") {
        await api.dbQuery(
          `
          INSERT INTO credito (
            id_venta, int_credito_nrocuota, dec_credito_montodebito, dec_credito_montocuota,
            tasa_interes, pago_periodo, dia_pago, periodo_gracia, var_credito_estado, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
          [
            ventaId,
            datosPago.numero_cuotas || 1,
            datosPago.pago_inicial || 0,
            total - (datosPago.pago_inicial || 0),
            datosPago.tasa_interes || 0,
            1, // Mensual por defecto
            datosPago.dias_pago || 30,
            0,
            "Activo",
          ]
        );
      }

      // Insertar movimiento de caja si es contado
      // Nota: La estructura de caja_movimiento requiere caja_desglose_id
      // Por ahora, comentamos esta funcionalidad hasta tener la estructura completa de cajas
      /*
      if (tipoPago === '1' && datosPago.efectivo_recibido) {
        // Obtener caja activa del usuario y local
        const cajaDesglose = await api.dbQuery(`
          SELECT cd.* FROM caja_desglose cd
          JOIN caja c ON c.id = cd.caja_id
          WHERE cd.responsable_id = ? AND c.local_id = ? AND cd.estado = 1
          ORDER BY cd.id DESC LIMIT 1
        `, [user.nUsuCodigo || user.id || 1, localId]);

        if (cajaDesglose && cajaDesglose.length > 0) {
          const cajaDesgloseId = cajaDesglose[0].id;
          const saldoOld = cajaDesglose[0].saldo || 0;
          const saldoNuevo = saldoOld + total;
          
          await api.dbQuery(`
            INSERT INTO caja_movimiento (
              caja_desglose_id, usuario_id, fecha_mov, movimiento, operacion,
              medio_pago, saldo, saldo_old, ref_id, ref_val, id_moneda
            ) VALUES (?, ?, CURRENT_TIMESTAMP, 'Ingreso', 'Venta', ?, ?, ?, ?, ?, ?)
          `, [
            cajaDesgloseId,
            user.nUsuCodigo || user.id || 1,
            datosPago.metodo_pago || 1,
            saldoNuevo,
            saldoOld,
            ventaId,
            datosPago.referencia || '',
            monedaId
          ]);
          
          // Actualizar saldo en caja_desglose
          await api.dbQuery(`
            UPDATE caja_desglose SET saldo = ? WHERE id = ?
          `, [saldoNuevo, cajaDesgloseId]);
        }
      }
      */

      // Actualizar correlativo (usar correlativo, no numero)
      if (correlativos && correlativos.length > 0) {
        await api.dbQuery(
          `
          UPDATE correlativos 
          SET correlativo = ? 
          WHERE id_documento = ? AND id_local = ? AND serie = ?
        `,
          [numeroFactura, documentoId, localId, serieFactura]
        );
      } else {
        await api.dbQuery(
          `
          INSERT INTO correlativos (id_documento, id_local, serie, correlativo)
          VALUES (?, ?, ?, ?)
        `,
          [documentoId, localId, serieFactura, numeroFactura]
        );
      }

      // Cerrar modal
      document.getElementById("modal-pago-contado").classList.add("hidden");
      document.getElementById("modal-pago-credito").classList.add("hidden");

      // Mostrar éxito
      const numeroFacturaFormateado = `${serieFactura}-${String(
        numeroFactura
      ).padStart(8, "0")}`;
      toast.success(`Venta ${numeroFacturaFormateado} procesada exitosamente`);

      // Preguntar si desea imprimir
      if (confirm("¿Desea imprimir la factura?")) {
        const venta = await api.dbQuery(
          "SELECT * FROM venta WHERE venta_id = ?",
          [ventaId]
        );
        if (venta && venta.length > 0) {
          await printService.imprimirFactura(venta[0]);
        }
      }

      // Reiniciar
      this.reiniciar();
    } catch (error) {
      console.error("Error procesando venta:", error);
      toast.error(`Error al procesar la venta: ${error.message}`);
      throw error;
    }
  },

  /**
   * Pone la venta en espera (hold)
   */
  async holdVenta() {
    if (this.carrito.length === 0) {
      toast.warning("El carrito está vacío");
      return;
    }

    // Guardar como venta en espera (venta_status = 'CAJA')
    toast.info("Funcionalidad de venta en espera en desarrollo");
  },

  /**
   * Reinicia la venta
   */
  reiniciar() {
    if (
      confirm(
        "¿Está seguro de reiniciar la venta? Se perderán todos los productos del carrito."
      )
    ) {
      this.limpiarCarrito();
      document.getElementById("producto-search").focus();
      toast.info("Venta reiniciada");
    }
  },
};

// Exponer métodos globalmente para eventos inline
window.VentasView = VentasView;

export default VentasView;
