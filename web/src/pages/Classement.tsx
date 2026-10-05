import { useEffect, useState } from 'react';
import { api } from '../api';
import { useSession } from '../session';
import type { Joueur } from '../types';
import { Avatar } from '../composants/Avatar';
import { Icone } from '../composants/Icone';
import { Chargement } from '../composants/Divers';
import { Mascotte } from '../composants/Mascotte';

function finDeSemaine() {
  const d = new Date();
  const fin = new Date(d);
  fin.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  fin.setHours(23, 59, 59, 999);
  const ms = fin.getTime() - d.getTime();
  const j = Math.floor(ms / 86400_000);
  const h = Math.floor((ms % 86400_000) / 3600_000);
  return j > 0 ? `${j} j ${h} h` : `${h} h ${Math.floor((ms % 3600_000) / 60_000)} min`;
}

export function Classement() {
  const { moi } = useSession();
  const [periode, setPeriode] = useState<'semaine' | 'general'>('semaine');
  const [joueurs, setJoueurs] = useState<Joueur[] | null>(null);
  useEffect(() => { setJoueurs(null); api.get<{ joueurs: Joueur[] }>(`/classement?periode=${periode}`).then((r) => setJoueurs(r.joueurs)); }, [periode]);

  const actifs = joueurs?.filter((j) => j.xpPeriode > 0) ?? [];
  const podium = actifs.slice(0, 3);
  const moiJ = joueurs?.find((j) => j.moi);

  return (
    <div className="page page-etroite">
      <div className="titre-page">
        <div>
          <div className="sur-titre">{moi?.organisation?.nom}</div>
          <h1>Classement</h1>
        </div>
        <div className="onglets" role="tablist">
          <button role="tab" aria-selected={periode === 'semaine'} className={periode === 'semaine' ? 'actif' : ''} onClick={() => setPeriode('semaine')}>Semaine</button>
          <button role="tab" aria-selected={periode === 'general'} className={periode === 'general' ? 'actif' : ''} onClick={() => setPeriode('general')}>Général</button>
        </div>
      </div>
      {periode === 'semaine' && (
        <div className="carte carte-pad ligne" style={{ gap: 14, background: 'var(--encre)', color: 'var(--carte)' }}>
          <Icone nom="horloge" taille={30} couleur="var(--jaune)" />
          <div>
            <strong style={{ color: 'var(--jaune)' }}>Fin de la manche dans {finDeSemaine()}</strong>
            <div style={{ fontSize: 14, opacity: 0.85 }}>Le compteur repart à zéro chaque lundi. Prenez la tête et décrochez le badge « En tête ».</div>
          </div>
        </div>
      )}
      {!joueurs ? <Chargement /> : (
        <>
          {podium.length > 0 ? (
            <div className="podium">
              {[1, 0, 2].map((i) => {
                const j = podium[i];
                return (
                  <div key={i} className={`marche marche-${i + 1}`} style={{ visibility: j ? 'visible' : 'hidden' }}>
                    {j && <>
                      {i === 0 && <Icone nom="couronne" taille={34} couleur="var(--jaune)" epaisseur={2} />}
                      <Avatar nom={j.avatar} taille={i === 0 ? 72 : 58} />
                      <div className="nom">{j.moi ? 'Vous' : j.nom.split(' ')[0]}</div>
                      <div className="mono" style={{ fontWeight: 800, fontSize: 14 }}>{j.xpPeriode} XP</div>
                    </>}
                    <div className="socle">{i + 1}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="vide"><Mascotte humeur="dort" taille={100} /><h2>Personne n'a encore joué cette semaine</h2><p className="discret">Une leçon suffit pour prendre la première place.</p></div>
          )}
          <div className="liste-classement">
            {joueurs.map((j) => (
              <div key={j.id} className={`ligne-classement${j.moi ? ' moi' : ''}`}>
                <span className="rang">{j.rang}</span>
                <Avatar nom={j.avatar} taille={46} />
                <div style={{ minWidth: 0 }}>
                  <div className="nom">{j.nom}{j.moi ? ' (vous)' : ''}</div>
                  <div className="sous">
                    <span>Niv. {j.niveau} · {j.grade}</span>
                    {j.serie > 0 && <span className="ligne" style={{ gap: 3 }}><Icone nom="flamme" taille={14} couleur="var(--orange)" epaisseur={2} />{j.serie} j</span>}
                  </div>
                </div>
                <span className="score">{j.xpPeriode} XP</span>
              </div>
            ))}
          </div>
          {moiJ && periode === 'semaine' && moiJ.rang > 1 && (
            <p className="discret" style={{ textAlign: 'center', marginTop: 18 }}>
              Encore <strong className="mono">{joueurs[moiJ.rang - 2].xpPeriode - moiJ.xpPeriode + 1} XP</strong> pour doubler {joueurs[moiJ.rang - 2].nom.split(' ')[0]}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
