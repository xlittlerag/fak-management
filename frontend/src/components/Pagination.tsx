import { Button } from './ui/Button';

interface PaginationProps {
  page: number;
  totalPages?: number;
  hasNext?: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  hasNext,
  onPageChange,
}: PaginationProps) {
  const noMore =
    hasNext !== undefined
      ? !hasNext
      : totalPages !== undefined && page >= totalPages - 1;
  if (totalPages !== undefined && totalPages <= 1) return null;

  return (
    <div class="flex items-center justify-between text-sm">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
      >
        Página anterior
      </Button>
      <span class="tnum text-steel">
        Página {page + 1}
        {totalPages !== undefined && <span> de {totalPages}</span>}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={noMore}
      >
        Página siguiente
      </Button>
    </div>
  );
}
