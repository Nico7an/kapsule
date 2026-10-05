import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../../api';
import { useSession } from '../../session';
import type { Badge, Couleur } from '../../types';
import { Icone } from '../../composants/Icone';
import { Avatar } from '../../composants/Avatar';
import { Chargement, Etoiles, Modale, dateCourte, duree, ilYa, toast } from '../../composants/Divers';
import { copier } from './Tableau';

interface Membre {
  id: number; nom: string; email: string; role: 'admin' | 'learner'; avatar: string; desactive: boolean;
  xp: number; niveau: number; grade: string; serie: number; meilleureSerie: number;
  parties: number; lecons: number; precision: number | null; derniereActivite: string | null; inscrit: string; rangSemaine: number | null;
}

type Tri = 'nom' | 'xp' | 'lecons' | 'precision' | 'serie' | 'derniereActivite';

export function Membres() {
  const [donnees, setDonnees] = useState<{ totalLecons: number; membres: Membre[] } | null>(null);
  const [recherche, setRecherche] = useState('');
  const [tri, setTri] = useState<Tri>('xp');
  const [sens, setSens] = useState(-1);
  const [ajout, setAjout] = useState(false);
  const charger = useCallback(() => { api.get<typeof donnees>('/admin/membres').then(setDonnees); }, []);
  useEffect(charger, [charger]);

  const liste = useMemo(() => {
    if (!donnees) return [];
    const q = recherche.trim().toLowerCase();
    return donnees.membres
      .filter((m) => !q || m.nom.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      .sort((a, b) => {
        const va = a[tri] ?? -1, vb = b[tri] ?? -1;
        return (typeof va === 'string' ? va.localeCompare(String(vb)) : (va as number) - (vb as number)) * sens;
      });
  }, [donnees, recherche, tri, sens]);

  if (!donnees) return <Chargement />;
  const trier = (t: Tri) => { if (t === tri) setSens(-sens); else { setTri(t); setSens(t === 'nom' ? 1 : -1); } };
  const entete = (t: Tri, libelle: string, num = true) => (
    <th onClick={() => trier(t)} className={num ? 'num' : ''} aria-sort={tri === t ? (sens > 0 ? 'ascending' : 'descending') : 'none'}>
      {libelle}{tri === t ? (sens > 0 ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="page">
      <div className="titre-page">
        <div><div className="sur-titre">Administration</div><h1>Membres</h1></div>
        <button className="btn btn-jaune" onClick={() => setAjout(true)}><Icone nom="plus" taille={20} />Ajouter un membre</button>
      </div>
      <div className="barre-outils">
        <input className="saisie" type="search" placeholder="Rechercher un nom ou un e-mail…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        <span className="tres-discret">{liste.length} membre{liste.length > 1 ? 's' : ''}</span>
      </div>
      <div className="carte tableau-wrap">
        <table className="tableau">
          <thead>
            <tr>
              {entete('nom', 'Membre', false)}
              {entete('xp', 'XP / niveau')}
              {entete('lecons', `Leçons /${donnees.totalLecons}`)}
              {entete('precision', 'Précision')}
              {entete('serie', 'Série')}
              {entete('derniereActivite', 'Dernière partie')}
            </tr>
          </thead>
          <tbody>
            {liste.map((m) => (
              <tr key={m.id} className={m.desactive ? 'desactive' : ''}>
                <td>
                  <div className="cellule-membre">
                    <Avatar nom={m.avatar} taille={38} />
                    <div>
                      <Link to={`/admin/membres/${m.id}`}>{m.nom}</Link>
                      {m.role === 'admin' && <span className="pastille pastille-encre" style={{ marginLeft: 6, fontSize: 11, padding: '0 7px' }}>admin</span>}
                      {m.desactive && <span className="pastille" style={{ marginLeft: 6, fontSize: 11, padding: '0 7px' }}>désactivé</span>}
                      <small>{m.email}</small>
                    </div>
                  </div>
                </td>
                <td className="num">{m.xp} <span className="tres-discret">· niv. {m.niveau}</span></td>
                <td className="num">{m.lecons}</td>
                <td className="num">{m.precision === null ? '—' : `${m.precision}%`}</td>
                <td className="num">{m.serie ? <span className="ligne" style={{ justifyContent: 'flex-end', gap: 3 }}><Icone nom="flamme" taille={15} couleur="var(--orange)" epaisseur={2} />{m.serie}</span> : '—'}</td>
                <td className="num" style={{ fontFamily: 'var(--police)', fontWeight: 500 }}>{ilYa(m.derniereActivite)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ajout && <AjoutMembre fermer={() => { setAjout(false); charger(); }} />}
    </div>
  );
}

function AjoutMembre({ fermer }: { fermer: () => void }) {
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'learner' | 'admin'>('learner');
  const [erreur, setErreur] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<{ code: string }>('/admin/membres', { nom, email, role });
      setCode(res.code);
    } catch (err) {
      setErreur((err as Error).message);
    }
  };
  if (code) return <InvitationEnvoyee nom={nom} email={email} code={code} fermer={fermer} />;
  return (
    <Modale titre="Ajouter un membre" fermer={fermer}>
      <p className="discret" style={{ marginTop: -6 }}>
        Un e-mail d'invitation avec son code de connexion sécurisé sera automatiquement envoyé.
      </p>
      <form className="empile" onSubmit={envoyer}>
        {erreur && <div className="erreur-form">{erreur}</div>}
        <label className="champ"><span>Nom</span><input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={60} /></label>
        <label className="champ"><span>E-mail</span><input className="saisie" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label className="champ"><span>Rôle</span>
          <select className="saisie" value={role} onChange={(e) => setRole(e.target.value as 'learner' | 'admin')}>
            <option value="learner">Apprenant</option><option value="admin">Administrateur</option>
          </select>
        </label>
        <button className="btn btn-jaune btn-large">Créer et envoyer l'invitation</button>
      </form>
    </Modale>
  );
}

function InvitationEnvoyee({ nom, email, code, fermer }: { nom: string; email: string; code: string; fermer: () => void }) {
  const lien = `${location.origin}/?email=${encodeURIComponent(email)}&code=${code}`;
  return (
    <Modale titre="Invitation envoyée !" fermer={fermer}>
      <p>Un e-mail d'invitation avec code de connexion a été envoyé à <strong>{nom}</strong> (<code>{email}</code>).</p>
      <div className="secret" style={{ fontSize: 28, letterSpacing: '0.22em', textAlign: 'center' }}>{code}</div>
      <p className="tres-discret" style={{ marginTop: -8 }}>Vous pouvez également lui transmettre le lien direct d'accès sur votre messagerie d'équipe :</p>
      <div className="actions">
        <button className="btn" onClick={() => copier(lien, 'Lien direct copié')}><Icone nom="copier" taille={18} />Copier le lien</button>
        <button className="btn btn-jaune" onClick={fermer}>Terminé</button>
      </div>
    </Modale>
  );
}

interface Detail extends Membre {
  parcours: { titre: string; couleur: Couleur; lecons: { titre: string; etoiles: number; reussie: boolean; essais: number }[] }[];
  badges: Badge[];
  historique: { lecon: string; correct: number; total: number; echec: boolean; etoiles: number; xp: number; dureeMs: number; date: string }[];
}

export function FicheMembre() {
  const { id } = useParams();
  const { moi } = useSession();
  const navigate = useNavigate();
  const [m, setM] = useState<Detail | null>(null);
  const [erreur, setErreur] = useState('');
  const [mdp, setMdp] = useState<string | null>(null);
  const [suppression, setSuppression] = useState(false);
  const charger = useCallback(() => { api.get<Detail>(`/admin/membres/${id}`).then(setM).catch((e) => setErreur(e.message)); }, [id]);
  useEffect(charger, [charger]);

  if (erreur) return <div className="page"><div className="erreur-form">{erreur}</div></div>;
  if (!m) return <Chargement />;
  const soiMeme = m.id === moi?.id;
  const modifier = async (corps: object, message: string) => {
    try { await api.patch(`/admin/membres/${m.id}`, corps); toast(message); charger(); } catch (e) { toast((e as Error).message); }
  };

  return (
    <div className="page">
      <Link to="/admin/membres" className="btn btn-fantome btn-petit" style={{ marginBottom: 12 }}><Icone nom="retour" taille={16} />Membres</Link>
      <div className="carte carte-pad ligne" style={{ gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
        <Avatar nom={m.avatar} taille={80} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ fontSize: 28 }}>{m.nom}</h1>
          <p className="discret">{m.email} · inscrit le {dateCourte(m.inscrit)}</p>
          <div className="ligne" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
            <span className="pastille pastille-encre">Niveau {m.niveau} · {m.grade}</span>
            {m.role === 'admin' && <span className="pastille pastille-jaune">Administrateur</span>}
            {m.desactive && <span className="pastille pastille-rouge">Désactivé</span>}
          </div>
        </div>
        {!soiMeme && (
          <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-petit" onClick={() => modifier({ role: m.role === 'admin' ? 'learner' : 'admin' }, 'Rôle modifié')}>{m.role === 'admin' ? 'Retirer admin' : 'Passer admin'}</button>
            <button className="btn btn-petit" onClick={async () => { try { const r = await api.post<{ code: string }>(`/admin/membres/${m.id}/inviter`); setMdp(r.code); toast('Invitation envoyée par e-mail'); } catch (e) { toast((e as Error).message); } }}><Icone nom="lien" taille={15} />Renvoyer l'invitation</button>
            <button className="btn btn-petit" onClick={() => modifier({ desactive: !m.desactive }, m.desactive ? 'Compte réactivé' : 'Compte désactivé')}>{m.desactive ? 'Réactiver' : 'Désactiver'}</button>
            <button className="btn btn-petit btn-rouge" onClick={() => setSuppression(true)} aria-label="Supprimer"><Icone nom="poubelle" taille={16} /></button>
          </div>
        )}
      </div>

      <div className="kpis">
        <div className="carte kpi kpi-jaune"><div className="libelle"><Icone nom="eclair" taille={16} />XP</div><div className="valeur">{m.xp}</div><div className="note">{m.rangSemaine ? `${m.rangSemaine}e cette semaine` : ''}</div></div>
        <div className="carte kpi"><div className="libelle">Leçons réussies</div><div className="valeur">{m.lecons}</div><div className="note">{m.parties} parties</div></div>
        <div className="carte kpi"><div className="libelle">Précision</div><div className="valeur">{m.precision ?? '—'}{m.precision !== null && '%'}</div></div>
        <div className="carte kpi"><div className="libelle"><Icone nom="flamme" taille={16} couleur="var(--orange)" epaisseur={2} />Série</div><div className="valeur">{m.serie}</div><div className="note">record {m.meilleureSerie} j</div></div>
      </div>

      <div className="grille-admin">
        <section className="carte carte-pad bloc col-6">
          <h2>Progression</h2>
          {m.parcours.map((p) => (
            <div key={p.titre} className={`c-${p.couleur}`} style={{ marginBottom: 14 }}>
              <div className="ligne" style={{ fontWeight: 800, marginBottom: 6 }}><span className="carre-couleur" style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 2 }} />{p.titre}</div>
              {p.lecons.map((l) => (
                <div key={l.titre} className="ligne entre" style={{ fontSize: 14, padding: '3px 0 3px 26px', color: l.essais ? undefined : 'var(--encre-3)' }}>
                  <span>{l.titre}{l.essais > 0 && !l.reussie && <span className="pastille pastille-rouge" style={{ marginLeft: 6, fontSize: 11, padding: '0 6px' }}>ratée</span>}</span>
                  <Etoiles n={l.etoiles} taille={14} />
                </div>
              ))}
            </div>
          ))}
        </section>
        <section className="carte carte-pad bloc col-6">
          <h2>Badges ({m.badges.length})</h2>
          {m.badges.length === 0 ? <p className="discret">Aucun badge pour l'instant.</p> : (
            <div className="ligne" style={{ flexWrap: 'wrap', gap: 8 }}>
              {m.badges.map((b) => <span key={b.id} className="pastille pastille-jaune" title={b.description}><Icone nom={b.icone} taille={16} />{b.nom}</span>)}
            </div>
          )}
          <h2 style={{ marginTop: 24 }}>Dernières parties</h2>
          {m.historique.length === 0 ? <p className="discret">Aucune partie jouée.</p> : (
            <div className="tableau-wrap">
              <table className="tableau">
                <tbody>
                  {m.historique.slice(0, 15).map((h, k) => (
                    <tr key={k}>
                      <td>{h.lecon}<div className="tres-discret" style={{ fontSize: 12 }}>{new Date(h.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div></td>
                      <td className="num">{h.echec ? <span className="pastille pastille-rouge">compromis</span> : <Etoiles n={h.etoiles} taille={13} />}</td>
                      <td className="num">{h.correct}/{h.total}</td>
                      <td className="num">{duree(h.dureeMs)}</td>
                      <td className="num">+{h.xp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      {mdp && <InvitationEnvoyee nom={m.nom} email={m.email} code={mdp} fermer={() => setMdp(null)} />}
      {suppression && (
        <Modale titre="Supprimer ce membre ?" fermer={() => setSuppression(false)}>
          <p>Le compte de <strong>{m.nom}</strong>, son historique et ses badges seront définitivement effacés. Pour simplement bloquer l'accès, préférez « Désactiver ».</p>
          <div className="actions">
            <button className="btn" onClick={() => setSuppression(false)}>Annuler</button>
            <button className="btn btn-rouge" onClick={async () => { await api.del(`/admin/membres/${m.id}`); toast('Membre supprimé'); navigate('/admin/membres'); }}>Supprimer</button>
          </div>
        </Modale>
      )}
    </div>
  );
}
