export interface CategoriaTorneo {
  nombre: string;
  genero: 'MASCULINO' | 'FEMENINO' | 'MIXTO';
  grad_min?: string;
  grad_max?: string;
  edad_min?: number;
  edad_max?: number;
}

export const CATEGORIAS_TORNEO_DEFAULT: CategoriaTorneo[] = [
  { nombre: 'Junior', genero: 'MIXTO', edad_max: 16 },
  { nombre: 'Master', genero: 'MIXTO', edad_min: 50 },
  { nombre: 'Kyu Femenino', genero: 'FEMENINO', grad_min: 'SIN_GRADUACION', grad_max: 'KYU_1' },
  { nombre: 'Kyu Masculino', genero: 'MASCULINO', grad_min: 'SIN_GRADUACION', grad_max: 'KYU_1' },
  { nombre: 'Dan Femenino', genero: 'FEMENINO', grad_min: 'DAN_1' },
  { nombre: 'Dan Masculino 1er y 2do Dan', genero: 'MASCULINO', grad_min: 'DAN_1', grad_max: 'DAN_2' },
  { nombre: 'Dan Masculino 3er Dan en adelante', genero: 'MASCULINO', grad_min: 'DAN_3' },
  { nombre: 'Equipos Junior', genero: 'MIXTO' },
  { nombre: 'Equipos Femenino', genero: 'FEMENINO' },
  { nombre: 'Equipos Masculino', genero: 'MASCULINO' },
];
