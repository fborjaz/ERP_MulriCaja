/**
 * Componente Base para Modales
 * @module renderer/components/modals/modal.base
 */

export class ModalBase {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.modal = null;
    this.onSave = null;
    this.onClose = null;
  }

  /**
   * Crea el HTML del modal
   * @param {string} content - Contenido HTML del modal
   * @returns {string} HTML completo del modal
   */
  createHTML(content) {
    return `
      <div class="modal" id="${this.id}">
        <div class="modal-content">
          <div class="modal-header">
            <h2>${this.title}</h2>
            <button class="modal-close" data-action="close">&times;</button>
          </div>
          <div class="modal-body">
            ${content}
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-action="close">Cancelar</button>
            <button class="btn btn-primary" id="${this.id}-save">Guardar</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Inicializa los event listeners del modal
   */
  initListeners() {
    if (!this.modal) return;

    // Botones de cerrar
    this.modal.querySelectorAll('[data-action="close"]').forEach((btn) => {
      btn.onclick = () => this.hide();
    });

    // Click fuera del modal para cerrar
    window.onclick = (event) => {
      if (event.target === this.modal) {
        this.hide();
      }
    };
  }

  /**
   * Muestra el modal
   */
  show() {
    if (!this.modal) {
      this.modal = document.getElementById(this.id);
      this.initListeners();
    }
    if (this.modal) {
      this.modal.style.display = "flex";
    }
  }

  /**
   * Oculta el modal
   */
  hide() {
    if (this.modal) {
      this.modal.style.display = "none";
      if (this.onClose) {
        this.onClose();
      }
    }
  }

  /**
   * Establece el callback de guardar
   * @param {Function} callback - Función a ejecutar al guardar
   */
  setSaveCallback(callback) {
    this.onSave = callback;
    // Esperar a que el modal esté en el DOM
    setTimeout(() => {
      const saveBtn = document.getElementById(`${this.id}-save`);
      if (saveBtn) {
        saveBtn.onclick = async () => {
          try {
            await callback();
            this.hide();
          } catch (error) {
            console.error("Error al guardar:", error);
            // Usar toast si está disponible, sino alert
            if (window.toast) {
              window.toast.error("Error: " + error.message);
            } else {
              alert("Error: " + error.message);
            }
          }
        };
      }
    }, 100);
  }
}

export default ModalBase;
