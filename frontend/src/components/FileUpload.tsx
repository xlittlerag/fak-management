import { useState } from 'preact/hooks';

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

  const handleChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0] || null;
    setError('');

    if (!file) {
      onFileChange(null);
      return;
    }

    if (file.size > maxSize) {
      setError(`El archivo excede el tamaño máximo de ${(maxSize / 1024 / 1024).toFixed(0)}MB.`);
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
    ? 'text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700'
    : 'block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200';

  return (
    <div>
      <label class={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-700 mb-1`}>
        {label}
        {!required && <span class="text-slate-400 font-normal"> (opcional)</span>}
      </label>
      <div class="flex items-center gap-2">
        <input
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
            class="text-red-500 hover:text-red-700 text-xs font-medium"
          >
            Quitar
          </button>
        )}
      </div>
      {currentFile && (
        <p class="text-xs text-green-600 mt-1">Archivo seleccionado: {currentFile.name}</p>
      )}
      {error && (
        <p class="text-xs text-red-600 mt-1">{error}</p>
      )}
      <p class={`text-xs text-slate-400 mt-0.5`}>
        Máximo {(maxSize / 1024 / 1024).toFixed(0)}MB — PDF, JPG o PNG
      </p>
    </div>
  );
}
