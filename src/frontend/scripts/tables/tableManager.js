import { escapeHTML, downloadFile, refreshIcons } from '../ui/dom.js';

export class TableManager {
  constructor({
    tableId,
    searchInputId,
    filterId = null,
    filterCallback = null,
    paginationId,
    summaryId,
    exportButtonId = null,
    pageSizeOptions = [10, 25, 50],
    columns
  }) {
    this.table = document.querySelector(`#${tableId} tbody`);
    this.tableElement = document.getElementById(tableId);
    this.searchInput = searchInputId ? document.getElementById(searchInputId) : null;
    this.filterElement = filterId ? document.getElementById(filterId) : null;
    this.filterCallback = filterCallback;
    this.paginationEl = document.getElementById(paginationId);
    this.summaryEl = summaryId ? document.getElementById(summaryId) : null;
    this.exportButton = exportButtonId ? document.getElementById(exportButtonId) : null;
    this.pageSizeOptions = pageSizeOptions;
    this.columns = columns;
    this.currentPage = 1;
    this.pageSize = pageSizeOptions[0];
    this.data = [];
    this.filtered = [];
    this.sortKey = null;
    this.sortDirection = 'asc';

    this.setupEvents();
  }

  setupEvents() {
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => {
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    if (this.filterElement && this.filterCallback) {
      this.filterElement.addEventListener('change', () => {
        this.currentPage = 1;
        this.applyFilters();
      });
    }

    if (this.tableElement) {
      const headers = this.tableElement.querySelectorAll('thead th[data-sort]');
      headers.forEach((header) => {
        header.addEventListener('click', () => {
          const key = header.dataset.sort;
          this.toggleSort(key);
        });
      });
    }

    if (this.exportButton) {
      this.exportButton.addEventListener('click', () => {
        this.exportCSV();
      });
    }
  }

  setData(data) {
    this.data = Array.isArray(data) ? data : [];
    this.applyFilters();
  }

  applyFilters() {
    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase().trim() : '';
    const filterValue = this.filterElement ? this.filterElement.value : 'all';

    this.filtered = this.data.filter((item) => {
      const matchesSearch = !searchTerm || this.columns.some((col) => {
        if (col.excludeFromSearch) return false;
        const value = typeof col.accessor === 'function' ? col.accessor(item) : item[col.key];
        return value && value.toString().toLowerCase().includes(searchTerm);
      });

      const matchesFilter = this.filterCallback ? this.filterCallback(item, filterValue) : true;
      return matchesSearch && matchesFilter;
    });

    if (this.sortKey) {
      this.filtered.sort((a, b) => this.compareValues(a, b));
    }

    this.render();
  }

  toggleSort(key) {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }

    this.applyFilters();
  }

  compareValues(a, b) {
    const column = this.columns.find((col) => col.key === this.sortKey);
    if (!column) return 0;

    const valueA = typeof column.accessor === 'function' ? column.accessor(a) : a[column.key];
    const valueB = typeof column.accessor === 'function' ? column.accessor(b) : b[column.key];

    if (valueA === valueB) return 0;
    if (valueA === undefined || valueA === null) return this.sortDirection === 'asc' ? -1 : 1;
    if (valueB === undefined || valueB === null) return this.sortDirection === 'asc' ? 1 : -1;

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return this.sortDirection === 'asc'
        ? valueA.localeCompare(valueB, 'id')
        : valueB.localeCompare(valueA, 'id');
    }

    return this.sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
  }

  render() {
    if (!this.table) return;

    const totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }

    const start = (this.currentPage - 1) * this.pageSize;
    const pageData = this.filtered.slice(start, start + this.pageSize);

    const rows = pageData.map((item) => {
      const cells = this.columns
        .map((col) => {
          const content = col.render
            ? col.render(item)
            : escapeHTML(
                typeof col.accessor === 'function'
                  ? col.accessor(item) ?? ''
                  : item[col.key] ?? ''
              );
          const label = escapeHTML(col.label ?? col.key);
          return `<td data-label="${label}">${content}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    });

    this.table.innerHTML =
      rows.join('') ||
      '<tr><td colspan="100%" class="py-10 text-center text-sm text-slate-400">Tidak ada data untuk ditampilkan.</td></tr>';

    this.renderPagination(totalPages);
    this.renderSummary(pageData.length);
    refreshIcons();
  }

  renderPagination(totalPages) {
    if (!this.paginationEl) return;

    const controls = [];
    controls.push(`
      <button class="rounded-full px-3 py-1 text-xs font-semibold ${this.currentPage === 1 ? 'text-slate-400' : 'text-sky-500'}"
        ${this.currentPage === 1 ? 'disabled' : ''} data-page="prev">Prev</button>
    `);

    controls.push(`<span class="text-xs text-slate-400">Halaman ${this.currentPage} dari ${totalPages}</span>`);

    controls.push(`
      <button class="rounded-full px-3 py-1 text-xs font-semibold ${
        this.currentPage === totalPages ? 'text-slate-400' : 'text-sky-500'
      }"
        ${this.currentPage === totalPages ? 'disabled' : ''} data-page="next">Next</button>
    `);

    controls.push(`
      <label class="flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1">
        <span class="text-xs text-slate-400">Show</span>
        <select class="rounded-full border-none bg-transparent text-xs focus:ring-0" data-page="size">
          ${this.pageSizeOptions
            .map((size) => `<option value="${size}" ${size === this.pageSize ? 'selected' : ''}>${size}</option>`)
            .join('')}
        </select>
      </label>
    `);

    this.paginationEl.innerHTML = controls.join('');

    this.paginationEl.querySelectorAll('button[data-page]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.page;
        if (type === 'prev' && this.currentPage > 1) {
          this.currentPage -= 1;
        }
        if (type === 'next' && this.currentPage < totalPages) {
          this.currentPage += 1;
        }
        this.render();
      });
    });

    const select = this.paginationEl.querySelector('select[data-page="size"]');
    if (select) {
      select.addEventListener('change', () => {
        this.pageSize = Number(select.value);
        this.currentPage = 1;
        this.render();
      });
    }
  }

  renderSummary(currentCount) {
    if (!this.summaryEl) return;
    const total = this.filtered.length;
    const start = total === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    const end = (this.currentPage - 1) * this.pageSize + currentCount;
    this.summaryEl.textContent = `Menampilkan ${start}-${end} dari ${total} entri`;
  }

  exportCSV() {
    const headers = this.columns
      .filter((col) => !col.excludeFromExport)
      .map((col) => '"' + (col.label ?? col.key) + '"');

    const rows = this.filtered.map((item) => {
      return this.columns
        .filter((col) => !col.excludeFromExport)
        .map((col) => {
          const value = col.exportAccessor
            ? col.exportAccessor(item)
            : typeof col.accessor === 'function'
            ? col.accessor(item)
            : item[col.key];
          return '"' + (value ?? '').toString().replace(/"/g, '""') + '"';
        })
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `${this.tableElement.id}-${Date.now()}.csv`, 'text/csv;charset=utf-8;');
  }
}
