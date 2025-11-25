/**
 * Servicio de Caché para Datos Estáticos
 * @module renderer/services/cache.service
 *
 * Propósito: Cachear datos que raramente cambian para reducir
 * consultas a la base de datos y mejorar el rendimiento.
 */

import { api } from "../core/api.js";

class CacheService {
  constructor() {
    // Almacenamiento de caché
    this.cache = {
      categorias: null,
      usuarios: null,
      cajas: null,
      configuracion: null,
      proveedores: null,
    };

    // Timestamps de última actualización
    this.lastUpdate = {
      categorias: 0,
      usuarios: 0,
      cajas: 0,
      configuracion: 0,
      proveedores: 0,
    };

    // TTL (Time To Live) en milisegundos
    this.TTL = {
      categorias: 5 * 60 * 1000, // 5 minutos
      usuarios: 3 * 60 * 1000, // 3 minutos
      cajas: 10 * 60 * 1000, // 10 minutos
      configuracion: 15 * 60 * 1000, // 15 minutos
      proveedores: 5 * 60 * 1000, // 5 minutos
    };
  }

  /**
   * Verifica si el caché está vigente
   * @param {string} key - Clave del caché
   * @returns {boolean}
   */
  isValid(key) {
    if (!this.cache[key]) return false;

    const now = Date.now();
    const elapsed = now - this.lastUpdate[key];

    return elapsed < this.TTL[key];
  }

  /**
   * Invalida el caché de una clave específica
   * @param {string} key - Clave del caché
   */
  invalidate(key) {
    this.cache[key] = null;
    this.lastUpdate[key] = 0;
  }

  /**
   * Invalida todo el caché
   */
  invalidateAll() {
    Object.keys(this.cache).forEach((key) => {
      this.cache[key] = null;
      this.lastUpdate[key] = 0;
    });
  }

  /**
   * Obtiene categorías (con caché)
   * @returns {Promise<Array>}
   */
  async getCategorias() {
    if (this.isValid("categorias")) {
      return this.cache.categorias;
    }

    try {
      const categorias = await api.dbQuery(
        "SELECT * FROM categorias ORDER BY nombre"
      );

      this.cache.categorias = categorias;
      this.lastUpdate.categorias = Date.now();

      return categorias;
    } catch (error) {
      console.error("Error obteniendo categorías:", error);
      throw error;
    }
  }

  /**
   * Obtiene usuarios activos (con caché)
   * @returns {Promise<Array>}
   */
  async getUsuarios() {
    if (this.isValid("usuarios")) {
      return this.cache.usuarios;
    }

    try {
      const usuarios = await api.dbQuery(
        "SELECT nUsuCodigo as id, username, nombre, grupo, activo FROM usuario WHERE activo = 1 AND deleted = 0 ORDER BY nombre"
      );

      this.cache.usuarios = usuarios;
      this.lastUpdate.usuarios = Date.now();

      return usuarios;
    } catch (error) {
      console.error("Error obteniendo usuarios:", error);
      throw error;
    }
  }

  /**
   * Obtiene cajas (con caché)
   * @returns {Promise<Array>}
   */
  async getCajas() {
    if (this.isValid("cajas")) {
      return this.cache.cajas;
    }

    try {
      const cajas = await api.dbQuery(
        "SELECT * FROM cajas WHERE activo = 1 ORDER BY nombre"
      );

      this.cache.cajas = cajas;
      this.lastUpdate.cajas = Date.now();

      return cajas;
    } catch (error) {
      console.error("Error obteniendo cajas:", error);
      throw error;
    }
  }

  /**
   * Obtiene configuración del sistema (con caché)
   * @returns {Promise<Object>} Objeto con configuración clave-valor
   */
  async getConfiguracion() {
    if (this.isValid("configuracion")) {
      return this.cache.configuracion;
    }

    try {
      const rows = await api.dbQuery("SELECT clave, valor FROM configuracion");

      // Convertir array a objeto clave-valor
      const config = {};
      rows.forEach((row) => {
        config[row.clave] = row.valor;
      });

      this.cache.configuracion = config;
      this.lastUpdate.configuracion = Date.now();

      return config;
    } catch (error) {
      console.error("Error obteniendo configuración:", error);
      throw error;
    }
  }

  /**
   * Obtiene un valor específico de configuración
   * @param {string} clave - Clave de configuración
   * @param {*} defaultValue - Valor por defecto si no existe
   * @returns {Promise<*>}
   */
  async getConfigValue(clave, defaultValue = null) {
    const config = await this.getConfiguracion();
    return config[clave] !== undefined ? config[clave] : defaultValue;
  }

  /**
   * Obtiene proveedores (con caché)
   * @returns {Promise<Array>}
   */
  async getProveedores() {
    if (this.isValid("proveedores")) {
      return this.cache.proveedores;
    }

    try {
      const proveedores = await api.dbQuery(
        "SELECT * FROM proveedores WHERE activo = 1 ORDER BY nombre"
      );

      this.cache.proveedores = proveedores;
      this.lastUpdate.proveedores = Date.now();

      return proveedores;
    } catch (error) {
      console.error("Error obteniendo proveedores:", error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object}
   */
  getStats() {
    const stats = {};
    const now = Date.now();

    Object.keys(this.cache).forEach((key) => {
      const elapsed = now - this.lastUpdate[key];
      const remaining = this.TTL[key] - elapsed;

      stats[key] = {
        cached: this.cache[key] !== null,
        items: this.cache[key]
          ? this.cache[key].length || Object.keys(this.cache[key]).length
          : 0,
        age: elapsed,
        ttl: this.TTL[key],
        remaining: remaining > 0 ? remaining : 0,
        valid: this.isValid(key),
      };
    });

    return stats;
  }

  /**
   * Precarga todos los cachés
   * Útil para llamar al inicio de la aplicación
   * @returns {Promise<void>}
   */
  async preloadAll() {
    try {
      await Promise.all([
        this.getCategorias(),
        this.getUsuarios(),
        this.getCajas(),
        this.getConfiguracion(),
        this.getProveedores(),
      ]);

      console.log("✅ Caché precargado exitosamente");
    } catch (error) {
      console.error("❌ Error precargando caché:", error);
    }
  }
}

// Exportar instancia singleton
export const cacheService = new CacheService();

// Exportar clase para testing
export { CacheService };
