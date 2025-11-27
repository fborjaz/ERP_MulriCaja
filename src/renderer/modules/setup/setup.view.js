/**
 * Vista de Configuración Inicial (Setup Wizard)
 * @module renderer/modules/setup/setup.view
 *
 * Paso 1: Validar credenciales del usuario contra la nube
 * Paso 2: Configurar credenciales de sincronización de la empresa
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
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
      <style>
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
          padding: 8px 0;
        }
        .checkbox-label input[type="checkbox"] {
          width: 20px;
          height: 20px;
          cursor: pointer;
          margin: 0;
          accent-color: #6366f1;
        }
        .checkbox-text {
          font-weight: 500;
          color: #333;
        }
        .checkbox-label:hover .checkbox-text {
          color: #6366f1;
        }
      </style>
      <div class="setup-wizard">
        <div class="setup-container">
          <div class="setup-header">
            <h1>🎉 Bienvenido a ERP Multicajas RD</h1>
            <p>Configuración Inicial del Sistema</p>
          </div>

          <div class="setup-progress">
            <div class="progress-step ${
              this.currentStep >= 1 ? "active" : ""
            } ${this.currentStep > 1 ? "completed" : ""}">
              <span class="step-number">1</span>
              <span class="step-label">Credenciales de Usuario</span>
            </div>
            <div class="progress-line ${
              this.currentStep > 1 ? "completed" : ""
            }"></div>
            <div class="progress-step ${this.currentStep >= 2 ? "active" : ""}">
              <span class="step-number">2</span>
              <span class="step-label">Configuración de Empresa</span>
            </div>
          </div>

          <div class="setup-content">
            <!-- Paso 1: Validar Credenciales contra BD Maestra -->
            <div class="setup-step ${
              this.currentStep === 1 ? "active" : "hidden"
            }" id="step-1">
              <h2>Paso 1: Validar Credenciales</h2>
              <p class="step-description">
                Ingrese sus credenciales REALES que coinciden con la base de datos maestra de IMAXPOS Cloud. Todos los campos son obligatorios y se validarán contra el servidor.
              </p>

              <form id="setup-form-step1">
                <div class="form-group">
                  <label>RNC / Cédula *</label>
                  <input
                    type="text"
                    id="user-rnc"
                    placeholder="Ej: 123456789"
                    required
                    autocomplete="off"
                  />
                  <small>RNC de la empresa registrado en la BD maestra</small>
                </div>

                <div class="form-group">
                  <label>ID de Empresa *</label>
                  <input
                    type="number"
                    id="empresa-id-step1"
                    placeholder="Ej: 001"
                    required
                    min="1"
                  />
                  <small>ID de la empresa en la base de datos maestra</small>
                </div>

                <div class="form-group">
                  <label>Usuario *</label>
                  <input
                    type="text"
                    id="user-username"
                    placeholder="Ej: usuario"
                    required
                    autocomplete="username"
                  />
                  <small>Usuario que existe en la BD de la empresa</small>
                </div>

                <div class="form-group">
                  <label>Contraseña *</label>
                  <div class="password-input-wrapper">
                    <input
                      type="password"
                      id="user-password"
                      placeholder="Contraseña del usuario"
                      required
                      autocomplete="current-password"
                    />
                    <button type="button" class="toggle-password" id="toggle-password-1">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                  <small>Contraseña del usuario (se valida en MD5)</small>
                </div>

                <div class="form-group">
                  <label>API Key *</label>
                  <div class="password-input-wrapper">
                    <input
                      type="password"
                      id="api-key-step1"
                      placeholder="sk_live_..."
                      required
                    />
                    <button type="button" class="toggle-password" id="toggle-password-api">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                  <small>API Key asociada a esta empresa en la BD maestra</small>
                </div>

                <div class="form-group">
                  <label>URL del Servidor *</label>
                  <input
                    type="text"
                    id="api-url-step1"
                    value="https://imaxpos.com/api/sync"
                    required
                    readonly
                    class="readonly-input"
                  />
                  <small>URL del servidor de sincronización</small>
                </div>

                <div class="setup-actions">
                  <button type="submit" class="btn btn-primary btn-large">
                    <span class="material-icons">check_circle</span>
                    Validar Credenciales
                  </button>
                </div>
              </form>
            </div>

            <!-- Paso 2: Sincronización Inicial -->
            <div class="setup-step ${
              this.currentStep === 2 ? "active" : "hidden"
            }" id="step-2">
              <h2>Paso 2: Sincronización Inicial</h2>
              <p class="step-description">
                Se descargarán TODOS los datos de su empresa desde la nube y se guardarán localmente. Este proceso puede tardar varios minutos dependiendo de la cantidad de datos.
              </p>

              <div id="empresa-info-display" style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-top: 0;">📋 Información de la Empresa Validada</h3>
                <div id="empresa-info-content">
                  <p><strong>Empresa:</strong> <span id="display-empresa-nombre">-</span></p>
                  <p><strong>RNC:</strong> <span id="display-empresa-rnc">-</span></p>
                  <p><strong>ID:</strong> <span id="display-empresa-id">-</span></p>
                  <p><strong>Usuario:</strong> <span id="display-usuario-nombre">-</span></p>
                </div>
              </div>

              <form id="setup-form-step2">

                <div class="form-group">
                  <label class="checkbox-label" for="auto-sync">
                    <input type="checkbox" id="auto-sync" checked>
                    <span class="checkbox-text">Sincronización Automática</span>
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
    if (togglePassword1) {
      togglePassword1.addEventListener("click", () => {
        this.togglePasswordVisibility("user-password", togglePassword1);
      });
    }

    if (togglePassword2) {
      togglePassword2.addEventListener("click", () => {
        this.togglePasswordVisibility("auth-token", togglePassword2);
      });
    }

    const togglePasswordApi = document.getElementById("toggle-password-api");
    if (togglePasswordApi) {
      togglePasswordApi.addEventListener("click", () => {
        this.togglePasswordVisibility("api-key-step1", togglePasswordApi);
      });
    }
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

      // Mostrar información de la empresa validada
      if (this.userCredentials && this.userCredentials.empresaData) {
        const empresa = this.userCredentials.empresaData.empresa;
        const usuario = this.userCredentials.empresaData.usuario;

        const empresaNombreEl = document.getElementById(
          "display-empresa-nombre"
        );
        const empresaRncEl = document.getElementById("display-empresa-rnc");
        const empresaIdEl = document.getElementById("display-empresa-id");
        const usuarioNombreEl = document.getElementById(
          "display-usuario-nombre"
        );

        if (empresaNombreEl)
          empresaNombreEl.textContent = empresa.nombre || "-";
        if (empresaRncEl) empresaRncEl.textContent = empresa.rnc || "-";
        if (empresaIdEl) empresaIdEl.textContent = empresa.id || "-";
        if (usuarioNombreEl)
          usuarioNombreEl.textContent =
            usuario.nombre || usuario.username || "-";
      }
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
   * Maneja el paso 1: Validar credenciales contra BD Maestra
   * Valida RNC, Usuario, Contraseña, ID de Empresa y API Key
   */
  async handleStep1() {
    try {
      const rnc = document.getElementById("user-rnc").value.trim();
      const empresaId = document
        .getElementById("empresa-id-step1")
        .value.trim();
      const username = document.getElementById("user-username").value.trim();
      const password = document.getElementById("user-password").value;
      const apiKey = document.getElementById("api-key-step1").value.trim();
      const apiUrl = document.getElementById("api-url-step1").value.trim();

      // Validaciones básicas
      if (!rnc) {
        toast.error("El RNC/Cédula es requerido");
        return;
      }

      if (!empresaId || parseInt(empresaId) <= 0) {
        toast.error(
          "El ID de Empresa es requerido y debe ser un número válido"
        );
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

      if (!apiKey) {
        toast.error("La API Key es requerida");
        return;
      }

      if (!apiUrl) {
        toast.error("La URL del servidor es requerida");
        return;
      }

      toast.info("🔍 Validando credenciales contra el servidor...");

      // Validar contra el servidor usando el nuevo endpoint
      const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      const validateUrl = baseUrl.includes("/api/sync")
        ? `${baseUrl}/validate-setup`
        : `${baseUrl}/api/sync/validate-setup`;

      const response = await axios.post(
        validateUrl,
        {
          rnc: rnc,
          username: username,
          password: password,
          companyId: parseInt(empresaId),
          apiKey: apiKey,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error(response.data?.error || "Credenciales inválidas");
      }

      // Guardar credenciales validadas
      // IMPORTANTE: Usar el username real de la base de datos, no el que el usuario ingresó
      const realUsername = response.data.data?.usuario?.username || username;

      this.userCredentials = {
        rnc: rnc,
        username: realUsername, // Usar el username real de la BD
        password: password,
        empresaId: parseInt(empresaId),
        apiKey: apiKey,
        apiUrl: apiUrl,
        empresaData: response.data.data,
      };

      // Guardar usuario en la base de datos local
      await this.saveUserToDatabase();

      toast.success(
        "✅ Credenciales validadas correctamente. Continuando con la sincronización..."
      );

      // Avanzar al paso 2
      setTimeout(() => {
        this.goToStep(2);
      }, 1000);
    } catch (error) {
      console.error("Error en paso 1:", error);
      if (error.response && error.response.data && error.response.data.error) {
        toast.error(`❌ ${error.response.data.error}`);
      } else if (error.message) {
        toast.error(`❌ ${error.message}`);
      } else {
        toast.error(
          "Error al validar credenciales. Verifique su conexión a internet."
        );
      }
    }
  },

  /**
   * Guarda el usuario en la base de datos local
   * Solo guarda lo que el usuario ingresa. Los datos de la nube se sincronizarán después
   */
  async saveUserToDatabase() {
    try {
      const { rnc, username, password, empresaData } = this.userCredentials;

      // Obtener datos reales del usuario desde la respuesta del servidor
      const realUsername = empresaData?.usuario?.username || username;
      const realNombre = empresaData?.usuario?.nombre || username;
      const realEmail = empresaData?.usuario?.email || "";

      // PRIMERO: Asegurar que la tabla usuario existe (estructura idéntica a la nube)
      try {
        await api.dbExec(`
          CREATE TABLE IF NOT EXISTS usuario (
            nUsuCodigo INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo VARCHAR(255) NOT NULL,
            username VARCHAR(18) NOT NULL,
            email VARCHAR(255) NOT NULL,
            email_verified INTEGER NOT NULL DEFAULT 0,
            password VARCHAR(50) NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1,
            nombre VARCHAR(255) DEFAULT NULL,
            phone VARCHAR(100) NOT NULL,
            grupo INTEGER DEFAULT NULL,
            id_local INTEGER DEFAULT NULL,
            deleted INTEGER DEFAULT 0,
            identificacion VARCHAR(50) DEFAULT NULL,
            esSuper INTEGER DEFAULT NULL,
            porcentaje_comision REAL DEFAULT NULL,
            twosteps INTEGER NOT NULL DEFAULT 0,
            imagen TEXT NOT NULL,
            fingerprint TEXT DEFAULT NULL,
            deviceId VARCHAR(250) DEFAULT NULL,
            rawId VARCHAR(255) DEFAULT NULL
          );
        `);
        console.log(
          "✅ Tabla 'usuario' verificada/creada (estructura compatible con nube)"
        );
      } catch (createError) {
        console.error("❌ Error creando tabla usuario:", createError);
        throw new Error(
          "No se pudo crear la tabla de usuarios. Por favor, reinicie la aplicación."
        );
      }

      // Verificar si el usuario ya existe (estructura de hostinger)
      const existingUsers = await api.dbQuery(
        "SELECT * FROM usuario WHERE username = ?",
        [realUsername]
      );

      // En hostinger, las contraseñas están en MD5
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
            realNombre, // Usar el nombre real de la BD
            md5Password, // Contraseña en MD5 para compatibilidad con hostinger
            realEmail, // Email real de la BD
            "", // Phone vacío por ahora
            realUsername, // Username real de la BD
          ]
        );

        console.log(
          "✅ Usuario actualizado:",
          realUsername,
          "Nombre:",
          realNombre
        );
      } else {
        // Crear nuevo usuario (estructura idéntica a la nube)
        // IMPORTANTE: Los campos NOT NULL deben tener valores, aunque sean vacíos
        await api.dbQuery(
          `INSERT INTO usuario (codigo, username, email, password, activo, nombre, phone, grupo, id_local, deleted, twosteps, imagen, email_verified)
           VALUES (?, ?, ?, ?, 1, ?, ?, 2, 1, 0, 0, ?, 0)`,
          [
            "", // codigo (NOT NULL pero puede ser vacío)
            realUsername, // username real de la BD
            realEmail, // email real de la BD
            md5Password, // password en MD5
            realNombre, // nombre real de la BD
            "", // phone (NOT NULL pero puede ser vacío)
            "", // imagen (NOT NULL pero puede ser vacío)
          ]
        );

        console.log("✅ Usuario creado:", realUsername, "Nombre:", realNombre);
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
          console.log(
            "⚠️ No se pudo guardar RNC (se guardará en sincronización):",
            configError.message
          );
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
      // Usar los datos guardados en userCredentials del paso 1
      if (!this.userCredentials) {
        toast.error("Por favor, complete el paso 1 primero");
        return;
      }

      const apiUrl = this.userCredentials.apiUrl;
      const empresaId = this.userCredentials.empresaId;
      const authToken = this.userCredentials.apiKey;

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
      // Probar conexión con el servidor usando el endpoint de sincronización
      try {
        const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
        const downloadUrl = baseUrl.includes("/api/sync")
          ? `${baseUrl}/download-changes`
          : `${baseUrl}/api/sync/download-changes`;

        const response = await axios.post(
          downloadUrl,
          {
            apiKey: authToken,
            companyId: companyIdNum.toString(),
            lastSyncTime: "2025-01-01 00:00:00", // Fecha antigua para obtener todos los cambios
          },
          {
            timeout: 10000, // 10 segundos de timeout
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        // Si llegamos aquí, la autenticación fue exitosa
        if (response.data && response.data.total !== undefined) {
          toast.success(
            `✅ Credenciales válidas. ${response.data.total} registros disponibles para sincronizar`
          );
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
            toast.error(
              "❌ API Key inválida o expirada. Verifique sus credenciales."
            );
            return false;
          } else if (status === 404) {
            toast.error(
              "❌ Company ID no encontrado. Verifique el ID de su empresa."
            );
            return false;
          } else if (status === 400) {
            toast.error(
              `❌ Error en la solicitud: ${
                errorData?.error || errorData?.message || "Datos inválidos"
              }`
            );
            return false;
          } else if (status === 500) {
            toast.error("❌ Error del servidor. Contacte a Soporte.");
            console.error("Error del servidor:", errorData);
            return false;
          } else {
            toast.error(
              `❌ Error ${status}: ${
                errorData?.error || errorData?.message || "Error desconocido"
              }`
            );
            return false;
          }
        } else if (axiosError.code === "ECONNABORTED") {
          toast.error(
            "❌ Tiempo de espera agotado. Verifique su conexión a internet."
          );
          return false;
        } else if (
          axiosError.code === "ENOTFOUND" ||
          axiosError.code === "ECONNREFUSED"
        ) {
          toast.error("❌ No se pudo conectar al servidor. Verifique la URL.");
          return false;
        } else {
          toast.error(`❌ Error de conexión: ${axiosError.message}`);
          return false;
        }
      }
    } catch (error) {
      console.error("Error probando conexión:", error);
      toast.error(
        `❌ Error: ${error.message || "No se pudo conectar al servidor"}`
      );
      return false;
    }
  },

  /**
   * Maneja el paso 2: Sincronización inicial completa
   * Descarga TODOS los datos de la BD de la empresa y los guarda localmente
   */
  async handleStep2() {
    try {
      // Usar las credenciales ya validadas del paso 1
      if (!this.userCredentials || !this.userCredentials.apiUrl) {
        toast.error("Error: Debe completar el paso 1 primero");
        this.goToStep(1);
        return;
      }

      const { apiUrl, empresaId, apiKey } = this.userCredentials;

      toast.info("🔄 Iniciando sincronización inicial completa...");
      toast.info(
        "📥 Descargando todos los datos de la empresa desde la nube..."
      );

      // Llamar al endpoint de sincronización inicial completa
      const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      const initialSyncUrl = baseUrl.includes("/api/sync")
        ? `${baseUrl}/initial-sync`
        : `${baseUrl}/api/sync/initial-sync`;

      const response = await axios.post(
        initialSyncUrl,
        {
          apiKey: apiKey,
          companyId: empresaId.toString(),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 300000, // 5 minutos para descargar todos los datos
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error(
          response.data?.error || "Error en la sincronización inicial"
        );
      }

      const allData = response.data.data;
      const totalTables = Object.keys(allData).length;
      let totalRecords = 0;

      toast.info(`📊 Procesando ${totalTables} tablas...`);

      // Guardar todos los datos en la BD local
      for (const [tableName, records] of Object.entries(allData)) {
        if (!Array.isArray(records) || records.length === 0) {
          continue;
        }

        totalRecords += records.length;
        console.log(
          `📝 Guardando ${records.length} registros de ${tableName}...`
        );

        // Obtener columnas de la tabla local para filtrar solo las que existen
        let localColumns = [];
        try {
          const tableInfo = await api.dbQuery(`PRAGMA table_info(${tableName})`);
          localColumns = tableInfo.map(col => col.name);
        } catch (pragmaError) {
          console.warn(`⚠️ No se pudieron obtener columnas de ${tableName}, intentando insertar todas`);
        }

        // Insertar todos los registros de esta tabla
        for (const record of records) {
          try {
            // Filtrar solo las columnas que existen en la tabla local
            let filteredRecord = record;
            if (localColumns.length > 0) {
              filteredRecord = {};
              for (const key in record) {
                if (localColumns.includes(key)) {
                  filteredRecord[key] = record[key];
                }
              }
            }

            // Si no hay columnas válidas, saltar este registro
            if (Object.keys(filteredRecord).length === 0) {
              console.warn(`⚠️ Registro de ${tableName} sin columnas válidas, omitiendo`);
              continue;
            }

            // Construir INSERT dinámico solo con columnas válidas
            const columns = Object.keys(filteredRecord).join(", ");
            const placeholders = Object.keys(filteredRecord)
              .map(() => "?")
              .join(", ");
            const values = Object.values(filteredRecord);

            await api.dbQuery(
              `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
              values
            );
          } catch (error) {
            console.warn(`⚠️ Error guardando registro en ${tableName}:`, error.message);
            // Continuar con el siguiente registro
          }
        }
      }

      toast.info("💾 Guardando configuración de sincronización...");

      // Guardar configuración de sincronización
      const autoSyncEl = document.getElementById("auto-sync");
      const syncIntervalEl = document.getElementById("sync-interval");

      const config = {
        api_url: apiUrl,
        empresa_id: empresaId,
        auth_token: apiKey,
        auto_sync: autoSyncEl && autoSyncEl.checked ? 1 : 0,
        sync_interval: syncIntervalEl
          ? parseInt(syncIntervalEl.value) || 300
          : 300,
        enabled: 1, // Habilitar sincronización
      };

      const result = await api.syncConfigure(config);

      if (!result.success) {
        throw new Error(result.error || "Error al guardar configuración");
      }

      toast.success(
        `✅ Sincronización inicial completada: ${totalRecords} registros de ${totalTables} tablas`
      );

      // Guardar datos de la empresa en configuraciones (ya tenemos los datos del paso 1)
      if (this.userCredentials.empresaData) {
        const empresaData = this.userCredentials.empresaData.empresa;
        const usuarioData = this.userCredentials.empresaData.usuario;

        const companyConfigs = [
          { key: "empresa_id", value: empresaData.id.toString() },
          { key: "empresa_nombre", value: empresaData.nombre || "" },
          { key: "empresa_rnc", value: empresaData.rnc || "" },
          { key: "empresa_database_name", value: empresaData.database || "" },
        ];

        for (const config of companyConfigs) {
          try {
            await api.dbQuery(
              `INSERT OR REPLACE INTO configuraciones (config_key, config_value) 
               VALUES (?, ?)`,
              [config.key, config.value]
            );
          } catch (configError) {
            console.log(
              "⚠️ Error guardando configuración:",
              configError.message
            );
          }
        }

        console.log("✅ Datos de la empresa guardados:", empresaData.nombre);
        toast.success(
          `✅ Información de empresa "${empresaData.nombre}" guardada correctamente`
        );
      } else {
        console.warn(
          "⚠️ No se pudieron obtener datos de la empresa, continuando con sincronización..."
        );
      }

      // SINCRONIZACIÓN INICIAL COMPLETA: Descargar TODOS los datos de la empresa
      toast.info(
        "📥 Descargando todos los datos de la empresa... Esto puede tardar varios minutos."
      );

      try {
        // Llamar al endpoint de sincronización inicial completa
        const baseUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
        const initialSyncUrl = baseUrl.includes("/api/sync")
          ? `${baseUrl}/initial-sync`
          : `${baseUrl}/api/sync/initial-sync`;

        const response = await axios.post(
          initialSyncUrl,
          {
            apiKey: apiKey,
            companyId: empresaId.toString(),
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 300000, // 5 minutos para descargar todos los datos
          }
        );

        if (!response.data || !response.data.success) {
          throw new Error(
            response.data?.error || "Error en la sincronización inicial"
          );
        }

        const allData = response.data.data;
        const totalTables = Object.keys(allData).length;
        let totalRecords = 0;

        toast.info(`📊 Procesando ${totalTables} tablas...`);

        // Guardar todos los datos en la BD local
        for (const [tableName, records] of Object.entries(allData)) {
          if (!Array.isArray(records) || records.length === 0) {
            continue;
          }

          totalRecords += records.length;
          console.log(
            `📝 Guardando ${records.length} registros de ${tableName}...`
          );

          // Insertar todos los registros de esta tabla
          for (const record of records) {
            try {
              // Construir INSERT dinámico
              const columns = Object.keys(record).join(", ");
              const placeholders = Object.keys(record)
                .map(() => "?")
                .join(", ");
              const values = Object.values(record);

              await api.dbQuery(
                `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${placeholders})`,
                values
              );
            } catch (error) {
              console.error(`Error guardando registro en ${tableName}:`, error);
              // Continuar con el siguiente registro
            }
          }
        }

        toast.success(
          `✅ Sincronización inicial completada: ${totalRecords} registros de ${totalTables} tablas descargados.`
        );
      } catch (syncError) {
        console.error("Error en sincronización inicial:", syncError);
        if (
          syncError.response &&
          syncError.response.data &&
          syncError.response.data.error
        ) {
          toast.error(
            `❌ Error en sincronización: ${syncError.response.data.error}`
          );
        } else {
          toast.warning(
            `⚠️ Configuración guardada, pero hubo un problema en la sincronización inicial: ${syncError.message}`
          );
          toast.info(
            "Puede intentar sincronizar manualmente desde el menú de Sincronización."
          );
        }
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
        console.log(
          "⚠️ Tabla configuraciones no encontrada, intentando crear..."
        );
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

      toast.success(
        "🎉 ¡Configuración completada exitosamente! Los datos de su empresa están sincronizados localmente."
      );

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
