/**
 * Sistema de Notificaciones Toast
 * @module renderer/components/notifications/toast
 */

export class ToastNotification {
  constructor() {
    this.container = null;
    this.init();
  }

  /**
   * Inicializa el contenedor de notificaciones
   */
  init() {
    if (!document.getElementById("toast-container")) {
      const container = document.createElement("div");
      container.id = "toast-container";
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;
      document.body.appendChild(container);
      this.container = container;
    } else {
      this.container = document.getElementById("toast-container");
    }

    // Agregar estilos CSS si no existen
    if (!document.getElementById("toast-styles")) {
      const style = document.createElement("style");
      style.id = "toast-styles";
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Muestra una notificación
   * @param {string} message - Mensaje a mostrar
   * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
   * @param {number} duration - Duración en ms (default: 3000)
   */
  show(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Estilos base
    const baseStyles = `
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease-out;
      min-width: 250px;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    // Colores según tipo
    const colors = {
      success: "#4caf50",
      error: "#f44336",
      warning: "#ff9800",
      info: "#2196f3",
    };

    // Iconos según tipo
    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    toast.style.cssText =
      baseStyles + `background-color: ${colors[type] || colors.info};`;
    toast.innerHTML = `
      <span style="font-size: 18px; font-weight: bold;">${
        icons[type] || icons.info
      }</span>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    // Auto-remover después de la duración
    setTimeout(() => {
      toast.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, duration);
  }

  /**
   * Muestra notificación de éxito
   * @param {string} message - Mensaje
   */
  success(message) {
    this.show(message, "success");
  }

  /**
   * Muestra notificación de error
   * @param {string} message - Mensaje
   */
  error(message) {
    this.show(message, "error");
  }

  /**
   * Muestra notificación de advertencia
   * @param {string} message - Mensaje
   */
  warning(message) {
    this.show(message, "warning");
  }

  /**
   * Muestra notificación informativa
   * @param {string} message - Mensaje
   */
  info(message) {
    this.show(message, "info");
  }
}

// Crear instancia global
export const toast = new ToastNotification();

// Exportar también como default
export default toast;
