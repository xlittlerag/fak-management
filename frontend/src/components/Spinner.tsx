export function Spinner({ text = 'Cargando...' }: { text?: string }) {
  return (
    <div class="flex items-center gap-3 text-slate-400 py-8 justify-center">
      <div class="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
      <span class="text-sm">{text}</span>
    </div>
  );
}
