import { Modal } from './Modal';

export function ConfirmModal({
  isOpen, onClose, onConfirm, title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false,
}: {
  isOpen: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string;
  confirmText?: string; cancelText?: string; danger?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p class="text-sm text-slate-600 mb-6">{message}</p>
      <div class="flex gap-3">
        <button onClick={onClose}
          class="w-full bg-slate-100 text-slate-700 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors"
        >
          {cancelText}
        </button>
        <button onClick={() => { onConfirm(); onClose(); }}
          class={`w-full py-2 rounded-md font-medium text-white transition-colors ${
            danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
