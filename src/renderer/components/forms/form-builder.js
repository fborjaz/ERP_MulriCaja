/**
 * Componente de Formulario Reutilizable
 * @module renderer/components/forms/form-builder
 */

export class FormBuilder {
  constructor(formId, options = {}) {
    this.formId = formId;
    this.options = {
      fields: options.fields || [],
      onSubmit: options.onSubmit || null,
      submitLabel: options.submitLabel || "Guardar",
      cancelLabel: options.cancelLabel || "Cancelar",
      onCancel: options.onCancel || null,
    };
  }

  /**
   * Renderiza el formulario
   */
  render() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    let html = '<div class="form-builder">';

    this.options.fields.forEach((field) => {
      html += this.renderField(field);
    });

    html += '<div class="form-actions">';
    if (this.options.onCancel) {
      html += `<button type="button" class="btn btn-secondary" id="${this.formId}-cancel">${this.options.cancelLabel}</button>`;
    }
    html += `<button type="submit" class="btn btn-primary" id="${this.formId}-submit">${this.options.submitLabel}</button>`;
    html += "</div>";
    html += "</div>";

    form.innerHTML = html;
    this.setupEventListeners();
  }

  /**
   * Renderiza un campo
   */
  renderField(field) {
    let html = `<div class="form-group ${field.required ? "required" : ""}">`;
    html += `<label for="${field.name}">${field.label}${
      field.required ? " *" : ""
    }</label>`;

    switch (field.type) {
      case "text":
      case "email":
      case "number":
      case "password":
      case "date":
        html += `<input type="${field.type}" 
                       id="${field.name}" 
                       name="${field.name}" 
                       ${field.required ? "required" : ""}
                       ${
                         field.placeholder
                           ? `placeholder="${field.placeholder}"`
                           : ""
                       }
                       ${field.value ? `value="${field.value}"` : ""}
                       class="form-control">`;
        break;

      case "textarea":
        html += `<textarea id="${field.name}" 
                          name="${field.name}" 
                          ${field.required ? "required" : ""}
                          ${
                            field.placeholder
                              ? `placeholder="${field.placeholder}"`
                              : ""
                          }
                          class="form-control">${field.value || ""}</textarea>`;
        break;

      case "select":
        html += `<select id="${field.name}" 
                        name="${field.name}" 
                        ${field.required ? "required" : ""}
                        class="form-control">`;
        if (field.options) {
          field.options.forEach((opt) => {
            html += `<option value="${opt.value}" ${
              field.value === opt.value ? "selected" : ""
            }>${opt.label}</option>`;
          });
        }
        html += "</select>";
        break;

      case "checkbox":
        html += `<input type="checkbox" 
                       id="${field.name}" 
                       name="${field.name}" 
                       ${field.value ? "checked" : ""}
                       class="form-checkbox">`;
        break;
    }

    if (field.help) {
      html += `<small class="form-help">${field.help}</small>`;
    }

    html += "</div>";
    return html;
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    const form = document.getElementById(this.formId);
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (this.options.onSubmit) {
        const data = this.getData();
        this.options.onSubmit(data);
      }
    });

    if (this.options.onCancel) {
      const cancelBtn = document.getElementById(`${this.formId}-cancel`);
      if (cancelBtn) {
        cancelBtn.addEventListener("click", this.options.onCancel);
      }
    }
  }

  /**
   * Obtiene los datos del formulario
   */
  getData() {
    const data = {};
    this.options.fields.forEach((field) => {
      const element = document.getElementById(field.name);
      if (element) {
        if (field.type === "checkbox") {
          data[field.name] = element.checked;
        } else {
          data[field.name] = element.value;
        }
      }
    });
    return data;
  }

  /**
   * Establece los datos del formulario
   */
  setData(data) {
    this.options.fields.forEach((field) => {
      const element = document.getElementById(field.name);
      if (element && data[field.name] !== undefined) {
        if (field.type === "checkbox") {
          element.checked = data[field.name];
        } else {
          element.value = data[field.name];
        }
      }
    });
  }

  /**
   * Resetea el formulario
   */
  reset() {
    const form = document.getElementById(this.formId);
    if (form) {
      form.reset();
    }
  }
}

export default FormBuilder;
