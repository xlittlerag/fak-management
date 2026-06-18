import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { PROVINCIAS } from '../constants';

interface Asociacion {
  id: number;
  nombre: string;
}

export default function Register() {
  const { route } = useLocation();
  const [asociaciones, setAsociaciones] = useState<Asociacion[]>([]);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    dni: '',
    fecha_nacimiento: '',
    genero: 'MASCULINO',
    asociacion_id: '',
    calle_altura: '',
    piso_depto: '',
    ciudad: '',
    provincia: 'BUENOS_AIRES',
    codigo_postal: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/asociaciones')
      .then(res => setAsociaciones(res.data))
      .catch(() => setError('Error crítico: No se pudieron cargar las asociaciones.'));
  }, []);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/register', {
        ...formData,
        asociacion_id: parseInt(formData.asociacion_id),
      });
      route('/login?registered=true');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
              <input name="password" type="password" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">DNI</label>
              <input name="dni" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Fecha Nac.</label>
              <input name="fecha_nacimiento" type="date" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Género</label>
              <select name="genero" onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Asociación / Dojo</label>
              <select name="asociacion_id" required onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="">Seleccionar...</option>
                {asociaciones.filter(a => a.id !== 0).map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-4">
            <h3 class="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Dirección</h3>
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
