import { useEffect, useState } from 'preact/hooks';
import api from '../services/api';
import { getErrorMessage } from '../lib/error';

interface Estado2fa {
  habilitado: boolean;
  activacion_en_curso: boolean;
  respaldos_restantes: number;
}

export default function Admin2FA() {
  const [estado, setEstado] = useState<Estado2fa | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Activación
  const [qr, setQr] = useState('');
  const [secretoManual, setSecretoManual] = useState('');
  const [codigo, setCodigo] = useState('');
  const [respaldos, setRespaldos] = useState<string[]>([]);
  const [activando, setActivando] = useState(false);

  // Deshabilitación
  const [pidiendoDeshabilitar, setPidiendoDeshabilitar] = useState(false);
  const [password, setPassword] = useState('');

  const cargar = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Estado2fa>('/auth/admin-2fa/estado');
      setEstado(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const iniciarActivacion = async () => {
    setError('');
    setExito('');
    setActivando(true);
    try {
      const res = await api.post('/auth/admin-2fa/setup');
      setQr(res.data.qr);
      setSecretoManual(res.data.secreto_manual);
      setEstado((e) => (e ? { ...e, activacion_en_curso: true } : e));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActivando(false);
    }
  };

  const confirmarActivacion = async (e: Event) => {
    e.preventDefault();
    setError('');
    setExito('');
    setActivando(true);
    try {
      const res = await api.post('/auth/admin-2fa/confirmar', { codigo });
      setRespaldos(res.data.codigos_respaldo);
      setQr('');
      setSecretoManual('');
      setCodigo('');
      setExito('El segundo factor ha sido habilitado correctamente. Guarde sus códigos de respaldo en un lugar seguro.');
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActivando(false);
    }
  };

  const deshabilitar = async (e: Event) => {
    e.preventDefault();
    setError('');
    setExito('');
    try {
      await api.post('/auth/admin-2fa/deshabilitar', { password });
      setPassword('');
      setPidiendoDeshabilitar(false);
      setExito('El segundo factor ha sido deshabilitado correctamente.');
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const regenerarRespaldos = async () => {
    setError('');
    setExito('');
    try {
      const res = await api.post('/auth/admin-2fa/respaldo/regenerar');
      setRespaldos(res.data.codigos_respaldo);
      setExito('Se generaron nuevos códigos de respaldo. Los anteriores han quedado invalidados; guarde los nuevos en un lugar seguro.');
      await cargar();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return <p class="text-sm text-steel">Cargando...</p>;
  }

  return (
    <div class="max-w-2xl space-y-6">
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
        <h3 class="text-lg font-semibold text-ink mb-2">Autenticación en dos pasos</h3>
        <p class="text-sm text-steel mb-4">
          Protege el acceso de administrador general exigiendo, además de la contraseña, un código temporal de una aplicación autenticadora (Google Authenticator, Authy, 1Password, etc.).
        </p>

        {error && (
          <div class="mb-4 p-3 bg-hinomaru-soft text-hinomaru border border-hinomaru/20 rounded text-sm">{error}</div>
        )}
        {exito && (
          <div class="mb-4 p-3 bg-success-soft text-success border border-success/20 rounded text-sm">{exito}</div>
        )}

        {estado && (
          <p class="mb-4">
            <span class={`inline-block px-2 py-1 rounded text-xs font-semibold ${estado.habilitado ? 'bg-success-soft text-success' : 'bg-paper text-steel'}`}>
              {estado.habilitado ? 'Habilitado' : 'Deshabilitado'}
            </span>
            {estado.habilitado && (
              <span class="ml-2 text-sm text-steel">Códigos de respaldo restantes: {estado.respaldos_restantes}</span>
            )}
          </p>
        )}

        {!estado?.habilitado && qr === '' && (
          <button
            onClick={iniciarActivacion}
            disabled={activando}
            class="px-4 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong disabled:opacity-50 transition-colors"
          >
            {activando ? 'Generando...' : 'Activar segundo factor'}
          </button>
        )}

        {!estado?.habilitado && qr !== '' && (
          <div class="space-y-4">
            <ol class="text-sm text-steel list-decimal list-inside space-y-1">
              <li>Escanee el código QR con su aplicación autenticadora.</li>
              <li>Ingrese abajo el código de 6 dígitos que muestra la aplicación.</li>
            </ol>
            <img src={qr} alt="Código QR para la aplicación autenticadora" class="w-48 h-48 border border-steel-soft rounded" />
            <p class="text-xs text-steel break-all">Si no puede escanear, ingrese manualmente: <code class="bg-paper px-1 rounded">{secretoManual}</code></p>
            <form onSubmit={confirmarActivacion} class="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codigo}
                onInput={(e: Event) => setCodigo((e.target as HTMLInputElement).value)}
                placeholder="123456"
                class="px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20 tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={activando}
                class="px-4 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong disabled:opacity-50 transition-colors"
              >
                {activando ? 'Verificando...' : 'Confirmar y habilitar'}
              </button>
            </form>
          </div>
        )}

        {estado?.habilitado && !pidiendoDeshabilitar && (
          <div class="flex flex-wrap gap-2">
            <button
              onClick={regenerarRespaldos}
              class="px-4 py-2 bg-paper text-ink rounded font-medium hover:bg-ai-soft transition-colors"
            >
              Regenerar códigos de respaldo
            </button>
            <button
              onClick={() => setPidiendoDeshabilitar(true)}
              class="px-4 py-2 bg-hinomaru text-white rounded font-medium hover:bg-hinomaru/90 transition-colors"
            >
              Deshabilitar segundo factor
            </button>
          </div>
        )}

        {estado?.habilitado && pidiendoDeshabilitar && (
          <form onSubmit={deshabilitar} class="space-y-3 border border-hinomaru/20 bg-hinomaru-soft rounded p-4">
            <p class="text-sm text-hinomaru">El acceso de administrador quedará protegido solo por contraseña. Ingrese su contraseña para confirmar.</p>
            <div>
              <label htmlFor="2fa-disable-password" class="block text-sm font-medium text-ink mb-1">Contraseña de administrador</label>
              <input
                id="2fa-disable-password"
                type="password"
                value={password}
                onInput={(e: Event) => setPassword((e.target as HTMLInputElement).value)}
                class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
              />
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={() => { setPidiendoDeshabilitar(false); setPassword(''); }}
                class="px-4 py-2 bg-paper text-ink rounded font-medium hover:bg-ai-soft transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                class="px-4 py-2 bg-hinomaru text-white rounded font-medium hover:bg-hinomaru/90 transition-colors"
              >
                Confirmar deshabilitación
              </button>
            </div>
          </form>
        )}
      </div>

      {respaldos.length > 0 && (
        <div class="bg-warning-soft border border-warning/20 rounded-lg p-6">
          <h4 class="text-sm font-semibold text-warning mb-2">Códigos de respaldo (se muestran una sola vez)</h4>
          <p class="text-sm text-warning mb-3">Cada código sirve una sola vez, para cuando no tenga acceso a su aplicación autenticadora.</p>
          <ul class="grid grid-cols-2 gap-2 font-mono text-sm text-warning">
            {respaldos.map((c) => <li key={c} class="bg-surface border border-warning/20 rounded px-2 py-1 text-center">{c}</li>)}
          </ul>
        </div>
      )}

    </div>
  );
}
