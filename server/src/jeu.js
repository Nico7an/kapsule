// Règles du jeu : XP, niveaux, rangs, séries quotidiennes et badges.
// Tout est calculé ici, côté serveur, pour que les classements soient fiables.

export const BOUCLIERS = 3; // erreurs tolérées avant l’échec de la leçon (« plus de vies » à l’écran)

// --- Calendrier (Europe/Paris) -----------------------------------------------

const fmtJour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
const fmtHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' });

/** Jour local « AAAA-MM-JJ ». */
export const jourLocal = (d = new Date()) => fmtJour.format(d);
export const heureLocale = (d = new Date()) => Number(fmtHeure.formatToParts(d).find((p) => p.type === 'hour').value);

export function decalerJour(jour, n) {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine du jour donné (semaine ISO). */
export function lundi(jour = jourLocal()) {
  const d = new Date(`${jour}T12:00:00Z`);
  const decalage = (d.getUTCDay() + 6) % 7;
  return decalerJour(jour, -decalage);
}

/**
 * Instant UTC correspondant à minuit, heure de Paris, du jour donné — pour
 * comparer avec les horodatages ISO stockés en base.
 */
export function minuitParisUTC(jour) {
  // Paris est à UTC+1 ou UTC+2 : on teste les deux et on garde celui qui tombe
  // bien sur ce jour à 0 h.
  for (const h of [22, 23]) {
    const d = new Date(`${decalerJour(jour, -1)}T${h}:00:00Z`);
    if (jourLocal(d) === jour && heureLocale(d) === 0) return d.toISOString().slice(0, 19) + 'Z';
  }
  return `${jour}T00:00:00Z`;
}

/** Série affichée : elle tombe à 0 si la dernière activité date d'avant-hier. */
export function serieEffective(user, aujourdHui = jourLocal()) {
  if (!user.last_active_day) return 0;
  if (user.last_active_day >= decalerJour(aujourdHui, -1)) return user.streak;
  return 0;
}

export function nouvelleSerie(user, aujourdHui = jourLocal()) {
  if (user.last_active_day === aujourdHui) return user.streak || 1;
  if (user.last_active_day === decalerJour(aujourdHui, -1)) return user.streak + 1;
  return 1;
}

// --- Niveaux et rangs -----------------------------------------------------------

/** XP total nécessaire pour atteindre le niveau n (n ≥ 1). */
export const xpPourNiveau = (n) => 50 * n * (n - 1);

export function niveau(xp) {
  let n = 1;
  while (xpPourNiveau(n + 1) <= xp) n++;
  const debut = xpPourNiveau(n);
  const fin = xpPourNiveau(n + 1);
  return { niveau: n, xpNiveau: xp - debut, xpPalier: fin - debut, grade: rang(n) };
}

export const RANGS = [
  { min: 1, nom: 'Curieux' },
  { min: 4, nom: 'Initié' },
  { min: 7, nom: 'Connaisseur' },
  { min: 10, nom: 'Spécialiste' },
  { min: 14, nom: 'Expert' },
  { min: 18, nom: 'Légende' },
];

export function rang(n) {
  let r = RANGS[0];
  for (const x of RANGS) if (n >= x.min) r = x;
  return r.nom;
}

// --- XP d'une partie ----------------------------------------------------------------

/**
 * @param {{ resultats: boolean[], dureeMs: number, echec: boolean, dejaReussie: boolean }} p
 *   resultats : première réponse de chaque question, dans l'ordre de passage.
 */
export function calculerXp({ resultats, dureeMs, echec, dejaReussie }) {
  const lignes = [];
  const bonnes = resultats.filter(Boolean).length;
  if (bonnes) lignes.push({ cle: 'reponses', libelle: `${bonnes} bonne${bonnes > 1 ? 's' : ''} réponse${bonnes > 1 ? 's' : ''}`, xp: bonnes * 10 });

  // Combo : à partir de 3 bonnes réponses d'affilée, +3 par réponse supplémentaire.
  let suite = 0, combo = 0, meilleurCombo = 0;
  for (const ok of resultats) {
    suite = ok ? suite + 1 : 0;
    meilleurCombo = Math.max(meilleurCombo, suite);
    if (suite >= 3) combo += 3;
  }
  if (combo) lignes.push({ cle: 'combo', libelle: `Combo ×${meilleurCombo}`, xp: combo });

  if (!echec && resultats.length && bonnes === resultats.length) {
    lignes.push({ cle: 'parfait', libelle: 'Sans faute', xp: 20 });
  }
  if (!echec && resultats.length && dureeMs / resultats.length < 9000) {
    lignes.push({ cle: 'rapide', libelle: 'Réflexes éclair', xp: 10 });
  }

  let total = lignes.reduce((s, l) => s + l.xp, 0);
  if (echec) {
    // Une partie perdue rapporte quand même un peu : on récompense l'effort.
    total = Math.min(total, 10);
    lignes.length = 0;
    if (total) lignes.push({ cle: 'effort', libelle: 'Effort récompensé', xp: total });
  } else if (dejaReussie) {
    const avant = total;
    total = Math.ceil(total / 2);
    lignes.push({ cle: 'revision', libelle: 'Révision (XP ÷ 2)', xp: total - avant });
  }
  return { total, lignes, meilleurCombo };
}

/** Étoiles d'une leçon : 1 = terminée, 2 = ≥ 80 %, 3 = sans faute. */
export function etoiles(correct, total, echec) {
  if (echec || !total) return 0;
  if (correct === total) return 3;
  if (correct / total >= 0.8) return 2;
  return 1;
}

// --- Badges ---------------------------------------------------------------------------

export const BADGES = [
  { id: 'premier-pas', nom: 'Premier pas', description: 'Terminer sa première leçon', icone: 'pied' },
  { id: 'sans-faute', nom: 'Sans faute', description: 'Réussir une leçon sans aucune erreur', icone: 'cible' },
  { id: 'eclair', nom: 'Éclair', description: 'Une leçon sans faute en moins de 45 secondes', icone: 'eclair' },
  { id: 'combo-5', nom: 'Combo ×5', description: 'Cinq bonnes réponses d\'affilée', icone: 'combo' },
  { id: 'serie-3', nom: 'Sur la lancée', description: '3 jours d\'affilée', icone: 'flamme' },
  { id: 'serie-7', nom: 'Semaine blindée', description: '7 jours d\'affilée', icone: 'flamme' },
  { id: 'serie-30', nom: 'Inarrêtable', description: '30 jours d\'affilée', icone: 'flamme' },
  { id: 'xp-500', nom: '500 XP', description: 'Cumuler 500 XP', icone: 'gemme' },
  { id: 'xp-2000', nom: '2 000 XP', description: 'Cumuler 2 000 XP', icone: 'gemme' },
  { id: 'xp-5000', nom: '5 000 XP', description: 'Cumuler 5 000 XP', icone: 'gemme' },
  { id: 'parcours', nom: 'Parcours bouclé', description: 'Terminer toutes les leçons d\'un parcours', icone: 'drapeau' },
  { id: 'tous-parcours', nom: 'Couteau suisse', description: 'Terminer tous les parcours communs', icone: 'trophee' },
  { id: 'resilient', nom: 'Résilient', description: 'Réussir une leçon après l\'avoir ratée', icone: 'muscle' },
  { id: 'noctambule', nom: 'Noctambule', description: 'Jouer entre 22 h et 5 h', icone: 'lune' },
  { id: 'leve-tot', nom: 'Lève-tôt', description: 'Jouer avant 7 h', icone: 'soleil' },
  { id: 'en-tete', nom: 'En tête', description: 'Prendre la 1re place du classement de la semaine', icone: 'couronne' },
];

/**
 * Badges nouvellement gagnés après une partie.
 * @param {object} ctx  état calculé par la route de fin de partie
 */
export function badgesGagnes(ctx, dejaObtenus) {
  const gagnes = [];
  const ajouter = (id) => { if (!dejaObtenus.has(id) && !gagnes.includes(id)) gagnes.push(id); };
  const { echec, correct, total, dureeMs, meilleurCombo, serie, xp, heure, parcoursTermine, tousParcours, dejaRatee, premierDeLaSemaine } = ctx;
  if (!echec) ajouter('premier-pas');
  if (!echec && correct === total) ajouter('sans-faute');
  if (!echec && correct === total && dureeMs < 45_000) ajouter('eclair');
  if (meilleurCombo >= 5) ajouter('combo-5');
  if (serie >= 3) ajouter('serie-3');
  if (serie >= 7) ajouter('serie-7');
  if (serie >= 30) ajouter('serie-30');
  if (xp >= 500) ajouter('xp-500');
  if (xp >= 2000) ajouter('xp-2000');
  if (xp >= 5000) ajouter('xp-5000');
  if (parcoursTermine) ajouter('parcours');
  if (tousParcours) ajouter('tous-parcours');
  if (!echec && dejaRatee) ajouter('resilient');
  if (heure >= 22 || heure < 5) ajouter('noctambule');
  if (heure >= 5 && heure < 7) ajouter('leve-tot');
  if (premierDeLaSemaine) ajouter('en-tete');
  return gagnes;
}

export const BONUS_BADGE = 25;
