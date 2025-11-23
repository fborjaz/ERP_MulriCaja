/**
 * Integración Completa - Inicialización de Módulos
 * @module renderer/core/integration
 */

import { toast } from "../components/notifications/toast.js";

/**
 * Verifica dependencias externas
 */
export async function verificarDependencias() {
  const dependencias = {
    jspdf: false,
    xlsx: false,
    qrcode: false,
  };

  // Verificar jsPDF
  try {
    if (typeof window.jspdf !== "undefined") {
      dependencias.jspdf = true;
    }
  } catch (e) {
    console.warn("jsPDF no disponible, usando método alternativo");
  }

  // Verificar XLSX
  try {
    if (typeof window.XLSX !== "undefined") {
      dependencias.xlsx = true;
    }
  } catch (e) {
    console.warn("xlsx no disponible, usando método alternativo (CSV)");
  }

  // Verificar QRCode
  try {
    if (typeof window.QRCode !== "undefined") {
      dependencias.qrcode = true;
    }
  } catch (e) {
    console.warn("qrcode no disponible");
  }

  return dependencias;
}

/**
 * Inicializa módulos del sistema
 */
export function inicializarModulos() {
  if (typeof window.api === "undefined") {
    console.error("API no está disponible");
    toast.error("Error: API no disponible");
    return;
  }

  const modulos = [
    "SistemaCotizaciones",
    "SistemaApartados",
    "SistemaDespachos",
    "SistemaNotasCredito",
    "ContabilidadRD",
    "FacturacionElectronica",
    "FarmaciaPlugin",
    "FerreteriaPlugin",
    "GraficosService",
  ];

  let modulosInicializados = 0;

  modulos.forEach((modulo) => {
    if (typeof window[modulo] !== "undefined") {
      console.log(`✅ ${modulo} cargado`);
      modulosInicializados++;
    } else {
      console.log(`⚠️ ${modulo} no disponible`);
    }
  });

  console.log(
    `📦 Módulos inicializados: ${modulosInicializados}/${modulos.length}`
  );

  return modulosInicializados;
}

/**
 * Inicialización completa del sistema
 */
export async function initIntegration() {
  console.log("🔧 Verificando dependencias...");
  const deps = await verificarDependencias();

  console.log("📦 Inicializando módulos...");
  const modulosCount = inicializarModulos();

  console.log("✅ Integración completada");

  return {
    dependencias: deps,
    modulosInicializados: modulosCount,
  };
}

// Exportar también como default
export default {
  verificarDependencias,
  inicializarModulos,
  initIntegration,
};
