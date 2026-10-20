/**
 * Adapta las tablas al patrón de tarjetas en móvil copiando las etiquetas
 * del <thead> a `data-label` en cada <td>. El CSS (`.table-cards`) usa ese
 * atributo con `content: attr(data-label)` para mostrar el nombre de la
 * columna sin duplicar markup en cada fila.
 *
 * Se usa un MutationObserver porque las tablas se renderizan después de
 * cargar datos y algunas filas se agregan/actualizan dinámicamente.
 */
let started = false;

function labelTable(table: HTMLTableElement) {
  table.classList.add('table-cards');

  const headerCells = Array.from(
    table.tHead?.rows[0]?.cells ?? [],
  ) as HTMLTableCellElement[];
  if (headerCells.length === 0) return;

  for (const body of Array.from(table.tBodies)) {
    for (const row of Array.from(body.rows)) {
      Array.from(row.cells).forEach((cell, index) => {
        if (cell.dataset.label !== undefined) return;
        cell.dataset.label =
          cell.colSpan > 1
            ? ''
            : (headerCells[index]?.textContent ?? '').trim();
      });
    }
  }
}

function scan(root: ParentNode) {
  if (root instanceof HTMLTableElement) {
    labelTable(root);
    return;
  }

  if (root instanceof Element) {
    const table = root.closest('table');
    if (table instanceof HTMLTableElement) {
      labelTable(table);
      return;
    }
  }

  root.querySelectorAll?.('table').forEach((table) => {
    if (table instanceof HTMLTableElement) labelTable(table);
  });
}

export function initResponsiveTables() {
  if (started || typeof document === 'undefined') return;
  started = true;

  scan(document);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== 'childList') continue;
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) scan(node);
      });
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}
