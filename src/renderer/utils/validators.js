/**
 * Validaciones específicas para República Dominicana
 * @module renderer/utils/validators
 */

/**
 * Valida una cédula dominicana
 * @param {string} cedula - Cédula a validar
 * @returns {boolean} true si es válida
 */
export function validarCedula(cedula) {
  if (!cedula || cedula.length !== 11) return false;

  const ced = cedula.replace(/-/g, "");
  if (ced.length !== 11) return false;

  let suma = 0;
  const multiplicador = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];

  for (let i = 0; i < 10; i++) {
    let digito = parseInt(ced[i]) * multiplicador[i];
    if (digito > 9) digito = Math.floor(digito / 10) + (digito % 10);
    suma += digito;
  }

  const digitoVerificador = (10 - (suma % 10)) % 10;
  return digitoVerificador === parseInt(ced[10]);
}

/**
 * Valida un RNC (Registro Nacional del Contribuyente)
 * @param {string} rnc - RNC a validar
 * @returns {boolean} true si es válido
 */
export function validarRNC(rnc) {
  if (!rnc) return false;

  // RNC puede ser de 9 u 11 dígitos
  const rncLimpio = rnc.replace(/-/g, "");

  if (rncLimpio.length === 9 || rncLimpio.length === 11) {
    return /^\d+$/.test(rncLimpio);
  }

  return false;
}

/**
 * Valida un NCF (Número de Comprobante Fiscal)
 * @param {string} ncf - NCF a validar
 * @returns {boolean} true si es válido
 */
export function validarNCF(ncf) {
  if (!ncf) return false;

  // NCF tiene formato: E + 2 dígitos (tipo) + 8 dígitos (secuencia)
  // Ejemplo: E310000000001
  const ncfPattern = /^[ABCE]\d{10}$/;
  return ncfPattern.test(ncf);
}

/**
 * Formatea una cédula con guiones
 * @param {string} cedula - Cédula sin formato
 * @returns {string} Cédula formateada (XXX-XXXXXXX-X)
 */
export function formatearCedula(cedula) {
  if (!cedula) return "";

  const ced = cedula.replace(/-/g, "");
  if (ced.length !== 11) return cedula;

  return `${ced.substring(0, 3)}-${ced.substring(3, 10)}-${ced.substring(10)}`;
}

/**
 * Formatea un RNC con guiones
 * @param {string} rnc - RNC sin formato
 * @returns {string} RNC formateado
 */
export function formatearRNC(rnc) {
  if (!rnc) return "";

  const rncLimpio = rnc.replace(/-/g, "");

  if (rncLimpio.length === 9) {
    return `${rncLimpio.substring(0, 1)}-${rncLimpio.substring(
      1,
      3
    )}-${rncLimpio.substring(3)}`;
  } else if (rncLimpio.length === 11) {
    return `${rncLimpio.substring(0, 3)}-${rncLimpio.substring(
      3,
      10
    )}-${rncLimpio.substring(10)}`;
  }

  return rnc;
}

/**
 * Valida un número de teléfono dominicano
 * @param {string} telefono - Teléfono a validar
 * @returns {boolean} true si es válido
 */
export function validarTelefono(telefono) {
  if (!telefono) return false;

  const telLimpio = telefono.replace(/[\s\-()]/g, "");

  // Teléfono dominicano: 10 dígitos (809/829/849 + 7 dígitos)
  if (telLimpio.length === 10) {
    const prefijo = telLimpio.substring(0, 3);
    return ["809", "829", "849"].includes(prefijo);
  }

  return false;
}

/**
 * Formatea un teléfono dominicano
 * @param {string} telefono - Teléfono sin formato
 * @returns {string} Teléfono formateado (809-XXX-XXXX)
 */
export function formatearTelefono(telefono) {
  if (!telefono) return "";

  const telLimpio = telefono.replace(/[\s\-()]/g, "");

  if (telLimpio.length === 10) {
    return `${telLimpio.substring(0, 3)}-${telLimpio.substring(
      3,
      6
    )}-${telLimpio.substring(6)}`;
  }

  return telefono;
}

/**
 * Valida un email
 * @param {string} email - Email a validar
 * @returns {boolean} true si es válido
 */
export function validarEmail(email) {
  if (!email) return false;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Valida que un campo no esté vacío
 * @param {string} value - Valor a validar
 * @returns {boolean} true si no está vacío
 */
export function validarRequerido(value) {
  return (
    value !== null && value !== undefined && value.toString().trim() !== ""
  );
}

/**
 * Valida que un número sea positivo
 * @param {number} value - Valor a validar
 * @returns {boolean} true si es positivo
 */
export function validarPositivo(value) {
  return !isNaN(value) && parseFloat(value) > 0;
}

/**
 * Valida un rango numérico
 * @param {number} value - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {boolean} true si está en el rango
 */
export function validarRango(value, min, max) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

export default {
  validarCedula,
  validarRNC,
  validarNCF,
  formatearCedula,
  formatearRNC,
  validarTelefono,
  formatearTelefono,
  validarEmail,
  validarRequerido,
  validarPositivo,
  validarRango,
};
