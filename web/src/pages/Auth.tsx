import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, Link } from 'react-router';
import { api } from '../api';
import { useSession } from '../session';
import { Mascotte } from '../composants/Mascotte';
import { Icone } from '../composants/Icone';
import { Avatar, AVATARS } from '../composants/Avatar';
import { Logo } from '../composants/Coquille';
import type { Moi } from '../types';

function Vitrine() {
  return (
    <section className="vitrine">
      <div className="ruban haut hachures" />
      <Mascotte humeur="fier" taille={140} className="mascotte-vitrine" />
      <h1>La cyber&shy;sécurité, en 3&nbsp;minutes par jour.</h1>
      <div className="arguments">
        <div><span><Icone nom="cible" /></span>Des leçons éclair, des pièges plus vrais que nature</div>
        <div><span><Icone nom="flamme" couleur="var(--orange)" epaisseur={2} /></span>Des séries, des badges, des niveaux</div>
        <div><span><Icone nom="podium" /></span>Un classement avec vos collègues</div>
      </div>
      <div className="ruban bas hachures" />
    </section>
  );
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <main className="ecran-auth">
      <Vitrine />
      <section className="formulaire">{children}</section>
    </main>
  );
}

export function Connexion() {
  const { definir } = useSession();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true); setErreur('');
    try { definir(await api.post<Moi>('/auth/connexion', { email, motDePasse })); }
    catch (err) { setErreur((err as Error).message); }
    finally { setEnvoi(false); }
  };
  return (
    <Cadre>
      <form onSubmit={envoyer}>
        <Logo />
        <h2 style={{ fontSize: 30 }}>Content de vous revoir</h2>
        {erreur && <div className="erreur-form" role="alert">{erreur}</div>}
        <label className="champ"><span>E-mail</span><input className="saisie" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></label>
        <label className="champ"><span>Mot de passe</span><input className="saisie" type="password" autoComplete="current-password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required /></label>
        <button className="btn btn-jaune btn-large" disabled={envoi}>{envoi ? 'Connexion…' : 'Se connecter'}</button>
        <p className="tres-discret" style={{ fontSize: 14, textAlign: 'center' }}>Pas encore de compte ? Demandez le lien d'invitation de votre organisation à son administrateur.</p>
      </form>
    </Cadre>
  );
}

export function Rejoindre() {
  const { code = '' } = useParams();
  const { definir } = useSession();
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [invalide, setInvalide] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api.get<{ organisation: string }>(`/auth/invitation/${encodeURIComponent(code)}`)
      .then((r) => setOrganisation(r.organisation)).catch((e) => setInvalide(e.message));
  }, [code]);

  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    setEnvoi(true); setErreur('');
    try { definir(await api.post<Moi>('/auth/inscription', { code, nom, email, motDePasse, avatar })); }
    catch (err) { setErreur((err as Error).message); }
    finally { setEnvoi(false); }
  };

  if (invalide) {
    return (
      <Cadre>
        <div className="vide">
          <Mascotte humeur="triste" taille={110} />
          <h2>{invalide}</h2>
          <p className="discret">Demandez un nouveau lien à l'administrateur de votre organisation.</p>
          <Link to="/" className="btn">J'ai déjà un compte</Link>
        </div>
      </Cadre>
    );
  }

  return (
    <Cadre>
      <form onSubmit={envoyer}>
        <Logo />
        <div>
          <div className="pastille pastille-jaune" style={{ marginBottom: 10 }}><Icone nom="membres" taille={16} />{organisation ?? '…'}</div>
          <h2 style={{ fontSize: 30 }}>Rejoindre l'équipe</h2>
        </div>
        {erreur && <div className="erreur-form" role="alert">{erreur}</div>}
        <div className="champ">
          <span>Choisissez votre avatar</span>
          <div className="selecteur-avatars">
            {AVATARS.map((a) => (
              <button type="button" key={a} className={a === avatar ? 'actif' : ''} onClick={() => setAvatar(a)} aria-label={a} aria-pressed={a === avatar}>
                <Avatar nom={a} taille={52} />
              </button>
            ))}
          </div>
        </div>
        <label className="champ"><span>Prénom et nom (visible dans le classement)</span><input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required autoComplete="name" /></label>
        <label className="champ"><span>E-mail</span><input className="saisie" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label className="champ"><span>Mot de passe (10 caractères min.)</span><input className="saisie" type="password" minLength={10} value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required autoComplete="new-password" /></label>
        <button className="btn btn-jaune btn-large" disabled={envoi || !organisation}>{envoi ? 'Création…' : 'C\'est parti'}</button>
        <p className="tres-discret" style={{ fontSize: 14, textAlign: 'center' }}>Déjà inscrit ? <Link to="/">Se connecter</Link></p>
      </form>
    </Cadre>
  );
}
