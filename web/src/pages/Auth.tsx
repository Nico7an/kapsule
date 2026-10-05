import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { api } from '../api';
import { useSession } from '../session';
import { Mascotte } from '../composants/Mascotte';
import { Icone } from '../composants/Icone';
import { Avatar, AVATARS } from '../composants/Avatar';
import { Logo } from '../composants/Coquille';
import { toast } from '../composants/Divers';
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
  const [searchParams] = useSearchParams();
  const [etape, setEtape] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState(searchParams.get('code') || '');
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  // Connexion automatique par lien magique (si email + code dans l'URL)
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    const urlCode = searchParams.get('code');
    if (urlEmail && urlCode) {
      setEnvoi(true);
      api.post<Moi>('/auth/valider-code', { email: urlEmail, code: urlCode })
        .then((m) => { toast(`Ravi de vous revoir, ${m.nom} !`); definir(m); })
        .catch((e) => { setErreur(e.message); setEtape('code'); })
        .finally(() => setEnvoi(false));
    }
  }, [searchParams, definir]);

  const demanderCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setEnvoi(true); setErreur('');
    try {
      await api.post('/auth/demander-code', { email: email.trim() });
      setEtape('code');
      toast('Code envoyé par e-mail');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const validerCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setEnvoi(true); setErreur('');
    try {
      const m = await api.post<Moi>('/auth/valider-code', { email: email.trim(), code: code.trim().replace(/\s+/g, '') });
      definir(m);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Cadre>
      {etape === 'email' ? (
        <form onSubmit={demanderCode}>
          <Logo />
          <div>
            <h2 style={{ fontSize: 30, marginBottom: 6 }}>Connexion sécurisée</h2>
            <p className="discret" style={{ fontSize: 15, margin: 0 }}>
              Pas de mot de passe à retenir : saisissez votre e-mail pour recevoir un code à 6 chiffres.
            </p>
          </div>
          {erreur && <div className="erreur-form" role="alert">{erreur}</div>}
          <label className="champ">
            <span>Votre adresse e-mail</span>
            <input
              className="saisie"
              type="email"
              autoComplete="username"
              placeholder="prenom.nom@entreprise.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button className="btn btn-jaune btn-large" disabled={envoi || !email.trim()}>
            {envoi ? 'Envoi du code…' : 'Recevoir mon code →'}
          </button>
          <p className="tres-discret" style={{ fontSize: 13.5, textAlign: 'center', lineHeight: 1.4 }}>
            Pas encore inscrit ? Rejoignez votre organisation via le lien partagé par votre administrateur.
          </p>
        </form>
      ) : (
        <form onSubmit={validerCode}>
          <Logo />
          <div>
            <div className="pastille pastille-jaune" style={{ marginBottom: 10 }}>
              <Icone nom="cadenas" taille={14} /> Vérification en cours
            </div>
            <h2 style={{ fontSize: 30, marginBottom: 6 }}>Entrez votre code</h2>
            <p className="discret" style={{ fontSize: 14.5, margin: 0 }}>
              Un code temporaire à 6 chiffres a été envoyé à <strong>{email}</strong>.
            </p>
          </div>
          {erreur && <div className="erreur-form" role="alert">{erreur}</div>}
          <label className="champ">
            <span>Code de connexion (6 chiffres)</span>
            <input
              className="saisie mono"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123 456"
              maxLength={7}
              style={{ fontSize: 30, textAlign: 'center', letterSpacing: '0.22em', fontWeight: 800, padding: '14px' }}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button className="btn btn-jaune btn-large" disabled={envoi || !code.trim()}>
            {envoi ? 'Vérification…' : 'Se connecter'}
          </button>
          <div className="ligne entre" style={{ fontSize: 14, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-fantome btn-petit"
              onClick={demanderCode}
              disabled={envoi}
            >
              Renvoyer un code
            </button>
            <button
              type="button"
              className="btn btn-fantome btn-petit"
              onClick={() => { setEtape('email'); setCode(''); setErreur(''); }}
            >
              Changer d'e-mail
            </button>
          </div>
        </form>
      )}
    </Cadre>
  );
}

export function Rejoindre() {
  const { code = '' } = useParams();
  const { definir } = useSession();
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [invalide, setInvalide] = useState('');
  const [etape, setEtape] = useState<'formulaire' | 'code'>('formulaire');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [erreur, setErreur] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    api.get<{ organisation: string }>(`/auth/invitation/${encodeURIComponent(code)}`)
      .then((r) => setOrganisation(r.organisation)).catch((e) => setInvalide(e.message));
  }, [code]);

  const demanderCodeInscription = async (e: FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !email.trim()) return;
    setEnvoi(true); setErreur('');
    try {
      await api.post('/auth/demander-inscription', { code, nom: nom.trim(), email: email.trim(), avatar });
      setEtape('code');
      toast('Code envoyé par e-mail');
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const validerCodeInscription = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setEnvoi(true); setErreur('');
    try {
      const m = await api.post<Moi>('/auth/valider-inscription', { email: email.trim(), code: otp.trim().replace(/\s+/g, '') });
      toast(`Bienvenue dans l'équipe, ${m.nom} !`);
      definir(m);
    } catch (err) {
      setErreur((err as Error).message);
    } finally {
      setEnvoi(false);
    }
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
      {etape === 'formulaire' ? (
        <form onSubmit={demanderCodeInscription}>
          <Logo />
          <div>
            <div className="pastille pastille-jaune" style={{ marginBottom: 10 }}>
              <Icone nom="membres" taille={16} />{organisation ?? '…'}
            </div>
            <h2 style={{ fontSize: 30 }}>Rejoindre l'équipe</h2>
            <p className="discret" style={{ fontSize: 14.5 }}>
              Pas de mot de passe requis : vous recevrez un code de confirmation par e-mail.
            </p>
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
          <label className="champ">
            <span>Prénom et nom (visible dans le classement)</span>
            <input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={60} required autoComplete="name" />
          </label>
          <label className="champ">
            <span>Votre adresse e-mail</span>
            <input className="saisie" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </label>
          <button className="btn btn-jaune btn-large" disabled={envoi || !organisation}>
            {envoi ? 'Envoi du code…' : 'Recevoir mon code d\'accès →'}
          </button>
          <p className="tres-discret" style={{ fontSize: 14, textAlign: 'center' }}>
            Déjà inscrit ? <Link to="/">Se connecter</Link>
          </p>
        </form>
      ) : (
        <form onSubmit={validerCodeInscription}>
          <Logo />
          <div>
            <div className="pastille pastille-jaune" style={{ marginBottom: 10 }}>
              <Icone nom="cadenas" taille={16} />{organisation}
            </div>
            <h2 style={{ fontSize: 30 }}>Validez votre e-mail</h2>
            <p className="discret" style={{ fontSize: 14.5 }}>
              Un code à 6 chiffres vient d'être envoyé à <strong>{email}</strong> pour confirmer votre compte.
            </p>
          </div>
          {erreur && <div className="erreur-form" role="alert">{erreur}</div>}
          <label className="champ">
            <span>Code de confirmation</span>
            <input
              className="saisie mono"
              type="text"
              inputMode="numeric"
              placeholder="123 456"
              maxLength={7}
              style={{ fontSize: 30, textAlign: 'center', letterSpacing: '0.22em', fontWeight: 800, padding: '14px' }}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              autoFocus
            />
          </label>
          <button className="btn btn-jaune btn-large" disabled={envoi || !otp.trim()}>
            {envoi ? 'Création du compte…' : 'Valider et commencer'}
          </button>
          <div className="ligne entre" style={{ fontSize: 14, marginTop: 4 }}>
            <button
              type="button"
              className="btn btn-fantome btn-petit"
              onClick={demanderCodeInscription}
              disabled={envoi}
            >
              Renvoyer un code
            </button>
            <button
              type="button"
              className="btn btn-fantome btn-petit"
              onClick={() => { setEtape('formulaire'); setOtp(''); setErreur(''); }}
            >
              Modifier mes infos
            </button>
          </div>
        </form>
      )}
    </Cadre>
  );
}
