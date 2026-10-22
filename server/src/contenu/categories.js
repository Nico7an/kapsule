// Catégories affichées sur la page « Apprendre », regroupées par famille.
// Chaque parcours du catalogue déclare sa catégorie (champ `categorie`) ;
// les défis maison d'une organisation tombent dans « defis ».
export const CATEGORIES = [
  { id: 'cyber', famille: 'Cybersécurité', titre: 'Cybersécurité', icone: 'bouclier' },

  { id: 'droit', famille: 'Droit des sociétés', titre: 'L’essentiel', icone: 'balance' },
  { id: 'avocat', famille: 'Droit des sociétés', titre: 'Avocats', icone: 'marteau' },
  { id: 'expert-comptable', famille: 'Droit des sociétés', titre: 'Experts-comptables', icone: 'calculatrice' },
  { id: 'juriste', famille: 'Droit des sociétés', titre: 'Juristes d’entreprise', icone: 'immeuble' },

  { id: 'dev', famille: 'Métiers de l’entreprise', titre: 'Développeurs', icone: 'code' },
  { id: 'devops', famille: 'Métiers de l’entreprise', titre: 'DevOps', icone: 'infini' },
  { id: 'marketing', famille: 'Métiers de l’entreprise', titre: 'Marketing', icone: 'megaphone' },
  { id: 'commercial', famille: 'Métiers de l’entreprise', titre: 'Commerciaux', icone: 'tendance' },
  { id: 'csm', famille: 'Métiers de l’entreprise', titre: 'Customer Success', icone: 'casque' },
  { id: 'cto', famille: 'Métiers de l’entreprise', titre: 'CTO', icone: 'puce' },
  { id: 'ceo', famille: 'Métiers de l’entreprise', titre: 'CEO', icone: 'boussole' },

  { id: 'dys', famille: 'Formation et inclusion', titre: 'Troubles dys', icone: 'livre' },
  { id: 'cfa', famille: 'Formation et inclusion', titre: 'CFA et apprentissage', icone: 'diplome' },

  { id: 'defis', famille: 'Mon organisation', titre: 'Défis maison', icone: 'crayon' },
];

export const CATEGORIE_DEFIS = 'defis';
