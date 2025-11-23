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
   * @param {number} cajaId - ID de la caja
   * @returns {Promise<Object>} Resultado del login
   */
  async login(username, password, cajaId) {
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

      // Buscar usuario en la base de datos
      const users = await api.dbQuery(
        "SELECT * FROM usuarios WHERE username = ? AND activo = 1",
        [username]
      );

      if (users.length === 0) {
        this.recordFailedAttempt(username);
        throw new Error("Usuario o contraseña incorrectos");
      }

      const user = users[0];

      // Verificar contraseña usando bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);

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

      // Obtener caja
      const cajas = await api.dbQuery("SELECT * FROM cajas WHERE id = ?", [
        cajaId,
      ]);
      if (cajas.length === 0) {
        throw new Error("Caja no encontrada");
      }

      // Login exitoso - limpiar intentos fallidos
      this.clearLoginAttempts(username);

      this.currentUser = user;
      this.currentCaja = cajas[0];

      // Guardar en localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.setItem("currentCaja", JSON.stringify(cajas[0]));

      return { success: true, user, caja: cajas[0] };
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
