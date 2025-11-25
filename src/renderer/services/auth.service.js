/**
 * Servicio de Autenticación
 * @module renderer/services/auth.service
 */

import bcrypt from "bcryptjs";
import { api } from "../core/api.js";

export class AuthService {
  constructor() {
    this.currentUser = null;
    this.currentCaja = null;
    // Rate limiting para prevenir ataques de fuerza bruta
    this.loginAttempts = new Map(); // username -> { count, lastAttempt, blockedUntil }
    this.MAX_ATTEMPTS = 5;
    this.BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos en milisegundos
  }

  /**
   * Realiza el login de un usuario
   * @param {string} username - Nombre de usuario
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Resultado del login
   */
  async login(username, password) {
    try {
      // Verificar si el usuario está bloqueado por intentos fallidos
      const blockStatus = this.checkLoginBlock(username);
      if (blockStatus.blocked) {
        const minutesLeft = Math.ceil(blockStatus.timeLeft / 60000);
        throw new Error(
          `Usuario bloqueado temporalmente. Intente nuevamente en ${minutesLeft} minuto(s).`
        );
      }

      // Validar que se proporcionen credenciales
      if (!username || !password) {
        throw new Error("Usuario y contraseña son requeridos");
      }

      // Buscar usuario en la base de datos (estructura de hostinger)
      const users = await api.dbQuery(
        "SELECT * FROM usuario WHERE username = ? AND activo = 1 AND deleted = 0",
        [username]
      );

      if (users.length === 0) {
        this.recordFailedAttempt(username);
        throw new Error("Usuario o contraseña incorrectos");
      }

      const user = users[0];

      // Verificar contraseña (en hostinger puede estar en MD5 o sin hash)
      // Intentar comparación directa primero (MD5), luego bcrypt
      let isValidPassword = false;
      if (user.password === password || user.password.length === 32) {
        // MD5 hash o contraseña sin hash
        const { md5 } = await import('../utils/md5.js');
        const md5Hash = md5(password);
        isValidPassword = user.password === md5Hash || user.password === password;
      } else {
        // Intentar bcrypt
        isValidPassword = await bcrypt.compare(password, user.password);
      }

      if (!isValidPassword) {
        this.recordFailedAttempt(username);
        const attemptsLeft = this.MAX_ATTEMPTS - this.getAttemptCount(username);

        if (attemptsLeft > 0) {
          throw new Error(
            `Contraseña incorrecta. Le quedan ${attemptsLeft} intento(s).`
          );
        } else {
          throw new Error(
            `Demasiados intentos fallidos. Usuario bloqueado por ${
              this.BLOCK_DURATION / 60000
            } minutos.`
          );
        }
      }

      // Login exitoso - limpiar intentos fallidos
      this.clearLoginAttempts(username);

      // Normalizar el objeto usuario para compatibilidad con el resto de la aplicación
      const normalizedUser = {
        id: user.nUsuCodigo,
        nUsuCodigo: user.nUsuCodigo,
        id_usuario: user.nUsuCodigo, // Alias para compatibilidad
        nombre: user.nombre || user.username,
        username: user.username,
        email: user.email || null,
        phone: user.phone || null,
        grupo: user.grupo || null,
        id_local: user.id_local || null,
        activo: user.activo === 1,
        deleted: user.deleted === 1,
        identificacion: user.identificacion || null,
        esSuper: user.esSuper === 1,
        porcentaje_comision: user.porcentaje_comision || 0,
        rol: user.esSuper === 1 ? "Administrador" : (user.grupo === 1 ? "Administrador" : "Usuario"),
        // Campos adicionales para compatibilidad
        usuario_nombre: user.nombre || user.username,
        usuario_usuario: user.username,
        usuario_status: user.activo,
      };

      this.currentUser = normalizedUser;
      this.currentCaja = null; // Ya no se usa caja

      // Guardar en localStorage
      localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      localStorage.removeItem("currentCaja"); // Eliminar caja del localStorage

      return { success: true, user: normalizedUser };
    } catch (error) {
      console.error("Error en login:", error);
      throw error;
    }
  }

  /**
   * Cierra la sesión del usuario
   */
  logout() {
    this.currentUser = null;
    this.currentCaja = null;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentCaja");
  }

  /**
   * Obtiene el usuario actual
   * @returns {Object|null} Usuario actual
   */
  getCurrentUser() {
    if (!this.currentUser) {
      const saved = localStorage.getItem("currentUser");
      this.currentUser = saved ? JSON.parse(saved) : null;
    }
    return this.currentUser;
  }

  /**
   * Obtiene la caja actual
   * @returns {Object|null} Caja actual
   */
  getCurrentCaja() {
    if (!this.currentCaja) {
      const saved = localStorage.getItem("currentCaja");
      this.currentCaja = saved ? JSON.parse(saved) : null;
    }
    return this.currentCaja;
  }

  /**
   * Verifica si hay una sesión activa
   * @returns {boolean} true si hay sesión
   */
  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }

  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string} rol - Rol a verificar
   * @returns {boolean} true si tiene el rol
   */
  hasRole(rol) {
    const user = this.getCurrentUser();
    return user && user.rol === rol;
  }

  /**
   * Verifica si el usuario es administrador
   * @returns {boolean} true si es admin
   */
  isAdmin() {
    return this.hasRole("Administrador");
  }

  /**
   * Carga las cajas disponibles
   * @returns {Promise<Array>} Lista de cajas
   */
  async loadCajas() {
    try {
      const cajas = await api.dbQuery("SELECT * FROM cajas WHERE activa = 1");
      return cajas;
    } catch (error) {
      console.error("Error cargando cajas:", error);
      throw error;
    }
  }

  /**
   * Verifica la sesión actual
   */
  async checkSession() {
    const user = this.getCurrentUser();
    if (user) {
      console.log("✅ Sesión restaurada:", user.username);
    }
  }

  /**
   * Verifica si un usuario está bloqueado por intentos fallidos
   * @param {string} username - Nombre de usuario
   * @returns {Object} Estado de bloqueo { blocked, timeLeft }
   */
  checkLoginBlock(username) {
    const attempts = this.loginAttempts.get(username);

    if (!attempts) {
      return { blocked: false, timeLeft: 0 };
    }

    const now = Date.now();

    // Si hay un bloqueo activo
    if (attempts.blockedUntil && attempts.blockedUntil > now) {
      return {
        blocked: true,
        timeLeft: attempts.blockedUntil - now,
      };
    }

    // Si el bloqueo expiró, limpiar
    if (attempts.blockedUntil && attempts.blockedUntil <= now) {
      this.clearLoginAttempts(username);
      return { blocked: false, timeLeft: 0 };
    }

    return { blocked: false, timeLeft: 0 };
  }

  /**
   * Registra un intento de login fallido
   * @param {string} username - Nombre de usuario
   */
  recordFailedAttempt(username) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(username) || {
      count: 0,
      lastAttempt: now,
      blockedUntil: null,
    };

    attempts.count++;
    attempts.lastAttempt = now;

    // Si alcanzó el máximo de intentos, bloquear
    if (attempts.count >= this.MAX_ATTEMPTS) {
      attempts.blockedUntil = now + this.BLOCK_DURATION;
      console.warn(
        `Usuario ${username} bloqueado por ${
          this.BLOCK_DURATION / 60000
        } minutos`
      );
    }

    this.loginAttempts.set(username, attempts);
  }

  /**
   * Obtiene el número de intentos fallidos de un usuario
   * @param {string} username - Nombre de usuario
   * @returns {number} Número de intentos
   */
  getAttemptCount(username) {
    const attempts = this.loginAttempts.get(username);
    return attempts ? attempts.count : 0;
  }

  /**
   * Limpia los intentos de login de un usuario
   * @param {string} username - Nombre de usuario
   */
  clearLoginAttempts(username) {
    this.loginAttempts.delete(username);
  }
}

// Crear y exportar instancia singleton
export const authService = new AuthService();

// Exportar también como default
export default authService;
