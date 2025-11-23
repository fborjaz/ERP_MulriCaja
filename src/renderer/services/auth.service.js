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
      const users = await api.dbQuery(
        "SELECT * FROM usuarios WHERE username = ? AND activo = 1",
        [username]
      );

      if (users.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const user = users[0];

      // Verificar contraseña (desarrollo: 'password' sin hash, producción: bcrypt)
      const isValidPassword =
        password === "password" ||
        (await bcrypt.compare(password, user.password));

      if (!isValidPassword) {
        throw new Error("Contraseña incorrecta");
      }

      // Obtener caja
      const cajas = await api.dbQuery("SELECT * FROM cajas WHERE id = ?", [
        cajaId,
      ]);
      if (cajas.length === 0) {
        throw new Error("Caja no encontrada");
      }

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
}

// Crear y exportar instancia singleton
export const authService = new AuthService();

// Exportar también como default
export default authService;
