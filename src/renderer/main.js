/**
 * Entry Point Principal
 * @module renderer/main
 */

// Estilos
import "../styles/main.css";

// Core
import { api } from "./core/api.js";
import { router } from "./core/router.js";
import { App } from "./core/app.js";
import "./core/integration.js";

// Servicios
import "./services/database.service.js";
import { authService } from "./services/auth.service.js";
import "./services/ai.service.js";
import "./services/export.service.js";
import "./services/import.service.js";
import "./services/print.service.js";

// Componentes
import "./components/modals/modal.base.js";
import "./components/notifications/toast.js";
import "./components/tables/data-table.js";
import "./components/forms/form-builder.js";
import "./components/charts/graficos.service.js";

// Módulos de Negocio (Servicios)
import "./modules/facturacion/facturacion-electronica.service.js";
import "./modules/facturacion/facturas-modernas.service.js";
import "./modules/reportes/dgii/dgii.service.js";
import "./modules/rrhh/nomina.service.js";
import "./modules/rrhh/rrhh.service.js";
import "./modules/apartados/apartados.service.js";
import "./modules/cotizaciones/cotizaciones.service.js";
import "./modules/despachos/despachos.service.js";
import "./modules/notas-credito/notas-credito.service.js";
import "./modules/contabilidad/contabilidad.service.js";
import "./modules/ventas/ventas.service.js";

// Plugins
import "./plugins/farmacia/farmacia.plugin.js";
import "./plugins/ferreteria/ferreteria.plugin.js";

// Vistas
import { DashboardView } from "./modules/dashboard/dashboard.view.js";
import { VentasView } from "./modules/ventas/ventas.view.js";
import { ProductosView } from "./modules/productos/productos.view.js";
import { ClientesView } from "./modules/clientes/clientes.view.js";
import { ComprasView } from "./modules/compras/compras.view.js";
import { InventarioView } from "./modules/inventario/inventario.view.js";
import { ReportesView } from "./modules/reportes/reportes.view.js";
import { DespachosView } from "./modules/despachos/despachos.view.js";
import { ApartadosView } from "./modules/apartados/apartados.view.js";
import { CotizacionesView } from "./modules/cotizaciones/cotizaciones.view.js";
import { ContabilidadView } from "./modules/contabilidad/contabilidad.view.js";
import { NotasCreditoView } from "./modules/notas-credito/notas-credito.view.js";
import { ConfiguracionView } from "./modules/configuracion/configuracion.view.js";

// Registrar Rutas
router.register("dashboard", DashboardView);
router.register("ventas", VentasView);
router.register("productos", ProductosView);
router.register("clientes", ClientesView);
router.register("compras", ComprasView);
router.register("inventario", InventarioView);
router.register("reportes", ReportesView);
router.register("despacho", DespachosView); // Nota: 'despacho' singular en HTML
router.register("apartados", ApartadosView);
router.register("cotizaciones", CotizacionesView);
router.register("contabilidad", ContabilidadView);
router.register("notas-credito", NotasCreditoView);
router.register("configuracion", ConfiguracionView);

// --- Lógica de Inicialización de UI ---

function showScreen(screenId) {
  const loadingScreen = document.getElementById("loading-screen");
  const loginScreen = document.getElementById("login-screen");
  const mainApp = document.getElementById("main-app");

  // Ocultar todas las pantallas principales
  loadingScreen?.classList.add("hidden");
  loginScreen?.classList.add("hidden");
  mainApp?.classList.add("hidden");

  // Mostrar la pantalla solicitada
  const screenToShow = document.getElementById(screenId);
  screenToShow?.classList.remove("hidden");
}

async function initialize() {
  const isAuthenticated = authService.isAuthenticated();

  if (isAuthenticated) {
    showScreen("main-app");
    // Si está autenticado, inicializar la app principal
    await App.init();
  } else {
    showScreen("login-screen");
    // Inicializa la lógica de la pantalla de login
    const { LoginView } = await import('./modules/login/login.view.js');
    LoginView.init();
  }
}

// --- Arrancar la aplicación ---
initialize();
