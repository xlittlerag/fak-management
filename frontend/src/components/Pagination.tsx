interface PaginationProps {
  page: number;
  totalPages?: number;
  hasNext?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, hasNext, onPageChange }: PaginationProps) {
  const noMore = hasNext !== undefined ? !hasNext : totalPages !== undefined && page >= totalPages - 1;
  if (totalPages !== undefined && totalPages <= 1) return null;

  return (
    <div class="flex justify-between items-center text-sm text-slate-600">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        class="px-4 py-2 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Página anterior
      </button>
      <span class="text-slate-500">
        Página {page + 1}
        {totalPages !== undefined && <span> de {totalPages}</span>}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={noMore}
        class="px-4 py-2 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Página siguiente
      </button>
    </div>
  );
}
