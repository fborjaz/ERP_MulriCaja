/**
 * Vista del Módulo de Ventas (Punto de Venta)
 * @module renderer/modules/ventas/ventas.view
 */

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

  render() {
    return `
      <div class="pos-container">
        <!-- Columna Izquierda: Productos y Formulario -->
        <div class="pos-main">
          <div class="card">
            <div class="card-body">
              <div class="form-group">
                <label for="producto-search">Buscar Producto (F3)</label>
                <input type="text" id="producto-search" class="form-control" placeholder="Escanear código o escribir nombre...">
              </div>
              <div id="productos-resultados" class="search-results"></div>
            </div>
          </div>
          <div class="card">
            <div class="card-body">
              <form id="form-agregar-producto">
                <input type="hidden" id="producto-id">
                <div class="form-group">
                  <label>Producto Seleccionado</label>
                  <input type="text" id="producto-nombre" class="form-control" readonly>
                </div>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="producto-precio">Precio</label>
                    <input type="number" id="producto-precio" class="form-control" step="0.01">
                  </div>
                  <div class="form-group">
                    <label for="producto-cantidad">Cantidad</label>
                    <input type="number" id="producto-cantidad" class="form-control" value="1" min="1">
                  </div>
                </div>
                <div class="form-actions">
                  <button type="button" id="btn-agregar-producto" class="btn btn-primary">Agregar al Carrito</button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Carrito y Pago -->
        <div class="pos-sidebar">
          <div class="card">
            <div class="card-header">
              <h2>Carrito de Compra</h2>
            </div>
            <div class="card-body">
              <div class="table-responsive" style="max-height: 300px;">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cant.</th>
                      <th>Precio</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody id="carrito-items">
                    <tr><td colspan="5" style="text-align:center;">Carrito vacío</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="totals-display">
                <div class="total-row"><span>Subtotal:</span><span id="venta-subtotal">$0.00</span></div>
                <div class="total-row"><span>ITBIS (18%):</span><span id="venta-itbis">$0.00</span></div>
                <div class="total-row final-total"><span>Total:</span><span id="venta-total">$0.00</span></div>
              </div>
            </div>
            <div class="card-footer">
              <div class="form-group">
                <label for="metodo-pago">Método de Pago</label>
                <select id="metodo-pago" class="form-control">
                  <option>Efectivo</option>
                  <option>Tarjeta</option>
                  <option>Transferencia</option>
                </select>
              </div>
              <div id="efectivo-recibido-div" class="form-group">
                <label for="efectivo-recibido">Efectivo Recibido</label>
                <input type="number" id="efectivo-recibido" class="form-control" placeholder="0.00">
              </div>
              <div class="button-group">
                <button id="btn-procesar-venta" class="btn btn-success btn-lg">Cobrar (F5)</button>
                <button id="btn-limpiar-carrito" class="btn btn-danger">Limpiar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Inicializa la vista de ventas
   */
  init() {
    // Definir los handlers en el contexto de this para poder removerlos después
    this.debouncedSearch = debounce(() => {
      const searchInput = document.getElementById("producto-search");
      this.buscarProductos(searchInput.value);
    }, 300);
    this.handleMetodoPagoChange = (e) => {
      const efectivoDiv = document.getElementById("efectivo-recibido-div");
      efectivoDiv.style.display =
        e.target.value === "Efectivo" ? "block" : "none";
    };

    this.limpiarCarrito();
    this.setupEventListeners();
  },

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    document
      .getElementById("producto-search")
      .addEventListener("input", this.debouncedSearch);
    document
      .getElementById("btn-agregar-producto")
      .addEventListener("click", () => this.agregarProducto());
    document
      .getElementById("btn-procesar-venta")
      .addEventListener("click", () => this.procesarVenta());
    document
      .getElementById("btn-limpiar-carrito")
      .addEventListener("click", () => this.limpiarCarrito());
    document
      .getElementById("metodo-pago")
      .addEventListener("change", this.handleMetodoPagoChange);
  },

  cleanup() {
    document
      .getElementById("producto-search")
      ?.removeEventListener("input", this.debouncedSearch);
    // Remover otros listeners si es necesario para evitar fugas de memoria
  },

  async buscarProductos(filtro) {
    if (!filtro || filtro.trim() === "") {
      document.getElementById("productos-resultados").innerHTML = "";
      return;
    }
    try {
      const productos = await db.getProductos(filtro);
      this.mostrarResultadosProductos(productos);
    } catch (error) {
      console.error("Error buscando productos:", error);
      toast.error("Error buscando productos");
    }
  },

  mostrarResultadosProductos(productos) {
    const resultados = document.getElementById("productos-resultados");
    if (productos.length === 0) {
      resultados.innerHTML =
        "<div class='search-result-item'>No se encontraron productos</div>";
      return;
    }
    resultados.innerHTML = productos
      .map(
        (p) => `
      <div class="search-result-item" data-id="${p.id}">
        <span>${p.nombre} (${p.codigo || "N/A"})</span>
        <span>${formatCurrency(p.precio_venta)}</span>
      </div>
    `
      )
      .join("");

    resultados.querySelectorAll(".search-result-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = parseInt(item.getAttribute("data-id"));
        this.seleccionarProducto(id);
        resultados.innerHTML = "";
        document.getElementById("producto-search").value = "";
      });
    });
  },

  async seleccionarProducto(productoId) {
    try {
      const producto = await db.getProducto(productoId);
      document.getElementById("producto-id").value = producto.id;
      document.getElementById("producto-nombre").value = producto.nombre;
      document.getElementById("producto-precio").value = producto.precio_venta;
      document.getElementById("producto-cantidad").value = 1;
      document.getElementById("producto-cantidad").focus();
    } catch (error) {
      console.error("Error seleccionando producto:", error);
      toast.error("Error seleccionando producto");
    }
  },

  async agregarProducto() {
    try {
      const productoId = parseInt(document.getElementById("producto-id").value);
      const nombre = document.getElementById("producto-nombre").value;
      const precio = parseFloat(
        document.getElementById("producto-precio").value
      );
      const cantidad = parseFloat(
        document.getElementById("producto-cantidad").value
      );

      // ===== VALIDACIONES =====

      // 1. Validar que se haya seleccionado un producto
      if (!productoId) {
        toast.warning("Por favor seleccione un producto");
        return;
      }

      // 2. Validar que la cantidad sea un número positivo
      if (!Validator.isPositiveNumber(cantidad)) {
        toast.error("La cantidad debe ser un número positivo");
        return;
      }

      // 3. Validar que el precio sea positivo
      if (!Validator.isPositiveNumber(precio)) {
        toast.error("El precio debe ser un número positivo");
        return;
      }

      // 4. Verificar stock disponible
      const producto = await db.getProducto(productoId);

      if (!producto) {
        toast.error("Producto no encontrado");
        return;
      }

      // Calcular cantidad total en carrito (existente + nueva)
      const existente = this.carrito.find(
        (item) => item.producto_id === productoId
      );
      const cantidadTotalEnCarrito = existente
        ? existente.cantidad + cantidad
        : cantidad;

      // Verificar que no exceda el stock disponible
      if (cantidadTotalEnCarrito > producto.stock_actual) {
        toast.error(
          `Stock insuficiente. Disponible: ${producto.stock_actual}, ` +
            `en carrito: ${existente ? existente.cantidad : 0}, ` +
            `solicitado: ${cantidad}`
        );
        return;
      }

      // 5. Validar cantidad razonable (máximo 1000 unidades por transacción)
      if (cantidad > 1000) {
        toast.error("La cantidad máxima por transacción es 1000 unidades");
        return;
      }

      // ===== AGREGAR AL CARRITO =====

      if (existente) {
        existente.cantidad += cantidad;
      } else {
        this.carrito.push({
          producto_id: productoId,
          nombre,
          precio_unitario: precio,
          cantidad,
          stock_disponible: producto.stock_actual,
        });
      }

      this.actualizarCarrito();
      this.limpiarFormularioProducto();
      toast.success(`${cantidad} x ${nombre} agregado al carrito`);
    } catch (error) {
      handleError(error, "Error al agregar producto al carrito");
    }
  },

  actualizarCarrito() {
    const tbody = document.getElementById("carrito-items");
    if (this.carrito.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">Carrito vacío</td></tr>';
    } else {
      tbody.innerHTML = this.carrito
        .map(
          (item, index) => `
        <tr>
          <td>${item.nombre}</td>
          <td>${item.cantidad}</td>
          <td>${formatCurrency(item.precio_unitario)}</td>
          <td>${formatCurrency(item.cantidad * item.precio_unitario)}</td>
          <td><button class="btn btn-sm btn-danger btn-eliminar-carrito" data-index="${index}">&times;</button></td>
        </tr>
      `
        )
        .join("");
    }

    tbody.querySelectorAll(".btn-eliminar-carrito").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.eliminarDelCarrito(parseInt(btn.dataset.index))
      );
    });

    let subtotal = this.carrito.reduce(
      (sum, item) => sum + item.cantidad * item.precio_unitario,
      0
    );
    const itbis = subtotal * 0.18;
    const total = subtotal + itbis;
    this.actualizarTotales(subtotal, itbis, total);
  },

  actualizarTotales(subtotal, itbis, total) {
    document.getElementById("venta-subtotal").textContent =
      formatCurrency(subtotal);
    document.getElementById("venta-itbis").textContent = formatCurrency(itbis);
    document.getElementById("venta-total").textContent = formatCurrency(total);
  },

  eliminarDelCarrito(index) {
    this.carrito.splice(index, 1);
    this.actualizarCarrito();
    toast.info("Producto eliminado del carrito");
  },

  async procesarVenta() {
    try {
      // ===== VALIDACIONES PREVIAS =====

      // 1. Validar que el carrito no esté vacío
      if (this.carrito.length === 0) {
        toast.warning("El carrito está vacío");
        return;
      }

      // 2. Obtener datos de pago
      const metodoPago = document.getElementById("metodo-pago").value;
      const efectivoRecibidoInput =
        document.getElementById("efectivo-recibido").value;
      const efectivoRecibido =
        metodoPago === "Efectivo" ? parseFloat(efectivoRecibidoInput) || 0 : 0;

      // 3. Calcular totales
      let subtotal = this.carrito.reduce(
        (sum, item) => sum + item.cantidad * item.precio_unitario,
        0
      );
      const itbis = subtotal * 0.18;
      const total = subtotal + itbis;

      // 4. Validar método de pago
      const metodosValidos = ["Efectivo", "Tarjeta", "Transferencia"];
      if (!metodosValidos.includes(metodoPago)) {
        toast.error("Método de pago inválido");
        return;
      }

      // 5. Validar efectivo recibido si el método es Efectivo
      if (metodoPago === "Efectivo") {
        if (!Validator.isPositiveNumber(efectivoRecibido)) {
          toast.error("Ingrese el efectivo recibido");
          document.getElementById("efectivo-recibido").focus();
          return;
        }

        if (efectivoRecibido < total) {
          const faltante = total - efectivoRecibido;
          toast.error(
            `Efectivo insuficiente. Total: ${formatCurrency(total)}, ` +
              `Recibido: ${formatCurrency(efectivoRecibido)}, ` +
              `Faltante: ${formatCurrency(faltante)}`
          );
          document.getElementById("efectivo-recibido").focus();
          return;
        }
      }

      // 6. Validar sesión de usuario
      const user = authService.getCurrentUser();

      if (!user) {
        toast.error("Error de sesión. Por favor inicie sesión nuevamente.");
        return;
      }

      // 7. Verificar stock disponible para todos los productos
      for (const item of this.carrito) {
        const producto = await db.getProducto(item.producto_id);

        if (!producto) {
          toast.error(`Producto "${item.nombre}" no encontrado`);
          return;
        }

        if (item.cantidad > producto.stock_actual) {
          toast.error(
            `Stock insuficiente para "${item.nombre}". ` +
              `Disponible: ${producto.stock_actual}, Solicitado: ${item.cantidad}`
          );
          return;
        }
      }

      // ===== PROCESAR VENTA =====

      const ventaData = {
        caja_id: null, // Ya no se usa caja
        usuario_id: user.id,
        cliente_id: this.clienteSeleccionado?.id || 1, // Default a cliente 'Contado'
        items: this.carrito,
        metodo_pago: metodoPago,
        efectivo_recibido: efectivoRecibido,
      };

      const result = await db.crearVenta(ventaData);

      // Mostrar cambio si es efectivo
      if (metodoPago === "Efectivo") {
        const cambio = efectivoRecibido - total;
        if (cambio > 0) {
          toast.success(
            `Venta ${result.numero_factura} procesada. Cambio: ${formatCurrency(
              cambio
            )}`
          );
        } else {
          toast.success(`Venta ${result.numero_factura} procesada`);
        }
      } else {
        toast.success(`Venta ${result.numero_factura} procesada`);
      }

      // Preguntar si desea imprimir
      if (confirm("¿Desea imprimir la factura?")) {
        const venta = await db.getVenta(result.id);
        await printService.imprimirFactura(venta);
      }

      this.limpiarCarrito();
    } catch (error) {
      handleError(error, "Error al procesar la venta");
    }
  },

  limpiarCarrito() {
    this.carrito = [];
    this.clienteSeleccionado = null;
    this.actualizarCarrito();
    this.limpiarFormularioProducto();
    document.getElementById("metodo-pago").value = "Efectivo";
    document.getElementById("efectivo-recibido").value = "";
    document.getElementById("efectivo-recibido-div").style.display = "block";
  },

  limpiarFormularioProducto() {
    document.getElementById("producto-id").value = "";
    document.getElementById("producto-nombre").value = "";
    document.getElementById("producto-precio").value = "";
    document.getElementById("producto-cantidad").value = "1";
    document.getElementById("producto-search").value = "";
    document.getElementById("productos-resultados").innerHTML = "";
    document.getElementById("producto-search").focus();
  },
};

export default VentasView;
