export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children?: preact.ComponentChildren;
}) {
  if (!isOpen) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        class="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-steel-soft bg-surface p-5 shadow-float sm:p-6"
      >
        <div class="mb-4 flex min-w-0 items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-display text-fluid-lg text-ink">{title}</h2>
            {subtitle && (
              <p class="mt-0.5 truncate text-sm text-steel">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            class="touch-target -mt-2 -mr-2 shrink-0 rounded-md text-steel transition-colors hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
