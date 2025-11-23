/**
 * Router - Sistema de navegación entre vistas
 * @module renderer/core/router
 */

export class Router {
  constructor(viewContainerId = 'view-container') {
    this.viewContainer = document.getElementById(viewContainerId);
    if (!this.viewContainer) {
      throw new Error(`El contenedor de vistas #${viewContainerId} no fue encontrado.`);
    }
    this.currentView = null;
    this.routes = new Map();
  }

  /**
   * Registra una ruta
   * @param {string} path - Ruta (ej: 'dashboard', 'ventas')
   * @param {Object} view - Objeto de la vista con métodos render() e init()
   */
  register(path, view) {
    if (!view || typeof view.render !== 'function' || typeof view.init !== 'function') {
      console.warn(`Intento de registrar una vista inválida para la ruta: '${path}'. La vista debe tener los métodos 'render' e 'init'.`);
      return;
    }
    this.routes.set(path, view);
  }

  /**
   * Navega a una ruta, renderizando el HTML y luego inicializando el JS
   * @param {string} path - Ruta destino
   */
  async navigate(path) {
    const view = this.routes.get(path);

    if (!view) {
      console.error(`Ruta no encontrada: ${path}`);
      return;
    }

    try {
      // 1. Limpiar vista anterior si tiene un método de limpieza
      if (this.currentView && typeof this.currentView.cleanup === 'function') {
        this.currentView.cleanup();
      }

      // 2. Renderizar el HTML de la nueva vista
      this.viewContainer.innerHTML = view.render();
      
      // 3. Inicializar el JavaScript de la nueva vista (ahora que el DOM existe)
      await view.init();

      this.currentView = view;

      // 4. Actualizar estado de la UI (navegación y título)
      this.updateActiveNav(path);
      this.updatePageTitle(path);

    } catch (error) {
      console.error(`Error navegando a ${path}:`, error);
      this.viewContainer.innerHTML = `<h2>Error al cargar la vista '${path}'</h2><p>${error.message}</p>`;
      // Importar toast dinámicamente para mostrar notificación
      const { toast } = await import("../components/notifications/toast.js");
      toast.error(`Error cargando la vista: ${path}`);
    }
  }

  /**
   * Actualiza el elemento de navegación activo en el sidebar
   * @param {string} path - Ruta actual
   */
  updateActiveNav(path) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });

    const activeItem = document.querySelector(`[data-view="${path}"]`);
    if (activeItem) {
      activeItem.classList.add("active");
    }
  }

  /**
   * Actualiza el título principal de la página
   * @param {string} path - Ruta actual
   */
  updatePageTitle(path) {
    const titles = {
      dashboard: "Dashboard",
      ventas: "Punto de Venta",
      productos: "Productos",
      clientes: "Clientes",
      inventario: "Inventario",
      cotizaciones: "Cotizaciones",
      apartados: "Apartados",
      despachos: "Despachos",
      "notas-credito": "Notas de Crédito",
      contabilidad: "Contabilidad",
      compras: "Compras",
      reportes: "Reportes",
      configuracion: "Configuración",
    };

    const title = titles[path] || "ERP Multicajas RD";
    const titleElement = document.getElementById("page-title");
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * Inicializa el router y la navegación
   */
  init() {
    // Escucha los clics en los items de navegación
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const view = item.getAttribute("data-view");
        if (view) {
          this.navigate(view);
        }
      });
    });

    // Cargar la vista inicial (dashboard)
    this.navigate("dashboard");
  }
}

// Crear y exportar instancia singleton del router
export const router = new Router();
export default router;