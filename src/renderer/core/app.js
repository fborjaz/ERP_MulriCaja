/**
 * Aplicación Principal - Inicialización
 * @module renderer/core/app
 */

import { router } from "./router.js";
import { toast } from "../components/notifications/toast.js";

export const App = {
  /**
   * Inicializa la aplicación
   */
  async init() {
    console.log("🚀 Iniciando ERP Multicajas RD...");

    try {
      // Verificar autenticación
      const currentUser = localStorage.getItem("currentUser");
      if (!currentUser) {
        console.log("❌ Usuario no autenticado");
        return;
      }

      // Inicializar router
      await router.init();

      // Cargar información del usuario
      this.loadUserInfo();

      // Setup event listeners globales
      this.setupGlobalListeners();

      console.log("✅ Aplicación inicializada correctamente");
    } catch (error) {
      console.error("❌ Error inicializando aplicación:", error);
      toast.error("Error inicializando aplicación");
    }
  },

  /**
   * Carga información del usuario en la UI
   */
  loadUserInfo() {
    const userStr = localStorage.getItem("currentUser");

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const userNameEl = document.getElementById("user-name");
        if (userNameEl) {
          // Usar nombre o username (estructura de hostinger)
          const displayName = user.nombre || user.username || "Usuario";
          userNameEl.textContent = displayName;
        }
        // Ocultar el elemento de caja ya que ya no se usa
        const cajaNameEl = document.getElementById("caja-name");
        if (cajaNameEl) {
          cajaNameEl.style.display = "none";
        }
      } catch (error) {
        console.error("Error parseando usuario:", error);
      }
    }
  },

  /**
   * Configura event listeners globales
   */
  setupGlobalListeners() {
    // Logout button
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        if (confirm("¿Está seguro de cerrar sesión?")) {
          localStorage.clear();
          location.reload();
        }
      });
    }

    // Toggle sidebar
    this.initSidebarToggle();

    // Atajos de teclado
    document.addEventListener("keydown", (e) => {
      // F1: Dashboard
      if (e.key === "F1") {
        e.preventDefault();
        router.navigate("dashboard");
      }
      // F2: Ventas
      if (e.key === "F2") {
        e.preventDefault();
        router.navigate("ventas");
      }
      // F3: Productos
      if (e.key === "F3") {
        e.preventDefault();
        router.navigate("productos");
      }
      // Ctrl+B o Cmd+B: Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        this.toggleSidebar();
      }
    });
  },

  /**
   * Inicializa el toggle del sidebar
   */
  initSidebarToggle() {
    const sidebar = document.getElementById("sidebar");
    const toggleBtn = document.getElementById("btn-toggle-sidebar");

    if (!sidebar) return;

    // Cargar estado guardado
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState === "true") {
      sidebar.classList.add("collapsed");
    }

    // Event listener para el botón toggle en el sidebar
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.toggleSidebar();
      });
    }
  },

  /**
   * Alterna el estado del sidebar (colapsado/expandido)
   */
  toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    const isCollapsed = sidebar.classList.contains("collapsed");

    if (isCollapsed) {
      sidebar.classList.remove("collapsed");
      localStorage.setItem("sidebarCollapsed", "false");
    } else {
      sidebar.classList.add("collapsed");
      localStorage.setItem("sidebarCollapsed", "true");
    }
  },
};

// Exportar también como default
export default App;
