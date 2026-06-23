export const validationMessages: Record<string, string> = {
  'dni should not be empty': 'El DNI es obligatorio',
  'password should not be empty': 'La contraseña es obligatoria',
  'password must be longer than or equal to 6 characters': 'La contraseña debe tener al menos 6 caracteres',
  'email must be an email': 'El correo electrónico no es válido',
  'nombre should not be empty': 'El nombre es obligatorio',
  'apellido should not be empty': 'El apellido es obligatorio',
  'fecha_nacimiento must be a valid ISO 8601 date string': 'La fecha de nacimiento no es válida',
  'sexo must be one of the following values: MASCULINO, FEMENINO': 'El sexo debe ser MASCULINO o FEMENINO',
  'provincia must be one of the following values: BUENOS_AIRES, CABA, CATAMARCA, CHACO, CHUBUT, CORDOBA, CORRIENTES, ENTRE_RIOS, FORMOSA, JUJUY, LA_PAMPA, LA_RIOJA, MENDOZA, MISIONES, NEUQUEN, RIO_NEGRO, SALTA, SAN_JUAN, SAN_LUIS, SANTA_CRUZ, SANTA_FE, SANTIAGO_DEL_ESTERO, TIERRA_DEL_FUEGO, TUCUMAN': 'La provincia no es válida',
  'asociacion_id must be an integer number': 'El ID de asociación debe ser un número entero',
  'dojo_id must be an integer number': 'El ID de dojo debe ser un número entero',
};
