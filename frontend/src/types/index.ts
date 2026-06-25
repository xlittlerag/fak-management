export interface DatosLugar {
  direccion: string;
  provincia: string;
  [key: string]: unknown;
}

export interface CategoriaDef {
  nombre: string;
  genero?: string;
  disciplina?: string;
  grad_min?: string;
  grad_max?: string;
  edad_min?: number;
  edad_max?: number;
}

export interface EventoResumen {
  id: number;
  tipo: string;
  ambito?: string;
  fecha_inicio: string;
  fecha_fin: string;
  datos_lugar: DatosLugar;
  publicado: boolean;
  pago_fuera_sistema: boolean;
  archivos_info: string | string[] | null;
  creador_id: number | null;
  torneo?: Record<string, unknown>;
  examen?: Record<string, unknown>;
  seminario?: Record<string, unknown>;
}

export interface InscripcionResumen {
  id: number;
  evento_id: number;
  categorias: string[];
  disciplinas?: string[];
  estado_aprob: string;
  pagado: boolean;
  pagado_fuera_sistema: boolean;
  necesidades_especiales: boolean;
  descripcion_necesidades: string | null;
  archivo_medico_url: string | null;
  evento: { id: number; tipo: string; fecha_inicio: string };
  usuario?: { id: number; nombre: string; email: string; dni: string; asociacion_id: number };
}
