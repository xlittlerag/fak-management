import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { PROVINCIAS, GRADUACIONES, SEXOS } from '../constants';
import { Spinner } from '../components/Spinner';
import { getErrorMessage } from '../lib/error';

export default function Perfil() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    dni: '',
    fecha_nacimiento: '',
    sexo: 'MASCULINO',
    calle_altura: '',
    piso_depto: '',
    ciudad: '',
    provincia: 'BUENOS_AIRES',
    codigo_postal: '',
    telefono: '',
    password: '',
    grad_kendo: '',
    f_grad_kendo: '',
    grad_iaido: '',
    f_grad_iaido: '',
    grad_jodo: '',
    f_grad_jodo: '',
  });
  const [loading, setLoading] = useState(true);
  const [reimpresionModal, setReimpresionModal] = useState(false);
  const [reimpDisc, setReimpDisc] = useState('KENDO');
  const [reimpLoading, setReimpLoading] = useState(false);
  const [reimpMsg, setReimpMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPerfil();
  }, []);

  const fetchPerfil = async () => {
    try {
      const res = await api.get('/usuarios/perfil');
      const data = res.data;
      setFormData({
        ...data,
        fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : '',
        piso_depto: data.piso_depto || '',
        password: '', 
      });
    } catch (err) {
      console.error(err);
      setMessage({ text: getErrorMessage(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    const updateData: Record<string, string | undefined> = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      fecha_nacimiento: formData.fecha_nacimiento,
      sexo: formData.sexo,
      calle_altura: formData.calle_altura,
      piso_depto: formData.piso_depto,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      codigo_postal: formData.codigo_postal,
      telefono: formData.telefono,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    try {
      await api.patch('/usuarios/perfil', updateData);
      setMessage({ text: 'Perfil actualizado con éxito', type: 'success' });
      fetchPerfil();
    } catch (err) {
      setMessage({ text: getErrorMessage(err), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    setFormData({ ...formData, [target.name]: target.value });
  };

  const handleBlur = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    setTouched({ ...touched, [target.name]: true });
  };

  const fieldError = (name: string): string => {
    if (!touched[name]) return '';
    const val = formData[name as keyof typeof formData];
    if (!val || (typeof val === 'string' && val.trim() === '')) return 'Este campo es obligatorio';
    if (name === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Correo electrónico inválido';
    return '';
  };

  if (loading) return <Spinner />;

  const getGradLabel = (val: string) => {
    return GRADUACIONES.find(g => g.value === val || g.value === val.split('_').reverse().join('_'))?.label || val;
  };

  return (
    <div class="max-w-4xl space-y-6">
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h3 class="text-xl font-bold mb-6 text-slate-800">Sus Datos Personales</h3>

        {message.text && (
          <div class={`mb-6 p-4 rounded text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input name="nombre" value={formData.nombre} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${fieldError('nombre') ? 'border-red-400' : 'border-slate-300'}`} />
              {fieldError('nombre') && <span class="text-xs text-red-600 mt-1">{fieldError('nombre')}</span>}
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input name="apellido" value={formData.apellido} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${fieldError('apellido') ? 'border-red-400' : 'border-slate-300'}`} />
              {fieldError('apellido') && <span class="text-xs text-red-600 mt-1">{fieldError('apellido')}</span>}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1 font-mono text-slate-400">DNI (No editable)</label>
              <input value={formData.dni} disabled class="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded cursor-not-allowed font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input name="email" value={formData.email} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${fieldError('email') ? 'border-red-400' : 'border-slate-300'}`} />
              {fieldError('email') && <span class="text-xs text-red-600 mt-1">{fieldError('email')}</span>}
            </div>

          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
              <input name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Sexo Registral</label>
              <select name="sexo" value={formData.sexo} onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                {SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-6">
            <h4 class="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Domicilio Real</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Calle y Altura</label>
                <input name="calle_altura" value={formData.calle_altura} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${fieldError('calle_altura') ? 'border-red-400' : 'border-slate-300'}`} />
                {fieldError('calle_altura') && <span class="text-xs text-red-600 mt-1">{fieldError('calle_altura')}</span>}
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Piso/Depto</label>
                <input name="piso_depto" value={formData.piso_depto} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                <input name="ciudad" value={formData.ciudad} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${fieldError('ciudad') ? 'border-red-400' : 'border-slate-300'}`} />
                {fieldError('ciudad') && <span class="text-xs text-red-600 mt-1">{fieldError('ciudad')}</span>}
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Provincia</label>
                <select name="provincia" value={formData.provincia} onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                  {PROVINCIAS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Código Postal</label>
                <input name="codigo_postal" value={formData.codigo_postal} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono ${fieldError('codigo_postal') ? 'border-red-400' : 'border-slate-300'}`} />
                {fieldError('codigo_postal') && <span class="text-xs text-red-600 mt-1">{fieldError('codigo_postal')}</span>}
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input name="telefono" value={formData.telefono || ''} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-slate-500 ${fieldError('telefono') ? 'border-red-400' : 'border-slate-300'}`} />
              {fieldError('telefono') && <span class="text-xs text-red-600 mt-1">{fieldError('telefono')}</span>}
            </div>
          </div>

          <div class="border-t border-slate-100 pt-6">
            <h4 class="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Seguridad</h4>
            <div class="max-w-xs">
              <label class="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
              <input 
                name="password" 
                type="password" 
                placeholder="Dejar en blanco para no cambiar"
                value={formData.password} 
                onInput={handleChange} 
                class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" 
              />
            </div>
          </div>

          <div class="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Graduaciones Display */}
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-bold mb-4 text-slate-800">Sus Graduaciones</h3>
        <div class="flex flex-wrap gap-3">
          {formData.grad_kendo && formData.grad_kendo !== 'SIN_GRADUACION' && (
            <div class="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-full px-4 py-2">
              <span class="text-xs font-bold text-amber-800 uppercase tracking-wider">Kendo</span>
              <span class="text-sm font-semibold text-amber-900">{getGradLabel(formData.grad_kendo)}</span>
              {formData.f_grad_kendo && <span class="text-[10px] text-amber-600 italic">{new Date(formData.f_grad_kendo).toLocaleDateString()}</span>}
            </div>
          )}
          {formData.grad_iaido && formData.grad_iaido !== 'SIN_GRADUACION' && (
            <div class="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2">
              <span class="text-xs font-bold text-indigo-800 uppercase tracking-wider">Iaido</span>
              <span class="text-sm font-semibold text-indigo-900">{getGradLabel(formData.grad_iaido)}</span>
              {formData.f_grad_iaido && <span class="text-[10px] text-indigo-600 italic">{new Date(formData.f_grad_iaido).toLocaleDateString()}</span>}
            </div>
          )}
          {formData.grad_jodo && formData.grad_jodo !== 'SIN_GRADUACION' && (
            <div class="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
              <span class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Jodo</span>
              <span class="text-sm font-semibold text-emerald-900">{getGradLabel(formData.grad_jodo)}</span>
              {formData.f_grad_jodo && <span class="text-[10px] text-emerald-600 italic">{new Date(formData.f_grad_jodo).toLocaleDateString()}</span>}
            </div>
          )}
          {(!formData.grad_kendo || formData.grad_kendo === 'SIN_GRADUACION') &&
           (!formData.grad_iaido || formData.grad_iaido === 'SIN_GRADUACION') &&
           (!formData.grad_jodo || formData.grad_jodo === 'SIN_GRADUACION') && (
            <p class="text-sm text-slate-400">Sin graduaciones registradas.</p>
          )}
        </div>
      </div>

      {/* Reimpresión de Diploma */}
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h3 class="text-lg font-bold mb-4 text-slate-800">Reimpresión de Diploma</h3>
        <p class="text-sm text-slate-500 mb-4">Solicite una reimpresión de su diploma nacional (FAK) para la disciplina que desee. El pago se realiza a través de Mercado Pago.</p>
        <button
          onClick={() => { setReimpresionModal(true); setReimpMsg(''); }}
          class="px-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors text-sm"
        >
          Solicitar Reimpresión
        </button>

        {reimpMsg && (
          <p class={`mt-3 text-sm ${reimpMsg.includes('Error') || reimpMsg.includes('No se') ? 'text-red-600' : 'text-green-600'}`}>
            {reimpMsg}
          </p>
        )}
      </div>

      {reimpresionModal && (
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReimpresionModal(false)}>
          <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <h3 class="text-lg font-bold text-slate-800 mb-4">Solicitar Reimpresión</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Disciplina</label>
                <select
                  value={reimpDisc}
                  onChange={(e: Event) => setReimpDisc((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500"
                >
                  <option value="KENDO">Kendo</option>
                  <option value="IAIDO">Iaido</option>
                  <option value="JODO">Jodo</option>
                </select>
              </div>
              <p class="text-sm text-slate-500">Se reimprimirá el último diploma nacional de <strong>{{ KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo' }[reimpDisc] || reimpDisc}</strong> registrado a su nombre.</p>
              <button
                onClick={async () => {
                  setReimpLoading(true);
                  setReimpMsg('');
                  try {
                    const res = await api.post('/diplomas/reimprimir', { disciplina: reimpDisc });
                    const { preferenceId } = res.data.preference;
                    const mp = new window.MercadoPago(import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY);
                    mp.checkout({
                      preference: { id: preferenceId },
                      render: { container: '#reimp-checkout-container', label: 'Pagar' },
                    });
                    setReimpMsg('Redirigiendo al pago...');
                  } catch (err) {
                    setReimpMsg(getErrorMessage(err));
                  } finally {
                    setReimpLoading(false);
                  }
                }}
                disabled={reimpLoading}
                class="w-full px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                {reimpLoading ? 'Generando pago...' : 'Continuar al pago'}
              </button>
              <div id="reimp-checkout-container" />
            </div>
            <button
              onClick={() => setReimpresionModal(false)}
              class="mt-4 w-full bg-slate-100 text-slate-700 py-2 rounded-md font-medium hover:bg-slate-200 transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
