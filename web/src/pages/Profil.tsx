import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useSession } from '../session';
import { activerSon, sons } from '../son';
import type { Badge, Moi } from '../types';
import { Avatar, AVATARS } from '../composants/Avatar';
import { Icone } from '../composants/Icone';
import { Chargement, Modale, dateCourte, toast } from '../composants/Divers';
import { CarteNiveau } from '../composants/Panneaux';

interface Stats { parties: number; precision: number | null; tempsMinutes: number; lecons: number; parfaites: number; semaine: { jour: string; xp: number }[]; rangSemaine: number | null }

const JOURS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export function Profil() {
  const { moi, definir } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [badges, setBadges] = useState<Badge[] | null>(null);
  const [edition, setEdition] = useState(false);
  const [mdp, setMdp] = useState(false);

  useEffect(() => {
    api.get<Stats>('/statistiques').then(setStats);
    api.get<Badge[]>('/badges').then(setBadges);
  }, []);

  if (!moi || !stats || !badges) return <Chargement />;
  const max = Math.max(10, ...stats.semaine.map((j) => j.xp));
  const obtenus = badges.filter((b) => b.obtenu).length;

  const basculerSon = async () => {
    const m = await api.patch<Moi>('/moi', { son: !moi.son });
    definir(m); activerSon(m.son); if (m.son) sons.juste();
  };

  return (
    <div className="page">
      <div className="carte" style={{ overflow: 'hidden', marginBottom: 22 }}>
        <div className="hachures" style={{ height: 16, borderBottom: 'var(--trait) solid var(--encre)' }} />
        <div className="carte-pad ligne" style={{ gap: 20, flexWrap: 'wrap' }}>
          <Avatar nom={moi.avatar} taille={96} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 32 }}>{moi.nom}</h1>
            <p className="discret">{moi.organisation?.nom} · {moi.role === 'admin' ? 'Administrateur' : 'Apprenant'}</p>
            <div className="ligne" style={{ marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
              <span className="pastille pastille-encre">Niveau {moi.niveau} · {moi.grade}</span>
              {stats.rangSemaine && <span className="pastille pastille-jaune"><Icone nom="podium" taille={14} />{stats.rangSemaine}{stats.rangSemaine === 1 ? 'er' : 'e'} cette semaine</span>}
            </div>
          </div>
          <button className="btn" onClick={() => setEdition(true)}><Icone nom="crayon" taille={18} />Modifier</button>
        </div>
      </div>

      <div className="deux-colonnes">
        <main className="empile" style={{ gap: 22 }}>
          <div className="kpis">
            <Tuile icone="flamme" couleur="var(--orange)" valeur={moi.serie} libelle="Série actuelle" note={`record : ${moi.meilleureSerie} j`} />
            <Tuile icone="eclair" couleur="var(--jaune)" valeur={moi.xp} libelle="XP total" />
            <Tuile icone="cible" valeur={stats.precision === null ? '—' : `${stats.precision}%`} libelle="Précision" note={`${stats.parties} partie${stats.parties > 1 ? 's' : ''}`} />
            <Tuile icone="couronne" couleur="var(--jaune)" valeur={stats.parfaites} libelle="Sans faute" note={`${stats.lecons} leçon${stats.lecons > 1 ? 's' : ''} réussie${stats.lecons > 1 ? 's' : ''}`} />
          </div>

          <section>
            <div className="ligne entre" style={{ marginBottom: 12 }}>
              <h2 style={{ fontSize: 22 }}>Badges</h2>
              <span className="pastille">{obtenus} / {badges.length}</span>
            </div>
            <div className="grille-badges">
              {badges.map((b) => (
                <div key={b.id} className={`carte badge${b.obtenu ? '' : ' verrouille'}`} title={b.obtenu ? `Obtenu le ${dateCourte(b.obtenu)}` : undefined}>
                  <div className="medaille"><Icone nom={b.obtenu ? b.icone : 'cadenas'} taille={32} couleur={b.obtenu ? 'var(--orange)' : undefined} epaisseur={2.2} /></div>
                  <h4>{b.nom}</h4>
                  <p>{b.description}</p>
                  <span className="tres-discret" style={{ fontSize: 11.5, fontWeight: 700 }}>{b.obtenu ? `✓ ${dateCourte(b.obtenu)}` : `${b.partOrganisation} % de l'équipe l'a`}</span>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="rail">
          <CarteNiveau moi={moi} />
          <div className="carte carte-pad">
            <h3 style={{ fontSize: 18, marginBottom: 12 }}>Mes 7 derniers jours</h3>
            <div className="mini-barres">
              {stats.semaine.map((j, i) => (
                <div key={j.jour} className={i === 6 ? 'aujourdhui' : ''} title={`${j.xp} XP`}>
                  <small>{j.xp || ''}</small>
                  <i style={{ height: `${Math.max(6, (j.xp / max) * 80)}px`, opacity: j.xp ? 1 : 0.35 }} />
                  <small>{JOURS[new Date(`${j.jour}T12:00:00`).getDay()]}</small>
                </div>
              ))}
            </div>
            <p className="tres-discret" style={{ fontSize: 13, marginTop: 10 }}>{stats.tempsMinutes} min de formation au total</p>
          </div>
          <div className="carte carte-pad empile" style={{ gap: 10 }}>
            <h3 style={{ fontSize: 18 }}>Réglages</h3>
            <button className="btn" onClick={basculerSon}><Icone nom={moi.son ? 'son' : 'muet'} taille={20} />Sons {moi.son ? 'activés' : 'coupés'}</button>
            <button className="btn" onClick={() => setMdp(true)}><Icone nom="cadenas" taille={20} />Changer de mot de passe</button>
          </div>
        </aside>
      </div>
      {edition && <EditionProfil moi={moi} fermer={() => setEdition(false)} />}
      {mdp && <ChangerMotDePasse fermer={() => setMdp(false)} />}
    </div>
  );
}

function Tuile({ icone, couleur, valeur, libelle, note }: { icone: string; couleur?: string; valeur: number | string; libelle: string; note?: string }) {
  return (
    <div className="carte kpi">
      <div className="libelle"><Icone nom={icone} taille={18} couleur={couleur} epaisseur={2.2} />{libelle}</div>
      <div className="valeur">{valeur}</div>
      {note && <div className="note">{note}</div>}
    </div>
  );
}

function EditionProfil({ moi, fermer }: { moi: Moi; fermer: () => void }) {
  const { definir } = useSession();
  const [nom, setNom] = useState(moi.nom);
  const [avatar, setAvatar] = useState(moi.avatar);
  const [erreur, setErreur] = useState('');
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    try { definir(await api.patch<Moi>('/moi', { nom, avatar })); toast('Profil mis à jour'); fermer(); }
    catch (err) { setErreur((err as Error).message); }
  };
  return (
    <Modale titre="Mon profil" fermer={fermer}>
      <form className="empile" onSubmit={envoyer}>
        {erreur && <div className="erreur-form">{erreur}</div>}
        <div className="selecteur-avatars">
          {AVATARS.map((a) => (
            <button type="button" key={a} className={a === avatar ? 'actif' : ''} onClick={() => setAvatar(a)} aria-label={a} aria-pressed={a === avatar}><Avatar nom={a} taille={52} /></button>
          ))}
        </div>
        <label className="champ"><span>Nom affiché dans le classement</span><input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required /></label>
        <button className="btn btn-jaune btn-large">Enregistrer</button>
      </form>
    </Modale>
  );
}

function ChangerMotDePasse({ fermer }: { fermer: () => void }) {
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [erreur, setErreur] = useState('');
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    try { await api.post('/moi/mot-de-passe', { actuel, nouveau }); toast('Mot de passe changé, vos autres sessions sont fermées'); fermer(); }
    catch (err) { setErreur((err as Error).message); }
  };
  return (
    <Modale titre="Changer de mot de passe" fermer={fermer}>
      <form className="empile" onSubmit={envoyer}>
        {erreur && <div className="erreur-form">{erreur}</div>}
        <label className="champ"><span>Mot de passe actuel</span><input className="saisie" type="password" autoComplete="current-password" value={actuel} onChange={(e) => setActuel(e.target.value)} required /></label>
        <label className="champ"><span>Nouveau (10 caractères min. — une phrase de passe, c'est encore mieux)</span><input className="saisie" type="password" autoComplete="new-password" minLength={10} value={nouveau} onChange={(e) => setNouveau(e.target.value)} required /></label>
        <button className="btn btn-jaune btn-large">Changer</button>
      </form>
    </Modale>
  );
}
