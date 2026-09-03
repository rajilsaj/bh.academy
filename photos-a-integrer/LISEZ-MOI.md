# Déposez les photos ici

Ce dossier (`photos-a-integrer/`, à la racine du dépôt) est la boîte aux lettres
des photos. Il n'est **pas** servi sur le web : je déplacerai les images vers
`public/` au moment de les intégrer. Vous y déposez les fichiers,
vous remplissez `attributions.csv`, et je m'occupe du reste : intégration,
`next/image`, dimensionnement responsive, et la mention de crédit en bas de page.

**Ne renommez pas les fichiers.** Chaque nom ci-dessous correspond à un
emplacement précis de la page d'accueil. C'est ce qui me permet de les brancher
sans vous redemander lequel va où.

---

## Les six emplacements

Les descriptions viennent du texte réel de chaque carte : la photo doit dire la
même chose que le paragraphe qu'elle accompagne.

### 1. `heros/accueil.jpg` — le bandeau d'ouverture

La première image du site, derrière le titre « La formation à l'IA comme
jamais ». C'est elle qui donne le ton.

- **Cherchez** : un groupe en train d'apprendre ensemble, en Afrique centrale,
  lumière naturelle. Des vraies personnes concentrées, pas une réunion
  d'entreprise souriant à l'objectif.
- **Évitez** : les mains blanches sur clavier, les robots, les cerveaux
  bleus en réseau — l'imagerie « IA » générique dit le contraire du programme.
- **Format** : paysage 16:9, **au moins 2000 px de large**.
- Elle passera sur fond violet avec le texte par-dessus : privilégiez une image
  qui garde du calme sur un côté, sans détail vital au centre.

### 2. `arguments/pratique.jpg` — « Du concret, pas de la théorie »

> *Chaque séance produit quelque chose : un CV réécrit, un tableur qui calcule,
> une lettre envoyée. Vous repartez avec vos fichiers.*

- **Cherchez** : des mains qui travaillent — un document à l'écran, une prise de
  notes, un tableur. Le geste du travail fini, pas l'écoute passive.
- **Format** : 4:3, au moins 1200 px de large.

### 3. `arguments/telephone.jpg` — « Tout tient dans le téléphone »

> *Présence, quiz et questionnaires passent par un simple lien. Pas de compte à
> créer, pas de mot de passe à retenir, pas d'application à installer.*

- **Cherchez** : une main tenant **un Android d'entrée de gamme**, pas un iPhone
  dernier cri. C'est le téléphone réel de vos apprenants, et l'écart se voit.
- **Format** : 4:3, au moins 1200 px de large.

### 4. `arguments/suivi.jpg` — « On ne vous lâche pas après »

> *Pendant six mois, un questionnaire court chaque mois. L'équipe rappelle
> celles et ceux qui décrochent. C'est là que se joue l'insertion.*

- **Cherchez** : une conversation à deux — un formateur et un apprenant, une
  main sur une épaule, une explication. De l'accompagnement, pas une salle.
- **Format** : 4:3, au moins 1200 px de large.

### 5. `arguments/certificat.jpg` — « Un certificat qui se vérifie »

> *À la fin, un certificat nominatif avec un code que n'importe quel employeur
> peut contrôler en ligne. Pas un simple papier.*

- **Cherchez** : un moment de remise — un document tendu, une poignée de main,
  une fierté. Sobre : la page porte déjà un certificat dessiné.
- **Format** : 4:3, au moins 1200 px de large.

### 6. `final/appel.jpg` — avant « Prêt à commencer ? »

La dernière image avant le pied de page et la signature.

- **Cherchez** : quelque chose d'ouvert et tourné vers l'avant — un départ, un
  groupe qui avance, Brazzaville. C'est la note finale.
- **Format** : paysage 16:9, au moins 1600 px de large.

---

## Remplissez `attributions.csv`

**C'est la partie que je ne peux pas faire à votre place.** Unsplash bloque les
requêtes automatiques depuis cette machine (page anti-robot), donc je n'ai aucun
moyen de lire le nom du photographe. Et je n'inventerai pas un nom : la licence
Unsplash crédite des personnes réelles, et un crédit faux est pire que pas de
crédit du tout.

Une ligne par photo, quatre colonnes :

```csv
fichier,photographe,profil_unsplash,page_photo
heros/accueil.jpg,Prénom Nom,https://unsplash.com/@pseudo,https://unsplash.com/photos/xxxxxxx
```

- `photographe` — le nom affiché sur la photo, tel quel.
- `profil_unsplash` — le lien vers son profil (le `@pseudo`).
- `page_photo` — l'adresse de la photo elle-même.

Ces trois informations sont sur la page de chaque photo, sous l'image. Le bouton
**Download free** donne le fichier ; le nom et le `@pseudo` sont juste au-dessus.

Une ligne laissée vide = photo non intégrée. Je préfère publier cinq photos
correctement créditées que six dont une sans auteur.

---

## Ce que j'en ferai

1. Conversion et compression, plusieurs largeurs via `next/image` (AVIF/WebP,
   repli JPEG), `loading="lazy"` sauf le bandeau d'ouverture.
2. Les fichiers restent **auto-hébergés** dans le dépôt — aucun appel vers
   `images.unsplash.com` à l'exécution. Le principe « tout est auto-hébergé,
   aucun service tiers » du projet reste vrai.
3. Une mention « Photographies » à côté de la signature, chaque nom cliquable
   vers le profil du photographe, comme la licence Unsplash le demande.
4. **Les photos ne vont que sur la vitrine.** Les cinq surfaces apprenant
   (`/l/<jeton>/…`) restent sans image : elles sont consultées en données
   mobiles sur des téléphones d'entrée de gamme et tiennent sous 100 Ko. Une
   seule photo ferait doubler ce chiffre.

---

## Alternative, si vous préférez

Créez une application de démonstration sur <https://unsplash.com/developers> et
donnez-moi la **Access Key** (lecture seule, 50 requêtes/heure). L'API officielle
répond depuis cette machine — elle renvoie un `401` propre, pas une page
anti-robot — donc avec une clé je peux chercher les photos, lire les noms des
photographes et télécharger les fichiers moi-même. Vous n'avez alors plus rien à
déposer ici.
