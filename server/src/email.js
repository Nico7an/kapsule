import nodemailer from 'nodemailer';

const env = process.env;

export function creerTransporteur() {
  const host = env.SMTP_HOST || 'ssl0.ovh.net';
  const port = Number(env.SMTP_PORT || 465);
  const user = env.SMTP_EMAIL || env.SMTP_USER || '';
  const pass = env.SMTP_PASSWORD || env.SMTP_PASS || '';
  const secure = env.SMTP_SECURE ? env.SMTP_SECURE === '1' || env.SMTP_SECURE === 'true' : port === 465;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
}

let transporteur = creerTransporteur();

/** Re-crée le transporteur si les variables changent. */
export function reconfigurerTransporteur() {
  transporteur = creerTransporteur();
}

/** Formate le code 123456 en "123 456" pour une lisibilité maximale. */
export const formaterCode = (code) => {
  const s = String(code).trim();
  return s.length === 6 ? `${s.slice(0, 3)} ${s.slice(3)}` : s;
};

/** Gabarit HTML pour les e-mails transactionnels Cyber. */
function gabaritHtml({ preheader, badge, titre, paragraphe, code, ctaUrl, ctaTexte, noteSecurite }) {
  const codeFormate = formaterCode(code);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .conteneur { max-width: 560px; margin: 32px auto; padding: 0 16px; }
    .carte { background: #FFFFFF; border: 3px solid #111215; border-radius: 20px; box-shadow: 0 8px 0 #111215; overflow: hidden; }
    .banniere { background: #FFDE38; border-bottom: 3px solid #111215; padding: 22px 28px; text-align: left; }
    .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; color: #111215; text-decoration: none; text-transform: uppercase; }
    .corps { padding: 32px 28px; color: #111215; }
    .badge { display: inline-block; padding: 4px 12px; background: #111215; color: #FFDE38; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border-radius: 8px; margin-bottom: 16px; }
    h1 { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; margin: 0 0 14px; }
    p { font-size: 16px; line-height: 1.5; color: #2B2E35; margin: 0 0 20px; }
    .boite-code { background: #FFF9D2; border: 3px solid #111215; border-radius: 14px; padding: 20px; text-align: center; margin: 24px 0; box-shadow: 0 4px 0 #111215; }
    .libelle-code { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #585D6B; margin-bottom: 8px; }
    .code-chiffres { font-family: 'JetBrains Mono', SFMono-Regular, Consolas, Menlo, monospace; font-size: 38px; font-weight: 900; letter-spacing: 0.22em; color: #111215; margin: 0; }
    .bouton { display: inline-block; background: #FFDE38; color: #111215; border: 3px solid #111215; border-radius: 12px; padding: 14px 28px; font-size: 16px; font-weight: 800; text-decoration: none; box-shadow: 0 4px 0 #111215; text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 20px; }
    .securite { background: #F8F9FA; border-left: 4px solid #111215; padding: 12px 16px; font-size: 13.5px; color: #585D6B; line-height: 1.45; border-radius: 0 8px 8px 0; margin-top: 24px; }
    .pied { text-align: center; padding: 24px; font-size: 12.5px; color: #767B8A; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader || titre}
  </div>
  <div class="conteneur">
    <div class="carte">
      <div class="banniere">
        <span class="logo">🛡️ Cyber</span>
      </div>
      <div class="corps">
        ${badge ? `<div class="badge">${badge}</div>` : ''}
        <h1>${titre}</h1>
        <div>${paragraphe}</div>
        
        <div class="boite-code">
          <div class="libelle-code">Votre code temporaire (15 min)</div>
          <div class="code-chiffres">${codeFormate}</div>
        </div>

        ${ctaUrl && ctaTexte ? `
        <div style="text-align: center;">
          <a href="${ctaUrl}" class="bouton" target="_blank">${ctaTexte} →</a>
        </div>
        ` : ''}

        <div class="securite">
          🔒 <strong>Sécurité</strong> : ${noteSecurite || 'Ce code est strictement confidentiel et expire dans 15 minutes. Si vous n\'êtes pas à l\'origine de cette demande, vous pouvez ignorer cet e-mail.'}
        </div>
      </div>
    </div>
    <div class="pied">
      <p style="margin: 0; font-size: 12.5px; color: #767B8A;">
        Plateforme d'entraînement Cyber · Sensibilisation interactive et ludique
      </p>
    </div>
  </div>
</body>
</html>`;
}

/** Envoie un e-mail transactionnel avec secours console si SMTP non configuré. */
export async function envoyerMail({ a, sujet, html, texte }) {
  const de = env.SMTP_FROM || `"Cyber" <${env.SMTP_EMAIL || 'no-reply@krateos.fr'}>`;

  if (!transporteur) {
    console.log(`\n==================================================`);
    console.log(`[EMAIL NON-SMTP] Destinataire: ${a}`);
    console.log(`[EMAIL NON-SMTP] Sujet: ${sujet}`);
    console.log(`[EMAIL NON-SMTP] Contenu texte:\n${texte}`);
    console.log(`==================================================\n`);
    return { ok: true, dev: true };
  }

  try {
    const info = await transporteur.sendMail({
      from: de,
      to: a,
      subject: sujet,
      text: texte,
      html: html,
    });
    console.log(`E-mail envoyé à ${a} (${info.messageId})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Erreur d'envoi d'e-mail à ${a}:`, err.message);
    // On logue également le contenu texte en secours console pour ne jamais bloquer l'utilisateur
    console.log(`[SECOURS EMAIL] Code pour ${a}:\n${texte}`);
    return { ok: false, erreur: err.message };
  }
}

/** Envoi d'un code OTP de connexion. */
export async function envoyerCodeConnexion({ email, prenom, code, lienConnexion }) {
  const codeFormate = formaterCode(code);
  const titre = `Bonjour ${prenom || ' !'}`;
  const paragraphe = `<p>Voici votre code de connexion sécurisé pour accéder à votre espace <strong>Cyber</strong>.</p><p>Aucun mot de passe requis : saisissez le code ci-dessous sur l'écran de connexion ou cliquez directement sur le bouton.</p>`;
  const preheader = `Votre code de connexion Cyber est ${codeFormate}`;

  const html = gabaritHtml({
    preheader,
    badge: 'Connexion sécurisée',
    titre,
    paragraphe,
    code,
    ctaUrl: lienConnexion,
    ctaTexte: 'Se connecter en un clic',
    noteSecurite: 'Ce code à usage unique expire dans 15 minutes. Ne le transmettez à personne.',
  });

  const texte = `Bonjour ${prenom || ''},\n\nVoici votre code de connexion à Cyber : ${codeFormate}\n\nCe code expire dans 15 minutes.\nLien direct : ${lienConnexion || 'https://cyber.nico7an.fr'}\n`;

  return envoyerMail({
    a: email,
    sujet: `Votre code de connexion Cyber : ${codeFormate}`,
    html,
    texte,
  });
}

/** Envoi d'une invitation par un administrateur. */
export async function envoyerInvitationMembre({ email, nom, organisation, invitePar, code, lienConnexion }) {
  const codeFormate = formaterCode(code);
  const titre = `Bienvenue dans l'équipe ${organisation} !`;
  const paragraphe = `
    <p><strong>${invitePar || 'Votre administrateur'}</strong> vous a invité à rejoindre l'espace <strong>${organisation}</strong> sur <strong>Cyber</strong>.</p>
    <p>Rejoignez vos collègues pour tester vos réflexes face aux pièges informatiques (phishing, mots de passe, fuites de données) à travers de courtes sessions de 3 minutes.</p>
    <p>Pour votre première connexion, utilisez le code temporaire ci-dessous :</p>
  `;
  const preheader = `${invitePar || 'Votre équipe'} vous a invité sur Cyber. Votre code d'accès : ${codeFormate}`;

  const html = gabaritHtml({
    preheader,
    badge: 'Invitation d\'équipe',
    titre,
    paragraphe,
    code,
    ctaUrl: lienConnexion,
    ctaTexte: 'Rejoindre mon organisation',
    noteSecurite: 'Pas de mot de passe à créer ! Vos futures connexions se feront directement par code envoyé sur cet e-mail.',
  });

  const texte = `Bonjour ${nom},\n\n${invitePar || 'Un administrateur'} vous invite à rejoindre ${organisation} sur Cyber.\n\nVotre code d'accès : ${codeFormate}\nAccéder à la plateforme : ${lienConnexion || 'https://cyber.nico7an.fr'}\n`;

  return envoyerMail({
    a: email,
    sujet: `${invitePar || 'Invitation'} vous a invité à rejoindre ${organisation} sur Cyber`,
    html,
    texte,
  });
}

/** Envoi d'un e-mail de bienvenue lors de la création d'une nouvelle organisation. */
export async function envoyerBienvenueAdmin({ email, nom, organisation, code, lienConnexion }) {
  const codeFormate = formaterCode(code);
  const titre = `Votre organisation ${organisation} est prête !`;
  const paragraphe = `
    <p>Bonjour <strong>${nom}</strong>,</p>
    <p>L'espace <strong>${organisation}</strong> a été créé avec succès sur la plateforme <strong>Cyber</strong>.</p>
    <p>En tant qu'administrateur, vous pouvez dès à présent inviter vos équipes, suivre les statistiques de progression et créer vos propres défis personnalisés.</p>
    <p>Voici votre code pour vous connecter à votre tableau de bord :</p>
  `;
  const preheader = `Votre espace ${organisation} est créé. Votre code de connexion : ${codeFormate}`;

  const html = gabaritHtml({
    preheader,
    badge: 'Espace Administrateur',
    titre,
    paragraphe,
    code,
    ctaUrl: lienConnexion,
    ctaTexte: 'Accéder au tableau de bord',
    noteSecurite: 'Conservez cet accès précieusement. Les futures connexions s\'effectueront avec un nouveau code envoyé sur cet e-mail.',
  });

  const texte = `Bonjour ${nom},\n\nVotre espace ${organisation} sur Cyber est créé.\nVotre code de connexion administrateur : ${codeFormate}\nLien direct : ${lienConnexion || 'https://cyber.nico7an.fr'}\n`;

  return envoyerMail({
    a: email,
    sujet: `Bienvenue sur Cyber · Votre espace ${organisation} est prêt`,
    html,
    texte,
  });
}

/** Envoi du code de confirmation pour rejoindre via lien public d'invitation. */
export async function envoyerCodeRejoindre({ email, prenom, organisation, code }) {
  const codeFormate = formaterCode(code);
  const titre = `Confirmez votre inscription à ${organisation}`;
  const paragraphe = `
    <p>Bonjour ${prenom || ''},</p>
    <p>Vous êtes sur le point de rejoindre l'organisation <strong>${organisation}</strong> sur Cyber.</p>
    <p>Entrez le code de vérification ci-dessous pour confirmer votre adresse et démarrer votre première leçon :</p>
  `;
  const preheader = `Votre code de validation Cyber : ${codeFormate}`;

  const html = gabaritHtml({
    preheader,
    badge: 'Confirmation d\'inscription',
    titre,
    paragraphe,
    code,
    noteSecurite: 'Ce code expire dans 15 minutes. Si vous n\'avez pas demandé à rejoindre cette organisation, ignorez cet e-mail.',
  });

  const texte = `Bonjour ${prenom || ''},\n\nVotre code pour rejoindre ${organisation} sur Cyber est : ${codeFormate}\nIl expire dans 15 minutes.\n`;

  return envoyerMail({
    a: email,
    sujet: `Code de validation Cyber : ${codeFormate}`,
    html,
    texte,
  });
}
