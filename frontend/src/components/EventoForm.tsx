import { useState, useEffect } from 'preact/hooks';
import api from '../services/api';
import {
  GRADUACIONES,
  SEXOS_CATEGORIA,
  CATEGORIAS_TORNEO_DEFAULT,
  PROVINCIAS,
} from '../constants';
import { getErrorMessage } from '../lib/error';
import { DISCIPLINA_LABELS } from '../lib/graduacion';
import { ConfirmModal } from './ConfirmModal';

interface Categoria {
  id: string;
  nombre: string;
  grad_min?: string;
  grad_max?: string;
  genero?: string;
  edad_min?: number;
  edad_max?: number;
}

export interface EventoAdmin {
  id: number;
  tipo: string;
  ambito: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: Record<string, any>;
  publicado: boolean;
  pago_fuera_sistema: boolean;
  archivos_info: string[];
  creador_id?: number;
  torneo?: {
    disciplina: string;
    costo_inscripcion: number;
    categorias: Categoria[];
    inscripcion_multiple: boolean;
    grad_min?: string;
    grad_max?: string;
    info_adicional?: string;
    fecha_limite_informativa?: string;
    fecha_limite_real?: string;
    inscripciones_abiertas: boolean;
  };
  examen?: {
    disciplinas: string[];
    graduaciones_a_rendir: string[];
    info_adicional?: string;
  };
  seminario?: {
    disciplina: string;
    costo_inscripcion: number;
    info_adicional?: string;
  };
}

interface RangoExamen {
  disciplina: string;
  grad_min: string;
  grad_max: string;
}

interface EventoFormState {
  tipo: string;
  ambito: string;
  fecha_inicio: string;
  fecha_fin: string;
  direccion: string;
  provincia: string;
  costo_inscripcion: string;
  disciplina: string;
  grad_min: string;
  grad_max: string;
  info_adicional: string;
  inscripcion_multiple: boolean;
  pago_fuera_sistema: boolean;
  fecha_limite_informativa: string;
  fecha_limite_real: string;
  archivos_info: string;
}

const TIPOS = ['TORNEO', 'EXAMEN', 'SEMINARIO'];
const GRAD_OPTS = GRADUACIONES.map((g) => ({ value: g.value, label: g.label }));
const GRAD_EXAMEN_OPTS = GRADUACIONES.filter(
  (g) => g.value !== 'SIN_GRADUACION',
).map((g) => ({ value: g.value, label: g.label }));
const DISCIPLINAS = (
  Object.entries(DISCIPLINA_LABELS) as Array<[string, string]>
).map(([value, label]) => ({ value, label }));

const DEFAULT_RANGO: Omit<RangoExamen, 'disciplina'> = {
  grad_min: 'KYU_3',
  grad_max: 'DAN_8',
};

function newId(): string {
  return crypto.randomUUID();
}

function emptyCategoria(): Categoria {
  return {
    id: newId(),
    nombre: '',
    grad_min: '',
    grad_max: '',
    genero: '',
    edad_min: undefined,
    edad_max: undefined,
  };
}

function withNewIds(
  categorias: Array<Omit<Categoria, 'id'> & { id?: string }>,
): Categoria[] {
  return categorias.map((c) => ({ ...c, id: newId() }));
}

// TC-12: un ISO en UTC ("...T02:59:59.000Z") cortado con slice(0, 10) muestra
// +1 día para usuarios en Argentina. Se convierte a fecha local primero para
// que el <input type="date"> muestre el día que eligió el administrador.
function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function buildForm(editing: EventoAdmin | null): EventoFormState {
  if (!editing) {
    return {
      tipo: 'TORNEO',
      ambito: 'REGIONAL',
      fecha_inicio: '',
      fecha_fin: '',
      direccion: '',
      provincia: '',
      costo_inscripcion: '',
      disciplina: '',
      grad_min: '',
      grad_max: '',
      info_adicional: '',
      inscripcion_multiple: false,
      pago_fuera_sistema: false,
      fecha_limite_informativa: '',
      fecha_limite_real: '',
      archivos_info: '',
    };
  }
  return {
    tipo: editing.tipo,
    ambito: editing.ambito || 'REGIONAL',
    fecha_inicio: toDateInputValue(editing.fecha_inicio),
    fecha_fin: toDateInputValue(editing.fecha_fin),
    direccion:
      (editing.datos_lugar as { direccion: string; provincia: string })
        ?.direccion ?? '',
    provincia:
      (editing.datos_lugar as { direccion: string; provincia: string })
        ?.provincia ?? '',
    costo_inscripcion: String(
      editing.torneo?.costo_inscripcion ??
        editing.seminario?.costo_inscripcion ??
        '',
    ),
    disciplina:
      editing.torneo?.disciplina ?? editing.seminario?.disciplina ?? '',
    grad_min: editing.torneo?.grad_min || '',
    grad_max: editing.torneo?.grad_max || '',
    info_adicional:
      editing.torneo?.info_adicional ??
      editing.examen?.info_adicional ??
      editing.seminario?.info_adicional ??
      '',
    inscripcion_multiple: editing.torneo?.inscripcion_multiple || false,
    pago_fuera_sistema: editing.pago_fuera_sistema || false,
    fecha_limite_informativa: toDateInputValue(
      editing.torneo?.fecha_limite_informativa,
    ),
    fecha_limite_real: toDateInputValue(editing.torneo?.fecha_limite_real),
    archivos_info: (editing.archivos_info || []).join('\n'),
  };
}

function buildCategorias(editing: EventoAdmin | null): Categoria[] {
  if (editing?.torneo?.categorias?.length) {
    return withNewIds(editing.torneo.categorias);
  }
  return [emptyCategoria()];
}

function buildDisciplinas(editing: EventoAdmin | null): string[] {
  return editing?.examen?.disciplinas || ['KENDO'];
}

function buildRangos(editing: EventoAdmin | null): RangoExamen[] {
  const examRangos = editing?.examen?.graduaciones_a_rendir as
    RangoExamen[] | undefined;
  if (Array.isArray(examRangos) && examRangos.length > 0) {
    return examRangos;
  }
  const discs = editing?.examen?.disciplinas || ['KENDO'];
  return discs.map((d) => ({ disciplina: d, ...DEFAULT_RANGO }));
}

interface EventoFormProps {
  editing: EventoAdmin | null;
  user: { id: number; rol: string } | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EventoForm({
  editing,
  user,
  onClose,
  onSaved,
}: EventoFormProps) {
  const [formError, setFormError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<EventoFormState>(() => buildForm(editing));
  const [categorias, setCategorias] = useState<Categoria[]>(() =>
    buildCategorias(editing),
  );
  const [selectedDisciplinas, setSelectedDisciplinas] = useState<string[]>(() =>
    buildDisciplinas(editing),
  );
  const [rangosExamen, setRangosExamen] = useState<RangoExamen[]>(() =>
    buildRangos(editing),
  );

  // Única sincronización externa: restablecer el formulario cuando se
  // suministra otro evento a editar (o se vuelve al modo creación).
  useEffect(() => {
    setForm(buildForm(editing));
    setCategorias(buildCategorias(editing));
    setSelectedDisciplinas(buildDisciplinas(editing));
    setRangosExamen(buildRangos(editing));
    setFormError('');
  }, [editing]);

  // Valores derivados calculados durante el render (no son estado):
  // los exámenes son siempre nacionales y sin pago fuera del sistema,
  // sin sobrescribir la elección del usuario en `form`.
  const isExamen = form.tipo === 'EXAMEN';
  const effectiveAmbito = isExamen ? 'NACIONAL' : form.ambito;
  const effectivePagoFueraSistema =
    effectiveAmbito === 'NACIONAL' ? false : form.pago_fuera_sistema;
  const visibleRangos: RangoExamen[] = selectedDisciplinas.map(
    (d) =>
      rangosExamen.find((r) => r.disciplina === d) ?? {
        disciplina: d,
        ...DEFAULT_RANGO,
      },
  );

  function updateCat(
    id: string,
    field: Exclude<keyof Categoria, 'id'>,
    value: string | number | undefined,
  ) {
    setCategorias((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  }

  function addCategoria() {
    setCategorias((prev) => [...prev, emptyCategoria()]);
  }

  function loadDefaultCategorias() {
    setCategorias(withNewIds(CATEGORIAS_TORNEO_DEFAULT));
  }

  function removeCategoria(id: string) {
    setCategorias((prev) =>
      prev.length <= 1 ? prev : prev.filter((c) => c.id !== id),
    );
  }

  // TC-09: actualizaciones funcionales e idempotentes para no perder
  // disciplinas ni rangos ante clics seguidos (estado desactualizado).
  function toggleDisciplina(d: string) {
    const agregando = !selectedDisciplinas.includes(d);
    setSelectedDisciplinas((prev) =>
      agregando
        ? prev.includes(d)
          ? prev
          : [...prev, d]
        : prev.filter((x) => x !== d),
    );
    if (agregando) {
      setRangosExamen((prev) =>
        prev.some((r) => r.disciplina === d)
          ? prev
          : [...prev, { disciplina: d, ...DEFAULT_RANGO }],
      );
    }
  }

  function updateRango(
    d: string,
    field: 'grad_min' | 'grad_max',
    value: string,
  ) {
    setRangosExamen((prev) => {
      if (prev.some((r) => r.disciplina === d)) {
        return prev.map((r) =>
          r.disciplina === d ? { ...r, [field]: value } : r,
        );
      }
      return [...prev, { disciplina: d, ...DEFAULT_RANGO, [field]: value }];
    });
  }

  async function handleSave() {
    setFormError('');
    try {
      const body: Record<string, any> = {
        tipo: form.tipo,
        ambito: effectiveAmbito,
        fecha_inicio: new Date(form.fecha_inicio + 'T00:00:00').toISOString(),
        fecha_fin: new Date(form.fecha_fin + 'T23:59:59').toISOString(),
        datos_lugar: { direccion: form.direccion, provincia: form.provincia },
        pago_fuera_sistema: effectivePagoFueraSistema,
      };

      if (form.archivos_info.trim()) {
        body.archivos_info = form.archivos_info
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      if (form.tipo === 'TORNEO') {
        body.disciplina = form.disciplina;
        body.costo_inscripcion = form.costo_inscripcion
          ? Number(form.costo_inscripcion)
          : 0;
        if (form.grad_min) body.grad_min = form.grad_min;
        if (form.grad_max) body.grad_max = form.grad_max;
        if (form.info_adicional) body.info_adicional = form.info_adicional;
        body.inscripcion_multiple = form.inscripcion_multiple;

        const validas = categorias.filter((c) => c.nombre.trim());
        if (validas.length === 0) {
          setFormError('Debe agregar al menos una categoría');
          return;
        }
        body.categorias = validas.map(({ id: _id, ...payload }) => payload);

        if (form.fecha_limite_informativa) {
          body.fecha_limite_informativa = new Date(
            form.fecha_limite_informativa + 'T23:59:59',
          ).toISOString();
        }
        if (form.fecha_limite_real) {
          body.fecha_limite_real = new Date(
            form.fecha_limite_real + 'T23:59:59',
          ).toISOString();
        }
      }

      if (form.tipo === 'EXAMEN') {
        body.disciplinas = selectedDisciplinas;
        body.graduaciones_a_rendir = visibleRangos;
        if (form.info_adicional) body.info_adicional = form.info_adicional;

        if (selectedDisciplinas.length === 0) {
          setFormError('Debe seleccionar al menos una disciplina');
          return;
        }
        if (visibleRangos.length === 0) {
          setFormError('Debe seleccionar al menos un rango de graduaciones');
          return;
        }
      }

      if (form.tipo === 'SEMINARIO') {
        body.disciplina = form.disciplina;
        body.costo_inscripcion = form.costo_inscripcion
          ? Number(form.costo_inscripcion)
          : 0;
        if (form.info_adicional) body.info_adicional = form.info_adicional;
      }

      if (editing) {
        await api.patch(`/eventos/${editing.id}`, body);
      } else {
        await api.post('/eventos', body);
      }

      onSaved();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await api.delete(`/eventos/${editing.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  return (
    <>
      <div class="bg-surface rounded-lg shadow-sm border border-steel-soft p-6">
        <h3 class="text-base font-bold text-ink mb-6">
          {editing ? 'Editar Evento' : 'Crear Evento'}
        </h3>

        {formError && (
          <div class="mb-4 bg-hinomaru-soft border border-hinomaru/20 text-hinomaru px-4 py-3 rounded text-sm">
            {formError}
          </div>
        )}

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="evf-tipo"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Tipo
            </label>
            <select
              id="evf-tipo"
              value={form.tipo}
              onChange={(e: Event) =>
                setForm({
                  ...form,
                  tipo: (e.target as HTMLSelectElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
            >
              {(user?.rol === 'ADMIN_GENERAL'
                ? TIPOS
                : TIPOS.filter((t) => t !== 'EXAMEN')
              ).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="evf-ambito"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Ámbito
            </label>
            <select
              id="evf-ambito"
              value={effectiveAmbito}
              onChange={(e: Event) =>
                setForm({
                  ...form,
                  ambito: (e.target as HTMLSelectElement).value,
                })
              }
              disabled={isExamen}
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="REGIONAL">Regional</option>
              <option value="NACIONAL">Nacional</option>
            </select>
            {isExamen && (
              <p class="text-[10px] text-steel mt-0.5">
                Los exámenes son siempre nacionales
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="evf-inicio"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Inicio
            </label>
            <input
              id="evf-inicio"
              type="date"
              value={form.fecha_inicio}
              onInput={(e: Event) =>
                setForm({
                  ...form,
                  fecha_inicio: (e.target as HTMLInputElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label
              htmlFor="evf-fin"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Fin
            </label>
            <input
              id="evf-fin"
              type="date"
              value={form.fecha_fin}
              onInput={(e: Event) =>
                setForm({
                  ...form,
                  fecha_fin: (e.target as HTMLInputElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label
              htmlFor="evf-direccion"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Dirección
            </label>
            <input
              id="evf-direccion"
              type="text"
              value={form.direccion}
              onInput={(e: Event) =>
                setForm({
                  ...form,
                  direccion: (e.target as HTMLInputElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
            />
          </div>

          <div>
            <label
              htmlFor="evf-provincia"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Provincia
            </label>
            <select
              id="evf-provincia"
              value={form.provincia}
              onChange={(e: Event) =>
                setForm({
                  ...form,
                  provincia: (e.target as HTMLSelectElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
            >
              <option value="">Seleccionar provincia</option>
              {PROVINCIAS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {form.tipo === 'TORNEO' && (
            <>
              <div>
                <label
                  htmlFor="evf-costo"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Costo de inscripción
                </label>
                <input
                  id="evf-costo"
                  type="number"
                  value={form.costo_inscripcion}
                  onInput={(e: Event) =>
                    setForm({
                      ...form,
                      costo_inscripcion: (e.target as HTMLInputElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label
                  htmlFor="evf-disciplina"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Disciplina
                </label>
                <select
                  id="evf-disciplina"
                  value={form.disciplina}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      disciplina: (e.target as HTMLSelectElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                >
                  {DISCIPLINAS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="evf-grad-min"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Grad. mínima
                </label>
                <select
                  id="evf-grad-min"
                  value={form.grad_min}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      grad_min: (e.target as HTMLSelectElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                >
                  <option value="">Sin requisito</option>
                  {GRAD_OPTS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="evf-grad-max"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Grad. máxima
                </label>
                <select
                  id="evf-grad-max"
                  value={form.grad_max}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      grad_max: (e.target as HTMLSelectElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                >
                  <option value="">Sin requisito</option>
                  {GRAD_OPTS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <p class="text-[10px] text-steel -mt-2">
                Este rango se exige además del rango de cada categoría.
              </p>
            </>
          )}

          {form.tipo === 'SEMINARIO' && (
            <>
              <div>
                <label
                  htmlFor="evf-costo-sem"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Costo de inscripción
                </label>
                <input
                  id="evf-costo-sem"
                  type="number"
                  value={form.costo_inscripcion}
                  onInput={(e: Event) =>
                    setForm({
                      ...form,
                      costo_inscripcion: (e.target as HTMLInputElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                />
              </div>

              <div>
                <label
                  htmlFor="evf-disciplina-sem"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Disciplina
                </label>
                <select
                  id="evf-disciplina-sem"
                  value={form.disciplina}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      disciplina: (e.target as HTMLSelectElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                >
                  {DISCIPLINAS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {form.tipo === 'TORNEO' && (
            <div class="flex items-end">
              <label
                htmlFor="evf-inscripcion-multiple"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  id="evf-inscripcion-multiple"
                  type="checkbox"
                  checked={form.inscripcion_multiple}
                  onChange={(e: Event) =>
                    setForm({
                      ...form,
                      inscripcion_multiple: (e.target as HTMLInputElement)
                        .checked,
                    })
                  }
                  class="w-4 h-4"
                />
                <span class="text-xs font-bold text-steel uppercase tracking-wider">
                  Inscripción múltiple
                </span>
              </label>
            </div>
          )}

          <div class="flex items-end">
            <label
              htmlFor="evf-pago-fuera"
              class="flex items-center gap-2 cursor-pointer"
            >
              <input
                id="evf-pago-fuera"
                type="checkbox"
                checked={effectivePagoFueraSistema}
                onChange={(e: Event) =>
                  setForm({
                    ...form,
                    pago_fuera_sistema: (e.target as HTMLInputElement).checked,
                  })
                }
                disabled={effectiveAmbito === 'NACIONAL' || isExamen}
                class="w-4 h-4 disabled:opacity-40"
              />
              <span
                class={`text-xs font-bold uppercase tracking-wider ${effectiveAmbito === 'NACIONAL' || isExamen ? 'text-steel-soft' : 'text-steel'}`}
              >
                Pago fuera del sistema
              </span>
              {(effectiveAmbito === 'NACIONAL' || isExamen) && (
                <span class="text-[10px] text-steel ml-1">
                  (no disponible para eventos nacionales)
                </span>
              )}
            </label>
          </div>

          {form.tipo === 'TORNEO' && (
            <>
              <div>
                <label
                  htmlFor="evf-limite-informativa"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Fecha límite informativa
                </label>
                <input
                  id="evf-limite-informativa"
                  type="date"
                  value={form.fecha_limite_informativa}
                  onInput={(e: Event) =>
                    setForm({
                      ...form,
                      fecha_limite_informativa: (e.target as HTMLInputElement)
                        .value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label
                  htmlFor="evf-limite-real"
                  class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
                >
                  Fecha límite real
                </label>
                <input
                  id="evf-limite-real"
                  type="date"
                  value={form.fecha_limite_real}
                  onInput={(e: Event) =>
                    setForm({
                      ...form,
                      fecha_limite_real: (e.target as HTMLInputElement).value,
                    })
                  }
                  class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
                />
              </div>
            </>
          )}

          <div class="lg:col-span-3">
            <label
              htmlFor="evf-archivos"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Archivos de información (URLs, uno por línea)
            </label>
            <textarea
              id="evf-archivos"
              value={form.archivos_info}
              onInput={(e: Event) =>
                setForm({
                  ...form,
                  archivos_info: (e.target as HTMLTextAreaElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
              rows={2}
            />
          </div>

          <div class="lg:col-span-3">
            <label
              htmlFor="evf-info"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-1"
            >
              Información adicional
            </label>
            <textarea
              id="evf-info"
              value={form.info_adicional}
              onInput={(e: Event) =>
                setForm({
                  ...form,
                  info_adicional: (e.target as HTMLTextAreaElement).value,
                })
              }
              class="w-full text-sm border-steel-soft rounded-md shadow-sm p-2"
              rows={3}
            />
          </div>
        </div>

        {/* Disciplinas para EXAMEN */}
        {isExamen && (
          <div class="mt-6">
            <span
              id="evf-disciplinas-label"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-2"
            >
              Disciplinas
            </span>
            <div
              class="flex flex-wrap gap-4"
              role="group"
              aria-labelledby="evf-disciplinas-label"
            >
              {DISCIPLINAS.map((d) => {
                const active = selectedDisciplinas.includes(d.value);
                return (
                  <label
                    key={d.value}
                    htmlFor={`evf-disc-${d.value}`}
                    class="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      id={`evf-disc-${d.value}`}
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleDisciplina(d.value)}
                      class="w-4 h-4"
                    />
                    {d.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Rangos de graduaciones por disciplina para EXAMEN */}
        {isExamen && (
          <div class="mt-4 space-y-4">
            <span
              id="evf-rangos-label"
              class="block text-xs font-bold text-steel uppercase tracking-wider mb-2"
            >
              Rangos de graduaciones por disciplina
            </span>
            {visibleRangos.map((rango) => {
              const d = rango.disciplina;
              return (
                <div
                  key={d}
                  class="flex flex-wrap items-end gap-3 bg-paper border border-steel-soft rounded-lg p-3"
                >
                  <span class="text-sm font-semibold text-ink min-w-[60px]">
                    {DISCIPLINAS.find((dd) => dd.value === d)?.label || d}
                  </span>
                  <div>
                    <label
                      htmlFor={`evf-rango-${d}-min`}
                      class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                    >
                      Desde
                    </label>
                    <select
                      id={`evf-rango-${d}-min`}
                      value={rango.grad_min}
                      onChange={(e: Event) =>
                        updateRango(
                          d,
                          'grad_min',
                          (e.target as HTMLSelectElement).value,
                        )
                      }
                      class="text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                    >
                      {GRAD_EXAMEN_OPTS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor={`evf-rango-${d}-max`}
                      class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                    >
                      Hasta
                    </label>
                    <select
                      id={`evf-rango-${d}-max`}
                      value={rango.grad_max}
                      onChange={(e: Event) =>
                        updateRango(
                          d,
                          'grad_max',
                          (e.target as HTMLSelectElement).value,
                        )
                      }
                      class="text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                    >
                      {GRAD_EXAMEN_OPTS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
            {selectedDisciplinas.length === 0 && (
              <p class="text-sm text-steel">
                Seleccione al menos una disciplina para configurar los rangos.
              </p>
            )}
          </div>
        )}

        {/* Categorías para TORNEO */}
        {form.tipo === 'TORNEO' && (
          <div class="mt-6">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-steel uppercase tracking-wider">
                Categorías
              </span>
              <div class="flex gap-2">
                <button
                  onClick={loadDefaultCategorias}
                  class="text-xs text-success hover:underline font-medium"
                >
                  Cargar por defecto
                </button>
                <button
                  onClick={addCategoria}
                  class="text-xs text-ai hover:underline font-medium"
                >
                  + Agregar categoría
                </button>
              </div>
            </div>

            <div class="space-y-3">
              {categorias.map((cat, i) => (
                <div
                  key={cat.id}
                  class="bg-paper border border-steel-soft rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold text-steel">
                      Categoría {i + 1}
                    </span>
                    {categorias.length > 1 && (
                      <button
                        onClick={() => removeCategoria(cat.id)}
                        class="text-xs text-hinomaru hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <div>
                      <label
                        htmlFor={`cat-${cat.id}-nombre`}
                        class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                      >
                        Nombre
                      </label>
                      <input
                        id={`cat-${cat.id}-nombre`}
                        type="text"
                        value={cat.nombre}
                        onInput={(e: Event) =>
                          updateCat(
                            cat.id,
                            'nombre',
                            (e.target as HTMLInputElement).value,
                          )
                        }
                        class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                        placeholder="Ej: Torneo Kyu"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`cat-${cat.id}-grad-min`}
                        class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                      >
                        Grad. mínima
                      </label>
                      <select
                        id={`cat-${cat.id}-grad-min`}
                        value={cat.grad_min || ''}
                        onChange={(e: Event) =>
                          updateCat(
                            cat.id,
                            'grad_min',
                            (e.target as HTMLSelectElement).value || undefined,
                          )
                        }
                        class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                      >
                        <option value="">Sin requisito</option>
                        {GRAD_OPTS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`cat-${cat.id}-grad-max`}
                        class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                      >
                        Grad. máxima
                      </label>
                      <select
                        id={`cat-${cat.id}-grad-max`}
                        value={cat.grad_max || ''}
                        onChange={(e: Event) =>
                          updateCat(
                            cat.id,
                            'grad_max',
                            (e.target as HTMLSelectElement).value || undefined,
                          )
                        }
                        class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                      >
                        <option value="">Sin requisito</option>
                        {GRAD_OPTS.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`cat-${cat.id}-genero`}
                        class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                      >
                        Género
                      </label>
                      <select
                        id={`cat-${cat.id}-genero`}
                        value={cat.genero || ''}
                        onChange={(e: Event) =>
                          updateCat(
                            cat.id,
                            'genero',
                            (e.target as HTMLSelectElement).value || undefined,
                          )
                        }
                        class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                      >
                        {SEXOS_CATEGORIA.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor={`cat-${cat.id}-edad-min`}
                        class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                      >
                        Edad mín.
                      </label>
                      <input
                        id={`cat-${cat.id}-edad-min`}
                        type="number"
                        value={cat.edad_min ?? ''}
                        onInput={(e: Event) => {
                          const val = (e.target as HTMLInputElement).value;
                          updateCat(
                            cat.id,
                            'edad_min',
                            val ? parseInt(val) : undefined,
                          );
                        }}
                        class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                        placeholder="Ej: 8"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`cat-${cat.id}-edad-max`}
                        class="block text-[10px] font-semibold text-steel uppercase mb-0.5"
                      >
                        Edad máx.
                      </label>
                      <input
                        id={`cat-${cat.id}-edad-max`}
                        type="number"
                        value={cat.edad_max ?? ''}
                        onInput={(e: Event) => {
                          const val = (e.target as HTMLInputElement).value;
                          updateCat(
                            cat.id,
                            'edad_max',
                            val ? parseInt(val) : undefined,
                          );
                        }}
                        class="w-full text-sm border-steel-soft rounded-md shadow-sm p-1.5"
                        placeholder="Ej: 17"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div class="flex gap-3 mt-6 pt-4 border-t border-steel-soft">
          {editing && (
            <button
              onClick={() => setConfirmDelete(true)}
              class="px-6 py-2 bg-surface text-hinomaru border border-hinomaru rounded-md font-medium hover:bg-hinomaru-soft transition-colors text-sm"
            >
              Eliminar permanentemente
            </button>
          )}
          <button
            onClick={onClose}
            class="px-6 py-2 bg-paper text-ink rounded-md font-medium hover:bg-ai-soft transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            class="px-6 py-2 bg-ai text-white rounded-md font-medium hover:bg-ai-strong transition-colors text-sm"
          >
            {editing ? 'Guardar Cambios' : 'Crear Evento'}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Eliminar evento"
        message="¿Está seguro de eliminar permanentemente este evento? Esta acción no se puede deshacer. Si el evento tiene inscripciones pendientes, también serán eliminadas."
        confirmText="Eliminar"
        danger
      />
    </>
  );
}
