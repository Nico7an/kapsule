import type { CSSProperties } from 'react';

// Icônes maison, trait épais et bouts arrondis, assorties aux contours de l'interface.
const TRACES: Record<string, string> = {
  cadenas: 'M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 11V8a4 4 0 0 1 8 0v3M12 15v2',
  'cadenas-ouvert': 'M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM8 11V7a4 4 0 0 1 7.6-1.7',
  hamecon: 'M15 2v11a5 5 0 0 1-10 0v-3l3 3M13 2h4',
  valise: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18',
  dossier: 'M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18',
  sirene: 'M6 18v-6a6 6 0 0 1 12 0v6M4 18h16v3H4zM12 2v2M3.5 5.5 5 7M20.5 5.5 19 7M10 12a2 2 0 0 1 2-2',
  bouclier: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  cible: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
  eclair: 'M13 2 4 14h7l-1 8 9-12h-7z',
  flamme: 'M12 22c4.4 0 7-3 7-7 0-3.5-2.2-5.6-3.6-8.2-.4 1.7-1.3 2.7-2.4 3.2C13 6.5 11.5 4 9 2c.4 3.2-1.1 5.3-2.6 7C5 10.7 5 12.6 5 15c0 4 2.6 7 7 7z',
  gemme: 'M6 3h12l4 6-10 12L2 9zM2 9h20M12 21 8 9l4-6 4 6z',
  couronne: 'M3 18h18l-1.5-11-4.5 4-3-6-3 6-4.5-4zM3 21h18',
  trophee: 'M8 3h8v6a4 4 0 0 1-8 0zM8 5H5a3 3 0 0 0 3 5M16 5h3a3 3 0 0 1-3 5M12 13v4M8 21l1-4h6l1 4z',
  pied: 'M8 14c-2 0-3-2.2-3-5s1.2-6 3-6 3 3 3 6-1 5-3 5zM16 21c-1.8 0-3-1.8-3-4s1.2-5 3-5 3 2.8 3 5-1.2 4-3 4z',
  combo: 'M5 6l6 6-6 6M13 6l6 6-6 6',
  drapeau: 'M5 21V4M5 4h13l-3 4 3 4H5',
  muscle: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12',
  lune: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  soleil: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  maison: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  podium: 'M3 21v-7h6v7M9 21V9h6v12M15 21v-5h6v5M2 21h20',
  profil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  tableau: 'M3 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM13 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1zM13 12a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1zM3 17a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  membres: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 6',
  crayon: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  reglages: 'M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1M16 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM10 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  sortie: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3',
  croix: 'M6 6l12 12M18 6 6 18',
  coche: 'M4 12.5l5 5L20 6.5',
  fleche: 'M5 12h14M13 6l6 6-6 6',
  retour: 'M19 12H5M11 6l-6 6 6 6',
  horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  plus: 'M12 5v14M5 12h14',
  poubelle: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  copier: 'M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2zM16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3',
  telecharger: 'M12 3v12M7 10l5 5 5-5M4 20h16',
  etoile: 'M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3L2.8 9.5l6.4-.9z',
  son: 'M4 9v6h4l5 4V5L8 9zM16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11',
  muet: 'M4 9v6h4l5 4V5L8 9zM17 9.5l5 5M22 9.5l-5 5',
  recherche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z',
  lien: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  enveloppe: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l9 6 9-6',
  message: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  graphique: 'M4 20V11M10 20V5M16 20v-7M2 20h20',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5v.5',
  rejouer: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  // Catégories : droit des sociétés et métiers de l'entreprise.
  balance: 'M12 4v16M8 20h8M4 7h16M4 7l-2.5 6a2.5 2.5 0 0 0 5 0zM20 7l-2.5 6a2.5 2.5 0 0 0 5 0z',
  marteau: 'M13 4.5l6.5 6.5M10.5 7l6.5 6.5M11.75 5.75 18.25 12.25M12 9.5 3.5 18a1.4 1.4 0 0 0 2 2l8.5-8.5M13 21h8',
  calculatrice: 'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 6.5h7v3h-7zM9 13.5h.01M12 13.5h.01M15 13.5h.01M9 17h.01M12 17h.01M15 17h.01',
  immeuble: 'M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M16 10h2a1 1 0 0 1 1 1v10M3 21h18M8.5 7.5h4M8.5 11.5h4M8.5 15.5h4',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  megaphone: 'M3 10v4a1 1 0 0 0 1 1h3l8 5V4L7 9H4a1 1 0 0 0-1 1zM19 9a4 4 0 0 1 0 6M7 15l1.5 5h3l-1-4',
  tendance: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  casque: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2zM20 15a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2zM17 19c0 1.5-1.5 2.5-4 2.5h-1',
  puce: 'M7 7h10v10H7zM10 10h4v4h-4zM10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4',
  infini: 'M12 12c-2-2.7-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.3 6-4zm0 0c2 2.7 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.3-6 4z',
  boussole: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z',
  livre: 'M12 6.5C10.5 5 8 4.5 3 4.5v14c5 0 7.5.5 9 2 1.5-1.5 4-2 9-2v-14c-5 0-7.5.5-9 2zM12 6.5v14',
  diplome: 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6',
  objectif: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6',
};

// Icônes pleines (le trait reste noir, l'intérieur prend la couleur).
const PLEINES = new Set(['eclair', 'flamme', 'etoile', 'couronne', 'gemme', 'bouclier', 'trophee', 'lune', 'pied']);

interface Props { nom: string; taille?: number; couleur?: string; epaisseur?: number; className?: string; style?: CSSProperties; titre?: string }

export function Icone({ nom, taille = 24, couleur, epaisseur = 2.4, className, style, titre }: Props) {
  const d = TRACES[nom] ?? TRACES.bouclier;
  const plein = couleur && PLEINES.has(nom);
  return (
    <svg
      width={taille} height={taille} viewBox="0 0 24 24"
      fill={plein ? couleur : 'none'}
      stroke={plein ? 'var(--encre)' : couleur ?? 'currentColor'}
      strokeWidth={epaisseur} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}
      role={titre ? 'img' : undefined} aria-hidden={titre ? undefined : true} aria-label={titre}
    >
      <path d={d} />
    </svg>
  );
}
