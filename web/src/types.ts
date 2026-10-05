export type Role = 'superadmin' | 'admin' | 'learner';
export type Couleur = 'jaune' | 'orange' | 'vert' | 'bleu' | 'rouge' | 'rose';

export interface Niveau { niveau: number; xpNiveau: number; xpPalier: number; grade: string }

export interface Moi extends Niveau {
  id: number; nom: string; email: string; role: Role; avatar: string; son: boolean;
  doitChangerMotDePasse: boolean; xp: number; serie: number; meilleureSerie: number; actifAujourdHui: boolean;
  badges: number;
  organisation: { id: number; nom: string } | null;
  objectif: { fait: number; cible: number } | null;
}

export interface NoeudLecon { id: string; titre: string; unite: string; nbQuestions: number; etoiles: number; reussie: boolean; ouverte: boolean }
export interface Parcours { id: string; titre: string; description: string; couleur: Couleur; icone: string; defi: boolean; lecons: NoeudLecon[]; faites: number; total: number }

export type Support =
  | { type: 'email'; de: string; objet: string; corps: string; lien?: string }
  | { type: 'sms'; de: string; corps: string }
  | { type: 'url'; url: string };

export interface QuestionPublique { id: string; type: 'unique' | 'multiple'; enonce: string; choix: string[]; support?: Support; nbReponses: number }
export interface Question extends Omit<QuestionPublique, 'nbReponses'> { reponse: number | number[]; explication: string }

export interface Partie {
  partie: string;
  lecon: { id: string; titre: string; parcours: string; couleur: Couleur; dejaReussie: boolean };
  boucliers: number;
  questions: QuestionPublique[];
}
export interface Correction { correct: boolean; reponse: number | number[]; explication: string; boucliers: number; compromis: boolean; termine: boolean }

export interface Badge { id: string; nom: string; description: string; icone: string; obtenu?: string | null; partOrganisation?: number }

export interface Bilan {
  echec: boolean; correct: number; total: number; dureeMs: number; etoiles: number;
  xp: { gagne: number; lignes: { cle: string; libelle: string; xp: number }[] };
  meilleurCombo: number;
  niveauAvant: Niveau; niveauApres: Niveau; montee: boolean;
  serie: number; serieProlongee: boolean;
  badges: Badge[];
  classement: { avant: number | null; apres: number | null; depasses: string[]; total: number };
  objectif: { fait: number; cible: number };
}

export interface Joueur extends Niveau { rang: number; id: number; nom: string; avatar: string; xp: number; serie: number; xpPeriode: number; moi: boolean }
export interface LigneLecon { rang: number; id: number; nom: string; avatar: string; correct: number; total: number; dureeMs: number; etoiles: number; niveau: number; moi: boolean }
