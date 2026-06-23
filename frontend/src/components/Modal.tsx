export function Modal({ isOpen, onClose, title, subtitle, children }: { isOpen: boolean, onClose: () => void, title: string, subtitle?: string, children?: preact.ComponentChildren }) {
  if (!isOpen) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div class="flex justify-between items-start mb-4 min-w-0">
          <div class="min-w-0">
            <h2 class="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p class="text-sm font-semibold text-slate-600 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} class="text-slate-400 hover:text-slate-600 transition-colors ml-2 flex-shrink-0">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
