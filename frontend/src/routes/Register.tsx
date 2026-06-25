import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { PROVINCIAS, SEXOS } from '../constants';
import { getErrorMessage } from '../lib/error';
import { DateInput } from '../components/DateInput';

interface Asociacion {
  id: number;
  nombre: string;
}

interface Dojo {
  id: number;
  nombre: string;
}

export default function Register() {
  const { route } = useLocation();
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [dojos, setDojos] = useState<Dojo[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    dni: '',
    fecha_nacimiento: '',
    sexo: 'MASCULINO',
    asociacion_id: '',
    dojo_id: '',
    calle_altura: '',
    piso_depto: '',
    ciudad: '',
    provincia: 'BUENOS_AIRES',
    codigo_postal: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passTouched, setPassTouched] = useState(false);

  useEffect(() => {
    api.get('/asociaciones')
      .then(res => setAsociaciones(res.data))
      .catch(() => setError('Error crítico: No se pudieron cargar las asociaciones.'));
  }, []);

  // Fetch dojos when association changes
  useEffect(() => {
    if (formData.asociacion_id) {
      api.get(`/dojos/asociacion/${formData.asociacion_id}`)
        .then(res => {
          setDojos(res.data);
          setFormData(prev => ({ ...prev, dojo_id: '' })); // Reset dojo
        })
        .catch(() => setError('Error al cargar dojos.'));
    } else {
      setDojos([]);
      setFormData(prev => ({ ...prev, dojo_id: '' }));
    }
  }, [formData.asociacion_id]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', {
        ...formData,
        asociacion_id: parseInt(formData.asociacion_id),
        dojo_id: formData.dojo_id ? parseInt(formData.dojo_id) : null,
      });
      route('/login?registered=true');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: Event) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    setFormData({ ...formData, [target.name]: target.value });
  };

  const strength = (() => {
    const p = formData.password;
    if (!p) return { level: 0, label: '', color: '', width: '0%' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    const map = [
      { label: 'Débil', color: 'bg-red-500', width: '20%' },
      { label: 'Moderada', color: 'bg-orange-500', width: '40%' },
      { label: 'Buena', color: 'bg-yellow-500', width: '60%' },
      { label: 'Fuerte', color: 'bg-lime-500', width: '80%' },
      { label: 'Muy fuerte', color: 'bg-green-500', width: '100%' },
    ];
    return { level: score, ...map[Math.min(score, 4)] };
  })();

  return (
    <div class="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div class="max-w-2xl w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h1 class="text-2xl font-bold text-slate-900 mb-6 text-center">Registro de Usuario</h1>
        
        {error && (
          <div class="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input name="nombre" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input name="apellido" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input name="email" type="email" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <input name="password" type="password" required onChange={handleChange} onBlur={() => setPassTouched(true)} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
              {passTouched && formData.password && (
                <div class="mt-2">
                  <div class="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div class={`h-full ${strength.color} rounded-full transition-all`} style={{ width: strength.width }} />
                  </div>
                  <p class={`text-xs mt-1 ${strength.level >= 3 ? 'text-green-600' : strength.level >= 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">DNI</label>
              <input name="dni" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Fecha Nac.</label>
              <DateInput name="fecha_nacimiento" required onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Sexo Registral</label>
              <select name="sexo" onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                {SEXOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Asociación</label>
              <select name="asociacion_id" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="">Seleccionar...</option>
                {asociaciones.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Dojo</label>
              <select name="dojo_id" required={dojos.length > 0} disabled={!formData.asociacion_id || dojos.length === 0} onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="">Seleccionar...</option>
                {dojos.map(d => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4">
            <h3 class="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Domicilio Real</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Calle y Altura</label>
                <input name="calle_altura" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Piso/Depto (Opcional)</label>
                <input name="piso_depto" onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                <input name="ciudad" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
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
                <input name="codigo_postal" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
              </div>
            </div>
            <div class="mt-4">
              <label class="block text-sm font-medium text-slate-700 mb-1">Teléfono (Opcional)</label>
              <input name="telefono" onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            class="w-full mt-6 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-slate-600">
          ¿Ya tiene una cuenta? <a href="/login" class="text-slate-900 font-semibold underline">Inicie sesión</a>
        </p>
      </div>
    </div>
  );
}
