import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { loadMercadoPago } from '../lib/mercadopago';
import { useAuth } from '../context/AuthContext';
import { PROVINCIAS, GRADUACIONES, SEXOS } from '../constants';
import { Spinner } from '../components/Spinner';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { getErrorMessage } from '../lib/error';

export default function Perfil() {
  const { user, logout } = useAuth();
  const { route } = useLocation();
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
    password_actual: '',
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
  const [simulatedReimp, setSimulatedReimp] = useState<{ externalReference: string } | null>(null);
  const [bajaModal, setBajaModal] = useState(false);
  const [bajaLoading, setBajaLoading] = useState(false);
  const [bajaMotivo, setBajaMotivo] = useState('');

  const fetchPerfil = async () => {
    try {
      const res = await api.get('/usuarios/perfil');
      const data = res.data;
      setFormData({
        ...data,
        fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : '',
        piso_depto: data.piso_depto || '',
        password: '',
        password_actual: '',
      });
    } catch (err) {
      console.error(err);
      setMessage({ text: getErrorMessage(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfil();
  }, []);

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
      if (formData.password.length < 12) {
        setMessage({ text: 'La contraseña debe tener al menos 12 caracteres.', type: 'error' });
        setSaving(false);
        return;
      }
      if (!formData.password_actual) {
        setMessage({ text: 'Debe ingresar su contraseña actual para cambiarla.', type: 'error' });
        setSaving(false);
        return;
      }
      updateData.password = formData.password;
      updateData.password_actual = formData.password_actual;
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

  const handleBaja = async () => {
    setBajaLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await api.post('/afiliaciones/baja', { motivo: bajaMotivo || undefined });
      logout();
      route('/login');
    } catch (err) {
      setMessage({ text: getErrorMessage(err), type: 'error' });
      setBajaLoading(false);
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
      {user?.estado_reg === 'DESAFILIADO' && (
        <div class="bg-warning-soft border border-warning/20 text-warning rounded-lg p-4 flex items-center justify-between gap-4">
          <div>
            <p class="font-semibold">Usted se encuentra desafiliado.</p>
            <p class="text-sm">Puede solicitar una nueva afiliación desde el panel.</p>
          </div>
          <a href="/dashboard/afiliacion" class="shrink-0 px-4 py-2 bg-warning text-white rounded-md text-sm font-medium hover:bg-warning/90 transition-colors">
            Solicitar Afiliación
          </a>
        </div>
      )}

      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-8">
        <h3 class="text-xl font-bold mb-6 text-ink">Sus Datos Personales</h3>

        {message.text && (
          <div class={`mb-6 p-4 rounded text-sm font-medium ${
            message.type === 'success' ? 'bg-success-soft text-success border border-success/20' : 'bg-hinomaru-soft text-hinomaru border border-hinomaru/20'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="perfil-nombre" class="block text-sm font-medium text-ink mb-1">Nombre</label>
              <input name="nombre" id="perfil-nombre" value={formData.nombre} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 ${fieldError('nombre') ? 'border-hinomaru' : 'border-steel-soft'}`} />
              {fieldError('nombre') && <span class="text-xs text-hinomaru mt-1">{fieldError('nombre')}</span>}
            </div>
            <div>
              <label htmlFor="perfil-apellido" class="block text-sm font-medium text-ink mb-1">Apellido</label>
              <input name="apellido" id="perfil-apellido" value={formData.apellido} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 ${fieldError('apellido') ? 'border-hinomaru' : 'border-steel-soft'}`} />
              {fieldError('apellido') && <span class="text-xs text-hinomaru mt-1">{fieldError('apellido')}</span>}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="perfil-dni" class="block text-sm font-medium text-ink mb-1 font-mono text-steel">DNI (No editable)</label>
              <input id="perfil-dni" value={formData.dni} disabled class="w-full px-3 py-2 border border-steel-soft bg-paper text-steel rounded cursor-not-allowed font-mono" />
            </div>
            <div>
              <label htmlFor="perfil-email" class="block text-sm font-medium text-ink mb-1">Correo Electrónico</label>
              <input name="email" id="perfil-email" value={formData.email} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 ${fieldError('email') ? 'border-hinomaru' : 'border-steel-soft'}`} />
              {fieldError('email') && <span class="text-xs text-hinomaru mt-1">{fieldError('email')}</span>}
            </div>

          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="perfil-fecha-nacimiento" class="block text-sm font-medium text-ink mb-1">Fecha de Nacimiento</label>
              <input name="fecha_nacimiento" id="perfil-fecha-nacimiento" type="date" value={formData.fecha_nacimiento} onInput={handleChange} class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20 font-mono" />
            </div>
            <div>
              <label htmlFor="perfil-sexo" class="block text-sm font-medium text-ink mb-1">Sexo Registral</label>
              <select name="sexo" id="perfil-sexo" value={formData.sexo} onChange={handleChange} class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20">
                {SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div class="border-t border-steel-soft pt-6">
            <h4 class="text-sm font-semibold text-ink mb-4 uppercase tracking-wider">Domicilio Real</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label htmlFor="perfil-calle-altura" class="block text-sm font-medium text-ink mb-1">Calle y Altura</label>
                <input name="calle_altura" id="perfil-calle-altura" value={formData.calle_altura} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 ${fieldError('calle_altura') ? 'border-hinomaru' : 'border-steel-soft'}`} />
                {fieldError('calle_altura') && <span class="text-xs text-hinomaru mt-1">{fieldError('calle_altura')}</span>}
              </div>
              <div>
                <label htmlFor="perfil-piso-depto" class="block text-sm font-medium text-ink mb-1">Piso/Depto</label>
                <input name="piso_depto" id="perfil-piso-depto" value={formData.piso_depto} onInput={handleChange} class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="perfil-ciudad" class="block text-sm font-medium text-ink mb-1">Ciudad</label>
                <input name="ciudad" id="perfil-ciudad" value={formData.ciudad} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 ${fieldError('ciudad') ? 'border-hinomaru' : 'border-steel-soft'}`} />
                {fieldError('ciudad') && <span class="text-xs text-hinomaru mt-1">{fieldError('ciudad')}</span>}
              </div>
              <div>
                <label htmlFor="perfil-provincia" class="block text-sm font-medium text-ink mb-1">Provincia</label>
                <select name="provincia" id="perfil-provincia" value={formData.provincia} onChange={handleChange} class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20">
                  {PROVINCIAS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="perfil-codigo-postal" class="block text-sm font-medium text-ink mb-1">Código Postal</label>
                <input name="codigo_postal" id="perfil-codigo-postal" value={formData.codigo_postal} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 font-mono ${fieldError('codigo_postal') ? 'border-hinomaru' : 'border-steel-soft'}`} />
                {fieldError('codigo_postal') && <span class="text-xs text-hinomaru mt-1">{fieldError('codigo_postal')}</span>}
              </div>
            </div>
            <div class="mt-4">
              <label htmlFor="perfil-telefono" class="block text-sm font-medium text-ink mb-1">Teléfono</label>
              <input name="telefono" id="perfil-telefono" value={formData.telefono || ''} onInput={handleChange} onBlur={handleBlur} class={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-ai/20 ${fieldError('telefono') ? 'border-hinomaru' : 'border-steel-soft'}`} />
              {fieldError('telefono') && <span class="text-xs text-hinomaru mt-1">{fieldError('telefono')}</span>}
            </div>
          </div>

          <div class="border-t border-steel-soft pt-6">
            <h4 class="text-sm font-semibold text-ink mb-4 uppercase tracking-wider">Seguridad</h4>
            <div class="max-w-xs space-y-4">
              <div>
                <label htmlFor="perfil-password" class="block text-sm font-medium text-ink mb-1">Nueva Contraseña (mínimo 12 caracteres)</label>
                <input
                  name="password"
                  id="perfil-password"
                  type="password"
                  placeholder="Dejar en blanco para no cambiar"
                  value={formData.password}
                  onInput={handleChange}
                  class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
                />
              </div>
              {formData.password && (
                <div>
                  <label htmlFor="perfil-password-actual" class="block text-sm font-medium text-ink mb-1">Contraseña Actual</label>
                  <input
                    name="password_actual"
                    id="perfil-password-actual"
                    type="password"
                    value={formData.password_actual}
                    onInput={handleChange}
                    class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
                  />
                </div>
              )}
            </div>
          </div>

          <div class="pt-4">
            <button 
              type="submit" 
              disabled={saving}
              class="px-8 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Graduaciones Display */}
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
        <h3 class="text-lg font-bold mb-4 text-ink">Sus Graduaciones</h3>
        <div class="flex flex-wrap gap-3">
          {formData.grad_kendo && formData.grad_kendo !== 'SIN_GRADUACION' && (
            <div class="inline-flex items-center gap-2 bg-warning-soft border border-warning/20 rounded-full px-4 py-2">
              <span class="text-xs font-bold text-warning uppercase tracking-wider">Kendo</span>
              <span class="text-sm font-semibold text-warning">{getGradLabel(formData.grad_kendo)}</span>
              {formData.f_grad_kendo && <span class="text-[10px] text-warning italic">{new Date(formData.f_grad_kendo).toLocaleDateString()}</span>}
            </div>
          )}
          {formData.grad_iaido && formData.grad_iaido !== 'SIN_GRADUACION' && (
            <div class="inline-flex items-center gap-2 bg-ai-soft border border-ai/20 rounded-full px-4 py-2">
              <span class="text-xs font-bold text-ai uppercase tracking-wider">Iaido</span>
              <span class="text-sm font-semibold text-ai-strong">{getGradLabel(formData.grad_iaido)}</span>
              {formData.f_grad_iaido && <span class="text-[10px] text-ai italic">{new Date(formData.f_grad_iaido).toLocaleDateString()}</span>}
            </div>
          )}
          {formData.grad_jodo && formData.grad_jodo !== 'SIN_GRADUACION' && (
            <div class="inline-flex items-center gap-2 bg-success-soft border border-success/20 rounded-full px-4 py-2">
              <span class="text-xs font-bold text-success uppercase tracking-wider">Jodo</span>
              <span class="text-sm font-semibold text-success">{getGradLabel(formData.grad_jodo)}</span>
              {formData.f_grad_jodo && <span class="text-[10px] text-success italic">{new Date(formData.f_grad_jodo).toLocaleDateString()}</span>}
            </div>
          )}
          {(!formData.grad_kendo || formData.grad_kendo === 'SIN_GRADUACION') &&
           (!formData.grad_iaido || formData.grad_iaido === 'SIN_GRADUACION') &&
           (!formData.grad_jodo || formData.grad_jodo === 'SIN_GRADUACION') && (
            <p class="text-sm text-steel">Sin graduaciones registradas.</p>
          )}
        </div>
      </div>

      {/* Reimpresión de Diploma */}
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
        <h3 class="text-lg font-bold mb-4 text-ink">Reimpresión de Diploma</h3>
        <p class="text-sm text-steel mb-4">Solicite una reimpresión de su diploma nacional de Kendo Argentina para la disciplina que desee. El pago se realiza a través de Mercado Pago.</p>
        <button
          onClick={() => { setReimpresionModal(true); setReimpMsg(''); }}
          class="px-6 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong transition-colors text-sm"
        >
          Solicitar Reimpresión
        </button>

        {reimpMsg && (
          <p class={`mt-3 text-sm ${reimpMsg.includes('Error') || reimpMsg.includes('No se') ? 'text-hinomaru' : 'text-success'}`}>
            {reimpMsg}
          </p>
        )}
      </div>

      <Modal isOpen={reimpresionModal} onClose={() => setReimpresionModal(false)} title="Solicitar Reimpresión">
        <div class="space-y-4">
              <div>
                <label htmlFor="perfil-reimp-disciplina" class="block text-sm font-medium text-ink mb-1">Disciplina</label>
                <select
                  id="perfil-reimp-disciplina"
                  value={reimpDisc}
                  onChange={(e: Event) => setReimpDisc((e.target as HTMLSelectElement).value)}
                  class="w-full px-3 py-2 border border-steel-soft rounded focus:outline-none focus:ring-1 focus:ring-ai/20"
                >
                  <option value="KENDO">Kendo</option>
                  <option value="IAIDO">Iaido</option>
                  <option value="JODO">Jodo</option>
                </select>
              </div>
              <p class="text-sm text-steel">Se reimprimirá el último diploma nacional de <strong>{{ KENDO: 'Kendo', IAIDO: 'Iaido', JODO: 'Jodo' }[reimpDisc] || reimpDisc}</strong> registrado a su nombre.</p>
              <button
                onClick={async () => {
                  setReimpLoading(true);
                  setReimpMsg('');
                  try {
                    const res = await api.post('/diplomas/reimprimir', { disciplina: reimpDisc });
                    const { preferenceId, simulated, externalReference } = res.data.preference;
                    if (simulated) {
                      setSimulatedReimp({ externalReference });
                      setReimpLoading(false);
                      return;
                    }
                await loadMercadoPago();
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
                class="w-full px-8 py-2 bg-ai text-white rounded font-medium hover:bg-ai-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
              >
                {reimpLoading ? 'Generando pago...' : 'Continuar al pago'}
              </button>
              {simulatedReimp ? (
                <div class="mt-2">
                  <button
                    onClick={async () => {
                      setReimpLoading(true);
                      try {
                        await api.post('/pagos/simulate', { externalReference: simulatedReimp.externalReference });
                        setReimpMsg('Pago simulado completado');
                        setSimulatedReimp(null);
                        setReimpresionModal(false);
                      } catch (err) {
                        setReimpMsg(getErrorMessage(err));
                      } finally {
                        setReimpLoading(false);
                      }
                    }}
                    disabled={reimpLoading}
                    class="w-full bg-success text-white px-8 py-2 rounded font-medium hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-center"
                  >
                    {reimpLoading ? 'Procesando...' : 'Pagar en modo prueba (simulado)'}
                  </button>
                </div>
              ) : (
                <div id="reimp-checkout-container" />
              )}
            </div>
            <button
              onClick={() => setReimpresionModal(false)}
              class="mt-4 w-full bg-paper text-ink py-2 rounded-md font-medium hover:bg-ai-soft transition-colors text-sm"
            >
              Cancelar
            </button>
      </Modal>

      {user?.estado_reg === 'APROBADO' && (
        <div class="bg-surface rounded-lg shadow-sm border border-hinomaru/20 p-6">
          <h3 class="text-lg font-bold mb-2 text-ink">Desafiliación</h3>
          <p class="text-sm text-steel mb-4">Solicitar su desafiliación de la federación. Esta acción es inmediata: conservará su historial y podrá solicitar una nueva afiliación en el futuro.</p>
          <button
            onClick={() => { setBajaModal(true); setBajaMotivo(''); }}
            class="px-6 py-2 bg-hinomaru text-white rounded font-medium hover:bg-hinomaru/90 transition-colors text-sm"
          >
            Solicitar desafiliación
          </button>
        </div>
      )}

      {bajaModal && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setBajaModal(false)}
          onConfirm={() => { handleBaja(); }}
          title="Solicitar desafiliación"
          message="¿Está seguro de solicitar su desafiliación? Su cuenta quedará desactivada para eventos y pagos hasta que solicite una nueva afiliación."
          confirmText={bajaLoading ? 'Procesando...' : 'Confirmar desafiliación'}
          danger
        />
      )}
    </div>
  );
}
