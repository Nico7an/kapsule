import { useState, type FormEvent } from 'react';
import { NavLink, Outlet, Link } from 'react-router';
import { useSession } from '../session';
import { api } from '../api';
import { Icone } from './Icone';
import { Modale, toast } from './Divers';
import type { Moi } from '../types';

/** Marque Kapsule : une gélule inclinée sur un carré d'encre. */
export function MarqueKapsule({ taille = 40 }: { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="3" y="3" width="58" height="58" rx="16" fill="#15140F" />
        <g transform="rotate(-38 32 32)">
          <rect x="21" y="10" width="22" height="44" rx="11" fill="#FFFDF6" />
          <path d="M21 32V21a11 11 0 0 1 22 0v11z" fill="#FFD60A" />
          <path d="M21 32h22" stroke="#15140F" strokeWidth="2.5" />
          <circle cx="28" cy="25" r="2.2" fill="#15140F" /><circle cx="36" cy="25" r="2.2" fill="#15140F" />
        </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Kapsule, accueil">
      <MarqueKapsule />
      <strong>kapsule<i>.</i></strong>
    </Link>
  );
}

export function Compteurs({ moi }: { moi: Moi }) {
  return (
    <div className="compteurs">
      <span className={`compteur${moi.serie && moi.actifAujourdHui ? '' : ' eteint'}`} title={`Série : ${moi.serie} jour${moi.serie > 1 ? 's' : ''}`}>
        <Icone nom="flamme" taille={22} couleur="var(--orange)" epaisseur={2} />{moi.serie}
      </span>
      <span className="compteur" title={`${moi.xp} XP au total`}>
        <Icone nom="eclair" taille={22} couleur="var(--jaune)" epaisseur={2} />{moi.xp}
      </span>
      <span className="compteur" title={`Niveau ${moi.niveau} · ${moi.grade}`}>
        <Icone nom="bouclier" taille={22} couleur="var(--bleu)" epaisseur={2} />{moi.niveau}
      </span>
    </div>
  );
}

function ChangementObligatoire({ moi }: { moi: Moi }) {
  const { rafraichir } = useSession();
  const [actuel, setActuel] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [erreur, setErreur] = useState('');
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/moi/mot-de-passe', { actuel, nouveau });
      toast('Mot de passe enregistré');
      await rafraichir();
    } catch (err) { setErreur((err as Error).message); }
  };
  return (
    <Modale titre={`Bienvenue, ${moi.nom.split(' ')[0]} !`}>
      <p className="discret">Votre compte a été créé avec un mot de passe temporaire. Choisissez le vôtre pour continuer.</p>
      <form className="empile" onSubmit={envoyer}>
        {erreur && <div className="erreur-form">{erreur}</div>}
        <label className="champ"><span>Mot de passe temporaire</span><input className="saisie" type="password" autoComplete="current-password" value={actuel} onChange={(e) => setActuel(e.target.value)} required /></label>
        <label className="champ"><span>Nouveau mot de passe (10 caractères min.)</span><input className="saisie" type="password" autoComplete="new-password" minLength={10} value={nouveau} onChange={(e) => setNouveau(e.target.value)} required /></label>
        <button className="btn btn-jaune btn-large">Enregistrer</button>
      </form>
    </Modale>
  );
}

export function Coquille() {
  const { moi, definir } = useSession();
  if (!moi) return null;
  const admin = moi.role === 'admin';
  const deconnecter = async () => { await api.post('/auth/deconnexion').catch(() => {}); definir(null); };

  return (
    <div className="coquille">
      <nav className="nav-laterale" aria-label="Navigation principale">
        <Logo />
        <NavLink to="/" end className="lien-nav"><Icone nom="maison" />Apprendre</NavLink>
        <NavLink to="/classement" className="lien-nav"><Icone nom="podium" />Classement</NavLink>
        <NavLink to="/profil" className="lien-nav"><Icone nom="profil" />Profil</NavLink>
        {admin && (
          <>
            <div className="nav-sep">Administration</div>
            <NavLink to="/admin" end className="lien-nav"><Icone nom="tableau" />Tableau de bord</NavLink>
            <NavLink to="/admin/membres" className="lien-nav"><Icone nom="membres" />Membres</NavLink>
            <NavLink to="/admin/defis" className="lien-nav"><Icone nom="crayon" />Défis</NavLink>
            <NavLink to="/admin/organisation" className="lien-nav"><Icone nom="reglages" />Organisation</NavLink>
          </>
        )}
        <div className="nav-bas">
          {moi.organisation && <div className="nav-sep" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>{moi.organisation.nom}</div>}
          <button className="lien-nav btn-fantome" style={{ width: '100%', background: 'none', cursor: 'pointer' }} onClick={deconnecter}><Icone nom="sortie" />Déconnexion</button>
        </div>
      </nav>

      <div className="principal">
        <header className="barre-haut">
            <Link to="/" aria-label="Accueil" style={{ display: 'flex' }}>
              <MarqueKapsule taille={34} />
            </Link>
            <Compteurs moi={moi} />
          </header>
        <Outlet />
      </div>

      <nav className="nav-mobile" aria-label="Navigation">
        <NavLink to="/" end><Icone nom="maison" />Apprendre</NavLink>
        <NavLink to="/classement"><Icone nom="podium" />Classement</NavLink>
        <NavLink to="/profil"><Icone nom="profil" />Profil</NavLink>
        {admin && <NavLink to="/admin"><Icone nom="tableau" />Admin</NavLink>}
      </nav>
      {moi.doitChangerMotDePasse && <ChangementObligatoire moi={moi} />}
    </div>
  );
}
