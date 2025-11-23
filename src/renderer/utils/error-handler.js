/**
 * Error Handler Global
 * @module renderer/utils/error-handler
 */

import { logger } from "../services/logger.service.js";
import { toast } from "../components/notifications/toast.js";

/**
 * Tipos de errores
 */
export const ErrorType = {
  DATABASE: "DATABASE",
  NETWORK: "NETWORK",
  VALIDATION: "VALIDATION",
  AUTHENTICATION: "AUTHENTICATION",
  AUTHORIZATION: "AUTHORIZATION",
  NOT_FOUND: "NOT_FOUND",
  BUSINESS_LOGIC: "BUSINESS_LOGIC",
  UNKNOWN: "UNKNOWN",
};

/**
 * Clase para errores de aplicación personalizados
 */
export class AppError extends Error {
  constructor(message, type = ErrorType.UNKNOWN, context = {}) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Maneja errores de forma centralizada
 * @param {Error} error - Error a manejar
 * @param {string} userMessage - Mensaje para mostrar al usuario (opcional)
 * @param {Object} context - Contexto adicional
 */
export function handleError(error, userMessage = null, context = {}) {
  // Clasificar el error
  const errorType = classifyError(error);

  // Crear mensaje para el usuario
  const displayMessage =
    userMessage || getUserFriendlyMessage(error, errorType);

  // Log del error
  logger.error(error.message || "Error desconocido", {
    error,
    type: errorType,
    context,
    userMessage: displayMessage,
  });

  // Mostrar notificación al usuario
  toast.error(displayMessage);

  // En desarrollo, también mostrar en consola
  if (process.env.NODE_ENV === "development") {
    console.error("Error detallado:", error);
  }

  return {
    handled: true,
    type: errorType,
    message: displayMessage,
  };
}

/**
 * Clasifica un error según su tipo
 * @param {Error} error - Error a clasificar
 * @returns {string} Tipo de error
 */
function classifyError(error) {
  // Si es un AppError, usar su tipo
  if (error instanceof AppError) {
    return error.type;
  }

  const message = error.message?.toLowerCase() || "";

  // Errores de base de datos
  if (
    message.includes("database") ||
    message.includes("sql") ||
    message.includes("sqlite") ||
    message.includes("query")
  ) {
    return ErrorType.DATABASE;
  }

  // Errores de red
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    error.name === "NetworkError"
  ) {
    return ErrorType.NETWORK;
  }

  // Errores de validación
  if (
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("must be") ||
    message.includes("validación")
  ) {
    return ErrorType.VALIDATION;
  }

  // Errores de autenticación
  if (
    message.includes("password") ||
    message.includes("contraseña") ||
    message.includes("login") ||
    message.includes("authentication") ||
    message.includes("autenticación")
  ) {
    return ErrorType.AUTHENTICATION;
  }

  // Errores de autorización
  if (
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("permission") ||
    message.includes("permiso")
  ) {
    return ErrorType.AUTHORIZATION;
  }

  // Errores de no encontrado
  if (
    message.includes("not found") ||
    message.includes("no encontrado") ||
    message.includes("does not exist")
  ) {
    return ErrorType.NOT_FOUND;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Genera un mensaje amigable para el usuario según el tipo de error
 * @param {Error} error - Error original
 * @param {string} errorType - Tipo de error
 * @returns {string} Mensaje para el usuario
 */
function getUserFriendlyMessage(error, errorType) {
  // Si el error ya tiene un mensaje claro, usarlo
  const originalMessage = error.message || "";

  // Mensajes que son suficientemente claros para el usuario
  const clearMessages = [
    "usuario",
    "contraseña",
    "bloqueado",
    "caja",
    "producto",
    "cliente",
    "stock",
    "precio",
  ];

  if (
    clearMessages.some((word) => originalMessage.toLowerCase().includes(word))
  ) {
    return originalMessage;
  }

  // Mensajes genéricos según el tipo
  switch (errorType) {
    case ErrorType.DATABASE:
      return "Error al acceder a la base de datos. Por favor, intente nuevamente.";

    case ErrorType.NETWORK:
      return "Error de conexión. Verifique su conexión a internet.";

    case ErrorType.VALIDATION:
      return originalMessage || "Los datos ingresados no son válidos.";

    case ErrorType.AUTHENTICATION:
      return "Error de autenticación. Verifique sus credenciales.";

    case ErrorType.AUTHORIZATION:
      return "No tiene permisos para realizar esta acción.";

    case ErrorType.NOT_FOUND:
      return "El recurso solicitado no fue encontrado.";

    case ErrorType.BUSINESS_LOGIC:
      return originalMessage || "No se pudo completar la operación.";

    default:
      return "Ocurrió un error inesperado. Por favor, intente nuevamente.";
  }
}

/**
 * Wrapper para funciones async que maneja errores automáticamente
 * @param {Function} fn - Función async a ejecutar
 * @param {string} userMessage - Mensaje para el usuario en caso de error
 * @returns {Function} Función wrapped
 */
export function withErrorHandling(fn, userMessage = null) {
  return async function (...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      handleError(error, userMessage);
      throw error; // Re-lanzar para que el caller pueda manejarlo si es necesario
    }
  };
}

/**
 * Maneja errores de validación de formularios
 * @param {Object} errors - Objeto con errores de validación
 * @param {string} formName - Nombre del formulario
 */
export function handleValidationErrors(errors, formName = "formulario") {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join("\n");

  logger.warn(`Errores de validación en ${formName}`, { errors });

  toast.error(`Error en ${formName}:\n${errorMessages}`);
}

/**
 * Handler global para errores no capturados
 */
export function setupGlobalErrorHandlers() {
  // Errores no capturados
  window.addEventListener("error", (event) => {
    handleError(event.error, "Error inesperado en la aplicación");
  });

  // Promesas rechazadas no manejadas
  window.addEventListener("unhandledrejection", (event) => {
    handleError(event.reason, "Error inesperado al procesar una operación");
  });

  logger.info("Handlers globales de error configurados");
}

// Exportar también como default
export default {
  handleError,
  withErrorHandling,
  handleValidationErrors,
  setupGlobalErrorHandlers,
  AppError,
  ErrorType,
};
