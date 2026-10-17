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
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div class="w-full max-w-md rounded-xl border border-steel-soft bg-surface p-6 shadow-float">
        <div class="mb-4 flex min-w-0 items-start justify-between">
          <div class="min-w-0">
            <h2 class="font-display text-lg text-ink">{title}</h2>
            {subtitle && (
              <p class="mt-0.5 truncate text-sm text-steel">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            class="ml-2 shrink-0 text-steel transition-colors hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
