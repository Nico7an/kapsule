import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { api } from '../api';
import { useSession } from '../session';
import { sons } from '../son';
import type { Bilan, Correction, LigneLecon, Partie, QuestionPublique, Support } from '../types';
import { Icone } from '../composants/Icone';
import { Mascotte, type Humeur } from '../composants/Mascotte';
import { Chargement, Confettis, Compteur, Jauge, Modale, duree } from '../composants/Divers';
import { ListeClassementLecon } from '../composants/Panneaux';

const BRAVO = ['Bien vu !', 'Imparable !', 'Exactement !', 'Bien joué !', 'Dans le mille !', 'Rien ne vous échappe !'];
const OUPS = ['Pas tout à fait…', 'Aïe, pas cette fois !', 'Raté, mais retenez ceci', 'Presque !'];
const auHasard = (t: string[]) => t[Math.floor(Math.random() * t.length)];

export function Lecon() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { rafraichir } = useSession();
  const [partie, setPartie] = useState<Partie | null>(null);
  const [erreur, setErreur] = useState('');
  const [index, setIndex] = useState(0);
  const [selection, setSelection] = useState<number[]>([]);
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [message, setMessage] = useState('');
  const [boucliers, setBoucliers] = useState(3);
  const [casse, setCasse] = useState(-1);
  const [combo, setCombo] = useState(0);
  const [envoi, setEnvoi] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [quitter, setQuitter] = useState(false);

  useEffect(() => {
    api.post<Partie>(`/lecons/${id}/demarrer`).then((p) => { setPartie(p); setBoucliers(p.boucliers); }).catch((e) => setErreur(e.message));
  }, [id]);

  const question = partie?.questions[index];

  const verifier = useCallback(async () => {
    if (!partie || !question || !selection.length || envoi) return;
    setEnvoi(true);
    try {
      const reponse = question.type === 'unique' ? selection[0] : selection;
      const c = await api.post<Correction>(`/parties/${partie.partie}/repondre`, { question: question.id, reponse });
      setCorrection(c);
      if (c.correct) {
        const n = combo + 1;
        setCombo(n);
        setMessage(auHasard(BRAVO));
        if (n >= 3) sons.combo(); else sons.juste();
      } else {
        setCombo(0);
        setMessage(auHasard(OUPS));
        setCasse(c.boucliers);
        sons.faux();
      }
      setBoucliers(c.boucliers);
    } catch (e) { setErreur((e as Error).message); }
    finally { setEnvoi(false); }
  }, [partie, question, selection, envoi, combo]);

  const continuer = useCallback(async () => {
    if (!partie || !correction || envoi) return;
    if (correction.termine) {
      setEnvoi(true);
      try {
        const b = await api.post<Bilan>(`/parties/${partie.partie}/terminer`);
        setBilan(b);
        if (b.echec) sons.echec(); else { sons.victoire(); if (b.badges.length) setTimeout(sons.badge, 900); }
        void rafraichir();
      } catch (e) { setErreur((e as Error).message); }
      finally { setEnvoi(false); }
      return;
    }
    setIndex((i) => i + 1);
    setSelection([]);
    setCorrection(null);
    setCasse(-1);
  }, [partie, correction, envoi, rafraichir]);

  const choisir = useCallback((i: number) => {
    if (!question || correction) return;
    sons.clic();
    if (question.type === 'unique') setSelection([i]);
    else setSelection((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));
  }, [question, correction]);

  // Clavier : 1 à 6 pour choisir, Entrée pour valider / continuer.
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (bilan || quitter || !question) return;
      if (e.key === 'Enter') { e.preventDefault(); if (correction) void continuer(); else void verifier(); return; }
      const n = Number(e.key);
      if (n >= 1 && n <= question.choix.length) choisir(n - 1);
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [bilan, quitter, question, correction, continuer, verifier, choisir]);

  if (erreur) {
    return (
      <div className="resultat"><div className="resultat-carte">
        <Mascotte humeur="triste" />
        <h1 style={{ fontSize: 28 }}>{erreur}</h1>
        <Link className="btn btn-jaune" to="/">Retour au parcours</Link>
      </div></div>
    );
  }
  if (!partie || !question) return <Chargement />;
  if (bilan) return <EcranBilan bilan={bilan} partie={partie} rejouer={() => window.location.reload()} />;

  const avancement = (index + (correction ? 1 : 0)) / partie.questions.length;
  const etatPied = correction ? (correction.correct ? 'juste' : 'faux') : '';
  const bonnes = correction ? [correction.reponse].flat() : [];
  const humeur: Humeur = correction ? (correction.correct ? 'fier' : correction.compromis ? 'compromis' : 'triste') : 'content';

  return (
    <div className={`lecteur c-${partie.lecon.couleur}`}>
      <div className="lecteur-haut">
        <button className="btn btn-fantome btn-icone" onClick={() => setQuitter(true)} aria-label="Quitter la leçon"><Icone nom="croix" taille={28} /></button>
        <Jauge valeur={avancement} />
        <div className="boucliers" aria-label={`${boucliers} vie${boucliers > 1 ? 's' : ''} restante${boucliers > 1 ? 's' : ''}`}>
          {Array.from({ length: partie.boucliers }, (_, i) => (
            <Icone key={i} nom="coeur" taille={28} epaisseur={2.2} couleur="var(--rouge)"
              className={i >= boucliers ? (i === casse ? 'perdu vient-de-casser' : 'perdu') : ''} />
          ))}
        </div>
      </div>

      <main className="lecteur-corps" key={question.id}>
        {combo >= 3 && <div className="combo" key={combo}><Icone nom="flamme" taille={18} couleur="var(--orange)" epaisseur={2} />Combo ×{combo}</div>}
        <div className="consigne">
          {question.support ? 'Mise en situation' : question.type === 'multiple' ? `Plusieurs réponses · ${question.nbReponses} à trouver` : 'Une seule réponse'}
        </div>
        <h1 className="enonce">{question.enonce}</h1>
        {question.support && <SupportVue support={question.support} />}
        <Choix question={question} selection={selection} bonnes={bonnes} corrige={!!correction} choisir={choisir} />
      </main>

      <footer className={`pied-lecteur ${etatPied}`}>
        <div className="pied-interieur">
          <div className="verdict">
            {correction ? (
              <>
                <Mascotte humeur={humeur} taille={76} className="mascotte-verdict" />
                <div role="status">
                  <h3>{correction.compromis ? 'Plus de vies !' : message}</h3>
                  {correction.explication && <p>{correction.explication}</p>}
                </div>
              </>
            ) : (
              <p className="tres-discret" style={{ fontSize: 14 }}>Touches <span className="mono">1</span>–<span className="mono">{question.choix.length}</span> pour choisir, <span className="mono">Entrée</span> pour valider</p>
            )}
          </div>
          {correction ? (
            <button className={`btn btn-large ${correction.correct ? 'btn-vert' : 'btn-rouge'}`} onClick={continuer} disabled={envoi} autoFocus>
              {correction.termine ? 'Voir le bilan' : 'Continuer'}
            </button>
          ) : (
            <button className="btn btn-jaune btn-large" onClick={verifier} disabled={!selection.length || envoi}>Vérifier</button>
          )}
        </div>
      </footer>

      {quitter && (
        <Modale titre="Abandonner la leçon ?" fermer={() => setQuitter(false)}>
          <div className="ligne" style={{ gap: 16 }}>
            <Mascotte humeur="triste" taille={80} />
            <p>Votre progression dans cette leçon sera perdue. Il ne reste que {partie.questions.length - index} question{partie.questions.length - index > 1 ? 's' : ''} !</p>
          </div>
          <div className="actions">
            <button className="btn btn-fantome" onClick={() => navigate('/')}>Abandonner</button>
            <button className="btn btn-jaune" onClick={() => setQuitter(false)} autoFocus>Continuer la leçon</button>
          </div>
        </Modale>
      )}
    </div>
  );
}

function Choix({ question, selection, bonnes, corrige, choisir }: { question: QuestionPublique; selection: number[]; bonnes: number[]; corrige: boolean; choisir: (i: number) => void }) {
  const duo = question.choix.length === 2 && question.choix.every((c) => c.length < 14);
  return (
    <div className={`choix${duo ? ' choix-duo' : ''}`} role={question.type === 'unique' ? 'radiogroup' : 'group'}>
      {question.choix.map((c, i) => {
        const choisi = selection.includes(i);
        const classe = corrige ? (bonnes.includes(i) ? 'juste' : choisi ? 'faux' : '') : choisi ? 'choisi' : '';
        return (
          <button key={i} className={classe} onClick={() => choisir(i)} disabled={corrige}
            role={question.type === 'unique' ? 'radio' : 'checkbox'} aria-checked={choisi}>
            {!duo && (question.type === 'multiple'
              ? <span className="case">{choisi && <Icone nom="coche" taille={16} epaisseur={3.2} />}</span>
              : <span className="touche">{i + 1}</span>)}
            <span>{c}</span>
            {corrige && bonnes.includes(i) && <Icone nom="coche" taille={22} epaisseur={3} style={{ position: 'absolute', right: 14, color: 'var(--vert-f)' }} />}
          </button>
        );
      })}
    </div>
  );
}

function SupportVue({ support }: { support: Support }) {
  if (support.type === 'email') {
    return (
      <div className="carte faux-mail">
        <div className="faux-mail-entete">
          <div className="ligne" style={{ gap: 8 }}><Icone nom="enveloppe" taille={18} /><span className="tres-discret">De :</span> <span className="mono">{support.de}</span></div>
          <strong>{support.objet}</strong>
        </div>
        <div className="faux-mail-corps">
          {support.corps}
          {support.lien && <div><span className="faux-mail-lien">{support.lien}</span></div>}
        </div>
      </div>
    );
  }
  if (support.type === 'sms') {
    return (
      <div className="faux-sms">
        <div className="de"><Icone nom="message" taille={14} /> {support.de}</div>
        <div className="bulle">{support.corps}</div>
      </div>
    );
  }
  return <div className="fausse-url"><Icone nom="cadenas" taille={18} /><span>{support.url}</span></div>;
}

// --- Bilan ----------------------------------------------------------------------------------

function EcranBilan({ bilan, partie, rejouer }: { bilan: Bilan; partie: Partie; rejouer: () => void }) {
  const navigate = useNavigate();
  const [classement, setClassement] = useState<LigneLecon[] | null>(null);
  const continuer = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    api.get<{ joueurs: LigneLecon[] }>(`/lecons/${partie.lecon.id}/classement`).then((r) => setClassement(r.joueurs)).catch(() => {});
    continuer.current?.focus();
  }, [partie.lecon.id]);

  if (bilan.echec) {
    return (
      <div className="resultat">
        <div className="resultat-carte">
          <div className="compromis-bandeau hachures-rouges" />
          <Mascotte humeur="compromis" taille={150} />
          <h1>Plus de vies</h1>
          <p className="discret" style={{ fontSize: 18 }}>Trois erreurs, la leçon s'arrête là. Relisez les explications et retentez : c'est en se trompant qu'on retient. On remet ça ?</p>
          <div className="tuiles">
            <div className="tuile c-rouge"><div>Bonnes</div><div>{bilan.correct}/{bilan.total}</div></div>
            <div className="tuile"><div>XP</div><div>+{bilan.xp.gagne}</div></div>
            <div className="tuile"><div>Série</div><div><Icone nom="flamme" taille={22} couleur="var(--orange)" epaisseur={2} />{bilan.serie}</div></div>
          </div>
          <div className="compromis-bandeau hachures-rouges" />
          <div className="ligne" style={{ width: '100%', gap: 12 }}>
            <button className="btn btn-large" onClick={() => navigate('/')}>Plus tard</button>
            <button className="btn btn-jaune btn-large" onClick={rejouer} ref={continuer}>Réessayer</button>
          </div>
        </div>
      </div>
    );
  }

  const precision = Math.round(100 * bilan.correct / bilan.total);
  const { avant, apres, depasses } = bilan.classement;
  return (
    <div className="resultat">
      <Confettis />
      <div className="resultat-carte">
        <Mascotte humeur="fier" taille={140} />
        <h1>{bilan.etoiles === 3 ? 'Sans faute !' : 'Leçon réussie !'}</h1>
        <div className="etoiles-grandes" aria-label={`${bilan.etoiles} étoiles sur 3`}>
          {[0, 1, 2].map((i) => (
            <Icone key={i} nom="etoile" taille={i === 1 ? 64 : 52} epaisseur={2} couleur={i < bilan.etoiles ? 'var(--jaune)' : 'var(--papier-2)'}
              style={{ animationDelay: `${300 + i * 220}ms`, marginTop: i === 1 ? -14 : 0 }} />
          ))}
        </div>
        <div className="tuiles">
          <div className="tuile c-jaune"><div>XP gagnés</div><div><Icone nom="eclair" taille={22} couleur="var(--jaune)" epaisseur={2} />+<Compteur valeur={bilan.xp.gagne} /></div></div>
          <div className="tuile c-vert"><div>Précision</div><div><Compteur valeur={precision} />%</div></div>
          <div className="tuile c-bleu"><div>Temps</div><div style={{ fontSize: 20 }}>{duree(bilan.dureeMs)}</div></div>
        </div>

        <div className="carte lignes-xp">
          <ul>
            {bilan.xp.lignes.map((l, i) => (
              <li key={l.cle} style={{ animationDelay: `${600 + i * 120}ms` }}><span>{l.libelle}</span><span>{l.xp > 0 ? '+' : ''}{l.xp} XP</span></li>
            ))}
          </ul>
        </div>

        {bilan.montee && (
          <div className="carte bandeau c-bleu" style={{ background: 'var(--bleu)', color: '#fff', animation: 'pop 600ms 900ms both' }}>
            <Icone nom="grade" taille={40} couleur="var(--jaune)" epaisseur={2} />
            <div><div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Niveau supérieur</div><div style={{ fontSize: 22, fontWeight: 800 }}>Niveau {bilan.niveauApres.niveau} · {bilan.niveauApres.grade}</div></div>
          </div>
        )}

        {bilan.badges.map((b, i) => (
          <div key={b.id} className="carte badge-gagne" style={{ animationDelay: `${1100 + i * 250}ms` }}>
            <div className="medaille" style={{ width: 54, height: 54, display: 'grid', placeItems: 'center', background: 'var(--carte)', border: 'var(--trait) solid var(--encre)', borderRadius: '50%', flex: 'none' }}>
              <Icone nom={b.icone} taille={28} couleur="var(--orange)" epaisseur={2.2} />
            </div>
            <div><div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 800 }}>Badge débloqué</div><div style={{ fontSize: 20, fontWeight: 800 }}>{b.nom}</div><div style={{ fontSize: 14 }}>{b.description}</div></div>
          </div>
        ))}

        {(bilan.serieProlongee || (apres && avant && apres < avant)) && (
          <div className="carte bandeau">
            {bilan.serieProlongee && <Icone nom="flamme" taille={36} couleur="var(--orange)" epaisseur={2} />}
            <div>
              {bilan.serieProlongee && <div><strong>{bilan.serie} jour{bilan.serie > 1 ? 's' : ''} de série !</strong> {bilan.serie === 1 ? 'Le début d\'une belle histoire.' : 'Ne cassez pas la chaîne.'}</div>}
              {apres && avant && apres < avant && (
                <div>Vous passez <strong>{apres}{apres === 1 ? 'er' : 'e'}</strong> de la semaine{depasses.length ? <> et doublez <strong>{depasses.slice(0, 2).join(', ')}{depasses.length > 2 ? ` et ${depasses.length - 2} autre${depasses.length > 3 ? 's' : ''}` : ''}</strong></> : ''} !</div>
              )}
            </div>
          </div>
        )}

        {classement && classement.length > 0 && (
          <div className="carte carte-pad empile" style={{ width: '100%', textAlign: 'left', gap: 10 }}>
            <h3 style={{ fontSize: 17 }} className="ligne"><Icone nom="podium" taille={20} />Classement de ce questionnaire</h3>
            <ListeClassementLecon joueurs={classement} limite={5} />
          </div>
        )}

        <div className="ligne" style={{ width: '100%', gap: 12 }}>
          <button className="btn btn-large" onClick={rejouer}><Icone nom="rejouer" taille={20} />Rejouer</button>
          <button className="btn btn-jaune btn-large" onClick={() => navigate('/')} ref={continuer}>Continuer</button>
        </div>
      </div>
    </div>
  );
}
