import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import type { Joueur, LigneLecon, Moi } from '../types';
import { Avatar } from './Avatar';
import { Icone } from './Icone';
import { Jauge, Modale, duree, Etoiles } from './Divers';

export function CarteNiveau({ moi }: { moi: Moi }) {
  return (
    <div className="carte carte-pad empile" style={{ gap: 10 }}>
      <div className="ligne entre">
        <div>
          <div className="tres-discret" style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }}>Niveau {moi.niveau}</div>
          <h3 style={{ fontSize: 22 }}>{moi.grade}</h3>
        </div>
        <Icone nom="grade" taille={44} couleur="var(--bleu)" epaisseur={2} />
      </div>
      <Jauge valeur={moi.xpNiveau / moi.xpPalier} couleur="var(--bleu)" />
      <div className="ligne entre mono" style={{ fontSize: 13, fontWeight: 700 }}>
        <span>{moi.xpNiveau} / {moi.xpPalier} XP</span>
        <span className="tres-discret">niv. {moi.niveau + 1} →</span>
      </div>
    </div>
  );
}

export function Anneau({ valeur, taille = 64, epaisseur = 9, couleur = 'var(--jaune)', children }: { valeur: number; taille?: number; epaisseur?: number; couleur?: string; children?: ReactNode }) {
  const r = (taille - epaisseur) / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valeur));
  return (
    <div style={{ position: 'relative', width: taille, height: taille, flex: 'none' }}>
      <svg width={taille} height={taille} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="var(--encre)" strokeWidth={epaisseur + 5} />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke="var(--papier-2)" strokeWidth={epaisseur} />
        <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" stroke={couleur} strokeWidth={epaisseur} strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>{children}</div>
    </div>
  );
}

export function CarteObjectif({ moi }: { moi: Moi }) {
  if (!moi.objectif) return null;
  const { fait, cible } = moi.objectif;
  const atteint = fait >= cible;
  return (
    <div className={`carte carte-pad ligne`} style={{ gap: 16, background: atteint ? 'var(--vert-c)' : undefined }}>
      <Anneau valeur={fait / cible} couleur={atteint ? 'var(--vert)' : 'var(--jaune)'}>
        <Icone nom={atteint ? 'coche' : 'cible'} taille={24} />
      </Anneau>
      <div>
        <h3 style={{ fontSize: 18 }}>{atteint ? 'Objectif atteint !' : 'Objectif du jour'}</h3>
        <p className="mono" style={{ fontWeight: 700 }}>{Math.min(fait, cible)} / {cible} XP</p>
        <p className="discret" style={{ fontSize: 13 }}>{atteint ? 'Revenez demain pour garder la série.' : `Encore ${cible - fait} XP, soit environ une leçon.`}</p>
      </div>
    </div>
  );
}

export function MiniClassement() {
  const [joueurs, setJoueurs] = useState<Joueur[] | null>(null);
  useEffect(() => { api.get<{ joueurs: Joueur[] }>('/classement').then((r) => setJoueurs(r.joueurs)).catch(() => setJoueurs([])); }, []);
  if (!joueurs) return null;
  const moi = joueurs.find((j) => j.moi);
  const tete = joueurs.slice(0, 5);
  return (
    <div className="carte carte-pad empile" style={{ gap: 10 }}>
      <div className="ligne entre">
        <h3 style={{ fontSize: 18 }}>Cette semaine</h3>
        <Link to="/classement" className="pastille">Tout voir <Icone nom="fleche" taille={14} /></Link>
      </div>
      {tete.map((j) => (
        <div key={j.id} className="ligne" style={{ gap: 10, fontWeight: j.moi ? 800 : 600, background: j.moi ? 'var(--jaune)' : undefined, borderRadius: 10, padding: j.moi ? '2px 6px' : '2px 0' }}>
          <span className="mono" style={{ width: 22, textAlign: 'center', fontWeight: 800 }}>{j.rang}</span>
          <Avatar nom={j.avatar} taille={30} />
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.nom}</span>
          <span className="mono" style={{ fontWeight: 800 }}>{j.xpPeriode}</span>
        </div>
      ))}
      {moi && moi.rang > 5 && (
        <div className="ligne" style={{ gap: 10, fontWeight: 800, background: 'var(--jaune)', borderRadius: 10, padding: '2px 6px' }}>
          <span className="mono" style={{ width: 22, textAlign: 'center' }}>{moi.rang}</span>
          <Avatar nom={moi.avatar} taille={30} />
          <span style={{ flex: 1 }}>Vous</span>
          <span className="mono">{moi.xpPeriode}</span>
        </div>
      )}
    </div>
  );
}

export function ListeClassementLecon({ joueurs, limite }: { joueurs: LigneLecon[]; limite?: number }) {
  if (!joueurs.length) return <p className="discret">Personne n'a encore terminé ce questionnaire. La première place est à prendre !</p>;
  const liste = limite ? joueurs.slice(0, limite) : joueurs;
  const moi = joueurs.find((j) => j.moi);
  return (
    <div className="liste-classement">
      {liste.map((j) => <LigneLeconVue key={j.id} j={j} />)}
      {limite && moi && moi.rang > limite && <LigneLeconVue j={moi} />}
    </div>
  );
}

function LigneLeconVue({ j }: { j: LigneLecon }) {
  return (
    <div className={`ligne-classement${j.moi ? ' moi' : ''}`} style={{ gridTemplateColumns: '32px 40px minmax(0,1fr) auto', padding: '8px 12px' }}>
      <span className="rang">{j.rang <= 3 ? ['🥇', '🥈', '🥉'][j.rang - 1] : j.rang}</span>
      <Avatar nom={j.avatar} taille={36} />
      <div style={{ minWidth: 0 }}>
        <div className="nom">{j.moi ? 'Vous' : j.nom}</div>
        <div className="sous"><Etoiles n={j.etoiles} taille={13} /><span className="mono">{duree(j.dureeMs)}</span></div>
      </div>
      <span className="score">{j.correct}/{j.total}</span>
    </div>
  );
}

export function ModaleClassementLecon({ id, fermer }: { id: string; fermer: () => void }) {
  const [donnees, setDonnees] = useState<{ lecon: { titre: string }; joueurs: LigneLecon[] } | null>(null);
  useEffect(() => { api.get<typeof donnees>(`/lecons/${id}/classement`).then(setDonnees).catch(() => fermer()); }, [id, fermer]);
  return (
    <Modale titre={donnees?.lecon.titre ?? 'Classement'} fermer={fermer}>
      <p className="discret" style={{ marginTop: -8 }}>Meilleur score de chacun, puis le plus rapide.</p>
      {donnees && <ListeClassementLecon joueurs={donnees.joueurs} />}
    </Modale>
  );
}
