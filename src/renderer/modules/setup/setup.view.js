/**
 * Vista de Configuración Inicial (Setup Wizard)
 * @module renderer/modules/setup/setup.view
 */

import { api } from "../../core/api.js";
import { toast } from "../../components/notifications/toast.js";
import bcrypt from "bcryptjs";
import { Validator } from "../../utils/validator.util.js";

export const SetupView = {
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

          <div class="setup-content">
            <div class="setup-step active" id="step-1">
              <h2>Paso 1: Configurar Administrador</h2>
              <p class="step-description">
                Por seguridad, debe establecer una contraseña segura para el usuario administrador.
              </p>

              <form id="setup-form">
                <div class="form-group">
                  <label>Nombre del Administrador</label>
                  <input
                    type="text"
                    id="admin-nombre"
                    value="Administrador"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>Apellido</label>
                  <input
                    type="text"
                    id="admin-apellido"
                    value="Sistema"
                    required
                  />
                </div>

                <div class="form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    id="admin-username"
                    value="admin"
                    readonly
                    class="readonly-input"
                  />
                  <small>El nombre de usuario "admin" no se puede cambiar</small>
                </div>

                <div class="form-group">
                  <label>Nueva Contraseña *</label>
                  <div class="password-input-wrapper">
                    <input
                      type="password"
                      id="admin-password"
                      placeholder="Mínimo 8 caracteres"
                      required
                    />
                    <button type="button" class="toggle-password" id="toggle-password-1">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                  <div class="password-strength" id="password-strength">
                    <div class="strength-bar">
                      <div class="strength-bar-fill" id="strength-bar-fill"></div>
                    </div>
                    <span class="strength-text" id="strength-text">Ingrese una contraseña</span>
                  </div>
                </div>

                <div class="form-group">
                  <label>Confirmar Contraseña *</label>
                  <div class="password-input-wrapper">
                    <input
                      type="password"
                      id="admin-password-confirm"
                      placeholder="Repita la contraseña"
                      required
                    />
                    <button type="button" class="toggle-password" id="toggle-password-2">
                      <span class="material-icons">visibility</span>
                    </button>
                  </div>
                </div>

                <div class="password-requirements">
                  <h4>Requisitos de la contraseña:</h4>
                  <ul>
                    <li id="req-length">
                      <span class="material-icons">radio_button_unchecked</span>
                      Mínimo 8 caracteres
                    </li>
                    <li id="req-uppercase">
                      <span class="material-icons">radio_button_unchecked</span>
                      Al menos una mayúscula
                    </li>
                    <li id="req-lowercase">
                      <span class="material-icons">radio_button_unchecked</span>
                      Al menos una minúscula
                    </li>
                    <li id="req-number">
                      <span class="material-icons">radio_button_unchecked</span>
                      Al menos un número
                    </li>
                  </ul>
                </div>

                <div class="setup-actions">
                  <button type="submit" class="btn btn-primary btn-large">
                    <span class="material-icons">check_circle</span>
                    Completar Configuración
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div class="setup-footer">
            <p>🔒 Esta configuración solo se realiza una vez</p>
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
    this.checkPasswordStrength();
  },

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    const form = document.getElementById("setup-form");
    const passwordInput = document.getElementById("admin-password");
    const passwordConfirmInput = document.getElementById(
      "admin-password-confirm"
    );
    const togglePassword1 = document.getElementById("toggle-password-1");
    const togglePassword2 = document.getElementById("toggle-password-2");

    // Submit del formulario
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSetup();
    });

    // Toggle visibility de contraseña
    togglePassword1.addEventListener("click", () => {
      this.togglePasswordVisibility("admin-password", togglePassword1);
    });

    togglePassword2.addEventListener("click", () => {
      this.togglePasswordVisibility("admin-password-confirm", togglePassword2);
    });

    // Validación en tiempo real de contraseña
    passwordInput.addEventListener("input", () => {
      this.checkPasswordStrength();
      this.validatePasswordMatch();
    });

    passwordConfirmInput.addEventListener("input", () => {
      this.validatePasswordMatch();
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
   * Verifica la fortaleza de la contraseña
   */
  checkPasswordStrength() {
    const password = document.getElementById("admin-password").value;
    const strengthBar = document.getElementById("strength-bar-fill");
    const strengthText = document.getElementById("strength-text");

    // Requisitos
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };

    // Actualizar UI de requisitos
    this.updateRequirementUI("req-length", requirements.length);
    this.updateRequirementUI("req-uppercase", requirements.uppercase);
    this.updateRequirementUI("req-lowercase", requirements.lowercase);
    this.updateRequirementUI("req-number", requirements.number);

    // Calcular fortaleza
    const metRequirements = Object.values(requirements).filter(Boolean).length;
    let strength = 0;
    let strengthLabel = "";
    let strengthClass = "";

    if (password.length === 0) {
      strength = 0;
      strengthLabel = "Ingrese una contraseña";
      strengthClass = "";
    } else if (metRequirements <= 1) {
      strength = 25;
      strengthLabel = "Muy débil";
      strengthClass = "weak";
    } else if (metRequirements === 2) {
      strength = 50;
      strengthLabel = "Débil";
      strengthClass = "fair";
    } else if (metRequirements === 3) {
      strength = 75;
      strengthLabel = "Buena";
      strengthClass = "good";
    } else if (metRequirements === 4) {
      strength = 100;
      strengthLabel = "Excelente";
      strengthClass = "excellent";
    }

    strengthBar.style.width = `${strength}%`;
    strengthBar.className = `strength-bar-fill ${strengthClass}`;
    strengthText.textContent = strengthLabel;
    strengthText.className = `strength-text ${strengthClass}`;
  },

  /**
   * Actualiza UI de requisito individual
   */
  updateRequirementUI(elementId, met) {
    const element = document.getElementById(elementId);
    const icon = element.querySelector(".material-icons");

    if (met) {
      element.classList.add("met");
      icon.textContent = "check_circle";
    } else {
      element.classList.remove("met");
      icon.textContent = "radio_button_unchecked";
    }
  },

  /**
   * Valida que las contraseñas coincidan
   */
  validatePasswordMatch() {
    const password = document.getElementById("admin-password").value;
    const confirm = document.getElementById("admin-password-confirm").value;
    const confirmInput = document.getElementById("admin-password-confirm");

    if (confirm.length > 0) {
      if (password === confirm) {
        confirmInput.classList.remove("error");
        confirmInput.classList.add("success");
      } else {
        confirmInput.classList.remove("success");
        confirmInput.classList.add("error");
      }
    } else {
      confirmInput.classList.remove("success", "error");
    }
  },

  /**
   * Valida la contraseña
   */
  validatePassword(password) {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
    };

    const allMet = Object.values(requirements).every(Boolean);

    if (!allMet) {
      const missing = [];
      if (!requirements.length) missing.push("mínimo 8 caracteres");
      if (!requirements.uppercase) missing.push("una mayúscula");
      if (!requirements.lowercase) missing.push("una minúscula");
      if (!requirements.number) missing.push("un número");

      throw new Error(`La contraseña debe contener: ${missing.join(", ")}`);
    }

    return true;
  },

  /**
   * Maneja el proceso de setup
   */
  async handleSetup() {
    try {
      const nombre = document.getElementById("admin-nombre").value.trim();
      const apellido = document.getElementById("admin-apellido").value.trim();
      const password = document.getElementById("admin-password").value;
      const passwordConfirm = document.getElementById(
        "admin-password-confirm"
      ).value;

      // Validaciones
      if (!Validator.isNotEmpty(nombre)) {
        toast.error("El nombre es requerido");
        return;
      }

      if (!Validator.isNotEmpty(apellido)) {
        toast.error("El apellido es requerido");
        return;
      }

      if (!Validator.isNotEmpty(password)) {
        toast.error("La contraseña es requerida");
        return;
      }

      // Validar fortaleza de contraseña
      this.validatePassword(password);

      // Validar que coincidan
      if (password !== passwordConfirm) {
        toast.error("Las contraseñas no coinciden");
        return;
      }

      // Hashear contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Actualizar usuario admin en la base de datos
      await api.dbQuery(
        `UPDATE usuarios 
         SET nombre = ?, apellido = ?, password = ? 
         WHERE username = 'admin'`,
        [nombre, apellido, hashedPassword]
      );

      // Marcar setup como completado
      await api.dbQuery(
        `INSERT OR REPLACE INTO configuracion (clave, valor, descripcion) 
         VALUES ('setup_completed', 'true', 'Setup inicial completado')`,
        []
      );

      toast.success("¡Configuración completada exitosamente!");

      // Esperar un momento y recargar
      setTimeout(() => {
        location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error en setup:", error);
      toast.error(error.message || "Error al completar la configuración");
    }
  },
};

export default SetupView;
