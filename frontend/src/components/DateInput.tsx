function toDDMMYYYY(iso: string | undefined): string {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function toISO(ddmmyyyy: string): string {
  if (!ddmmyyyy) return '';
  const m = ddmmyyyy.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return ddmmyyyy;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

interface DateInputProps {
  value?: string;
  onInput: (e: Event) => void;
  class?: string;
  required?: boolean;
  name?: string;
}

export function DateInput({ value, onInput, ...rest }: DateInputProps) {
  const display = toDDMMYYYY(value);

  const handleInput = (e: Event) => {
    const el = e.target as HTMLInputElement;
    const raw = el.value;
    const clean = raw.replace(/[^0-9/]/g, '');
    el.value = toISO(clean);
    onInput(e);
  };

  return <input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" value={display} onInput={handleInput} {...rest} />;
}
