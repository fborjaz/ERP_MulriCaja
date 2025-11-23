/**
 * Componente de Tabla Reutilizable
 * @module renderer/components/tables/data-table
 */

import { debounce } from "../../utils/helpers.js";

export class DataTable {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = {
      columns: options.columns || [],
      data: options.data || [],
      pagination: options.pagination !== false,
      pageSize: options.pageSize || 10,
      searchable: options.searchable !== false,
      sortable: options.sortable !== false,
      actions: options.actions || [],
      onRowClick: options.onRowClick || null,
    };
    this.currentPage = 1;
    this.filteredData = [...this.options.data];
  }

  /**
   * Renderiza la tabla
   */
  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let html = '<div class="data-table-wrapper">';

    // Barra de búsqueda
    if (this.options.searchable) {
      html += `
        <div class="data-table-header">
          <input type="text" 
                 class="data-table-search" 
                 placeholder="Buscar..." 
                 id="${this.containerId}-search">
        </div>
      `;
    }

    // Tabla
    html += '<table class="data-table">';
    html += "<thead><tr>";

    this.options.columns.forEach((col) => {
      const sortable = this.options.sortable && col.sortable !== false;
      html += `<th ${sortable ? 'class="sortable"' : ""}>${col.label}</th>`;
    });

    if (this.options.actions.length > 0) {
      html += "<th>Acciones</th>";
    }

    html += "</tr></thead>";
    html += '<tbody id="' + this.containerId + '-tbody"></tbody>';
    html += "</table>";

    // Paginación
    if (this.options.pagination) {
      html += `<div class="data-table-pagination" id="${this.containerId}-pagination"></div>`;
    }

    html += "</div>";
    container.innerHTML = html;

    // Event listeners
    this.setupEventListeners();
    this.renderRows();
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    if (this.options.searchable) {
      const searchInput = document.getElementById(`${this.containerId}-search`);
      if (searchInput) {
        searchInput.addEventListener(
          "input",
          debounce((e) => {
            this.search(e.target.value);
          }, 300)
        );
      }
    }
  }

  /**
   * Renderiza las filas
   */
  renderRows() {
    const tbody = document.getElementById(`${this.containerId}-tbody`);
    if (!tbody) return;

    const start = (this.currentPage - 1) * this.options.pageSize;
    const end = start + this.options.pageSize;
    const pageData = this.options.pagination
      ? this.filteredData.slice(start, end)
      : this.filteredData;

    if (pageData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="${
        this.options.columns.length + (this.options.actions.length > 0 ? 1 : 0)
      }" style="text-align: center;">No hay datos</td></tr>`;
      return;
    }

    tbody.innerHTML = pageData
      .map((row, index) => {
        let html = "<tr>";

        this.options.columns.forEach((col) => {
          const value = col.field ? row[col.field] : "";
          const formatted = col.formatter ? col.formatter(value, row) : value;
          html += `<td>${formatted}</td>`;
        });

        if (this.options.actions.length > 0) {
          html += '<td class="actions">';
          this.options.actions.forEach((action) => {
            // Usar data attributes en lugar de onclick inline para mejor seguridad
            html += `<button class="btn btn-sm btn-${action.type || "primary"}" 
                          data-action="${action.handler}"
                          data-id="${row.id || index}">${
              action.label
            }</button>`;
          });
          html += "</td>";
        }

        html += "</tr>";
        return html;
      })
      .join("");

    // Re-attach action listeners
    if (this.options.actions.length > 0) {
      this.options.actions.forEach((action) => {
        tbody
          .querySelectorAll(`[data-action="${action.handler}"]`)
          .forEach((btn) => {
            btn.onclick = () => {
              const id = btn.getAttribute("data-id");
              // Buscar la función en window o ejecutar si es función directa
              if (typeof window[action.handler] === "function") {
                window[action.handler](id);
              } else {
                console.warn(`Handler ${action.handler} no encontrado`);
              }
            };
          });
      });
    }

    this.renderPagination();
  }

  /**
   * Renderiza la paginación
   */
  renderPagination() {
    if (!this.options.pagination) return;

    const paginationEl = document.getElementById(
      `${this.containerId}-pagination`
    );
    if (!paginationEl) return;

    const totalPages = Math.ceil(
      this.filteredData.length / this.options.pageSize
    );

    let html = `<span>Página ${this.currentPage} de ${totalPages}</span>`;
    html += `<button class="btn-prev" ${
      this.currentPage === 1 ? "disabled" : ""
    }>Anterior</button>`;
    html += `<button class="btn-next" ${
      this.currentPage === totalPages ? "disabled" : ""
    }>Siguiente</button>`;

    paginationEl.innerHTML = html;

    // Listeners de paginación
    const prevBtn = paginationEl.querySelector(".btn-prev");
    const nextBtn = paginationEl.querySelector(".btn-next");

    if (prevBtn) prevBtn.onclick = () => this.previousPage();
    if (nextBtn) nextBtn.onclick = () => this.nextPage();
  }

  /**
   * Busca en los datos
   */
  search(query) {
    const lowerQuery = query.toLowerCase();
    this.filteredData = this.options.data.filter((row) => {
      return this.options.columns.some((col) => {
        const value = row[col.field];
        return value && value.toString().toLowerCase().includes(lowerQuery);
      });
    });
    this.currentPage = 1;
    this.renderRows();
  }

  /**
   * Actualiza los datos
   */
  updateData(newData) {
    this.options.data = newData;
    this.filteredData = [...newData];
    this.currentPage = 1;
    this.renderRows();
  }

  /**
   * Página anterior
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderRows();
    }
  }

  /**
   * Página siguiente
   */
  nextPage() {
    const totalPages = Math.ceil(
      this.filteredData.length / this.options.pageSize
    );
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderRows();
    }
  }
}

export default DataTable;
