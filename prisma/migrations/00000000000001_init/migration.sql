-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN_GENERAL', 'ADMIN_ASOCIACION', 'BASICO');

-- CreateEnum
CREATE TYPE "EstadoRegistro" AS ENUM ('PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "Disciplina" AS ENUM ('KENDO', 'IAIDO', 'JODO');

-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MASCULINO', 'FEMENINO', 'X');

-- CreateEnum
CREATE TYPE "Graduacion" AS ENUM ('SIN_GRADUACION', 'KYU_3', 'KYU_2', 'KYU_1', 'DAN_1', 'DAN_2', 'DAN_3', 'DAN_4', 'DAN_5', 'DAN_6', 'DAN_7', 'DAN_8');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "Provincia" AS ENUM ('BUENOS_AIRES', 'CABA', 'CATAMARCA', 'CHACO', 'CHUBUT', 'CORDOBA', 'CORRIENTES', 'ENTRE_RIOS', 'FORMOSA', 'JUJUY', 'LA_PAMPA', 'LA_RIOJA', 'MENDOZA', 'MISIONES', 'NEUQUEN', 'RIO_NEGRO', 'SALTA', 'SAN_JUAN', 'SAN_LUIS', 'SANTA_CRUZ', 'SANTA_FE', 'SANTIAGO_DEL_ESTERO', 'TIERRA_DEL_FUEGO', 'TUCUMAN');

-- CreateTable
CREATE TABLE "AdminGeneral" (
    "id" SERIAL NOT NULL,
    "dni" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "AdminGeneral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asociacion" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Asociacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dojo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "asociacion_id" INTEGER NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Dojo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "fecha_nacimiento" TIMESTAMP(3) NOT NULL,
    "sexo" "Sexo" NOT NULL,
    "calle_altura" TEXT NOT NULL,
    "piso_depto" TEXT,
    "ciudad" TEXT NOT NULL,
    "provincia" "Provincia" NOT NULL,
    "codigo_postal" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'BASICO',
    "estado_pago" BOOLEAN NOT NULL DEFAULT false,
    "asociacion_id" INTEGER NOT NULL,
    "dojo_id" INTEGER NOT NULL,
    "estado_reg" "EstadoRegistro" NOT NULL DEFAULT 'PENDIENTE_APROBACION',
    "estado_blanqueo" "EstadoSolicitud" NOT NULL DEFAULT 'APROBADO',
    "grad_kendo" "Graduacion" NOT NULL DEFAULT 'SIN_GRADUACION',
    "f_grad_kendo" TIMESTAMP(3),
    "grad_iaido" "Graduacion" NOT NULL DEFAULT 'SIN_GRADUACION',
    "f_grad_iaido" TIMESTAMP(3),
    "grad_jodo" "Graduacion" NOT NULL DEFAULT 'SIN_GRADUACION',
    "f_grad_jodo" TIMESTAMP(3),

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificadoExterno" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "url_archivo" TEXT NOT NULL,
    "disciplina" "Disciplina" NOT NULL,
    "grad_solicitada" "Graduacion" NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "CertificadoExterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evento" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "ambito" TEXT NOT NULL DEFAULT 'REGIONAL',
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "datos_lugar" JSONB NOT NULL,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "pago_fuera_sistema" BOOLEAN NOT NULL DEFAULT false,
    "archivos_info" JSONB,
    "creador_id" INTEGER,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Torneo" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "disciplina" TEXT NOT NULL,
    "costo_inscripcion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categorias" JSONB NOT NULL,
    "inscripcion_multiple" BOOLEAN NOT NULL DEFAULT false,
    "grad_min" TEXT,
    "grad_max" TEXT,
    "info_adicional" TEXT,
    "fecha_limite_informativa" TIMESTAMP(3),
    "fecha_limite_real" TIMESTAMP(3),
    "inscripciones_abiertas" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Torneo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Examen" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "disciplinas" JSONB NOT NULL,
    "graduaciones_a_rendir" JSONB NOT NULL,
    "info_adicional" TEXT,

    CONSTRAINT "Examen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seminario" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "disciplina" TEXT NOT NULL,
    "costo_inscripcion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "info_adicional" TEXT,

    CONSTRAINT "Seminario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscripcionEvento" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "categoria_grad" JSONB NOT NULL,
    "disciplinas" JSONB,
    "estado_aprob" "EstadoSolicitud" NOT NULL DEFAULT 'PENDIENTE',
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "pagado_fuera_sistema" BOOLEAN NOT NULL DEFAULT false,
    "necesidades_especiales" BOOLEAN NOT NULL DEFAULT false,
    "descripcion_necesidades" TEXT,
    "archivo_medico_url" TEXT,

    CONSTRAINT "InscripcionEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialGraduacion" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "disciplina" "Disciplina" NOT NULL,
    "graduacion" "Graduacion" NOT NULL,
    "fecha_obtencion" TIMESTAMP(3) NOT NULL,
    "otorgado_por" TEXT NOT NULL,

    CONSTRAINT "HistorialGraduacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "precioexamen" (
    "id" SERIAL NOT NULL,
    "graduacion" TEXT NOT NULL,
    "costo" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "precioexamen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dniblacklist" (
    "id" SERIAL NOT NULL,
    "dni" TEXT NOT NULL,

    CONSTRAINT "dniblacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuotaglobal" (
    "id" SERIAL NOT NULL,
    "monto_actual" DOUBLE PRECISION NOT NULL,
    "fecha_vencimiento" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuotaglobal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminGeneral_dni_key" ON "AdminGeneral"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_dni_key" ON "Usuario"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Torneo_evento_id_key" ON "Torneo"("evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "Examen_evento_id_key" ON "Examen"("evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "Seminario_evento_id_key" ON "Seminario"("evento_id");

-- CreateIndex
CREATE UNIQUE INDEX "precioexamen_graduacion_key" ON "precioexamen"("graduacion");

-- CreateIndex
CREATE UNIQUE INDEX "dniblacklist_dni_key" ON "dniblacklist"("dni");

-- AddForeignKey
ALTER TABLE "Dojo" ADD CONSTRAINT "Dojo_asociacion_id_fkey" FOREIGN KEY ("asociacion_id") REFERENCES "Asociacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_asociacion_id_fkey" FOREIGN KEY ("asociacion_id") REFERENCES "Asociacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_dojo_id_fkey" FOREIGN KEY ("dojo_id") REFERENCES "Dojo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificadoExterno" ADD CONSTRAINT "CertificadoExterno_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evento" ADD CONSTRAINT "Evento_creador_id_fkey" FOREIGN KEY ("creador_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Torneo" ADD CONSTRAINT "Torneo_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Examen" ADD CONSTRAINT "Examen_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seminario" ADD CONSTRAINT "Seminario_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionEvento" ADD CONSTRAINT "InscripcionEvento_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscripcionEvento" ADD CONSTRAINT "InscripcionEvento_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "Evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistorialGraduacion" ADD CONSTRAINT "HistorialGraduacion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
