import type { Config } from 'tailwindcss'

/**
 * Deux systèmes visuels cohabitent, volontairement distincts :
 *
 *   `vitrine` — violet, jaune, formes rondes. Ce que voient les apprenants et
 *               le public. Chaleureux, enfantin, lisible sur un petit écran.
 *   `bo`      — sombre, dense, accents pastel. Le back-office, consulté
 *               longuement par les formateurs sur un vrai écran.
 *
 * Aucune couleur n'est écrite en dur ailleurs que dans ce fichier.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Repli dans le var() lui-meme : une variable absente rendrait sinon
        // toute la declaration invalide (IACVT), pas seulement sa premiere entree.
        titre: ['var(--police-titre, system-ui)', 'Segoe UI', 'Roboto', 'sans-serif'],
        accent: ['var(--police-accent, "Segoe Script")', 'cursive'],
      },
      colors: {
        /*
         * La palette du dossier « Formation à l'IA » (FORMATION BH AI v2.pdf) :
         * marine profond en fond, bleu roi pour les titres, cyan en accent,
         * orange pour l'action, gris clair pour les panneaux. Les noms des
         * jetons sont restés ceux de la première maquette (violet, jaune…) ;
         * seules les valeurs ont changé, pour ne rien réécrire dans les écrans.
         */
        vitrine: {
          violet: '#0B1D3F',
          'violet-fonce': '#061229',
          'violet-clair': '#24408F',
          lavande: '#E4EEF8',
          'lavande-fonce': '#C6D8EE',
          jaune: '#DC4D28',
          'jaune-fonce': '#B93D1E',
          turquoise: '#00AEEF',
          vert: '#0D6EB7',
          rose: '#00719F',
          /* Le bleu du logo ia.lab et du site de la Fondation, et son fond clair. */
          bleu: '#3A7FD0',
          'bleu-clair': '#DCEBFA',
        },
        /*
         * Le cockpit (back-office) : fond bleu très clair, cartes blanches,
         * bleu profond pour l'action. Les noms `bo-*` restent ceux que les écrans
         * utilisent ; seules les valeurs changent.
         */
        bo: {
          fond: '#EEF3FA',
          panneau: '#FFFFFF',
          'panneau-2': '#F3F7FC',
          bordure: '#DCE5F2',
          texte: '#15213A',
          doux: '#6B7A99',
          bleu: '#0D6EB7',
          'bleu-fonce': '#0B1D3F',
          'bleu-clair': '#D6E9F8',
          menthe: '#2BB673',
          rose: '#DC4D28',
          jaune: '#E8891F',
          violet: '#0D6EB7',
          cyan: '#00AEEF',
        },
        /* Couleurs de marques tierces citées sur le site — jamais les nôtres. */
        marque: {
          claude: '#D97757',
        },
        niveau: {
          vert: '#17C08B',
          orange: '#F59E0B',
          rouge: '#EF4444',
          bleu: '#60A5FA',
        },
      },
      borderRadius: {
        carte: '1.5rem',
        bloc: '1.25rem',
      },
      /*
       * Typographie « Light & Smooth Bold » : l'interlettrage suit la graisse.
       * Le léger (300) s'aère un peu pour que ses déliés ne se touchent pas ;
       * le gras (700) se resserre pour garder une densité équivalente.
       */
      letterSpacing: {
        leger: '0.02rem',
        fort: '-0.015em',
      },
      backgroundImage: {
        // Le quadrillage discret du fond violet de la maquette.
        quadrillage:
          'linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px)',
      },
      backgroundSize: {
        // Nom distinct de `quadrillage` : image et taille partagent le préfixe `bg-`.
        grille44: '44px 44px',
      },
    },
  },
  plugins: [],
}
export default config
