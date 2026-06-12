import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import { PROVINCIAS, GRADUACIONES } from '../constants';

export default function Perfil() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    dni: '',
    fecha_nacimiento: '',
    genero: 'MASCULINO',
    calle_altura: '',
    piso_depto: '',
    ciudad: '',
    provincia: 'BUENOS_AIRES',
    codigo_postal: '',
    password: '',
    grad_kendo: '',
    f_grad_kendo: '',
    grad_iaido: '',
    f_grad_iaido: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

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
      setMessage({ text: 'Error al cargar el perfil', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    const updateData: any = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email,
      fecha_nacimiento: formData.fecha_nacimiento,
      genero: formData.genero,
      calle_altura: formData.calle_altura,
      piso_depto: formData.piso_depto,
      ciudad: formData.ciudad,
      provincia: formData.provincia,
      codigo_postal: formData.codigo_postal,
    };

    if (formData.password) {
      updateData.password = formData.password;
    }

    try {
      await api.patch('/usuarios/perfil', updateData);
      setMessage({ text: 'Perfil actualizado con éxito', type: 'success' });
      fetchPerfil();
    } catch (err) {
      setMessage({ text: 'Error al actualizar el perfil', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (loading) return <div>Cargando...</div>;

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
              <input name="nombre" value={formData.nombre} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
              <input name="apellido" value={formData.apellido} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1 font-mono text-slate-400">DNI (No editable)</label>
              <input value={formData.dni} disabled class="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-500 rounded cursor-not-allowed font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
              <input name="email" value={formData.email} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
            </div>

          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Fecha de Nacimiento</label>
              <input name="fecha_nacimiento" type="date" value={formData.fecha_nacimiento} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Género</label>
              <select name="genero" value={formData.genero} onChange={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500">
                <option value="MASCULINO">Masculino</option>
                <option value="FEMENINO">Femenino</option>
              </select>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-6">
            <h4 class="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wider">Dirección</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-1">Calle y Altura</label>
                <input name="calle_altura" value={formData.calle_altura} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Piso/Depto</label>
                <input name="piso_depto" value={formData.piso_depto} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                <input name="ciudad" value={formData.ciudad} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500" />
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
                <input name="codigo_postal" value={formData.codigo_postal} onInput={handleChange} class="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono" />
              </div>
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
              class="px-8 py-2 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>

      {/* Graduaciones Display */}
      <div class="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        <h3 class="text-xl font-bold mb-6 text-slate-800">Sus Graduaciones</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Kendo</div>
            <div class="text-2xl font-black text-slate-900">{getGradLabel(formData.grad_kendo)}</div>
            {formData.f_grad_kendo && (
              <div class="text-sm text-slate-500 mt-2 italic">Obtenida el {new Date(formData.f_grad_kendo).toLocaleDateString()}</div>
            )}
          </div>
          <div class="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <div class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Iaido</div>
            <div class="text-2xl font-black text-slate-900">{getGradLabel(formData.grad_iaido)}</div>
            {formData.f_grad_iaido && (
              <div class="text-sm text-slate-500 mt-2 italic">Obtenida el {new Date(formData.f_grad_iaido).toLocaleDateString()}</div>
            )}
          </div>
        </div>
        <p class="mt-6 text-xs text-slate-400 italic">
          * Para actualizar sus graduaciones, por favor póngase en contacto con el Administrador General o cargue su certificado externo (disponible en la próxima fase).
        </p>
      </div>
    </div>
  );
}
