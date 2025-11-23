/**
 * Servicio de Logging Centralizado
 * @module renderer/services/logger.service
 */

import { api } from "../core/api.js";

/**
 * Niveles de log
 */
export const LogLevel = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  AUDIT: "AUDIT",
};

/**
 * Servicio de logging con soporte para múltiples niveles y persistencia
 */
export class LoggerService {
  constructor() {
    this.enabled = true;
    this.minLevel = LogLevel.INFO; // Nivel mínimo a registrar
    this.maxLogsInMemory = 1000; // Máximo de logs en memoria
    this.logsInMemory = [];
  }

  /**
   * Registra un mensaje de debug
   * @param {string} message - Mensaje
   * @param {Object} context - Contexto adicional
   */
  debug(message, context = {}) {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Registra un mensaje informativo
   * @param {string} message - Mensaje
   * @param {Object} context - Contexto adicional
   */
  info(message, context = {}) {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Registra una advertencia
   * @param {string} message - Mensaje
   * @param {Object} context - Contexto adicional
   */
  warn(message, context = {}) {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Registra un error
   * @param {string} message - Mensaje
   * @param {Object} context - Contexto adicional (incluir error si existe)
   */
  error(message, context = {}) {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Registra un evento de auditoría
   * @param {string} message - Mensaje
   * @param {Object} context - Contexto (usuario, acción, etc.)
   */
  audit(message, context = {}) {
    this.log(LogLevel.AUDIT, message, context);
  }

  /**
   * Método principal de logging
   * @param {string} level - Nivel de log
   * @param {string} message - Mensaje
   * @param {Object} context - Contexto adicional
   */
  log(level, message, context = {}) {
    if (!this.enabled) return;

    // Verificar si el nivel es suficiente
    if (!this.shouldLog(level)) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
    };

    // Log en consola con formato
    this.logToConsole(logEntry);

    // Guardar en memoria
    this.saveToMemory(logEntry);

    // Para errores y auditoría, también guardar en archivo
    if (level === LogLevel.ERROR || level === LogLevel.AUDIT) {
      this.saveToFile(logEntry);
    }
  }

  /**
   * Determina si un nivel debe ser registrado
   * @param {string} level - Nivel a verificar
   * @returns {boolean} true si debe registrarse
   */
  shouldLog(level) {
    const levels = [
      LogLevel.DEBUG,
      LogLevel.INFO,
      LogLevel.WARN,
      LogLevel.ERROR,
      LogLevel.AUDIT,
    ];

    const currentIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);

    // AUDIT siempre se registra
    if (level === LogLevel.AUDIT) return true;

    return levelIndex >= currentIndex;
  }

  /**
   * Sanitiza el contexto para evitar datos sensibles en logs
   * @param {Object} context - Contexto original
   * @returns {Object} Contexto sanitizado
   */
  sanitizeContext(context) {
    const sanitized = { ...context };

    // Remover campos sensibles
    const sensitiveFields = [
      "password",
      "token",
      "apiKey",
      "secret",
      "creditCard",
    ];

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***";
      }
    });

    // Si hay un error, extraer información útil
    if (sanitized.error instanceof Error) {
      sanitized.error = {
        message: sanitized.error.message,
        stack: sanitized.error.stack,
        name: sanitized.error.name,
      };
    }

    return sanitized;
  }

  /**
   * Registra en consola con formato y colores
   * @param {Object} logEntry - Entrada de log
   */
  logToConsole(logEntry) {
    const { timestamp, level, message, context } = logEntry;

    // Formato: [TIMESTAMP] [LEVEL] Message { context }
    const prefix = `[${timestamp}] [${level}]`;
    const contextStr =
      Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : "";

    // Usar diferentes métodos de console según el nivel
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, contextStr);
        break;
      case LogLevel.INFO:
      case LogLevel.AUDIT:
        console.info(prefix, message, contextStr);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, contextStr);
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, contextStr);
        break;
      default:
        console.log(prefix, message, contextStr);
    }
  }

  /**
   * Guarda log en memoria (para consulta rápida)
   * @param {Object} logEntry - Entrada de log
   */
  saveToMemory(logEntry) {
    this.logsInMemory.push(logEntry);

    // Mantener solo los últimos N logs
    if (this.logsInMemory.length > this.maxLogsInMemory) {
      this.logsInMemory.shift();
    }
  }

  /**
   * Guarda log en archivo (vía IPC al proceso principal)
   * @param {Object} logEntry - Entrada de log
   */
  async saveToFile(logEntry) {
    try {
      // TODO: Implementar handler IPC para escritura de logs
      // await api.writeLog(logEntry);

      // Por ahora, solo guardamos en localStorage como fallback
      const logs = this.getStoredLogs();
      logs.push(logEntry);

      // Mantener solo los últimos 500 logs en localStorage
      if (logs.length > 500) {
        logs.shift();
      }

      localStorage.setItem("app_logs", JSON.stringify(logs));
    } catch (error) {
      console.error("Error guardando log en archivo:", error);
    }
  }

  /**
   * Obtiene logs almacenados en localStorage
   * @returns {Array} Array de logs
   */
  getStoredLogs() {
    try {
      const stored = localStorage.getItem("app_logs");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Obtiene logs en memoria
   * @param {string} level - Filtrar por nivel (opcional)
   * @returns {Array} Array de logs
   */
  getLogsInMemory(level = null) {
    if (!level) return this.logsInMemory;
    return this.logsInMemory.filter((log) => log.level === level);
  }

  /**
   * Limpia logs en memoria
   */
  clearMemoryLogs() {
    this.logsInMemory = [];
  }

  /**
   * Limpia logs almacenados
   */
  clearStoredLogs() {
    localStorage.removeItem("app_logs");
  }

  /**
   * Configura el nivel mínimo de logging
   * @param {string} level - Nivel mínimo
   */
  setMinLevel(level) {
    if (Object.values(LogLevel).includes(level)) {
      this.minLevel = level;
    }
  }

  /**
   * Habilita o deshabilita el logging
   * @param {boolean} enabled - true para habilitar
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Exporta logs a un archivo de texto
   * @returns {string} Logs en formato texto
   */
  exportLogsAsText() {
    const allLogs = [...this.getStoredLogs(), ...this.logsInMemory];

    return allLogs
      .map((log) => {
        const contextStr =
          Object.keys(log.context).length > 0
            ? `\n  Context: ${JSON.stringify(log.context, null, 2)}`
            : "";
        return `[${log.timestamp}] [${log.level}] ${log.message}${contextStr}`;
      })
      .join("\n\n");
  }
}

// Crear y exportar instancia singleton
export const logger = new LoggerService();

// Exportar también como default
export default logger;
