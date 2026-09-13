# Cockpit IALAB - Project Structure

## Overview
**Cockpit IALAB** is the new project branding for the BantuHub Academy management platform. The original project has been preserved in the `/v1` folder while the main folder runs the new version.

- **Project Name**: cockpit-ialab (v2.0.0)
- **Status**: Production-ready (same database & Vercel deployment)
- **Deployment**: Vercel (`bh-academy-seven.vercel.app`)
- **Database**: Supabase (PostgreSQL)
- **Homepage**: Direct Gmail login (no public vitrine)

## Folder Structure

### Main Project (Active)
```
/
├── app/                    # Next.js App Router
│   ├── admin/(protege)/    # Admin/Cockpit dashboard
│   ├── l/[token]/          # Learner portal (token-based)
│   ├── mon-espace/         # Login gateway (auto-redirect)
│   └── page.tsx            # Homepage (Gmail login only)
├── components/             # React components
├── lib/                    # Utilities & logic
│   ├── db/                 # Database schemas (Drizzle ORM)
│   ├── i18n/fr.ts          # French translations
│   ├── auth.ts             # Authentication (Auth.js)
│   └── cockpit-menu.ts     # Menu state management
├── public/                 # Static assets
├── scripts/                # CLI scripts (migrate, seed)
└── db/                     # Database setup

### Backup (Archived)
```
/v1/                       # Complete backup of previous version
```

## Sidebar Menu (New Layout)

### Dashboard
- **Tableau de bord** → `/admin`

### People (Personnes)
- **Formateurs** → `/admin/formateurs`
- **Apprenants** → `/admin/utilisateurs`

### Management (Gestion)
- **Modules** → `/admin/modules`
- **Sessions** → `/admin/sessions`
- **Ressources** → `/admin/ressources`

### Configuration
- **Configs** → `/admin/configuration`
- **Support Technique** → `/admin/visites`

**Authentication**: Login in top-right avatar + Logout button

## Technology Stack

- **Framework**: Next.js 14 (App Router, Server Actions)
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: PostgreSQL (Supabase), Drizzle ORM
- **Authentication**: Auth.js (credentials + Google OAuth)
- **Storage**: Supabase Storage (fichiers bucket)
- **Hosting**: Vercel
- **AI**: Anthropic Claude (FAQ assistant, optional)
- **Tools**: ExcelJS (exports), Nodemailer (email), pdf-lib, Three.js

## Environment Variables

All stored in `.env` and synced to Vercel:
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` - File storage
- `AUTH_SECRET` / `TOKEN_SECRET` - Session management
- `AUTH_GOOGLE_*` - OAuth credentials
- `ANTHROPIC_API_KEY` - AI features (optional)
- `SMTP_*` / `SMS_WEBHOOK_*` - Notifications (optional)

## Homepage (Entry Point)

The homepage (`/`) is now a minimal login page with:
- **Single login method**: Google OAuth only
- **Auto-redirect**:
  - Existing admin/trainer → `/admin` (dashboard)
  - Existing learner → `/mon-espace` (portal)
- **Design**: Centered card with BantuHub + IALAB branding

This replaces the public vitrine (hero, modules, FAQ, pricing sections) which are now archived in `/v1`.

## Key Features

- ✅ User management (admin, trainer, learner roles)
- ✅ Module & session administration
- ✅ Excel/PDF exports
- ✅ Personal learner tokens (no password)
- ✅ Training resource management
- ✅ Attendance tracking
- ✅ Certificates with verification codes
- ✅ AI-powered FAQ assistant (optional)
- ✅ Email notifications (optional)

## Development

```bash
npm install
npm run dev              # Start dev server (port 3000)
npm run build           # Production build
npm run migrate         # Run database migrations
npm run seed            # Load demo data
npm run typecheck       # TypeScript check
```

Demo accounts: `admin@bantuhub.cg` / `formateur@bantuhub.cg`
Demo password: `bantuhub2025` (from `SEED_PASSWORD`)

## Deployment

The project is deployed to Vercel with:
- Automatic deployments on git push to `main`
- Environment variables managed in Vercel dashboard
- Build script: `tsx scripts/verifier-typo.ts && tsx scripts/cli.ts migrate && next build`
- Production URL: `bh-academy-seven.vercel.app`

## Version History

- **v2.0.0**: 
  - ✅ Cockpit IALAB rebranding (current)
  - ✅ Homepage: Gmail login only (no public vitrine)
  - ✅ Sidebar menu with standardized labels
- **v1.0.0**: BantuHub Academy (archived in `/v1`)

---

**Last Updated**: 2026-09-13
**Latest Commits**: 
- `88c50e4` - Homepage: Gmail login form
- `e0e95f8` - Rebranding: Cockpit IALAB
