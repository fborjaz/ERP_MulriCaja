/**
 * Utilidades y funciones helper generales
 * @module renderer/utils/helpers
 */

/**
 * Formatea un número como moneda dominicana
 * @param {number} amount - Cantidad a formatear
 * @returns {string} Cantidad formateada
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
  }).format(amount);
}

/**
 * Formatea una fecha
 * @param {Date|string} date - Fecha a formatear
 * @param {string} format - Formato deseado ('short', 'long', 'time')
 * @returns {string} Fecha formateada
 */
export function formatDate(date, format = "short") {
  const d = typeof date === "string" ? new Date(date) : date;

  switch (format) {
    case "short":
      return d.toLocaleDateString("es-DO");
    case "long":
      return d.toLocaleDateString("es-DO", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    case "time":
      return d.toLocaleTimeString("es-DO");
    case "datetime":
      return `${d.toLocaleDateString("es-DO")} ${d.toLocaleTimeString(
        "es-DO"
      )}`;
    default:
      return d.toLocaleDateString("es-DO");
  }
}

/**
 * Genera un código único
 * @param {string} prefix - Prefijo del código
 * @returns {string} Código generado
 */
export function generateCode(prefix = "CODE") {
  return `${prefix}-${Date.now()}`;
}

/**
 * Debounce function
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Muestra una notificación toast
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('success', 'error', 'warning', 'info')
 */
export function showToast(message, type = "info") {
  // Importar toast dinámicamente para evitar dependencias circulares si fuera necesario
  // Por ahora usamos console.log como fallback o la implementación global si existe
  if (window.toast) {
    window.toast[type](message);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

/**
 * Confirma una acción con el usuario
 * @param {string} message - Mensaje de confirmación
 * @returns {boolean} true si el usuario confirma
 */
export function confirmAction(message) {
  return confirm(message);
}

/**
 * Sanitiza input HTML para prevenir XSS
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
export function sanitizeHTML(str) {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Calcula el ITBIS (18%)
 * @param {number} amount - Monto base
 * @returns {number} ITBIS calculado
 */
export function calculateITBIS(amount) {
  return amount * 0.18;
}

/**
 * Calcula el total con ITBIS
 * @param {number} subtotal - Subtotal
 * @returns {object} Objeto con subtotal, itbis y total
 */
export function calculateTotal(subtotal) {
  const itbis = calculateITBIS(subtotal);
  const total = subtotal + itbis;
  return { subtotal, itbis, total };
}

export default {
  formatCurrency,
  formatDate,
  generateCode,
  debounce,
  showToast,
  confirmAction,
  sanitizeHTML,
  calculateITBIS,
  calculateTotal,
};
