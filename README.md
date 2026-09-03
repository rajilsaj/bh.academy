# BantuHub Academy

Plateforme de la formation « Intelligence artificielle et employabilité » de la
Fondation BantuHub, à Brazzaville et Pointe-Noire.

- **Site vitrine** : présentation de la formation, inscription en ligne,
  assistant de questions-réponses.
- **Espace apprenant** : un lien personnel, sans mot de passe. Présence,
  quiz, ressources de cours, dépôt de documents, suivi du parcours.
- **Back-office** : gestion des utilisateurs (export Excel), des formations,
  des modules et de leurs ressources. Accès administrateur et formateur, par
  e-mail et mot de passe ou compte Google.
- **Certificats** : nominatifs, avec un code vérifiable en ligne.

## Technologies

- Next.js 14 (App Router, Server Actions), React 18, TypeScript
- Tailwind CSS
- PostgreSQL, Drizzle ORM
- Auth.js (identifiants et Google)
- Supabase (base de données et stockage des fichiers)
- Vercel (hébergement)
- Anthropic Claude (assistant de la FAQ, facultatif)
- ExcelJS, Nodemailer, Three.js

## Outils

- Node.js 20+ et npm
- Supabase Studio
- Vercel
- Google Cloud Console (OAuth)
- Sharp (optimisation des images)

## Démarrage

```sh
npm install
cp .env.example .env     # DATABASE_URL, SUPABASE_*, secrets
npm run migrate
npm run seed             # facultatif : jeu de démonstration
npm run dev
```

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript |
| `npm run migrate` | Migrations SQL et bucket de fichiers |
| `npm run seed` | Efface tout et insère le jeu de démonstration |

Comptes de démonstration : `admin@bantuhub.cg` et `formateur@bantuhub.cg`,
mot de passe `SEED_PASSWORD` (`bantuhub2025` par défaut).

## Licence

AGPL-3.0-or-later.
