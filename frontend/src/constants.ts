export const PROVINCIAS = [
  { value: 'BUENOS_AIRES', label: 'Buenos Aires' },
  { value: 'CABA', label: 'Ciudad Autónoma de Buenos Aires' },
  { value: 'CATAMARCA', label: 'Catamarca' },
  { value: 'CHACO', label: 'Chaco' },
  { value: 'CHUBUT', label: 'Chubut' },
  { value: 'CORDOBA', label: 'Córdoba' },
  { value: 'CORRIENTES', label: 'Corrientes' },
  { value: 'ENTRE_RIOS', label: 'Entre Ríos' },
  { value: 'FORMOSA', label: 'Formosa' },
  { value: 'JUJUY', label: 'Jujuy' },
  { value: 'LA_PAMPA', label: 'La Pampa' },
  { value: 'LA_RIOJA', label: 'La Rioja' },
  { value: 'MENDOZA', label: 'Mendoza' },
  { value: 'MISIONES', label: 'Misiones' },
  { value: 'NEUQUEN', label: 'Neuquén' },
  { value: 'RIO_NEGRO', label: 'Río Negro' },
  { value: 'SALTA', label: 'Salta' },
  { value: 'SAN_JUAN', label: 'San Juan' },
  { value: 'SAN_LUIS', label: 'San Luis' },
  { value: 'SANTA_CRUZ', label: 'Santa Cruz' },
  { value: 'SANTA_FE', label: 'Santa Fe' },
  { value: 'SANTIAGO_DEL_ESTERO', label: 'Santiago del Estero' },
  { value: 'TIERRA_DEL_FUEGO', label: 'Tierra del Fuego' },
  { value: 'TUCUMAN', label: 'Tucumán' },
];

export const SEXOS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'X', label: 'X' },
];

export const SEXOS_CATEGORIA = [
  { value: '', label: 'Todos' },
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'MIXTO', label: 'Mixto' },
];

export const CATEGORIAS_TORNEO_DEFAULT = [
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

export const GRADUACIONES = [
  { value: 'SIN_GRADUACION', label: 'Sin graduación' },
  { value: 'KYU_3', label: '3° Kyu' },
  { value: 'KYU_2', label: '2° Kyu' },
  { value: 'KYU_1', label: '1° Kyu' },
  { value: 'DAN_1', label: '1° Dan' },
  { value: 'DAN_2', label: '2° Dan' },
  { value: 'DAN_3', label: '3° Dan' },
  { value: 'DAN_4', label: '4° Dan' },
  { value: 'DAN_5', label: '5° Dan' },
  { value: 'DAN_6', label: '6° Dan' },
  { value: 'DAN_7', label: '7° Dan' },
  { value: 'DAN_8', label: '8° Dan' },
];
