export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: any }) {
  if (!isOpen) return null;
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100">
        <div class="flex justify-between items-center mb-4 min-w-0">
          <h2 class="text-lg font-bold text-slate-900 truncate whitespace-nowrap overflow-hidden">{title}</h2>
          <button onClick={onClose} class="text-slate-400 hover:text-slate-600 transition-colors ml-2 flex-shrink-0">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
