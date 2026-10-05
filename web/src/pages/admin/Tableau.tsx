import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api';
import type { Couleur } from '../../types';
import { Icone } from '../../composants/Icone';
import { Avatar } from '../../composants/Avatar';
import { Chargement, Jauge, dateCourte, ilYa, toast } from '../../composants/Divers';

interface Vue {
  organisation: { name: string; invite_code: string; daily_goal: number };
  indicateurs: { membres: number; actifs7: number; actifsPrec: number; parties: number; lecons: number; precision: number | null; heures: number; xpSemaine: number; seriesActives: number };
  activite: { jour: string; parties: number; joueurs: number; xp: number }[];
  avancement: { id: string; titre: string; couleur: Couleur; icone: string; defi: boolean; lecons: number; moyenne: number; termines: number; commences: number }[];
  questionsDifficiles: { lecon: string; parcours: string; enonce: string; bonneReponse: string; reponses: number; erreurs: number }[];
  podium: { id: number; nom: string; avatar: string; xp: number; niveau: number }[];
  inactifs: { id: number; nom: string; avatar: string; derniereActivite: string | null }[];
}

export const lienInvitation = (code: string) => `${location.origin}/rejoindre/${code}`;

export function copier(texte: string, message = 'Copié !') {
  navigator.clipboard?.writeText(texte).then(() => toast(message), () => toast(texte));
}

export function Tableau() {
  const [v, setV] = useState<Vue | null>(null);
  useEffect(() => { api.get<Vue>('/admin/vue-ensemble').then(setV); }, []);
  if (!v) return <Chargement />;
  const i = v.indicateurs;
  const maxParties = Math.max(1, ...v.activite.map((a) => a.parties));
  const tendance = i.actifs7 - i.actifsPrec;

  return (
    <div className="page">
      <div className="titre-page">
        <div>
          <div className="sur-titre">Tableau de bord · {v.organisation.name}</div>
          <h1>Comment se porte l'équipe ?</h1>
        </div>
        <div className="ligne" style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-petit" onClick={() => copier(lienInvitation(v.organisation.invite_code), 'Lien d\'invitation copié')}><Icone nom="lien" taille={16} />Lien d'invitation</button>
          <a className="btn btn-petit btn-encre" href="/api/admin/export.csv"><Icone nom="telecharger" taille={16} />Export CSV</a>
        </div>
      </div>

      <div className="kpis">
        <div className="carte kpi kpi-jaune">
          <div className="libelle"><Icone nom="membres" taille={16} />Actifs sur 7 jours</div>
          <div className="valeur">{i.actifs7}<span style={{ fontSize: 18, color: 'var(--encre-2)' }}> / {i.membres}</span></div>
          <div className="note">{tendance === 0 ? 'stable' : `${tendance > 0 ? '▲ +' : '▼ '}${tendance}`} vs semaine précédente</div>
        </div>
        <div className="carte kpi">
          <div className="libelle"><Icone nom="coche" taille={16} />Leçons réussies</div>
          <div className="valeur">{i.lecons}</div>
          <div className="note">{i.parties} parties · {i.heures} h de formation</div>
        </div>
        <div className="carte kpi">
          <div className="libelle"><Icone nom="cible" taille={16} />Bonnes réponses</div>
          <div className="valeur">{i.precision ?? '—'}{i.precision !== null && '%'}</div>
          <div className="note">sur toutes les questions jouées</div>
        </div>
        <div className="carte kpi">
          <div className="libelle"><Icone nom="flamme" taille={16} couleur="var(--orange)" epaisseur={2} />Séries en cours</div>
          <div className="valeur">{i.seriesActives}</div>
          <div className="note">{i.xpSemaine} XP gagnés cette semaine</div>
        </div>
      </div>

      <div className="grille-admin">
        <section className="carte carte-pad bloc col-8">
          <h2><Icone nom="graphique" taille={20} />Activité<span className="tres-discret">parties par jour, 30 derniers jours</span></h2>
          <div className="histogramme">
            {v.activite.map((a, k) => {
              const jour = new Date(`${a.jour}T12:00:00`).getDay();
              return (
                <div key={a.jour} className={`barre${jour === 0 || jour === 6 ? ' weekend' : ''}${k === v.activite.length - 1 ? ' aujourdhui' : ''}`}>
                  <i style={{ height: `${(a.parties / maxParties) * 100}%` }} />
                  <span className="info">{dateCourte(a.jour)} · {a.parties} partie{a.parties > 1 ? 's' : ''} · {a.joueurs} joueur{a.joueurs > 1 ? 's' : ''}</span>
                </div>
              );
            })}
          </div>
          <div className="axe-x"><span>{dateCourte(v.activite[0].jour)}</span><span>{dateCourte(v.activite[14].jour)}</span><span>aujourd'hui</span></div>
        </section>

        <section className="carte carte-pad bloc col-4">
          <h2><Icone nom="couronne" taille={20} couleur="var(--jaune)" epaisseur={2} />Podium de la semaine</h2>
          {v.podium.filter((p) => p.xp > 0).length === 0 ? <p className="discret">Personne n'a encore joué cette semaine.</p> : (
            <div className="empile" style={{ gap: 10 }}>
              {v.podium.filter((p) => p.xp > 0).map((p, k) => (
                <Link key={p.id} to={`/admin/membres/${p.id}`} className="ligne" style={{ textDecoration: 'none', gap: 10 }}>
                  <span className="mono" style={{ width: 20, fontWeight: 800 }}>{k + 1}</span>
                  <Avatar nom={p.avatar} taille={36} />
                  <span style={{ flex: 1, fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</span>
                  <span className="mono" style={{ fontWeight: 800 }}>{p.xp} XP</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="carte carte-pad bloc col-6">
          <h2><Icone nom="drapeau" taille={20} />Avancement par parcours<span className="tres-discret">moyenne de l'équipe</span></h2>
          {v.avancement.map((p) => (
            <div key={p.id} className={`ligne-avancement c-${p.couleur}`}>
              <div className="carre-couleur"><Icone nom={p.icone} taille={18} /></div>
              <div style={{ minWidth: 0 }}>
                <div className="titre"><span>{p.titre}</span><span>{p.termines} terminé{p.termines > 1 ? 's' : ''} · {p.commences} commencé{p.commences > 1 ? 's' : ''}</span></div>
                <Jauge valeur={p.moyenne / 100} couleur={`var(--c)`} fine />
              </div>
              <span className="mono" style={{ fontWeight: 800, textAlign: 'right' }}>{p.moyenne}%</span>
            </div>
          ))}
        </section>

        <section className="carte carte-pad bloc col-6">
          <h2><Icone nom="info" taille={20} />Questions les plus ratées<span className="tres-discret">à retravailler ensemble</span></h2>
          {v.questionsDifficiles.length === 0 ? <p className="discret">Pas encore assez de réponses pour en tirer des tendances.</p> : v.questionsDifficiles.map((q, k) => (
            <div key={k} className="question-dure">
              <div className="taux">{q.erreurs}%</div>
              <div>
                <div className="enonce-court">{q.enonce}</div>
                <div className="meta">{q.parcours} · {q.lecon} · {q.reponses} réponses</div>
                <div className="meta"><strong>Bonne réponse :</strong> {q.bonneReponse}</div>
              </div>
            </div>
          ))}
        </section>

        <section className="carte carte-pad bloc col-12">
          <h2><Icone nom="horloge" taille={20} />À relancer<span className="tres-discret">aucune leçon réussie depuis 14 jours</span></h2>
          {v.inactifs.length === 0 ? <p className="discret">Tout le monde est dans le coup. Bravo !</p> : (
            <div className="ligne" style={{ flexWrap: 'wrap', gap: 10 }}>
              {v.inactifs.map((m) => (
                <Link key={m.id} to={`/admin/membres/${m.id}`} className="pastille" style={{ padding: '4px 12px 4px 4px', textDecoration: 'none' }}>
                  <Avatar nom={m.avatar} taille={28} />{m.nom}<span className="tres-discret" style={{ fontWeight: 500 }}>· {ilYa(m.derniereActivite)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
