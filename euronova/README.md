# 🌌 EuroNova — Plataforma Cósmica de Voluntariado Europeo y Oportunidades Juveniles

![Next.js 15](https://img.shields.io/badge/Next.js-15.0%2B-black?style=for-the-badge&logo=next.js)
![React 19](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_RLS-3ECF8E?style=for-the-badge&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict_v5-3178C6?style=for-the-badge&logo=typescript)
![i18n](https://img.shields.io/badge/i18n-7_Locales_(100%25)-purple?style=for-the-badge)
![Deployment](https://img.shields.io/badge/Vercel-Production_Edge-000000?style=for-the-badge&logo=vercel)

EuroNova es una plataforma web moderna de alto rendimiento diseñada para conectar a jóvenes con oportunidades de voluntariado europeo, proyectos Erasmus+, Cuerpos Europeos de Solidaridad (ESC) y formación internacional. Desarrollada bajo el sistema de diseño visual **"Cosmic Dark Mode"**, una arquitectura server-first blindada con Supabase y soporte multilingüe en 7 idiomas.

---

## 🚀 Características Principales

* 🎨 **Sistema de Diseño Cósmico (Cosmic Dark Mode):** Paleta visual futurista basada en Tailwind CSS v4 (`void-deep`, `void-surface`, `plasma-cyan`, `hyper-violet`, `nova-flare`, `rup-emerald`) con animaciones fluidas vía Framer Motion y componentes accesibles Radix UI / Shadcn.
* 🌐 **Internacionalización Integral (7 Idiomas):** Cobertura del 100% de paridad con 2,138 claves sincronizadas en Español (`es`), Inglés (`en`), Alemán (`de`), Francés (`fr`), Italiano (`it`), Ruso (`ru`) y Portugués (`pt`).
* 🔒 **Seguridad y Defensas Multi-Capa:**
  - Encabezados HTTP estrictos (Content-Security-Policy, HSTS preloaded, X-Frame DENY, nosniff).
  - Autenticación persistente sincronizada en cookies `httpOnly` mediante `@supabase/ssr`.
  - Protección de endpoints de fondo (`/api/cron/*`) con verificación criptográfica en tiempo constante (`crypto.timingSafeEqual`).
* 🗄️ **Base de Datos Supabase con RLS:** 32 migraciones SQL idempotentes con políticas Row Level Security (RLS) anti-escalamiento de privilegios, soporte omnicanal y eliminación atómica GDPR Art. 17 (*Right to be Forgotten*).
* 🔄 **Respaldos Automatizados a Google Drive (Safe Rotation):** Flujo diario en GitHub Actions (`.github/workflows/db-backup.yml`) a las 04:00 AM UTC que extrae la base de datos vía `pg_dump`, la comprime con gzip y la almacena en Google Drive, eliminando el respaldo anterior únicamente tras verificar el 100% del éxito de la nueva subida.
* 📊 **Telemetría y Límites de Error en Vivo:** Endpoint `/api/health` sin caché para monitorizar latencia en milisegundos y captura de excepciones 404/500 sin fugas de trazas sensibles.

---

## 📂 Estructura del Repositorio

```text
EuroNova/
├── .github/
│   └── workflows/
│       ├── ci.yml                           # Quality Gatekeeper automatizado en cada push/PR
│       └── db-backup.yml                    # Backup diario a Google Drive con Safe Rotation
├── docs/
│   ├── ARCHITECTURE_AND_DEPLOYMENT.md       # Arquitectura detallada, diagramas Mermaid y locks
│   ├── API_REFERENCE.md                     # Manual humano de API HTTP y webhooks de fondo
│   ├── openapi.yaml                         # Especificación estándar OpenAPI 3.1 máquina-legible
│   ├── ADMIN_AND_TRUST_MANUAL.md            # Manual de Auto-Scraper y matemática True Trust
│   ├── GDPR_SECURITY_AND_RECOVERY.md        # Auditoría RGPD, Disaster Recovery y Quality Gates
│   └── BACKUP_SETUP.md                      # Configuración de Service Account y Google Drive
├── supabase/
│   ├── migrations/                          # 32 scripts SQL de esquema, índices y RLS
│   └── recovery/
│       └── emergency_rollback_and_audit.sql # Kit SQL de contingencia en 5 bloques
├── vercel.json                              # Calibración de Crons y funciones Edge en Vercel
├── euronova/                                # Directorio principal de la aplicación Next.js
│   ├── actions/                             # Server Actions (Mutaciones atómicas de backend)
│   ├── app/                                 # Next.js 15 App Router ([locale], legal, dashboard, etc.)
│   ├── components/                          # Componentes React (CosmicTooltip, Modales, Mapas)
│   ├── i18n/                                # Configuración de idiomas y routing de next-intl
│   ├── lib/                                 # Utilidades (Supabase clients, auth, cronAuth, GDPR)
│   ├── messages/                            # Diccionarios de traducción (en, es, de, fr, it, ru, pt)
│   ├── scripts/                             # Scripts de auditoría y validación pre-vuelo
│   ├── .env.example                         # Plantilla de variables de entorno sanitizada
│   └── package.json                         # Dependencias y scripts de construcción
└── README.md                                # Documento maestro del proyecto
```

---

## ⚡ Inicio Rápido (Local Development)

### 1. Clonar el Repositorio e Instalar Dependencias
```bash
git clone https://github.com/CRACKXXXX/EuroNova.git
cd EuroNova/euronova
npm ci
```

### 2. Configurar Variables de Entorno
```bash
cp .env.example .env.local
```
Completa las variables requeridas en `.env.local` y ejecuta el validador pre-vuelo:
```bash
node scripts/validate-env.mjs
```

### 3. Aplicar Migraciones en Supabase
Ejecuta los scripts ubicados en `supabase/migrations/` en el **SQL Editor** de tu proyecto Supabase (o mediante `npx supabase db push`).

### 4. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Controles de Calidad Pre-Commit (Quality Gates)

Para garantizar la estabilidad absoluta en producción, ejecuta los controles bloqueantes:

```bash
# 1. Validador de entorno y credenciales
node scripts/validate-env.mjs

# 2. Validador estricto de paridad i18n (100% de paridad en 7 idiomas)
node scripts/validate-i18n.mjs --strict

# 3. Escáner de texto estático y toasts en componentes
node scripts/scan-hardcoded.mjs

# 4. Escáner de internacionalización en rutas del App Router
node scripts/scan-routes.mjs

# 5. Verificación de tipos estricta en TypeScript
npx tsc --noEmit

# 6. Linter ESLint con 0 advertencias toleradas
npx eslint app components lib actions --max-warnings=0

# 7. Compilación final de producción
npm run build
```

---

## 📚 Índice Maestro de Documentación (Phase H & Phase I)

La plataforma cuenta con documentación exhaustiva para desarrolladores, auditores de la Unión Europea y administradores de sistemas:

1. 📐 **[Arquitectura Visual, Despliegue en Vercel & Dependency Locks](docs/ARCHITECTURE_AND_DEPLOYMENT.md)**  
   *Diagramas de arquitectura Mermaid, pipelines de datos, guía de configuración Zero-to-Hero y candados de dependencias.*
2. 🔌 **[Especificación OpenAPI 3.1 Swagger](docs/openapi.yaml)**  
   *Especificación estándar máquina-legible para todos los 7 Route Handlers de EuroNova con esquemas de autenticación Bearer.*
3. 📖 **[Manual de Referencia de API & Webhooks](docs/API_REFERENCE.md)**  
   *Guía legible para humanos con ejemplos cURL, códigos HTTP, límites de tasa y verificación de Crons.*
4. 🛡️ **[Manual del Administrador: Auto-Scraper y True Trust Protocol](docs/ADMIN_AND_TRUST_MANUAL.md)**  
   *Internas del Auto-Scraper, deduplicación en 3 capas, matemática del True Trust Protocol (escala 0-100) y progresión de 50 niveles.*
5. ⚖️ **[Dossier de Seguridad RGPD, Disaster Recovery & Guía CI/CD](docs/GDPR_SECURITY_AND_RECOVERY.md)**  
   *Auditoría Art. 17 ("Right to be Forgotten"), política de decay a 2 años Art. 5.1.e, restauración paso a paso de copias de Google Drive y guía de scripts CI/CD.*
6. 💾 **[Configuración de Copias de Seguridad en Google Drive](docs/BACKUP_SETUP.md)**  
   *Guía paso a paso para configurar la Google Cloud Console, Service Account y rotación segura en GitHub Actions.*
7. 🆘 **[Kit SQL de Emergencia, Bloqueo y Auditoría](../supabase/recovery/emergency_rollback_and_audit.sql)**  
   *Script SQL de contingencia en 5 bloques para bloqueo 1-click en solo lectura, reversión de lotes del scraper y purga de botnets.*

---
**EuroNova Engineering Team** — *Built for European Youth Mobility & Solidarity.*
