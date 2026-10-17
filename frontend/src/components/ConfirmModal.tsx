import { Modal } from './Modal';
import { Button } from './ui/Button';

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  danger = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p class="mb-6 text-sm text-steel">{message}</p>
      <div class="flex gap-3">
        <Button variant="secondary" class="w-full" onClick={onClose}>
          {cancelText}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          class="w-full"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
}
