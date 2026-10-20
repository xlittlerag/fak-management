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
    <div class="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span class="tnum order-first w-full text-center text-steel sm:order-none sm:w-auto">
        Página {page + 1}
        {totalPages !== undefined && <span> de {totalPages}</span>}
      </span>
      <Button
        variant="secondary"
        size="sm"
        class="flex-1 sm:flex-none"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
      >
        Página anterior
      </Button>
      <Button
        variant="secondary"
        size="sm"
        class="flex-1 sm:flex-none"
        onClick={() => onPageChange(page + 1)}
        disabled={noMore}
      >
        Página siguiente
      </Button>
    </div>
  );
}
