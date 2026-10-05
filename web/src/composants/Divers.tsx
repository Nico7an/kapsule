import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icone } from './Icone';
import { Mascotte } from './Mascotte';

export function Chargement() {
  return <div className="chargement"><Mascotte humeur="dort" taille={96} /></div>;
}

export function Modale({ titre, children, fermer }: { titre: string; children: ReactNode; fermer?: () => void }) {
  useEffect(() => {
    if (!fermer) return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && fermer();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [fermer]);
  return (
    <div className="voile" onMouseDown={(e) => e.target === e.currentTarget && fermer?.()}>
      <div className="modale carte" role="dialog" aria-modal="true" aria-label={titre}>
        <div className="ligne entre">
          <h2>{titre}</h2>
          {fermer && <button className="btn btn-fantome btn-icone" onClick={fermer} aria-label="Fermer"><Icone nom="croix" /></button>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Etoiles({ n, taille = 16, total = 3 }: { n: number; taille?: number; total?: number }) {
  return (
    <span className="ligne" style={{ gap: 2 }} aria-label={`${n} étoile${n > 1 ? 's' : ''} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Icone key={i} nom="etoile" taille={taille} epaisseur={2} couleur={i < n ? 'var(--jaune)' : 'var(--papier-2)'} />
      ))}
    </span>
  );
}

/** Jauge horizontale ; valeur entre 0 et 1. */
export function Jauge({ valeur, couleur, fine }: { valeur: number; couleur?: string; fine?: boolean }) {
  const v = Math.max(0, Math.min(1, valeur));
  return (
    <div className={`jauge${fine ? ' jauge-fine' : ''}${v === 0 ? ' jauge-zero' : ''}`} role="progressbar" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${v * 100}%`, ...(couleur ? { background: couleur } : {}) }} />
    </div>
  );
}

/** Nombre qui défile jusqu'à sa valeur. */
export function Compteur({ valeur, duree = 900 }: { valeur: number; duree?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, (t - debut) / duree);
      setV(Math.round(valeur * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [valeur, duree]);
  return <>{v}</>;
}

let afficherToast: (t: string) => void = () => {};
export const toast = (t: string) => afficherToast(t);

export function Toasts() {
  const [texte, setTexte] = useState<string | null>(null);
  const minuteur = useRef<number>(0);
  useEffect(() => {
    afficherToast = (t) => {
      setTexte(t);
      clearTimeout(minuteur.current);
      minuteur.current = window.setTimeout(() => setTexte(null), 2600);
    };
  }, []);
  return texte ? <div className="toast" role="status">{texte}</div> : null;
}

export function Confettis() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const couleurs = ['#FFD60A', '#FF8A1F', '#22B36B', '#2F7BF6', '#FF7EB6', '#15140F'];
    const morceaux = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 16, vy: -Math.random() * 16 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, c: couleurs[Math.floor(Math.random() * couleurs.length)],
    }));
    let raf = 0;
    const debut = performance.now();
    const frame = (t: number) => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const m of morceaux) {
        m.vy += 0.45; m.vx *= 0.99; m.x += m.vx; m.y += m.vy; m.r += m.vr;
        ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.r);
        ctx.fillStyle = m.c; ctx.fillRect(-m.w / 2, -m.h / 2, m.w, m.h);
        ctx.strokeStyle = '#15140F'; ctx.lineWidth = 1.2; ctx.strokeRect(-m.w / 2, -m.h / 2, m.w, m.h);
        ctx.restore();
      }
      if (t - debut < 4000) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 40 }} aria-hidden="true" />;
}

export const duree = (ms: number) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
};

export const dateCourte = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—';

export const ilYa = (iso: string | null) => {
  if (!iso) return 'jamais';
  const j = Math.floor((Date.now() - new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).getTime()) / 86400_000);
  return j <= 0 ? 'aujourd\'hui' : j === 1 ? 'hier' : `il y a ${j} j`;
};
