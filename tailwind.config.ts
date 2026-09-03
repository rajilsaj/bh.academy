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
        vitrine: {
          violet: '#5A32D5',
          'violet-fonce': '#4726AE',
          'violet-clair': '#7048E8',
          lavande: '#E7DDFA',
          'lavande-fonce': '#CBB8F2',
          jaune: '#FCC63C',
          'jaune-fonce': '#E8AF17',
          turquoise: '#4FE0D2',
          vert: '#17C08B',
          rose: '#F26FC0',
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
          bleu: '#3B6BA5',
          'bleu-fonce': '#274C7A',
          'bleu-clair': '#D6E6FA',
          menthe: '#2BB673',
          rose: '#E5484D',
          jaune: '#F5B84A',
          violet: '#3B6BA5',
          cyan: '#5AA7E8',
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
