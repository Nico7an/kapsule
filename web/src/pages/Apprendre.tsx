import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import { useSession } from '../session';
import type { Categorie, NoeudLecon, Parcours } from '../types';
import { Icone } from '../composants/Icone';
import { Mascotte } from '../composants/Mascotte';
import { Chargement, Etoiles } from '../composants/Divers';
import { CarteNiveau, CarteObjectif, MiniClassement, ModaleClassementLecon } from '../composants/Panneaux';
import { Compteurs } from '../composants/Coquille';

// Décalage horizontal des nœuds : le chemin serpente comme une piste de jeu.
const SERPENTIN = [0, 56, 84, 56, 0, -56, -84, -56];

// Catégorie choisie, retenue dans ce navigateur (confort seulement : le
// stockage peut être indisponible, on retombe alors sur la première).
const CLE_CATEGORIE = 'kapsule:categorie';
const lireCategorie = () => { try { return localStorage.getItem(CLE_CATEGORIE); } catch { return null; } };
const retenirCategorie = (id: string) => { try { localStorage.setItem(CLE_CATEGORIE, id); } catch { /* sans stockage */ } };

export function Apprendre() {
  const { moi } = useSession();
  const [parcours, setParcours] = useState<Parcours[] | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [classement, setClassement] = useState<string | null>(null);
  const [categorieChoisie, setCategorieChoisie] = useState<string | null>(lireCategorie);
  const actuelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get<Parcours[]>('/parcours').then(setParcours); }, []);

  // Catégories dans l'ordre du catalogue, avec leur avancement.
  const categories: (Categorie & { faites: number; total: number })[] = [];
  for (const p of parcours ?? []) {
    let c = categories.find((x) => x.id === p.categorie.id);
    if (!c) categories.push(c = { ...p.categorie, faites: 0, total: 0 });
    c.faites += p.faites; c.total += p.total;
  }
  const categorie = categories.find((c) => c.id === categorieChoisie) ?? categories[0];
  const visibles = parcours?.filter((p) => p.categorie.id === categorie?.id) ?? [];
  const choisir = (id: string) => { setCategorieChoisie(id); retenirCategorie(id); setOuvert(null); };

  // Première leçon ouverte et pas encore réussie de la catégorie : c'est « la suivante ».
  const suivante = visibles.flatMap((p) => p.lecons).find((l) => l.ouverte && !l.reussie)?.id;

  useEffect(() => {
    if (suivante && actuelRef.current) actuelRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [suivante]);

  useEffect(() => {
    const fermer = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.noeud-ligne')) setOuvert(null); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, []);
  const fermerClassement = useCallback(() => setClassement(null), []);

  if (!parcours || !moi) return <Chargement />;
  const total = visibles.reduce((n, p) => n + p.total, 0);
  const faites = visibles.reduce((n, p) => n + p.faites, 0);

  return (
    <div className="page">
      <div className="deux-colonnes">
        <main>
          <div className="ligne entre" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 32 }}>Salut {moi.nom.split(' ')[0]} !</h1>
              <p className="discret">{faites === 0 ? 'Votre première leçon vous attend.' : `${faites} leçon${faites > 1 ? 's' : ''} sur ${total} réussie${faites > 1 ? 's' : ''}. On continue ?`}</p>
            </div>
          </div>
          <SelecteurCategories categories={categories} active={categorie?.id} choisir={choisir} />
          {visibles.map((p) => {
            let unite = '';
            return (
              <section key={p.id} className={`c-${p.couleur}`}>
                <header className="entete-parcours">
                  <div className="icone-parcours"><Icone nom={p.icone} taille={30} /></div>
                  <div style={{ minWidth: 0 }}>
                    <h2>{p.titre}</h2>
                    <p>{p.description}</p>
                  </div>
                  <div className="avancement"><div style={{ fontSize: 22 }}>{p.faites}/{p.total}</div><div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>leçons</div></div>
                </header>
                <div className="chemin">
                  {p.lecons.map((l, i) => {
                    const nouvelleUnite = l.unite && l.unite !== unite;
                    unite = l.unite;
                    return (
                      <div key={l.id} style={{ display: 'contents' }}>
                        {nouvelleUnite && i > 0 && <div className="unite" style={{ width: '100%' }}>{l.unite}</div>}
                        <Noeud
                          lecon={l} decalage={SERPENTIN[i % SERPENTIN.length]} actuel={l.id === suivante} ouvert={ouvert === l.id}
                          refActuel={l.id === suivante ? actuelRef : undefined}
                          basculer={() => setOuvert(ouvert === l.id ? null : l.id)}
                          voirClassement={() => setClassement(l.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {faites === total && total > 0 && (
            <div className="carte carte-pad vide" style={{ marginTop: 32 }}>
              <Mascotte humeur="fier" />
              <h2>Catégorie bouclée !</h2>
              <p className="discret">Explorez une autre catégorie, ou rejouez ces leçons pour décrocher les trois étoiles.</p>
            </div>
          )}
        </main>
        <aside className="rail">
          <div className="rail-desktop"><Compteurs moi={moi} /></div>
          <CarteObjectif moi={moi} />
          <CarteNiveau moi={moi} />
          <MiniClassement />
        </aside>
      </div>
      {classement && <ModaleClassementLecon id={classement} fermer={fermerClassement} />}
    </div>
  );
}

function SelecteurCategories({ categories, active, choisir }: {
  categories: (Categorie & { faites: number; total: number })[]; active?: string; choisir: (id: string) => void;
}) {
  if (categories.length < 2) return null;
  const familles = [...new Set(categories.map((c) => c.famille))];
  return (
    <nav className="categories" aria-label="Catégories">
      {familles.map((f) => (
        <div key={f} className="famille">
          <div className="famille-titre">{f}</div>
          <div className="famille-puces">
            {categories.filter((c) => c.famille === f).map((c) => (
              <button
                key={c.id} type="button" className={`puce-categorie${c.id === active ? ' active' : ''}`}
                aria-pressed={c.id === active} onClick={() => choisir(c.id)}
              >
                <Icone nom={c.icone} taille={18} />
                <span>{c.titre}</span>
                <span className={`compte${c.total && c.faites === c.total ? ' fini' : ''}`}>{c.faites}/{c.total}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

interface PropsNoeud {
  lecon: NoeudLecon; decalage: number; actuel: boolean; ouvert: boolean;
  refActuel?: Ref<HTMLDivElement>; basculer: () => void; voirClassement: () => void;
}

function Noeud({ lecon, decalage, actuel, ouvert, refActuel, basculer, voirClassement }: PropsNoeud) {
  const navigate = useNavigate();
  const etat = !lecon.ouverte ? 'verrouille' : lecon.etoiles === 3 ? 'reussi parfait' : lecon.reussie ? 'reussi' : actuel ? 'actuel' : '';
  const icone = !lecon.ouverte ? 'cadenas' : lecon.reussie ? (lecon.etoiles === 3 ? 'couronne' : 'coche') : 'etoile';
  return (
    <div className={`noeud-ligne${ouvert ? ' ouvert' : ''}`} style={{ ['--x' as string]: `${decalage}px` }} ref={refActuel}>
      {actuel && !ouvert && <div className="bulle-depart">{lecon.etoiles ? 'Continuer' : 'Commencer'}</div>}
      <button className={`noeud ${etat}`} onClick={basculer} aria-label={`${lecon.titre}${lecon.ouverte ? '' : ' (verrouillée)'}`} aria-expanded={ouvert}>
        <Icone nom={icone} taille={34} epaisseur={2.6} couleur={lecon.ouverte && !lecon.reussie ? 'var(--carte)' : undefined} />
      </button>
      <div className="noeud-etoiles">{lecon.ouverte && <Etoiles n={lecon.etoiles} />}</div>
      <div className="noeud-titre">{lecon.titre}</div>
      {ouvert && (
        <div className="pop-lecon carte" role="dialog" aria-label={lecon.titre}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', opacity: 0.8 }}>{lecon.unite || 'Défi'}</div>
          <h3>{lecon.titre}</h3>
          <p style={{ fontSize: 14, marginTop: 4 }}>
            {!lecon.ouverte ? 'Réussissez la leçon précédente pour ouvrir celle-ci.'
              : `${lecon.nbQuestions} questions · 3 vies${lecon.reussie ? ' · révision : XP ÷ 2' : ''}`}
          </p>
          {lecon.ouverte && (
            <>
              <button className="btn btn-large" style={{ minHeight: 50, fontSize: 16 }} onClick={() => navigate(`/lecon/${lecon.id}`)}>
                {lecon.reussie ? <><Icone nom="rejouer" taille={20} />Rejouer</> : <>Commencer · +{lecon.nbQuestions * 10} XP</>}
              </button>
              <button className="btn btn-fantome" style={{ width: '100%', marginTop: 6, color: 'inherit' }} onClick={voirClassement}>
                <Icone nom="podium" taille={18} />Classement du questionnaire
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
