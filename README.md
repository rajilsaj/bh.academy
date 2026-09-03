# BantuHub — Suivi des apprenants

Application de suivi des apprenants d'un programme de littératie en intelligence
artificielle, **avant, pendant et après** la formation. Conçue pour la Fondation
BantuHub, Brazzaville. Promotions de 30 à 80 personnes, consultées depuis des
téléphones Android d'entrée de gamme sur données mobiles.

Hébergé sur Vercel et Supabase, sans serveur à entretenir : un `git push` déploie.

---

## Démarrage

L'application tourne sur **Vercel** ; la base de données et les fichiers sont
chez **Supabase**. Aucun conteneur, aucun serveur à entretenir.

### 1. Supabase

1. Créez un projet sur <https://supabase.com> (région Europe, la plus proche
   de Brazzaville en latence).
2. *Project Settings → Database* : copiez la chaîne de connexion du **pooler en
   mode Transaction** (port 6543) : c'est le `DATABASE_URL` de l'application.
   Copiez aussi la connexion **directe** (port 5432) pour les scripts.
3. *Project Settings → API* : notez l'URL du projet (`SUPABASE_URL`) et la clé
   **service_role** (`SUPABASE_SERVICE_ROLE_KEY`). Cette clé reste côté serveur.

Le bucket privé `fichiers` est créé automatiquement par la première migration.

### 2. Base et jeu de démonstration

```sh
npm install
cp .env.example .env        # renseignez DATABASE_URL (port 5432), SUPABASE_*, les secrets
npm run migrate             # tables, vues, bucket
npm run seed                # facultatif : la promotion de démonstration (40 apprenants)
```

Comptes du personnel créés par le jeu de démonstration (même mot de passe,
`SEED_PASSWORD`, par défaut `bantuhub2025`) :

| Adresse | Rôle |
| --- | --- |
| `admin@bantuhub.cg` | `admin` |
| `formateur@bantuhub.cg` | `formateur` |

Le récapitulatif affiché en fin d'amorçage donne l'URL d'inscription de la
promotion, le code de la session ouverte et un exemple de lien apprenant.
Pour une production vierge, n'exécutez simplement pas `npm run seed`.

### 3. Vercel

1. Poussez le dépôt sur GitHub, puis *Add New Project* sur <https://vercel.com>
   en important le dépôt. Le framework Next.js est détecté ; rien à configurer.
2. *Settings → Environment Variables* : reportez toutes les variables de
   `.env.example`. Pour `DATABASE_URL`, utilisez le **pooler port 6543**.
   `APP_URL` est l'adresse publique (`https://suivi.bantuhub.cg`).
3. Déployez. La commande `vercel-build` du `package.json` exécute le garde-fou
   typographique, applique les migrations manquantes, puis construit le site :
   chaque déploiement laisse la base au niveau du code.

> **En production**, tirez `AUTH_SECRET` et `TOKEN_SECRET` au hasard
> (`openssl rand -base64 32`). Changer `TOKEN_SECRET` après coup invalide tous
> les liens apprenants déjà distribués. Ne le faites pas en cours de promotion.

---

## Où vivent les données

| Donnée | Où | Accès |
| --- | --- | --- |
| Base PostgreSQL | Supabase, projet dédié | Supabase Studio (*Table Editor*, *SQL Editor*) |
| Fichiers apprenants et ressources de cours | Supabase Storage, bucket privé `fichiers` | Supabase Studio (*Storage*) ; servis par l'application seulement, après vérification |
| Certificats TLS, domaine | Vercel | Automatique |

Les fichiers ne sont **jamais servis directement** depuis Supabase : les
routes `/api/fichiers/[id]`, `/api/ressources/[id]` et `/l/[token]/ressources/[id]`
vérifient qui demande (personnel connecté, ou apprenant par son lien) avant de
lire le fichier avec la clé de service. Le bucket n'a donc pas besoin de
politiques RLS : il est privé, point.

Supabase conserve des **sauvegardes quotidiennes** de la base (sept jours sur
l'offre gratuite, davantage sur Pro). Pour une copie à vous, voir
[Sauvegarde](#sauvegarde).

> Sans `SUPABASE_URL` dans `.env`, le poste de développement écrit les fichiers
> dans `./data/uploads` : même contrat, aucun réseau. Pratique hors ligne.

---

## Les deux interfaces

L'application porte **deux systèmes visuels distincts**, définis une seule fois
dans `tailwind.config.ts` et `app/globals.css`. Aucune couleur n'est écrite en
dur dans un composant.

### Vitrine — violet, jaune, rondeurs

Pour le public et les apprenants : page d'accueil, inscription, les cinq
surfaces apprenant, certificat. Fond violet quadrillé, cartes blanches très
arrondies, boutons pilule jaunes à flèche, pastilles contourées, mots
manuscrits d'accentuation. Chaleureux et lisible sur un petit écran.

Classes : `.panneau-violet`, `.carte`, `.bouton-principal`, `.pastille`,
`.option`, `.faq`, `.titre`, `.manuscrit`.

### Back-office — sombre et dense

Pour les formateurs **et les apprenants** qui suivent leur progression :
`/admin/*` et `/l/[token]/parcours`. Fond quasi noir, panneaux à filet, onglets
pilule blanc-sur-noir, accents menthe / rose / jaune / violet, chiffres larges,
jauges et anneaux de progression.

Classes : `.bo`, `.bo-panneau`, `.bo-onglets`, `.bo-puce`, `.bo-tableau`,
`.bo-jauge`, `.bo-chiffre`.

Les graphiques sont du HTML et du SVG rendus côté serveur — jauges, histogramme,
anneau de progression. **Aucune bibliothèque de graphiques**, sur aucune page.

### Polices

Deux familles auto-hébergées sous OFL 1.1 (`app/fonts/`, licence détaillée dans
`app/fonts/LICENCE.md`) : **Fredoka** pour les titres, **Caveat** pour les mots
manuscrits. Aucune requête vers Google Fonts.

Elles ne sont chargées **que sur les pages sans contrainte de bande passante** :
accueil, inscription, certificat. Les cinq surfaces apprenant s'en passent — 16 Ko
de police décorative feraient dépasser le budget de 100 Ko, et l'identité tient
déjà au violet, au jaune et aux rondeurs. Le back-office utilise la pile système.

---

## Ce que fait le produit

### Côté apprenant — un lien, cinq surfaces

Aucun compte, aucun mot de passe, aucune adresse à vérifier. L'accès est un jeton
signé dans l'URL, distribué par WhatsApp : `https://…/l/<jeton>`.

| Route | Rôle |
| --- | --- |
| `/l/[token]` | Aiguilleur : détecte ce qui est ouvert et n'affiche **qu'une seule action** |
| `/l/[token]/presence` | Saisie du code du jour |
| `/l/[token]/quiz/[quizId]` | 5 questions, une par écran, score immédiat |
| `/l/[token]/suivi/[waveCode]` | Questionnaire mensuel, 10 questions |
| `/l/[token]/documents` | Envoi d'une production (CV, lettre, rapport…) |
| `/l/[token]/parcours` | Son avancement module par module, et son certificat |

L'aiguilleur ne présente jamais un menu. L'ordre de priorité est figé :
présence → quiz → questionnaire → documents.

Le jeton est composé de 24 caractères aléatoires suivis de 8 caractères de
signature HMAC. Un lien mal recopié est rejeté sans même interroger la base.

### Inscription publique

`/inscription/[cohortId]` est la **seule** route qui crée un apprenant. Elle
capture la situation de départ, pas seulement les coordonnées : statut
professionnel, outils d'IA déjà utilisés, confiance auto-évaluée de 1 à 5,
objectif professionnel. Ces réponses sont stockées comme la réponse à la vague
`J0` — le même objet que les suivis mensuels, donc comparable dans le temps.

À la validation, l'identifiant (`BH-IA-041`) et le lien personnel s'affichent,
avec un bouton de copie.

### Côté administration

Le back-office est volontairement réduit à deux écrans : les personnes et la
matière enseignée.

| Route | Rôle |
| --- | --- |
| `/admin/utilisateurs` | Équipe et apprenants : créer, modifier, inviter, supprimer, **exporter en Excel** (`/admin/utilisateurs/export/equipe.xlsx` et `apprenants.xlsx`) |
| `/admin/modules` | Les formations et leurs modules (points, poids, seuil, formateur attitré) |
| `/admin/modules/[id]` | La fiche d'une formation : modules, objectifs, promotions rattachées |
| `/admin/ressources` | Les ressources de chaque module (présentations, vidéos, quiz) |
| `/certificat/[code]` | Vérification publique d'un certificat (sans authentification) |

Les anciens écrans (tableau de bord, relance, sessions, vagues, certificats,
export CSV, points, notifications) sont conservés dans `_archive/` hors du code
compilé, pour être remis en service si besoin.

### Connexion

Deux façons d'entrer, pour tout le monde : **e-mail + mot de passe**, ou
**Continuer avec Google** (compte Gmail ou Google Workspace). Le bouton Google
n'apparaît que si `AUTH_GOOGLE_ID` et `AUTH_GOOGLE_SECRET` sont renseignés dans
`.env` (identifiants OAuth « application Web », URI de redirection
`<APP_URL>/api/auth/callback/google`). Google ne crée jamais de compte : seule
une adresse déjà enregistrée dans Utilisateurs peut se connecter par ce biais.

### Rôles

| Permission | `admin` | `formateur` |
| --- | :---: | :---: |
| Utilisateurs (et export Excel) | ✓ | |
| Modules : créer, modifier | ✓ | |
| Modules : consulter | ✓ | ✓ |
| Ressources | ✓ | ses modules |
| **Téléphones et e-mails** | ✓ | |

Les permissions sont définies à un seul endroit : `PERMISSIONS` dans
`lib/auth.ts`. La migration `0004_roles` convertit les anciens rôles
(`directeur`, `formation`, `donnees`) en `admin`.

---

## Le modèle de données

Douze tables. `learners` a une clé primaire textuelle lisible (`BH-IA-001`) ;
tout le reste utilise des UUID.

Trois décisions structurent le schéma :

**Les résultats sont un journal d'événements, jamais une colonne de statut.**
`outcomes` s'ajoute, ne se modifie pas. Le taux d'insertion à 3 et 6 mois est une
requête sur cette table, pas un champ tenu à la main qui dériverait dès le
deuxième mois.

**Les documents sont versionnés, jamais écrasés.** Le CV v1 déposé à
l'inscription et le CV v2 produit après le module IA coexistent : c'est la pièce
d'impact la plus parlante du programme. La contrainte
`(learner_id, doc_type, version)` l'impose au niveau de la base.

**Le niveau est une vue SQL, jamais une colonne.** Personne ne peut le mettre à
jour à la main, donc il ne peut pas mentir.

### Les niveaux

`v_learner_level` applique ces règles, dans cet ordre de priorité :

1. **Bleu** — a au moins un résultat de type `emploi`, `stage`, `mission` ou `projet`.
2. **Rouge** — n'a répondu à **aucune** des deux dernières vagues fermées ; ou,
   pendant la formation, 2 absences consécutives ou plus **et** aucune tentative
   de quiz.
3. **Orange** — a déjà répondu par le passé mais a manqué la dernière vague
   fermée ; ou taux de présence inférieur à 70 %.
4. **Vert** — tout le reste.

Fermer une vague dans `/admin/waves` ne touche qu'à la colonne `closes_at`. Les
niveaux se recalculent d'eux-mêmes à la lecture suivante.

### Modules, avancement et certificats

Les **modules ne sont pas une table** : ils existent déjà, portés par
`sessions.module_name`. La vue `v_modules` les reconstitue et les ordonne. Les
redéclarer ailleurs créerait deux vérités.

`v_module_progress` calcule l'avancement de chaque apprenant sur chaque module :

- présence et quiz pèsent **60 / 40** quand les deux existent ;
- si le module n'a pas de quiz, la présence fait foi ; s'il n'a pas encore eu de
  session, c'est le score au quiz ;
- un module non commencé vaut **NULL, pas zéro** : personne n'est pénalisé pour
  un cours qui n'a pas encore eu lieu.

`v_learner_progress` en fait la moyenne sur les modules déjà ouverts, et
`v_certificate_eligibility` applique la règle de délivrance : 80 % d'avancement,
aucun module laissé de côté, et le quiz final passé.

Le **certificat** est la seule exception à la règle « on calcule, on ne stocke
pas ». Une fois délivré, il porte une date, un code vérifiable et **le
pourcentage figé ce jour-là** : recalculer un document déjà remis à quelqu'un
n'aurait pas de sens. La contrainte d'unicité sur `learner_id` empêche tout
doublon, et l'éligibilité est relue en base au moment du clic — jamais depuis le
formulaire.

La page `/certificat/[code]` est **publique** : un employeur saisit le code et
vérifie lui-même, sans passer par la Fondation. Rien d'autre que le nom, la date
et le pourcentage n'y est exposé.

### Les indicateurs

`v_indicators` expose, au format long (`metric`, `dimension`, `cohort_id`,
`cohort_name`, `value`, `unit`), directement exploitable dans un outil de tableaux de bord :

- `taux_reponse_vague` — taux de réponse, par vague
- `taux_presence_global`, `taux_presence_seance`
- `paires_quiz` — apprenants ayant passé le quiz initial **et** le final
- `delta_moyen_quiz` — progression moyenne entre les deux (en pourcentage, donc
  comparable même si les barèmes diffèrent)
- `documents_par_type`
- `resultats_M3`, `resultats_M6` — résultats par type, à 90 et 180 jours après la
  fin de la formation
- `taux_insertion` — part des apprenants avec au moins un résultat positif, à M3 et M6
- `repartition_niveau`

---

## Export CSV

Chaque table est exportable depuis `/admin/export`, plus un CSV « tableau de
bord » à une ligne par apprenant qui réunit niveau, assiduité, progression aux
quiz, vagues répondues, documents et résultats.

Le format est RFC 4180 strict (séparateur virgule, guillemets doublés, fins de
ligne CRLF) avec une marque d'ordre d'octets UTF-8 en tête, pour qu'Excel en
français affiche correctement les accents. `COPY … FROM … (FORMAT csv, HEADER
true)` ignore la ligne d'en-tête, donc la marque d'ordre d'octets ne gêne pas la
réimportation.

C'est une porte de sortie, pas une fonctionnalité : si le programme change
d'outil un jour, les données partent proprement.

Un test de non-régression vérifie l'aller-retour complet :

```sh
DATABASE_URL=… npx tsx scripts/verify-export.ts
```

Il exporte chaque table, la réimporte par `COPY` dans une table jumelle vide et
compare les deux ligne à ligne.

---

## Tableaux de bord

Les indicateurs sont des **vues SQL** (`v_indicators`, `v_learner_level`,
`v_learner_progress`…) : n'importe quel outil qui parle PostgreSQL les lit.

- **Supabase Studio** (*SQL Editor*) suffit pour une requête ponctuelle, et
  peut enregistrer des requêtes favorites.
- Pour de vrais tableaux de bord, branchez Metabase Cloud, Grafana ou Looker
  Studio sur la connexion Supabase, avec un rôle en lecture seule :

```sql
create role bantu_ro login password '…';
grant usage on schema public to bantu_ro;
grant select on all tables in schema public to bantu_ro;
alter default privileges in schema public grant select on tables to bantu_ro;
```

Construisez ensuite les tableaux de bord sur `v_indicators` et `v_learner_level`.

---

## Contraintes techniques tenues

**Une pile ouverte, hébergée simplement.** Next.js, PostgreSQL, Drizzle,
Auth.js, Tailwind. L'hébergement est délégué à Vercel (application) et Supabase
(base et fichiers) ; les deux reposent sur des briques ouvertes (PostgreSQL,
stockage compatible S3) et la base s'exporte en un `pg_dump` — voir
[Où vivent les données](#où-vivent-les-données). Le seul SDK propriétaire est
`@supabase/supabase-js`, confiné à `lib/storage.ts`.

**Toutes les chaînes sont dans `lib/i18n/fr.ts`.** Aucun texte visible n'est
écrit en dur dans un composant.

**Les pages apprenant fonctionnent sans JavaScript.** Formulaires en `POST`
classique vers des server actions, redirections 303, erreurs renvoyées par la
chaîne de requête. Le seul composant client de toute l'application est le bouton
« copier le lien » de la page d'inscription, et le lien reste lisible et
cliquable sans lui.

Le parcours complet — inscription, pointage, quiz en cinq écrans, questionnaire
— a été rejoué de bout en bout par un client HTTP sans moteur JavaScript.

**Poids des pages.** Mesuré sur le build de production, page apprenant
complète, ressources comprises, compression active :

| Page | Contenu | Polices | Transféré |
| --- | ---: | ---: | ---: |
| Aiguilleur apprenant | 88,6 Ko | — | **88,6 Ko** |
| Présence | 88,8 Ko | — | **88,8 Ko** |
| Documents | 89,3 Ko | — | **89,3 Ko** |
| Mon parcours | 89,7 Ko | — | **89,7 Ko** |
| Inscription | 83,8 Ko | 15,5 Ko | 99,3 Ko |
| Accueil (vitrine) | 91,5 Ko | 65,4 Ko | 156,9 Ko |
| Certificat public | 88,7 Ko | 65,4 Ko | 154,0 Ko |

Les **cinq surfaces apprenant tiennent sous 100 Ko**, comme exigé. Les pages
vitrine dépassent volontairement : elles portent les polices de la charte, ne
sont vues qu'une fois, et leur texte s'affiche immédiatement en police système
grâce à `font-display: swap`.

Le bundle de compatibilité hérité (110 Ko) porte l'attribut `noModule` : aucun
navigateur moderne ne le télécharge, il n'est donc pas compté ci-dessus.

Ces 80 Ko de moteur client sont le coût fixe de Next.js App Router, et ces pages
ne s'en servent jamais — elles sont entièrement fonctionnelles sans JavaScript.
Les scripts sont chargés en `async` : la page est lisible et utilisable avant
même leur arrivée. Pour descendre au strict contenu utile, la piste est de
servir les cinq surfaces apprenant comme des Route Handlers renvoyant du HTML
brut ; le coût est de perdre les server actions et de traiter les formulaires à
la main.

---

## Ce qui a été vérifié

Les critères d'acceptation ont été rejoués contre un PostgreSQL réel et le build
de production (`output: 'standalone'`), pas seulement relus :

| Critère | Résultat |
| --- | --- |
| Parcours apprenant **sans JavaScript** — inscription, pointage, quiz en 5 écrans, questionnaire | 28/28 |
| Administration authentifiée et cloisonnement des rôles | 26/26 |
| Modules, avancement, délivrance et vérification des certificats | 31/31 |
| Aller-retour CSV sur les 13 tables (`COPY … FROM`, comparaison ligne à ligne) | 13/13, 0 différence |
| Fermer M2 fait basculer des apprenants de Vert à Orange, sans édition manuelle | 13 bascules |
| Poids des cinq surfaces apprenant | 88 à 90 Ko transférés |

Le parcours apprenant a été rejoué par un client HTTP **dépourvu de moteur
JavaScript** : lecture du HTML, extraction des champs du formulaire, envoi en
`multipart/form-data` vers l'URL courante, suivi des redirections 303, puis
vérification de l'état en base. C'est exactement ce que fait un navigateur dont
JavaScript est désactivé.

Deux défauts ont été trouvés et corrigés par ces tests :

- La génération de l'identifiant `BH-IA-0xx` utilisait `'\D'` dans un littéral
  de gabarit JavaScript, où la barre oblique inverse disparaît avant d'atteindre
  SQL. Toute inscription échouait. Remplacé par `'[^0-9]'`.
- L'export CSV faisait transiter les `timestamptz` par un `Date` JavaScript, qui
  n'a qu'une précision à la milliseconde : les microsecondes étaient perdues et
  les lignes écrites par l'application ne se réimportaient pas à l'identique.
  La conversion en texte est maintenant faite par PostgreSQL.
- L'anneau de progression de « mon parcours » affichait un pourcentage sans
  libellé : on ne savait pas de quoi il s'agissait. Libellé ajouté.
- Fredoka était embarquée en deux graisses alors qu'une seule sert, et chargée
  sur les pages apprenant, ce qui portait leur poids à 104 Ko — au-dessus du
  budget. Graisse inutile supprimée, police restreinte aux pages vitrine.

Le test d'aller-retour CSV est rejouable :

```sh
DATABASE_URL=… npx tsx scripts/verify-export.ts
```

---

## Développement

```sh
npm install
cp .env.example .env     # DATABASE_URL vers Supabase (port 5432), ou vers un Postgres local
npm run migrate
npm run seed
npm run dev
```

Les scripts en ligne de commande lisent `.env` automatiquement si les variables
ne sont pas déjà présentes dans l'environnement. Un PostgreSQL local
(`postgres://bantu:bantu@localhost:5432/bantuhub`) fonctionne aussi bien que
Supabase pour développer ; sans `SUPABASE_URL`, les fichiers vont dans
`./data/uploads`.

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run typecheck` | Vérification TypeScript et garde-fou typographique |
| `npm run migrate` | Applique les migrations SQL et crée le bucket de fichiers |
| `npm run seed` | **Efface tout** et réinsère le jeu de démonstration |
| `npm run db:generate` | Génère une migration depuis `lib/db/schema.ts` |
| `npm run photos` | Régénère les images optimisées de `public/photos` |

### Migrations

Les migrations sont des fichiers SQL numérotés dans `drizzle/`, appliqués dans
l'ordre du journal `drizzle/meta/_journal.json` et enregistrés dans la table
`__migrations`. Les instructions sont séparées par `--> statement-breakpoint`.

Les vues (`0001_views.sql`) sont écrites à la main, car `drizzle-kit` ne génère
pas de vues. Pour modifier une vue, ajoutez un nouveau fichier numéroté qui la
recrée — ne modifiez jamais un fichier déjà appliqué. Si la liste des colonnes
change, faites précéder d'un `DROP VIEW IF EXISTS … CASCADE`.

Pour faire évoluer les **tables**, modifiez `lib/db/schema.ts` puis lancez
`npm run db:generate`.

### Sauvegarde

Supabase sauvegarde la base chaque jour. Pour une copie **à vous**, un dump
depuis votre poste suffit (connexion directe, port 5432) :

```sh
pg_dump "$DATABASE_URL" --clean --if-exists -f backups/bantuhub-$(date +%Y%m%d).sql
```

Les fichiers du bucket `fichiers` se téléchargent depuis Supabase Studio
(*Storage → fichiers → Download*), ou avec la CLI Supabase.

Pour restaurer sur un projet neuf : `npm run migrate`, puis
`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backups/bantuhub-….sql`.
Les dumps sont produits avec `--clean --if-exists` : ils sont rejouables sur une
base déjà peuplée, sans la vider à la main au préalable.

---

## Hors périmètre, volontairement

Pas de constructeur de formulaires par glisser-déposer, pas de quiz temps réel
en websocket, pas de mot de passe apprenant, pas d'intégration à l'API WhatsApp,
pas d'application mobile.

Le quiz n'a ni chronomètre ni classement : ce qui compte est le score rattaché à
l'apprenant et au module, pas le jeu.
