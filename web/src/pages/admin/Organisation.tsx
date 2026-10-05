import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api';
import { useSession } from '../../session';
import { Icone } from '../../composants/Icone';
import { Chargement, Modale, toast } from '../../composants/Divers';
import { copier, lienInvitation } from './Tableau';

interface Org { name: string; invite_code: string; daily_goal: number }
const OBJECTIFS = [[20, 'Tranquille'], [30, 'Régulier'], [50, 'Sérieux'], [80, 'Intense'], [120, 'Extrême']] as const;

export function Organisation() {
  const { rafraichir } = useSession();
  const [org, setOrg] = useState<Org | null>(null);
  const [nom, setNom] = useState('');
  const [regenerer, setRegenerer] = useState(false);
  useEffect(() => { api.get<{ organisation: Org }>('/admin/vue-ensemble').then((v) => { setOrg(v.organisation); setNom(v.organisation.name); }); }, []);
  if (!org) return <Chargement />;

  const enregistrer = async (corps: object) => {
    try { setOrg(await api.patch<Org>('/admin/organisation', corps)); toast('Enregistré'); void rafraichir(); }
    catch (e) { toast((e as Error).message); }
  };
  const envoyerNom = (e: FormEvent) => { e.preventDefault(); void enregistrer({ nom }); };
  const lien = lienInvitation(org.invite_code);

  return (
    <div className="page page-etroite" style={{ maxWidth: 760 }}>
      <div className="titre-page"><div><div className="sur-titre">Administration</div><h1>Organisation</h1></div></div>
      <div className="empile" style={{ gap: 20 }}>
        <section className="carte carte-pad empile">
          <h2 style={{ fontSize: 20 }} className="ligne"><Icone nom="lien" />Lien d'invitation</h2>
          <p className="discret">Toute personne qui a ce lien peut créer un compte dans votre organisation. Partagez-le sur votre messagerie interne ; régénérez-le s'il circule trop.</p>
          <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <code className="saisie mono" style={{ flex: 1, minWidth: 240, display: 'flex', alignItems: 'center', wordBreak: 'break-all' }}>{lien}</code>
            <button className="btn btn-jaune" onClick={() => copier(lien, 'Lien copié')}><Icone nom="copier" taille={18} />Copier</button>
          </div>
          <button className="btn btn-petit btn-fantome" style={{ justifySelf: 'start' }} onClick={() => setRegenerer(true)}><Icone nom="rejouer" taille={16} />Régénérer le lien</button>
        </section>

        <section className="carte carte-pad empile">
          <h2 style={{ fontSize: 20 }} className="ligne"><Icone nom="objectif" />Objectif quotidien</h2>
          <p className="discret">Le nombre d'XP par jour proposé à chaque membre. Une leçon rapporte environ 60 XP.</p>
          <div className="onglets" style={{ flexWrap: 'wrap' }}>
            {OBJECTIFS.map(([v, l]) => (
              <button key={v} className={org.daily_goal === v ? 'actif' : ''} onClick={() => enregistrer({ objectif: v })}>{l} · {v} XP</button>
            ))}
          </div>
        </section>

        <section className="carte carte-pad">
          <form className="empile" onSubmit={envoyerNom}>
            <h2 style={{ fontSize: 20 }} className="ligne"><Icone nom="reglages" />Nom affiché</h2>
            <div className="ligne" style={{ flexWrap: 'wrap' }}>
              <input className="saisie" style={{ flex: 1, minWidth: 220 }} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={80} required />
              <button className="btn" disabled={nom.trim() === org.name}>Renommer</button>
            </div>
          </form>
        </section>

        <section className="carte carte-pad empile">
          <h2 style={{ fontSize: 20 }} className="ligne"><Icone nom="telecharger" />Exporter</h2>
          <p className="discret">Tous les membres avec leurs XP, niveau, leçons réussies et précision, au format CSV (Excel, LibreOffice…).</p>
          <a className="btn btn-encre" style={{ justifySelf: 'start' }} href="/api/admin/export.csv"><Icone nom="telecharger" taille={18} />Télécharger le CSV</a>
        </section>
      </div>
      {regenerer && (
        <Modale titre="Régénérer le lien ?" fermer={() => setRegenerer(false)}>
          <p>L'ancien lien cessera de fonctionner immédiatement. Les comptes déjà créés ne sont pas touchés.</p>
          <div className="actions">
            <button className="btn" onClick={() => setRegenerer(false)}>Annuler</button>
            <button className="btn btn-jaune" onClick={async () => {
              const r = await api.post<{ invite_code: string }>('/admin/organisation/invitation');
              setOrg({ ...org, invite_code: r.invite_code }); setRegenerer(false); toast('Nouveau lien prêt');
            }}>Régénérer</button>
          </div>
        </Modale>
      )}
    </div>
  );
}
