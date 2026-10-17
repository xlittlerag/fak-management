import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'preact-iso';
import api from '../services/api';
import { PROVINCIAS, SEXOS } from '../constants';
import { getErrorMessage } from '../lib/error';
import { AuthLayout } from '../components/AuthLayout';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';

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
    api
      .get('/asociaciones')
      .then((res) => setAsociaciones(res.data))
      .catch(() =>
        setError('Error crítico: No se pudieron cargar las asociaciones.'),
      );
  }, []);

  // Fetch dojos when association changes
  useEffect(() => {
    if (formData.asociacion_id) {
      api
        .get(`/dojos/asociacion/${formData.asociacion_id}`)
        .then((res) => {
          setDojos(res.data);
          setFormData((prev) => ({ ...prev, dojo_id: '' })); // Reset dojo
        })
        .catch(() => setError('Error al cargar dojos.'));
    } else {
      setDojos([]);
      setFormData((prev) => ({ ...prev, dojo_id: '' }));
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
    const { name, value } = target;
    // Actualización funcional: evita perder campos ante eventos seguidos
    // (p. ej. autocompletado o relleno rápido), donde `formData` estaría
    // desactualizado por el cierre.
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const strength = (() => {
    const p = formData.password;
    if (!p) return { level: 0, label: '', color: '', width: '0%' };
    let score = 0;
    if (p.length >= 12) score++;
    if (p.length >= 16) score++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    const map = [
      { label: 'Débil', color: 'bg-hinomaru', width: '20%' },
      { label: 'Moderada', color: 'bg-warning', width: '40%' },
      { label: 'Buena', color: 'bg-bamboo', width: '60%' },
      { label: 'Fuerte', color: 'bg-success', width: '80%' },
      { label: 'Muy fuerte', color: 'bg-success', width: '100%' },
    ];
    return { level: score, ...map[Math.min(score, 4)] };
  })();

  return (
    <AuthLayout
      wide
      title="Registro de usuario"
      subtitle="Complete sus datos. Su solicitud quedará pendiente de aprobación."
      footer={
        <>
          ¿Ya tiene una cuenta?{' '}
          <a
            href="/login"
            class="font-medium text-ai underline hover:text-ai-strong"
          >
            Inicie sesión
          </a>
        </>
      }
    >
      {error && (
        <Alert tone="error" class="mb-4">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit} class="space-y-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nombre" htmlFor="reg-nombre">
            <Input
              name="nombre"
              id="reg-nombre"
              required
              onChange={handleChange}
            />
          </Field>
          <Field label="Apellido" htmlFor="reg-apellido">
            <Input
              name="apellido"
              id="reg-apellido"
              required
              onChange={handleChange}
            />
          </Field>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Correo Electrónico" htmlFor="reg-email">
            <Input
              name="email"
              id="reg-email"
              type="email"
              required
              onChange={handleChange}
            />
          </Field>
          <Field
            label="Contraseña (mínimo 12 caracteres)"
            htmlFor="reg-password"
          >
            <Input
              name="password"
              id="reg-password"
              type="password"
              required
              onChange={handleChange}
              onBlur={() => setPassTouched(true)}
            />
            {passTouched && formData.password && (
              <div class="mt-2">
                <div class="h-1.5 w-full overflow-hidden rounded-full bg-paper">
                  <div
                    class={`h-full ${strength.color} rounded-full transition-all`}
                    style={{ width: strength.width }}
                  />
                </div>
                <p
                  class={`mt-1 text-xs ${strength.level >= 3 ? 'text-success' : strength.level >= 2 ? 'text-warning' : 'text-hinomaru'}`}
                >
                  {strength.label}
                </p>
              </div>
            )}
          </Field>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="DNI (solo números)" htmlFor="reg-dni">
            <Input
              name="dni"
              id="reg-dni"
              required
              inputMode="numeric"
              class="font-mono"
              onChange={handleChange}
            />
          </Field>
          <Field label="Fecha Nac." htmlFor="reg-fecha-nacimiento">
            <Input
              name="fecha_nacimiento"
              id="reg-fecha-nacimiento"
              type="date"
              required
              class="font-mono"
              onChange={handleChange}
            />
          </Field>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Sexo Registral" htmlFor="reg-sexo">
            <Select name="sexo" id="reg-sexo" onChange={handleChange}>
              {SEXOS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Asociación" htmlFor="reg-asociacion">
            <Select
              name="asociacion_id"
              id="reg-asociacion"
              required
              onChange={handleChange}
            >
              <option value="">Seleccionar...</option>
              {asociaciones.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Dojo" htmlFor="reg-dojo">
            <Select
              name="dojo_id"
              id="reg-dojo"
              required={dojos.length > 0}
              disabled={!formData.asociacion_id || dojos.length === 0}
              onChange={handleChange}
            >
              <option value="">Seleccionar...</option>
              {dojos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div class="border-t border-steel-soft pt-4">
          <h3 class="mb-4 text-sm font-semibold tracking-wider text-steel uppercase">
            Domicilio Real
          </h3>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="md:col-span-2">
              <Field label="Calle y Altura" htmlFor="reg-calle-altura">
                <Input
                  name="calle_altura"
                  id="reg-calle-altura"
                  required
                  onChange={handleChange}
                />
              </Field>
            </div>
            <Field label="Piso/Depto (Opcional)" htmlFor="reg-piso-depto">
              <Input
                name="piso_depto"
                id="reg-piso-depto"
                onChange={handleChange}
              />
            </Field>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Ciudad" htmlFor="reg-ciudad">
              <Input
                name="ciudad"
                id="reg-ciudad"
                required
                onChange={handleChange}
              />
            </Field>
            <Field label="Provincia" htmlFor="reg-provincia">
              <Select
                name="provincia"
                id="reg-provincia"
                value={formData.provincia}
                onChange={handleChange}
              >
                {PROVINCIAS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Código Postal" htmlFor="reg-codigo-postal">
              <Input
                name="codigo_postal"
                id="reg-codigo-postal"
                required
                class="font-mono"
                onChange={handleChange}
              />
            </Field>
          </div>
          <div class="mt-4">
            <Field
              label="Teléfono (solo números, espacios y + - ( ) .)"
              htmlFor="reg-telefono"
            >
              <Input
                name="telefono"
                id="reg-telefono"
                required
                inputMode="tel"
                onChange={handleChange}
              />
            </Field>
          </div>
        </div>

        <Button type="submit" class="mt-2 w-full" loading={loading}>
          {loading ? 'Registrando...' : 'Registrarse'}
        </Button>
      </form>
    </AuthLayout>
  );
}
