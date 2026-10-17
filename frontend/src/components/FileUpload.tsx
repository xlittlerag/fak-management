import { useId, useState } from 'preact/hooks';

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

interface FileUploadProps {
  label: string;
  accept?: string;
  maxSize?: number;
  currentFile: File | null;
  onFileChange: (file: File | null) => void;
  compact?: boolean;
  disabled?: boolean;
  required?: boolean;
}

export function FileUpload({
  label,
  accept = '.jpg,.jpeg,.png,.pdf',
  maxSize = MAX_SIZE,
  currentFile,
  onFileChange,
  compact = false,
  disabled = false,
  required = false,
}: FileUploadProps) {
  const [error, setError] = useState('');
  const inputId = useId();

  const handleChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0] || null;
    setError('');

    if (!file) {
      onFileChange(null);
      return;
    }

    if (file.size > maxSize) {
      setError(
        `El archivo excede el tamaño máximo de ${(maxSize / 1024 / 1024).toFixed(0)}MB.`,
      );
      onFileChange(null);
      (e.target as HTMLInputElement).value = '';
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Solo se permiten archivos PDF, JPG o PNG.');
      onFileChange(null);
      (e.target as HTMLInputElement).value = '';
      return;
    }

    onFileChange(file);
  };

  const handleClear = () => {
    setError('');
    onFileChange(null);
  };

  const inputClass = compact
    ? 'text-xs text-steel file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-ai-soft file:text-ai'
    : 'block w-full text-sm text-steel file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-ai-soft file:text-ai hover:file:bg-ai/20';

  return (
    <div>
      <label
        htmlFor={inputId}
        class={`mb-1 block ${compact ? 'text-xs' : 'text-sm'} font-medium text-ink`}
      >
        {label}
        {!required && <span class="font-normal text-steel"> (opcional)</span>}
      </label>
      <div class="flex items-center gap-2">
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleChange}
          class={inputClass}
          disabled={disabled}
        />
        {currentFile && (
          <button
            type="button"
            onClick={handleClear}
            class="text-xs font-medium text-hinomaru hover:text-hinomaru/80"
          >
            Quitar
          </button>
        )}
      </div>
      {currentFile && (
        <p class="mt-1 text-xs text-success">
          Archivo seleccionado: {currentFile.name}
        </p>
      )}
      {error && (
        <p class="mt-1 text-xs text-hinomaru" role="alert">
          {error}
        </p>
      )}
      <p class="mt-0.5 text-xs text-steel">
        Máximo {(maxSize / 1024 / 1024).toFixed(0)}MB — PDF, JPG o PNG
      </p>
    </div>
  );
}
