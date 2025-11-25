/**
 * Vista de Configuración Inicial (Setup Wizard)
 * @module renderer/modules/setup/setup.view
 * 
 * Paso 1: Validar credenciales del usuario contra la nube
 * Paso 2: Configurar credenciales de sincronización de la empresa
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import bcrypt from "bcryptjs";
import axios from "axios";
import { md5 } from "../../utils/md5.js";

export const SetupView = {
  currentStep: 1,
  userCredentials: null,

  /**
   * Renderiza el HTML de la vista de setup
   * @returns {string} HTML de la vista
   */
  render() {
    return `
      <div class="setup-wizard">
        <div class="setup-container">
          <div class="setup-header">
            <h1>🎉 Bienvenido a ERP Multicajas RD</h1>
            <p>Configuración Inicial del Sistema</p>
          </div>

          <div class="setup-progress">
            <div class="progress-step ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}">
              <span class="step-number">1</span>
              <span class="step-label">Credenciales de Usuario</span>
            </div>
            <div class="progress-line ${this.currentStep > 1 ? 'completed' : ''}"></div>
            <div class="progress-step ${this.currentStep >= 2 ? 'active' : ''}">
              <span class="step-number">2</span>
              <span class="step-label">Configuración de Empresa</span>
            </div>
          </div>

          <div class="setup-content">
            <!-- Paso 1: Credenciales de Usuario -->
            <div class="setup-step ${this.currentStep === 1 ? 'active' : 'hidden'}" id="step-1">
              <h2>Paso 1: Validar Credenciales de Usuario</h2>
              <p class="step-description">
                Ingrese sus credenciales del sistema IMAXPOS Cloud. Estas deben coincidir exactamente con las de su cuenta en la nube. Los datos se sincronizarán automáticamente después de configurar la conexión.
              </p>

              <form id="setup-form-step1">
                <div class="form-group">
                  <label>RNC / Cédula *</label>
                  <input
                    type="text"
                    id="user-rnc"
                    placeholder="Ej: 001-1234567-8 o 001-01234567-8"
                    required
                    autocomplete="off"
                  />
                  <small>Ingrese su RNC (empresa) o Cédula (persona física)</small>
                </div>

                <div class="form-group">
                  <label>Usuario *</label>
                  <input
                    type="text"
                    id="user-username"
                    placeholder="Nombre de usuario"
                    required
                    autocomplete="username"
                  />
                  <small>El mismo usuario que utiliza en IMAXPOS Cloud</small>
                </div>

                <div class="form-group">
                  <label>Contraseña *</label>
                  <div class="password-input-wrapper">
                    <input
                      type="password"
                      id="user-password"
                      placeholder="Su contraseña de IMAXPOS Cloud"
                      required
                      autocomplete="current-password"
                    />
                    <button type="button" class="toggle-password" id="toggle-password-1">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                  <small>La misma contraseña que utiliza en IMAXPOS Cloud</small>
                </div>

                <div class="setup-actions">
                  <button type="submit" class="btn btn-primary btn-large">
                    <span class="material-icons">check_circle</span>
                    Validar y Continuar
                  </button>
                </div>
              </form>
            </div>

            <!-- Paso 2: Configuración de Empresa -->
            <div class="setup-step ${this.currentStep === 2 ? 'active' : 'hidden'}" id="step-2">
              <h2>Paso 2: Configuración de Sincronización</h2>
              <p class="step-description">
                Configure la conexión con su empresa en IMAXPOS Cloud. Si no conoce estos datos, comuníquese con Soporte.
              </p>

              <form id="setup-form-step2">
                <div class="form-group">
                  <label>URL del Servidor *</label>
                  <input
                    type="text"
                    id="api-url"
                    value="https://imaxpos.com/api/sync"
                    readonly
                    class="readonly-input"
                    required
                  />
                  <small>URL preconfigurada del servidor de sincronización</small>
                </div>

                <div class="form-group">
                  <label>ID de Empresa *</label>
                  <input
                    type="number"
                    id="empresa-id"
                    placeholder="Ej: 42"
                    required
                    min="1"
                  />
                  <small>
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">info</span>
                    Si no conoce el ID de su empresa, comuníquese con <strong>Soporte</strong>
                  </small>
                </div>

                <div class="form-group">
                  <label>API Key *</label>
                  <div class="password-input-wrapper">
                    <input
                      type="password"
                      id="auth-token"
                      placeholder="Token de autenticación"
                      required
                    />
                    <button type="button" class="toggle-password" id="toggle-password-2">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                  <small>
                    <span class="material-icons" style="font-size: 16px; vertical-align: middle;">info</span>
                    Si no conoce su API Key, comuníquese con <strong>Soporte</strong>
                  </small>
                </div>

                <div class="form-group">
                  <label>
                    <input type="checkbox" id="auto-sync" checked>
                    Sincronización Automática
                  </label>
                  <small>Sincronizar automáticamente cada cierto tiempo</small>
                </div>

                <div class="form-group" id="sync-interval-group">
                  <label for="sync-interval">Intervalo de Sincronización (segundos)</label>
                  <input type="number" id="sync-interval" class="form-control" 
                    value="300" min="60" max="3600">
                  <small>Tiempo entre sincronizaciones automáticas (mínimo 60 segundos)</small>
                </div>

                <div class="setup-actions">
                  <button type="button" id="btn-back-step1" class="btn btn-secondary">
                    <span class="material-icons">arrow_back</span>
                    Atrás
                  </button>
                  <button type="button" id="btn-test-connection" class="btn btn-info">
                    <span class="material-icons">wifi</span>
                    Probar Conexión
                  </button>
                  <button type="submit" class="btn btn-primary btn-large">
                    <span class="material-icons">check_circle</span>
                    Guardar y Completar
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="setup-footer">
            <p>🔒 Esta configuración solo se realiza una vez</p>
            <p class="support-info">
              <span class="material-icons">support_agent</span>
              ¿Necesita ayuda? Contacte a <strong>Soporte</strong> para obtener su ID de Empresa y API Key
            </p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Inicializa la lógica del setup
   */
  async init() {
    this.setupEventListeners();
  },

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    const formStep1 = document.getElementById("setup-form-step1");
    const formStep2 = document.getElementById("setup-form-step2");
    const togglePassword1 = document.getElementById("toggle-password-1");
    const togglePassword2 = document.getElementById("toggle-password-2");
    const btnBack = document.getElementById("btn-back-step1");
    const btnTestConnection = document.getElementById("btn-test-connection");

    // Submit del formulario paso 1
    formStep1.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleStep1();
    });

    // Submit del formulario paso 2
    formStep2.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleStep2();
    });

    // Botón atrás
    btnBack.addEventListener("click", () => {
      this.goToStep(1);
    });

    // Botón probar conexión
    btnTestConnection.addEventListener("click", () => {
      this.testConnection();
    });

    // Toggle visibility de contraseña
    togglePassword1.addEventListener("click", () => {
      this.togglePasswordVisibility("user-password", togglePassword1);
    });

    togglePassword2.addEventListener("click", () => {
      this.togglePasswordVisibility("auth-token", togglePassword2);
    });
  },

  /**
   * Cambia a un paso específico
   */
  goToStep(step) {
    this.currentStep = step;
    const step1 = document.getElementById("step-1");
    const step2 = document.getElementById("step-2");

    if (step === 1) {
      step1.classList.remove("hidden");
      step1.classList.add("active");
      step2.classList.add("hidden");
      step2.classList.remove("active");
    } else if (step === 2) {
      step1.classList.add("hidden");
      step1.classList.remove("active");
      step2.classList.remove("hidden");
      step2.classList.add("active");
    }

    // Actualizar indicador de progreso
    this.updateProgressIndicator();
  },

  /**
   * Actualiza el indicador de progreso
   */
  updateProgressIndicator() {
    const progressSteps = document.querySelectorAll(".progress-step");
    const progressLines = document.querySelectorAll(".progress-line");

    progressSteps.forEach((step, index) => {
      const stepNum = index + 1;
      if (stepNum < this.currentStep) {
        step.classList.add("completed");
        step.classList.remove("active");
      } else if (stepNum === this.currentStep) {
        step.classList.add("active");
        step.classList.remove("completed");
      } else {
        step.classList.remove("active", "completed");
      }
    });

    progressLines.forEach((line, index) => {
      if (index + 1 < this.currentStep) {
        line.classList.add("completed");
      } else {
        line.classList.remove("completed");
      }
    });
  },

  /**
   * Toggle visibility de contraseña
   */
  togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    const icon = button.querySelector(".material-icons");

    if (input.type === "password") {
      input.type = "text";
      icon.textContent = "visibility_off";
    } else {
      input.type = "password";
      icon.textContent = "visibility";
    }
  },

  /**
   * Maneja el paso 1: Guardar credenciales de usuario
   * NO valida contra la nube aquí, solo guarda localmente
   * La validación real se hará en el paso 2 con la configuración de sincronización
   */
  async handleStep1() {
    try {
      const rnc = document.getElementById("user-rnc").value.trim();
      const username = document.getElementById("user-username").value.trim();
      const password = document.getElementById("user-password").value;

      // Validaciones básicas
      if (!rnc) {
        toast.error("El RNC/Cédula es requerido");
        return;
      }

      if (!username) {
        toast.error("El usuario es requerido");
        return;
      }

      if (!password) {
        toast.error("La contraseña es requerida");
        return;
      }

      // Guardar credenciales localmente (sin validar contra la nube)
      this.userCredentials = {
        rnc: rnc,
        username: username,
        password: password
      };

      // Guardar usuario en la base de datos local
      await this.saveUserToDatabase();

      toast.success("✅ Credenciales guardadas. Continuando con la configuración...");
      
      // Avanzar al paso 2
      setTimeout(() => {
        this.goToStep(2);
      }, 1000);
    } catch (error) {
      console.error("Error en paso 1:", error);
      toast.error(error.message || "Error al guardar credenciales");
    }
  },

  /**
   * Guarda el usuario en la base de datos local
   * Solo guarda lo que el usuario ingresa. Los datos de la nube se sincronizarán después
   */
  async saveUserToDatabase() {
    try {
      const { rnc, username, password } = this.userCredentials;

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Verificar si el usuario ya existe (estructura de hostinger)
      const existingUsers = await api.dbQuery(
        "SELECT * FROM usuario WHERE username = ?",
        [username]
      );

      // En hostinger, las contraseñas pueden estar en MD5 o sin hash
      // Para el setup inicial, guardamos en MD5 para compatibilidad
      const md5Password = md5(password);

      if (existingUsers.length > 0) {
        // Actualizar usuario existente
        await api.dbQuery(
          `UPDATE usuario 
           SET nombre = ?, 
               password = ?,
               email = ?,
               phone = ?
           WHERE username = ?`,
          [
            username,        // Usar username como nombre por ahora (se actualizará en sincronización)
            md5Password,     // Contraseña en MD5 para compatibilidad con hostinger
            '',              // Email vacío por ahora
            '',              // Phone vacío por ahora
            username
          ]
        );
        
        console.log("✅ Usuario actualizado:", username);
      } else {
        // Crear nuevo usuario (estructura de hostinger)
        await api.dbQuery(
          `INSERT INTO usuario (codigo, username, email, password, activo, nombre, phone, grupo, id_local, deleted, twosteps, imagen)
           VALUES (?, ?, ?, ?, 1, ?, ?, 2, 1, 0, 0, '')`,
          [
            '',              // codigo vacío
            username,        // username
            '',              // email vacío
            md5Password,     // password en MD5
            username,        // nombre
            ''               // phone vacío
          ]
        );
        
        console.log("✅ Usuario creado:", username);
      }

      // Guardar RNC/Cédula en configuración para uso posterior
      if (rnc) {
        try {
          // La tabla configuraciones tiene campos: config_key, config_value (sin descripcion)
          await api.dbQuery(
            `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
             VALUES ('usuario_rnc', ?)`,
            [rnc]
          );
          console.log("📝 RNC/Cédula guardado:", rnc);
        } catch (configError) {
          // Si la tabla no existe, simplemente continuar
          // El RNC se puede guardar después cuando se sincronice
          console.log("⚠️ No se pudo guardar RNC (se guardará en sincronización):", configError.message);
        }
      }
    } catch (error) {
      console.error("Error guardando usuario:", error);
      throw new Error("Error al guardar usuario en la base de datos local");
    }
  },

  /**
   * Prueba la conexión con el servidor y valida API Key y Company ID
   */
  async testConnection() {
    try {
      const apiUrl = document.getElementById("api-url").value.trim();
      const empresaId = document.getElementById("empresa-id").value.trim();
      const authToken = document.getElementById("auth-token").value.trim();

      if (!apiUrl || !empresaId || !authToken) {
        toast.error("Complete todos los campos antes de probar la conexión");
        return;
      }

      toast.info("Validando credenciales...");

      // Validar que el Company ID sea un número válido
      const companyIdNum = parseInt(empresaId);
      if (isNaN(companyIdNum) || companyIdNum <= 0) {
        toast.error("❌ El ID de Empresa debe ser un número válido");
        return;
      }

      // Hacer una llamada real al endpoint /download-changes para validar API Key y Company ID
      // Esto es igual a como lo hace el test-sync-empresa42.js
      try {
        const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
        const downloadUrl = baseUrl.includes('/api/sync') 
          ? `${baseUrl}/download-changes` 
          : `${baseUrl}/api/sync/download-changes`;

        const response = await axios.post(downloadUrl, {
          apiKey: authToken,
          companyId: companyIdNum.toString(),
          lastSyncTime: '2025-01-01 00:00:00' // Fecha antigua para obtener todos los cambios
        }, {
          timeout: 10000, // 10 segundos de timeout
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Si llegamos aquí, la autenticación fue exitosa
        if (response.data && response.data.total !== undefined) {
          toast.success(`✅ Credenciales válidas. ${response.data.total} registros disponibles para sincronizar`);
          return true;
        } else {
          toast.warning("⚠️ Respuesta inesperada del servidor");
          return false;
        }

      } catch (axiosError) {
        // Manejar errores de axios
        if (axiosError.response) {
          const status = axiosError.response.status;
          const errorData = axiosError.response.data;

          if (status === 401) {
            toast.error("❌ API Key inválida o expirada. Verifique sus credenciales.");
            return false;
          } else if (status === 404) {
            toast.error("❌ Company ID no encontrado. Verifique el ID de su empresa.");
            return false;
          } else if (status === 400) {
            toast.error(`❌ Error en la solicitud: ${errorData?.error || errorData?.message || 'Datos inválidos'}`);
            return false;
          } else if (status === 500) {
            toast.error("❌ Error del servidor. Contacte a Soporte.");
            console.error("Error del servidor:", errorData);
            return false;
          } else {
            toast.error(`❌ Error ${status}: ${errorData?.error || errorData?.message || 'Error desconocido'}`);
            return false;
          }
        } else if (axiosError.code === 'ECONNABORTED') {
          toast.error("❌ Tiempo de espera agotado. Verifique su conexión a internet.");
          return false;
        } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
          toast.error("❌ No se pudo conectar al servidor. Verifique la URL.");
          return false;
        } else {
          toast.error(`❌ Error de conexión: ${axiosError.message}`);
          return false;
        }
      }
    } catch (error) {
      console.error("Error probando conexión:", error);
      toast.error(`❌ Error: ${error.message || "No se pudo conectar al servidor"}`);
      return false;
    }
  },

  /**
   * Maneja el paso 2: Configurar sincronización
   */
  async handleStep2() {
    try {
      const apiUrl = document.getElementById("api-url").value.trim();
      const empresaId = document.getElementById("empresa-id").value.trim();
      const authToken = document.getElementById("auth-token").value.trim();

      // Validaciones
      if (!apiUrl) {
        toast.error("La URL del servidor es requerida");
        return;
      }

      if (!empresaId || parseInt(empresaId) <= 0) {
        toast.error("El ID de empresa es requerido y debe ser un número válido");
        return;
      }

      if (!authToken) {
        toast.error("El API Key es requerido");
        return;
      }

      // PRIMERO: Validar las credenciales haciendo una llamada real al servidor
      toast.info("Validando credenciales antes de guardar...");
      const isValid = await this.testConnection();
      if (!isValid) {
        // testConnection ya muestra el error apropiado
        return;
      }

      toast.info("Guardando configuración...");

      // Guardar configuración de sincronización
      const config = {
        api_url: apiUrl,
        empresa_id: parseInt(empresaId),
        auth_token: authToken,
        auto_sync: document.getElementById("auto-sync").checked ? 1 : 0,
        sync_interval: parseInt(document.getElementById("sync-interval").value) || 300
      };

      const result = await api.syncConfigure(config);

      if (!result.success) {
        throw new Error(result.error || "Error al guardar configuración");
      }

      toast.success("✅ Configuración guardada y validada exitosamente");

      // SINCRONIZACIÓN INICIAL COMPLETA: Descargar todos los datos de la empresa
      toast.info("📥 Iniciando sincronización inicial... Esto puede tardar unos minutos.");
      
      try {
        // Hacer una sincronización completa inicial (descargar todos los datos)
        const syncResult = await api.syncPull();
        
        if (syncResult.success) {
          const totalRecords = syncResult.data?.total || syncResult.data?.appliedChanges || 0;
          toast.success(`✅ Sincronización inicial completada. ${totalRecords} registros descargados de la empresa.`);
          
          // Opcional: También hacer un PUSH por si hay datos locales que subir
          try {
            const pushResult = await api.syncPush();
            if (pushResult.success && pushResult.data?.sentChanges > 0) {
              toast.info(`⬆️ ${pushResult.data.sentChanges} cambios locales enviados al servidor.`);
            }
          } catch (pushError) {
            console.warn("No se pudieron enviar cambios locales:", pushError);
            // No es crítico en la sincronización inicial
          }
        } else {
          throw new Error(syncResult.error || "Error en la sincronización inicial");
        }
      } catch (syncError) {
        console.error("Error en sincronización inicial:", syncError);
        toast.warning(`⚠️ Configuración guardada, pero hubo un problema en la sincronización inicial: ${syncError.message}`);
        toast.info("Puede intentar sincronizar manualmente desde el menú de Sincronización.");
      }

      // Marcar setup como completado
      try {
        await api.dbQuery(
          `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
           VALUES ('setup_completed', 'true')`,
          []
        );
      } catch (error) {
        // Si la tabla no existe, intentar crear una tabla básica
        console.log("⚠️ Tabla configuraciones no encontrada, intentando crear...");
        try {
          await api.dbExec(`
            CREATE TABLE IF NOT EXISTS configuraciones (
              config_id INTEGER PRIMARY KEY AUTOINCREMENT,
              config_key VARCHAR(255),
              config_value TEXT
            )
          `);
          await api.dbQuery(
            `INSERT INTO configuraciones (config_key, config_value) 
             VALUES ('setup_completed', 'true')`,
            []
          );
        } catch (createError) {
          console.error("Error creando tabla configuraciones:", createError);
          // Continuar de todas formas
        }
      }

      toast.success("🎉 ¡Configuración completada exitosamente! Los datos de su empresa están sincronizados localmente.");

      // Esperar un momento y recargar
      setTimeout(() => {
        location.reload();
      }, 3000);
    } catch (error) {
      console.error("Error en paso 2:", error);
      toast.error(error.message || "Error al completar la configuración");
    }
  },
};

export default SetupView;
