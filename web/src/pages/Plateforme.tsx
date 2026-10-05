import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { Icone } from '../composants/Icone';
import { Chargement, Modale, dateCourte, toast } from '../composants/Divers';
import { copier } from './admin/Tableau';

interface Org { id: number; name: string; created_at: string; membres: number; admins: number; actifs7: number; parties: number }

export function Plateforme() {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [creation, setCreation] = useState(false);
  const [suppression, setSuppression] = useState<Org | null>(null);
  const charger = useCallback(() => { api.get<Org[]>('/plateforme/organisations').then(setOrgs); }, []);
  useEffect(charger, [charger]);
  if (!orgs) return <Chargement />;
  const total = (k: 'membres' | 'actifs7' | 'parties') => orgs.reduce((s, o) => s + o[k], 0);

  return (
    <div className="page">
      <div className="titre-page">
        <div><div className="sur-titre">Plateforme</div><h1>Organisations</h1></div>
        <button className="btn btn-jaune" onClick={() => setCreation(true)}><Icone nom="plus" taille={20} />Nouvelle organisation</button>
      </div>
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="carte kpi kpi-jaune"><div className="libelle">Organisations</div><div className="valeur">{orgs.length}</div></div>
        <div className="carte kpi"><div className="libelle">Membres</div><div className="valeur">{total('membres')}</div></div>
        <div className="carte kpi"><div className="libelle">Actifs 7 j</div><div className="valeur">{total('actifs7')}</div></div>
        <div className="carte kpi"><div className="libelle">Parties jouées</div><div className="valeur">{total('parties')}</div></div>
      </div>
      <p className="discret" style={{ marginBottom: 14 }}>Par conception, cet espace ne montre que des totaux : le détail des apprenants n'est visible que des administrateurs de chaque organisation.</p>
      <div className="carte tableau-wrap">
        <table className="tableau">
          <thead><tr><th>Organisation</th><th className="num">Membres</th><th className="num">Admins</th><th className="num">Actifs 7 j</th><th className="num">Parties</th><th className="num">Créée le</th><th /></tr></thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id}>
                <td style={{ fontWeight: 800 }}>{o.name}</td>
                <td className="num">{o.membres}</td><td className="num">{o.admins}</td><td className="num">{o.actifs7}</td><td className="num">{o.parties}</td>
                <td className="num" style={{ fontFamily: 'var(--police)', fontWeight: 500 }}>{dateCourte(o.created_at)}</td>
                <td className="num"><button className="btn btn-fantome btn-icone" onClick={() => setSuppression(o)} aria-label={`Supprimer ${o.name}`}><Icone nom="poubelle" taille={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {creation && <Creation fermer={() => { setCreation(false); charger(); }} />}
      {suppression && <Suppression org={suppression} fermer={() => { setSuppression(null); charger(); }} />}
    </div>
  );
}

function Creation({ fermer }: { fermer: () => void }) {
  const [nom, setNom] = useState('');
  const [adminNom, setAdminNom] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [erreur, setErreur] = useState('');
  const [mdp, setMdp] = useState<string | null>(null);
  const envoyer = async (e: FormEvent) => {
    e.preventDefault();
    try { setMdp((await api.post<{ motDePasseTemporaire: string }>('/plateforme/organisations', { nom, adminNom, adminEmail })).motDePasseTemporaire); }
    catch (err) { setErreur((err as Error).message); }
  };
  if (mdp) {
    return (
      <Modale titre="Organisation créée" fermer={fermer}>
        <p>Transmettez à <strong>{adminNom}</strong> son mot de passe temporaire (à changer à la première connexion) :</p>
        <div className="secret">{mdp}</div>
        <div className="actions">
          <button className="btn" onClick={() => copier(`${location.origin}\nIdentifiant : ${adminEmail}\nMot de passe temporaire : ${mdp}`, 'Identifiants copiés')}><Icone nom="copier" taille={18} />Copier</button>
          <button className="btn btn-jaune" onClick={fermer}>Terminé</button>
        </div>
      </Modale>
    );
  }
  return (
    <Modale titre="Nouvelle organisation" fermer={fermer}>
      <form className="empile" onSubmit={envoyer}>
        {erreur && <div className="erreur-form">{erreur}</div>}
        <label className="champ"><span>Nom de l'organisation</span><input className="saisie" value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={80} /></label>
        <label className="champ"><span>Nom du premier administrateur</span><input className="saisie" value={adminNom} onChange={(e) => setAdminNom(e.target.value)} required maxLength={60} /></label>
        <label className="champ"><span>Son e-mail</span><input className="saisie" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required /></label>
        <button className="btn btn-jaune btn-large">Créer</button>
      </form>
    </Modale>
  );
}

function Suppression({ org, fermer }: { org: Org; fermer: () => void }) {
  const [confirmation, setConfirmation] = useState('');
  return (
    <Modale titre="Supprimer l'organisation ?" fermer={fermer}>
      <p>Les <strong>{org.membres} comptes</strong>, leur historique et les défis maison de <strong>{org.name}</strong> seront définitivement effacés.</p>
      <label className="champ"><span>Recopiez « {org.name} » pour confirmer</span><input className="saisie" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
      <div className="actions">
        <button className="btn" onClick={fermer}>Annuler</button>
        <button className="btn btn-rouge" disabled={confirmation !== org.name} onClick={async () => {
          try { await api.del(`/plateforme/organisations/${org.id}`, { confirmation }); toast('Organisation supprimée'); fermer(); } catch (e) { toast((e as Error).message); }
        }}>Supprimer</button>
      </div>
    </Modale>
  );
}
