# Requerimientos de Hosting — Kendo Manager

## Perfil de la aplicación

| Característica                  | Valor                                                               |
| ------------------------------- | ------------------------------------------------------------------- |
| Tipo                            | Aplicación web (backend + frontend SPA)                             |
| Backend                         | Node.js 22+ (NestJS)                                                |
| Frontend                        | Preact + Vite (archivos estáticos)                                  |
| Base de datos                   | SQLite                                                              |
| Almacenamiento de archivos      | Sistema de archivos (`uploads/`). Ver § Almacenamiento de archivos. |
| Usuarios concurrentes esperados | < 50                                                                |
| Volumen de datos                | Bajo (miles de registros, no millones)                              |
| Integración externa             | API de Mercado Pago (vía HTTPS saliente)                            |
| Certificación SSL               | Requerida (HTTPS)                                                   |
| Copias de seguridad             | Diarias, con prueba de restauración mensual                         |

## Requerimientos técnicos

### Servidor de aplicación (backend)

- Node.js 22.x LTS o superior
- Ejecución de proceso Node.js persistente (PM2, systemd, o similar)
- Variable de entorno `JWT_SECRET` para firma de tokens
- Variable de entorno `DATABASE_URL` para conexión a PostgreSQL
- Variable de entorno `VITE_MERCADO_PAGO_PUBLIC_KEY` para frontend
- Variable de entorno `MERCADO_PAGO_ACCESS_TOKEN` para backend
- Variable de entorno `LOG_LEVEL` para nivel de logging (default: `info`)
- Variable de entorno `NODE_ENV` para entorno (`production` / `development`)
- Puerto HTTP accesible (por defecto 3000, detrás de proxy reverso)
- Capacidad de escribir archivos en `./uploads/` (persistente entre reinicios)
- Capacidad de servir archivos estáticos desde `./uploads/`

### Base de datos

- SQLite (archivo `./dev.db` en la raíz del proyecto)
- Sin servidor separado — la base de datos es un archivo local
- La aplicación crea y migra el schema mediante Prisma (`prisma db push`)
- Backup: copiar el archivo `dev.db`

### Frontend

- Servidor HTTP (nginx, Caddy, o similar) para archivos estáticos
- Proxy reverso hacia el backend NestJS en rutas `/api/*`
- Las rutas diferentes de `/api/*` deben servir el frontend (SPA fallback)
- Headers de seguridad: X-Content-Type-Options, X-Frame-Options, CSP

### Red

- Certificado SSL/TLS (Let's Encrypt gratuito o comercial)
- Puerto 443 (HTTPS) expuesto públicamente
- Puerto 80 (HTTP) para redirección a HTTPS
- Acceso saliente a internet (API de Mercado Pago)
- Sin necesidad de IP fija dedicada (DNS puede ser A record o CNAME)

### Copias de seguridad

- Backup diario de la base de datos (copiar `dev.db`)
- Backup diario del directorio `uploads/`
- Retención: mínimo 7 días (recomendado 30 días)
- Prueba de restauración mensual

---

## Almacenamiento de archivos

La aplicación permite la subida de archivos (diplomas en PDF, certificados
médicos, imágenes). El volumen esperado es bajo (decenas a centenas de archivos
por año, < 500 MB anuales).

### Opción actual: sistema de archivos local

Los archivos se almacenan en `./uploads/` dentro del servidor y se sirven
estáticamente vía nginx en `/uploads/`.

**Pros:**

- Sin costo adicional de infraestructura
- Sin latencia de red
- Sin dependencia externa
- Sin cambios en el código

**Contras:**

- Los archivos no sobreviven a la destrucción del servidor (requiere backups)
- Escalamiento horizontal requiere storage compartido (NFS, EBS, etc.)
- El espacio en disco del VPS se comparte con la aplicación y la base de datos

### Alternativa: Object Storage (S3-compatible)

AWS S3 o alternativas más económicas como DigitalOcean Spaces, Vultr Object
Storage o Backblaze B2.

**Pros:**

- Los archivos persisten independientemente del servidor
- Escalamiento horizontal sin cambios de arquitectura
- Backups automáticos del proveedor (11 9's de durabilidad)
- Sin riesgo de llenar el disco del servidor

**Contras:**

- Costo adicional (~$5/mes en Spaces o B2, ~$0.023/GB en AWS S3 Standard)
- Requiere migrar el código de `files.service.ts` para usar SDK de S3
- Mayor latencia de lectura/escritura (red vs local)
- Complejidad arquitectónica innecesaria para el volumen actual

### Recomendación

**Para el volumen actual (< 500 MB/año, < 50 usuarios), el almacenamiento local
es la opción correcta.** S3 sería overkill: agrega costo, complejidad y una
dependencia externa sin beneficio real para este perfil de uso.

La contrapartida es asegurar los backups del directorio `uploads/` junto con la
base de datos. En el checklist de instalación se incluye este paso.

Si en el futuro la aplicación creciera (múltiples servidores, > 500 usuarios, >
5 GB de archivos), migrar a DigitalOcean Spaces ($5/mes por 250 GB) sería el
paso natural sin comprometerse con AWS.

---

## Propuestas de servicios cloud

### Tier 1 — Económico (recomendado para FAK)

Adecuado para el volumen actual de la Federación Argentina de Kendo.

| Recurso                           | Servicio                                             | Especificación              | Costo estimado (USD/mes) |
| --------------------------------- | ---------------------------------------------------- | --------------------------- | ------------------------ |
| Servidor de aplicación + frontend | VPS básico                                           | 2 vCPU, 2 GB RAM, 40 GB SSD | ~10–15                   |
| Base de datos                     | SQLite (archivo local en el mismo VPS)               | —                           | incluido                 |
| SSL                               | Let's Encrypt (gratuito)                             | —                           | $0                       |
| Backups                           | Scripts automáticos + rsync a almacenamiento externo | —                           | $0                       |
| **Total estimado**                |                                                      |                             | **~10–15 USD/mes**       |

**Proveedores sugeridos:**

| Proveedor        | Producto      | Especificación              | Precio (USD/mes) | Notas                                                |
| ---------------- | ------------- | --------------------------- | ---------------- | ---------------------------------------------------- |
| **DigitalOcean** | Droplet Basic | 2 vCPU, 2 GB RAM, 40 GB SSD | $12              | Data center São Paulo. Panel de control simple.      |
| **Vultr**        | Cloud Compute | 2 vCPU, 2 GB RAM, 40 GB SSD | $12              | Data center São Paulo. Similar a DigitalOcean.       |
| **Hetzner**      | CX22          | 2 vCPU, 4 GB RAM, 40 GB SSD | ~$7              | Data center en Europa (más latencia). Muy económico. |
| **Hostinger**    | VPS KVM 1     | 2 vCPU, 4 GB RAM, 50 GB SSD | ~$9              | Sin data center en Sudamérica. Precio promocional.   |

> **Recomendación:** DigitalOcean Droplet de $12/mes en São Paulo (saque un
> snapshot semanal como backup adicional). Instalar aplicación Node.js con PM2
> + nginx como proxy reverso y servidor de estáticos.

---

### Tier 2 — Administrado (menos mantenimiento)

Con SQLite no se necesita base de datos administrada. Todo corre en un solo
VPS. Si en el futuro se requiere PostgreSQL por escala, se puede migrar sin
cambios en la aplicación.

| Recurso                           | Servicio                                         | Especificación              | Costo estimado (USD/mes) |
| --------------------------------- | ------------------------------------------------- | --------------------------- | ------------------------ |
| Servidor de aplicación + frontend | VPS                                              | 2 vCPU, 2 GB RAM, 40 GB SSD | ~12                      |
| Base de datos                     | SQLite (incluido, sin servidor separado)          | —                           | $0                       |
| SSL                               | Let's Encrypt (gratuito)                         | —                           | $0                       |
| Backups                           | Copia del archivo `dev.db` + snapshots del VPS   | —                           | incluido                 |
| **Total estimado**                |                                                  |                             | **~12 USD/mes**          |

---

### Tier 3 — Serverless / PaaS (mínima administración)

No recomendado con SQLite (los PaaS esperan una URL de base de datos externa).
Si se necesita este modelo, migrar a PostgreSQL sigue siendo viable en
cualquier momento.

---

## Arquitectura de red recomendada

```
      ┌─────────────┐
      │  Let's      │
      │  Encrypt    │
      │  (SSL)     │
      └──────┬──────┘
             │
      ┌──────▼──────┐
      │   nginx     │  ← proxy reverso
      │  (o Caddy)  │
      └──┬──────┬───┘
         │      │
┌────────▼┐  ┌──▼────────┐
│ Backend  │  │ Frontend  │
│ NestJS   │  │ estáticos │
│ :3000    │  │ (HTML/CSS)│
└────┬─────┘  └───────────┘
```

## Guía rápida de implementación (DigitalOcean)

1. Crear Droplet Ubuntu 24.04 LTS ($12/mo, São Paulo)
2. Instalar Node.js 22.x, nginx
3. Clonar repositorio, instalar dependencias (`pnpm install`)
4. Compilar backend (`pnpm run build`) y frontend
   (`cd frontend && pnpm run build`)
5. Configurar `DATABASE_URL=file:./dev.db`, `JWT_SECRET`,
   `MERCADO_PAGO_ACCESS_TOKEN` en `.env`
6. Ejecutar `npx prisma db push` para crear schema
7. Iniciar backend con PM2: `pm2 start dist/main.js --name kendo-api`
8. Configurar nginx:
   - Servir `frontend/dist/` en `/`
   - Proxy reverso `/api/*` hacia `http://localhost:3000`
   - Proxy reverso `/uploads/` hacia la carpeta de archivos
   - SSL con Certbot (Let's Encrypt)

## Checklist de instalación

- [ ] Node.js 22.x instalado
- [ ] `JWT_SECRET` generado (`openssl rand -hex 64`)
- [ ] `DATABASE_URL` configurada (ej: `file:./dev.db`)
- [ ] `MERCADO_PAGO_ACCESS_TOKEN` configurado
- [ ] `VITE_MERCADO_PAGO_PUBLIC_KEY` configurado en frontend
- [ ] Backend compilado y corriendo con PM2
- [ ] Frontend compilado y sirviendo correctamente
- [ ] nginx configurado con proxy reverso
- [ ] SSL activo (Let's Encrypt)
- [ ] Backup automático configurado (copia de `dev.db` diaria + rsync)
- [ ] Firewall configurado (solo puertos 22, 80, 443)
- [ ] Uploads directory con permisos correctos
- [ ] Prueba de restauración de backup exitosa
