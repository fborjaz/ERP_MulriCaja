/**
 * Utilidad de Validación Centralizada
 * @module renderer/utils/validator
 */

export class Validator {
  /**
   * Valida formato de RNC dominicano
   * @param {string} rnc - RNC a validar
   * @returns {boolean} true si es válido
   */
  static isValidRNC(rnc) {
    if (!rnc) return false;

    // Remover guiones y espacios
    const cleaned = rnc.replace(/[-\s]/g, "");

    // RNC debe tener 9 u 11 dígitos
    if (!/^\d{9}$|^\d{11}$/.test(cleaned)) {
      return false;
    }

    return true;
  }

  /**
   * Valida formato de cédula dominicana
   * @param {string} cedula - Cédula a validar
   * @returns {boolean} true si es válida
   */
  static isValidCedula(cedula) {
    if (!cedula) return false;

    // Remover guiones y espacios
    const cleaned = cedula.replace(/[-\s]/g, "");

    // Cédula debe tener 11 dígitos
    if (!/^\d{11}$/.test(cleaned)) {
      return false;
    }

    return true;
  }

  /**
   * Valida formato de email
   * @param {string} email - Email a validar
   * @returns {boolean} true si es válido
   */
  static isValidEmail(email) {
    if (!email) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida formato de teléfono dominicano
   * @param {string} telefono - Teléfono a validar
   * @returns {boolean} true si es válido
   */
  static isValidTelefono(telefono) {
    if (!telefono) return false;

    // Remover caracteres no numéricos
    const cleaned = telefono.replace(/\D/g, "");

    // Debe tener 10 dígitos (809/829/849 + 7 dígitos)
    if (!/^\d{10}$/.test(cleaned)) {
      return false;
    }

    // Validar código de área dominicano
    const areaCode = cleaned.substring(0, 3);
    const validAreaCodes = ["809", "829", "849"];

    return validAreaCodes.includes(areaCode);
  }

  /**
   * Valida que un número sea positivo
   * @param {number|string} value - Valor a validar
   * @returns {boolean} true si es positivo
   */
  static isPositiveNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }

  /**
   * Valida que un número sea no negativo (>= 0)
   * @param {number|string} value - Valor a validar
   * @returns {boolean} true si es no negativo
   */
  static isNonNegativeNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
  }

  /**
   * Valida formato de fecha (YYYY-MM-DD)
   * @param {string} fecha - Fecha a validar
   * @returns {boolean} true si es válida
   */
  static isValidDate(fecha) {
    if (!fecha) return false;

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fecha)) {
      return false;
    }

    const date = new Date(fecha);
    return date instanceof Date && !isNaN(date);
  }

  /**
   * Valida que una fecha no sea futura
   * @param {string} fecha - Fecha a validar
   * @returns {boolean} true si no es futura
   */
  static isNotFutureDate(fecha) {
    if (!this.isValidDate(fecha)) return false;

    const date = new Date(fecha);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return date <= today;
  }

  /**
   * Valida rango de fechas
   * @param {string} fechaInicio - Fecha de inicio
   * @param {string} fechaFin - Fecha de fin
   * @returns {boolean} true si el rango es válido
   */
  static isValidDateRange(fechaInicio, fechaFin) {
    if (!this.isValidDate(fechaInicio) || !this.isValidDate(fechaFin)) {
      return false;
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    return inicio <= fin;
  }

  /**
   * Sanitiza entrada para prevenir SQL injection
   * @param {string} input - Entrada a sanitizar
   * @returns {string} Entrada sanitizada
   */
  static sanitizeInput(input) {
    if (typeof input !== "string") return input;

    // Remover caracteres peligrosos
    return input
      .replace(/['"`;\\]/g, "") // Comillas y punto y coma
      .trim();
  }

  /**
   * Valida longitud de string
   * @param {string} str - String a validar
   * @param {number} min - Longitud mínima
   * @param {number} max - Longitud máxima
   * @returns {boolean} true si está en el rango
   */
  static isValidLength(str, min, max) {
    if (typeof str !== "string") return false;
    const length = str.trim().length;
    return length >= min && length <= max;
  }

  /**
   * Valida que un string no esté vacío
   * @param {string} str - String a validar
   * @returns {boolean} true si no está vacío
   */
  static isNotEmpty(str) {
    return typeof str === "string" && str.trim().length > 0;
  }

  /**
   * Valida código de barras (EAN-13 o UPC)
   * @param {string} barcode - Código de barras
   * @returns {boolean} true si es válido
   */
  static isValidBarcode(barcode) {
    if (!barcode) return false;

    const cleaned = barcode.replace(/\D/g, "");

    // EAN-13 (13 dígitos) o UPC (12 dígitos)
    if (!/^\d{12}$|^\d{13}$/.test(cleaned)) {
      return false;
    }

    return true;
  }

  /**
   * Valida que un precio de venta sea mayor que el costo
   * @param {number} precioVenta - Precio de venta
   * @param {number} precioCosto - Precio de costo
   * @returns {boolean} true si es válido
   */
  static isValidPricing(precioVenta, precioCosto) {
    const venta = parseFloat(precioVenta);
    const costo = parseFloat(precioCosto);

    if (isNaN(venta) || isNaN(costo)) return false;
    if (venta <= 0 || costo < 0) return false;

    return venta > costo;
  }

  /**
   * Valida stock (actual, mínimo, máximo)
   * @param {number} actual - Stock actual
   * @param {number} minimo - Stock mínimo
   * @param {number} maximo - Stock máximo
   * @returns {boolean} true si es válido
   */
  static isValidStock(actual, minimo, maximo) {
    const act = parseFloat(actual);
    const min = parseFloat(minimo);
    const max = parseFloat(maximo);

    if (isNaN(act) || isNaN(min) || isNaN(max)) return false;
    if (act < 0 || min < 0 || max < 0) return false;

    return min <= max;
  }

  /**
   * Formatea RNC con guiones
   * @param {string} rnc - RNC sin formato
   * @returns {string} RNC formateado
   */
  static formatRNC(rnc) {
    if (!rnc) return "";

    const cleaned = rnc.replace(/\D/g, "");

    if (cleaned.length === 9) {
      // Formato: XXX-XXXXX-X
      return `${cleaned.substring(0, 3)}-${cleaned.substring(
        3,
        8
      )}-${cleaned.substring(8)}`;
    } else if (cleaned.length === 11) {
      // Formato: XXX-XXXXXXX-X
      return `${cleaned.substring(0, 3)}-${cleaned.substring(
        3,
        10
      )}-${cleaned.substring(10)}`;
    }

    return cleaned;
  }

  /**
   * Formatea cédula con guiones
   * @param {string} cedula - Cédula sin formato
   * @returns {string} Cédula formateada
   */
  static formatCedula(cedula) {
    if (!cedula) return "";

    const cleaned = cedula.replace(/\D/g, "");

    if (cleaned.length === 11) {
      // Formato: XXX-XXXXXXX-X
      return `${cleaned.substring(0, 3)}-${cleaned.substring(
        3,
        10
      )}-${cleaned.substring(10)}`;
    }

    return cleaned;
  }

  /**
   * Formatea teléfono
   * @param {string} telefono - Teléfono sin formato
   * @returns {string} Teléfono formateado
   */
  static formatTelefono(telefono) {
    if (!telefono) return "";

    const cleaned = telefono.replace(/\D/g, "");

    if (cleaned.length === 10) {
      // Formato: (XXX) XXX-XXXX
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(
        3,
        6
      )}-${cleaned.substring(6)}`;
    }

    return cleaned;
  }
}

// Exportar también como default
export default Validator;
