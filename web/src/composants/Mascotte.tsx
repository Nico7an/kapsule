import type { JSX } from 'react';
// Bitou, le cadenas mascotte. Son humeur suit le jeu.
export type Humeur = 'content' | 'fier' | 'triste' | 'surpris' | 'compromis' | 'dort';

const BOUCHES: Record<Humeur, JSX.Element> = {
  content: <path d="M48 80q12 10 24 0" fill="none" stroke="var(--encre)" strokeWidth="4.5" strokeLinecap="round" />,
  fier: <><path d="M44 77h32q-2 16-16 16t-16-16z" fill="var(--encre)" /><path d="M53 88q7-5 14 0" fill="var(--rose)" /></>,
  triste: <path d="M48 87q12-10 24 0" fill="none" stroke="var(--encre)" strokeWidth="4.5" strokeLinecap="round" />,
  surpris: <ellipse cx="60" cy="84" rx="6" ry="8" fill="var(--encre)" />,
  compromis: <path d="M44 85l6-5 5 5 5-5 5 5 5-5 6 5" fill="none" stroke="var(--encre)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />,
  dort: <path d="M52 84h16" stroke="var(--encre)" strokeWidth="4.5" strokeLinecap="round" />,
};

function Yeux({ humeur }: { humeur: Humeur }) {
  if (humeur === 'compromis') {
    return <g stroke="var(--encre)" strokeWidth="4.5" strokeLinecap="round"><path d="M38 58l10 10M48 58 38 68M72 58l10 10M82 58 72 68" /></g>;
  }
  if (humeur === 'dort' || humeur === 'fier') {
    return <g fill="none" stroke="var(--encre)" strokeWidth="4.5" strokeLinecap="round"><path d={humeur === 'fier' ? 'M37 66q6-8 12 0M71 66q6-8 12 0' : 'M37 64q6 6 12 0M71 64q6 6 12 0'} /></g>;
  }
  return (
    <g style={{ transformOrigin: '60px 63px', animation: 'cligne 4.5s infinite' }}>
      <ellipse cx="43" cy="63" rx="6.5" ry={humeur === 'surpris' ? 9 : 8} fill="var(--encre)" />
      <ellipse cx="77" cy="63" rx="6.5" ry={humeur === 'surpris' ? 9 : 8} fill="var(--encre)" />
      <circle cx="45.5" cy="59.5" r="2.4" fill="#fff" />
      <circle cx="79.5" cy="59.5" r="2.4" fill="#fff" />
      {humeur === 'triste' && <path d="M34 50l12 4M86 50l-12 4" stroke="var(--encre)" strokeWidth="4" strokeLinecap="round" />}
    </g>
  );
}

interface Props { humeur?: Humeur; taille?: number; anime?: boolean; className?: string }

export function Mascotte({ humeur = 'content', taille = 120, anime = true, className }: Props) {
  const animation = !anime ? undefined
    : humeur === 'fier' ? 'sautille 900ms ease-in-out infinite'
    : humeur === 'triste' || humeur === 'compromis' ? 'secoue 500ms ease 1'
    : 'flotte 3s ease-in-out infinite';
  return (
    <svg width={taille} height={taille} viewBox="0 0 120 120" className={className} style={{ animation, overflow: 'visible', flex: 'none' }} aria-hidden="true">
      {/* anse */}
      <path d="M34 46V34a26 26 0 0 1 52 0v12" fill="none" stroke="var(--encre)" strokeWidth="14" strokeLinecap="round" />
      <path d="M34 46V34a26 26 0 0 1 52 0v12" fill="none" stroke={humeur === 'compromis' ? 'var(--gris)' : '#C8C1AE'} strokeWidth="6" strokeLinecap="round" />
      {/* pieds */}
      <rect x="34" y="102" width="18" height="12" rx="6" fill="var(--encre)" />
      <rect x="68" y="102" width="18" height="12" rx="6" fill="var(--encre)" />
      {/* corps */}
      <rect x="16" y="40" width="88" height="68" rx="22" fill={humeur === 'compromis' ? 'var(--rouge)' : 'var(--jaune)'} stroke="var(--encre)" strokeWidth="4.5" />
      <path d="M26 52q0-6 6-6h20" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
      {/* joues */}
      <ellipse cx="32" cy="78" rx="6" ry="4" fill="var(--rose)" opacity=".75" />
      <ellipse cx="88" cy="78" rx="6" ry="4" fill="var(--rose)" opacity=".75" />
      <Yeux humeur={humeur} />
      {BOUCHES[humeur]}
      {humeur === 'triste' && <path d="M99 44q5 8 0 11-5-3 0-11z" fill="var(--bleu)" stroke="var(--encre)" strokeWidth="2.5" />}
      {humeur === 'dort' && <text x="96" y="30" fontFamily="var(--police)" fontWeight="800" fontSize="20" fill="var(--encre)">z</text>}
    </svg>
  );
}
