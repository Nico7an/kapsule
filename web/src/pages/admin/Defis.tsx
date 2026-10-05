import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../../api';
import type { Question, Support } from '../../types';
import { Icone } from '../../composants/Icone';
import { Chargement, Modale, dateCourte, toast } from '../../composants/Divers';
import { Mascotte } from '../../composants/Mascotte';

interface ResumeDefi { id: string; titre: string; publie: boolean; nbQuestions: number; misAJour: string; parties: number; joueurs: number; precision: number | null }

export function Defis() {
  const [defis, setDefis] = useState<ResumeDefi[] | null>(null);
  useEffect(() => { api.get<ResumeDefi[]>('/admin/defis').then(setDefis); }, []);
  if (!defis) return <Chargement />;
  return (
    <div className="page">
      <div className="titre-page">
        <div><div className="sur-titre">Administration</div><h1>Défis maison</h1></div>
        <Link to="/admin/defis/nouveau" className="btn btn-jaune"><Icone nom="plus" taille={20} />Nouveau défi</Link>
      </div>
      <p className="discret" style={{ maxWidth: 680, marginBottom: 20 }}>
        Vos propres questionnaires : charte informatique, procédures internes, consignes du moment… Ils apparaissent dans le parcours « Défis maison » de vos membres, avec leur propre classement. Les autres organisations ne les voient pas.
      </p>
      {defis.length === 0 ? (
        <div className="carte vide">
          <Mascotte humeur="surpris" taille={100} />
          <h2>Aucun défi pour l'instant</h2>
          <p className="discret">Trois questions suffisent pour lancer un premier défi à l'équipe.</p>
          <Link to="/admin/defis/nouveau" className="btn btn-jaune">Créer le premier</Link>
        </div>
      ) : (
        <div className="carte tableau-wrap">
          <table className="tableau">
            <thead><tr><th>Défi</th><th className="num">Questions</th><th className="num">Joueurs</th><th className="num">Réussite</th><th className="num">Mis à jour</th></tr></thead>
            <tbody>
              {defis.map((d) => (
                <tr key={d.id}>
                  <td><div className="cellule-membre"><Link to={`/admin/defis/${d.id}`}>{d.titre}</Link>{!d.publie && <span className="pastille">brouillon</span>}</div></td>
                  <td className="num">{d.nbQuestions}</td>
                  <td className="num">{d.joueurs}</td>
                  <td className="num">{d.precision === null ? '—' : `${d.precision}%`}</td>
                  <td className="num" style={{ fontFamily: 'var(--police)', fontWeight: 500 }}>{dateCourte(d.misAJour)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const questionVide = (): Question => ({ id: '', type: 'unique', enonce: '', choix: ['', ''], reponse: 0, explication: '' });

export function EditeurDefi() {
  const { id } = useParams();
  const nouveau = !id || id === 'nouveau';
  const navigate = useNavigate();
  const [titre, setTitre] = useState('');
  const [publie, setPublie] = useState(true);
  const [questions, setQuestions] = useState<Question[] | null>(nouveau ? [questionVide()] : null);
  const [erreur, setErreur] = useState('');
  const [suppression, setSuppression] = useState(false);

  useEffect(() => {
    if (nouveau) return;
    api.get<{ titre: string; publie: boolean; questions: Question[] }>(`/admin/defis/${id}`)
      .then((d) => { setTitre(d.titre); setPublie(d.publie); setQuestions(d.questions); })
      .catch((e) => setErreur(e.message));
  }, [id, nouveau]);

  if (!questions) return erreur ? <div className="page"><div className="erreur-form">{erreur}</div></div> : <Chargement />;

  const maj = (i: number, q: Partial<Question>) => setQuestions(questions.map((x, k) => (k === i ? { ...x, ...q } : x)));
  const deplacer = (i: number, d: number) => {
    const n = [...questions];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setQuestions(n);
  };
  const enregistrer = async () => {
    setErreur('');
    // Les identifiants de question restent stables d'une version à l'autre.
    const corps = { titre, publie, questions: questions.map((q, i) => ({ ...q, id: q.id || `q${Date.now().toString(36)}${i}` })) };
    try {
      if (nouveau) await api.post('/admin/defis', corps); else await api.put(`/admin/defis/${id}`, corps);
      toast(publie ? 'Défi publié' : 'Brouillon enregistré');
      navigate('/admin/defis');
    } catch (e) { setErreur((e as Error).message); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  return (
    <div className="page page-etroite" style={{ maxWidth: 820 }}>
      <Link to="/admin/defis" className="btn btn-fantome btn-petit" style={{ marginBottom: 12 }}><Icone nom="retour" taille={16} />Défis maison</Link>
      <div className="titre-page"><h1>{nouveau ? 'Nouveau défi' : 'Modifier le défi'}</h1></div>
      {erreur && <div className="erreur-form" style={{ marginBottom: 16 }}>{erreur}</div>}
      <div className="carte carte-pad empile" style={{ marginBottom: 20 }}>
        <label className="champ"><span>Titre</span><input className="saisie" value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={80} placeholder="Ex. : Notre charte informatique" /></label>
        <label className="ligne" style={{ fontWeight: 700, cursor: 'pointer' }}>
          <input type="checkbox" checked={publie} onChange={(e) => setPublie(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--encre)' }} />
          Publié (visible par les membres)
        </label>
      </div>

      <div className="empile" style={{ gap: 18 }}>
        {questions.map((q, i) => (
          <EditeurQuestion key={i} q={q} i={i} total={questions.length} maj={(x) => maj(i, x)} deplacer={(d) => deplacer(i, d)}
            supprimer={() => setQuestions(questions.filter((_, k) => k !== i))} />
        ))}
      </div>
      <button className="btn" style={{ width: '100%', marginTop: 18, borderStyle: 'dashed' }} onClick={() => setQuestions([...questions, questionVide()])} disabled={questions.length >= 30}>
        <Icone nom="plus" taille={20} />Ajouter une question
      </button>
      <div className="actions" style={{ marginTop: 24, justifyContent: 'space-between' }}>
        {!nouveau ? <button className="btn btn-rouge" onClick={() => setSuppression(true)}><Icone nom="poubelle" taille={18} />Supprimer</button> : <span />}
        <button className="btn btn-jaune" onClick={enregistrer}><Icone nom="coche" taille={20} />Enregistrer</button>
      </div>
      {suppression && (
        <Modale titre="Supprimer ce défi ?" fermer={() => setSuppression(false)}>
          <p>Le défi et tous les résultats associés seront effacés. Les XP déjà gagnés restent acquis.</p>
          <div className="actions">
            <button className="btn" onClick={() => setSuppression(false)}>Annuler</button>
            <button className="btn btn-rouge" onClick={async () => { await api.del(`/admin/defis/${id}`); toast('Défi supprimé'); navigate('/admin/defis'); }}>Supprimer</button>
          </div>
        </Modale>
      )}
    </div>
  );
}

function EditeurQuestion({ q, i, total, maj, deplacer, supprimer }: { q: Question; i: number; total: number; maj: (q: Partial<Question>) => void; deplacer: (d: number) => void; supprimer: () => void }) {
  const bonnes = [q.reponse].flat();
  const basculerBonne = (k: number) => {
    if (q.type === 'unique') maj({ reponse: k });
    else maj({ reponse: bonnes.includes(k) ? bonnes.filter((x) => x !== k) : [...bonnes, k] });
  };
  const changerType = (type: 'unique' | 'multiple') => maj({ type, reponse: type === 'unique' ? bonnes[0] ?? 0 : bonnes });
  const retirerChoix = (k: number) => {
    const choix = q.choix.filter((_, x) => x !== k);
    const decale = (r: number) => (r > k ? r - 1 : r);
    maj({ choix, reponse: q.type === 'unique' ? (q.reponse === k ? 0 : decale(q.reponse as number)) : bonnes.filter((r) => r !== k).map(decale) });
  };
  const changerSupport = (type: string) => {
    const s: Record<string, Support | undefined> = {
      aucun: undefined,
      email: { type: 'email', de: '', objet: '', corps: '' },
      sms: { type: 'sms', de: '', corps: '' },
      url: { type: 'url', url: '' },
    };
    maj({ support: s[type] });
  };
  const s = q.support;

  return (
    <div className="carte question-edit">
      <div className="entete">
        <strong>Q{i + 1}</strong>
        <select className="saisie" style={{ width: 'auto', minHeight: 38, padding: '4px 36px 4px 10px' }} value={q.type} onChange={(e) => changerType(e.target.value as 'unique' | 'multiple')}>
          <option value="unique">Une seule réponse</option>
          <option value="multiple">Plusieurs réponses</option>
        </select>
        <span style={{ flex: 1 }} />
        <button className="btn btn-fantome btn-icone" disabled={i === 0} onClick={() => deplacer(-1)} aria-label="Monter"><Icone nom="fleche" taille={18} style={{ transform: 'rotate(-90deg)' }} /></button>
        <button className="btn btn-fantome btn-icone" disabled={i === total - 1} onClick={() => deplacer(1)} aria-label="Descendre"><Icone nom="fleche" taille={18} style={{ transform: 'rotate(90deg)' }} /></button>
        <button className="btn btn-fantome btn-icone" disabled={total === 1} onClick={supprimer} aria-label="Supprimer la question"><Icone nom="poubelle" taille={18} /></button>
      </div>
      <label className="champ"><span>Énoncé</span><textarea className="saisie" value={q.enonce} onChange={(e) => maj({ enonce: e.target.value })} maxLength={500} style={{ minHeight: 64 }} /></label>

      <label className="champ"><span>Mise en situation (facultatif)</span>
        <select className="saisie" value={s?.type ?? 'aucun'} onChange={(e) => changerSupport(e.target.value)}>
          <option value="aucun">Aucune</option><option value="email">Faux e-mail</option><option value="sms">Faux SMS</option><option value="url">Adresse web</option>
        </select>
      </label>
      {s?.type === 'email' && (
        <div className="empile" style={{ gap: 8, paddingLeft: 12, borderLeft: '3px solid var(--gris)' }}>
          <input className="saisie" placeholder="Expéditeur (ex. : Service RH <rh@exemple.fr>)" value={s.de} onChange={(e) => maj({ support: { ...s, de: e.target.value } })} />
          <input className="saisie" placeholder="Objet" value={s.objet} onChange={(e) => maj({ support: { ...s, objet: e.target.value } })} />
          <textarea className="saisie" placeholder="Corps du message" value={s.corps} onChange={(e) => maj({ support: { ...s, corps: e.target.value } })} />
          <input className="saisie" placeholder="Texte du bouton (facultatif)" value={s.lien ?? ''} onChange={(e) => maj({ support: { ...s, lien: e.target.value || undefined } })} />
        </div>
      )}
      {s?.type === 'sms' && (
        <div className="empile" style={{ gap: 8, paddingLeft: 12, borderLeft: '3px solid var(--gris)' }}>
          <input className="saisie" placeholder="Expéditeur (numéro ou nom)" value={s.de} onChange={(e) => maj({ support: { ...s, de: e.target.value } })} />
          <textarea className="saisie" placeholder="Texte du SMS" value={s.corps} onChange={(e) => maj({ support: { ...s, corps: e.target.value } })} />
        </div>
      )}
      {s?.type === 'url' && <input className="saisie mono" placeholder="https://…" value={s.url} onChange={(e) => maj({ support: { ...s, url: e.target.value } })} />}

      <div className="champ">
        <span>Choix — cochez {q.type === 'unique' ? 'la bonne réponse' : 'les bonnes réponses'}</span>
        {q.choix.map((c, k) => (
          <div key={k} className="choix-edit">
            <button type="button" className={`coche-bonne${bonnes.includes(k) ? ' oui' : ''}`} onClick={() => basculerBonne(k)} aria-label={`Bonne réponse : choix ${k + 1}`} aria-pressed={bonnes.includes(k)}>
              {bonnes.includes(k) && <Icone nom="coche" taille={22} epaisseur={3} />}
            </button>
            <input className="saisie" value={c} placeholder={`Choix ${k + 1}`} maxLength={200} onChange={(e) => maj({ choix: q.choix.map((x, y) => (y === k ? e.target.value : x)) })} />
            <button type="button" className="btn btn-fantome btn-icone" disabled={q.choix.length <= 2} onClick={() => retirerChoix(k)} aria-label="Retirer ce choix"><Icone nom="croix" taille={18} /></button>
          </div>
        ))}
        {q.choix.length < 6 && <button type="button" className="btn btn-petit btn-fantome" style={{ justifySelf: 'start' }} onClick={() => maj({ choix: [...q.choix, ''] })}><Icone nom="plus" taille={16} />Ajouter un choix</button>}
      </div>
      <label className="champ"><span>Explication affichée après la réponse</span><textarea className="saisie" value={q.explication} onChange={(e) => maj({ explication: e.target.value })} maxLength={800} placeholder="Pourquoi c'est la bonne réponse, et le bon réflexe à retenir." /></label>
    </div>
  );
}
