// Catalogue commun, partagé par toutes les organisations (org_id NULL en base).
// Il est réécrit en base à chaque démarrage : modifier ce fichier puis
// redéployer suffit à mettre le contenu à jour.
//
// Format d'une question :
//   { id, type: 'unique' | 'multiple', enonce, choix: string[],
//     reponse: index | index[], explication,
//     support?: { type: 'email', de, objet, corps, lien? }
//             | { type: 'sms', de, corps }
//             | { type: 'url', url } }
// Les ids de question doivent rester stables : les statistiques des admins
// (« questions les plus ratées ») s'appuient dessus.

import { DROIT } from './droit.js';
import { METIERS } from './metiers.js';
import { EXPERT } from './expert.js';
import { LEXIQUE } from './lexique.js';
import { FORMATION } from './formation.js';

const vraiFaux = (id, enonce, vrai, explication, support) => ({
  id, type: 'unique', enonce, choix: ['Vrai', 'Faux'], reponse: vrai ? 0 : 1, explication, ...(support ? { support } : {}),
});

const piege = (id, support, estPiege, explication, enonce = 'Ce message est-il légitime ?') => ({
  id, type: 'unique', enonce, choix: ['Légitime', 'Piège'], reponse: estPiege ? 1 : 0, explication, support,
});

const CYBER = [
  // ---------------------------------------------------------------------------
  {
    id: 'reflexes',
    titre: 'Les réflexes de base',
    description: 'Mots de passe, double authentification, mises à jour : le socle qui bloque l\'essentiel des attaques.',
    couleur: 'jaune',
    icone: 'cadenas',
    lecons: [
      {
        id: 'reflexes-mdp',
        unite: 'Unité 1 · Verrouiller ses comptes',
        titre: 'Des mots de passe solides',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Lequel de ces mots de passe est le plus résistant ?',
            choix: ['P@ssw0rd2024!', 'Marseille13', 'girafe-tambour-orage-citron', 'Azerty123$'],
            reponse: 2,
            explication: 'La longueur prime. Une phrase de passe de quatre mots au hasard est bien plus longue à casser qu\'un mot connu « décoré » de chiffres et de symboles, que les outils d\'attaque testent en premier.',
          },
          vraiFaux('q2', 'Réutiliser le même mot de passe « très fort » sur plusieurs sites ne pose pas de problème.', false,
            'Si un seul de ces sites se fait voler sa base, les attaquants testent automatiquement le couple e-mail / mot de passe partout ailleurs : c\'est le « credential stuffing ». Un mot de passe unique par service.'),
          {
            id: 'q3', type: 'unique',
            enonce: 'Quelle longueur minimale vise-t-on aujourd\'hui pour un mot de passe classique ?',
            choix: ['6 caractères', '8 caractères', '12 caractères', 'Peu importe s\'il contient un symbole'],
            reponse: 2,
            explication: 'On vise au moins 12 caractères mêlant plusieurs types, et davantage pour une phrase de passe. 8 caractères se cassent en quelques heures sur du matériel grand public.',
          },
          {
            id: 'q4', type: 'multiple',
            enonce: 'Quelles informations faut-il éviter dans un mot de passe ? (plusieurs réponses)',
            choix: ['Le prénom de son enfant', 'Sa date de naissance', 'Des mots tirés au hasard', 'Le nom de son équipe de foot'],
            reponse: [0, 1, 3],
            explication: 'Tout ce qu\'on peut trouver sur vos réseaux sociaux est testé en priorité. Des mots tirés au hasard, sans lien avec vous, n\'ont pas ce défaut.',
          },
          vraiFaux('q5', 'Le service informatique peut légitimement vous demander votre mot de passe par e-mail pour « vérifier votre compte ».', false,
            'Jamais. Un administrateur n\'a pas besoin de votre mot de passe pour intervenir sur votre compte. Une telle demande est un signe d\'hameçonnage.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'Vous apprenez que le site d\'une boutique où vous avez un compte a été piraté. Premier réflexe ?',
            choix: ['Attendre un e-mail de la boutique', 'Changer ce mot de passe, et partout où il était réutilisé', 'Supprimer l\'application de son téléphone', 'Rien, ce n\'est qu\'une boutique'],
            reponse: 1,
            explication: 'Changez-le tout de suite, ainsi que sur les autres comptes qui l\'utilisaient. Le site haveibeenpwned.com permet de vérifier si votre adresse figure dans une fuite connue.',
          },
        ],
      },
      {
        id: 'reflexes-mfa',
        unite: 'Unité 1 · Verrouiller ses comptes',
        titre: 'Gestionnaire et double authentification',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Quel est le principal avantage d\'un gestionnaire de mots de passe ?',
            choix: ['Il rend les mots de passe inutiles', 'Il permet un mot de passe long et unique par site sans avoir à les retenir', 'Il empêche tout piratage', 'Il remplace l\'antivirus'],
            reponse: 1,
            explication: 'Vous ne retenez plus qu\'un seul mot de passe maître, très solide ; le gestionnaire génère et remplit les autres. Il refuse aussi de remplir le formulaire d\'un faux site, ce qui aide contre l\'hameçonnage.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'La double authentification (MFA), c\'est…',
            choix: ['Taper deux fois son mot de passe', 'Prouver son identité avec deux éléments de nature différente', 'Avoir deux comptes', 'Changer de mot de passe tous les mois'],
            reponse: 1,
            explication: 'Quelque chose que vous savez (mot de passe) + quelque chose que vous possédez (téléphone, clé de sécurité) ou que vous êtes (empreinte). Un mot de passe volé ne suffit alors plus.',
          },
          {
            id: 'q3', type: 'unique',
            enonce: 'Il est 23 h. Votre téléphone affiche une demande de validation de connexion que vous n\'avez pas initiée. Que faites-vous ?',
            choix: ['Je valide pour qu\'elle arrête de sonner', 'Je refuse, puis je change mon mot de passe et je préviens l\'informatique', 'Je l\'ignore', 'J\'éteins mon téléphone'],
            reponse: 1,
            explication: 'Quelqu\'un a votre mot de passe et tente d\'entrer. Les attaquants envoient des rafales de demandes en espérant une validation par lassitude (« MFA fatigue »). Refuser ne suffit pas : le mot de passe est compromis.',
          },
          {
            id: 'q4', type: 'unique',
            enonce: 'Parmi ces seconds facteurs, lequel résiste le mieux à l\'hameçonnage ?',
            choix: ['Code reçu par SMS', 'Code d\'une application d\'authentification', 'Clé de sécurité physique (FIDO2) ou passkey', 'Question secrète'],
            reponse: 2,
            explication: 'Une clé FIDO2 ou une passkey vérifie l\'adresse réelle du site : elle ne répond tout simplement pas sur un faux site. Les codes, eux, peuvent être recopiés par l\'attaquant en temps réel. Ils restent bien mieux que rien.',
          },
          vraiFaux('q5', 'Si vous utilisez un gestionnaire de mots de passe, son mot de passe maître doit être le plus solide de tous et protégé par la double authentification.', true,
            'C\'est la clé du coffre : une longue phrase de passe que vous n\'utilisez nulle part ailleurs, plus un second facteur.'),
          vraiFaux('q6', 'Un collègue vous lit au téléphone le code à 6 chiffres qu\'il vient de recevoir « par erreur » en vous demandant de le confirmer. C\'est sans risque.', false,
            'C\'est une arnaque classique : l\'attaquant tente de se connecter à votre compte et a besoin du code qui vient de vous être envoyé. Un code de vérification ne se communique jamais.'),
        ],
      },
      {
        id: 'reflexes-maj',
        unite: 'Unité 2 · Entretenir ses équipements',
        titre: 'Mises à jour et sauvegardes',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Pourquoi faut-il installer rapidement les mises à jour de sécurité ?',
            choix: ['Pour avoir les nouvelles fonctions', 'Parce qu\'elles corrigent des failles que les attaquants connaissent dès leur publication', 'Pour libérer de l\'espace disque', 'Ce n\'est pas urgent'],
            reponse: 1,
            explication: 'Dès qu\'un correctif sort, les attaquants l\'étudient pour comprendre la faille et visent les machines qui ne l\'ont pas encore installé. Le délai compte.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'En naviguant, une fenêtre surgit : « Votre Flash Player est obsolète, cliquez ici pour le mettre à jour ». Que faites-vous ?',
            choix: ['Je clique, c\'est pour ma sécurité', 'Je ferme la page : les mises à jour passent par le système ou le magasin d\'applications', 'Je télécharge mais je n\'installe pas', 'Je redémarre l\'ordinateur'],
            reponse: 1,
            explication: 'Les fausses mises à jour sont un moyen courant de diffuser des logiciels malveillants. Les vraies passent par les mécanismes officiels (Windows Update, App Store, service informatique). Flash n\'existe d\'ailleurs plus depuis 2020.',
          },
          {
            id: 'q3', type: 'unique',
            enonce: 'La règle des sauvegardes « 3-2-1 », c\'est :',
            choix: ['3 sauvegardes par jour, 2 par semaine, 1 par mois', '3 copies des données, sur 2 supports différents, dont 1 hors site ou hors ligne', '3 mots de passe, 2 facteurs, 1 coffre', '3 disques durs en même temps'],
            reponse: 1,
            explication: 'La copie hors ligne est celle qui sauve face à un rançongiciel : ce qui est branché en permanence peut être chiffré en même temps que le reste.',
          },
          vraiFaux('q4', 'Une sauvegarde qu\'on n\'a jamais essayé de restaurer est une sauvegarde fiable.', false,
            'Beaucoup d\'entreprises découvrent le jour de l\'incident que leurs sauvegardes étaient incomplètes ou illisibles. Tester la restauration fait partie de la sauvegarde.'),
          vraiFaux('q5', 'Un ordinateur ou un téléphone qui ne reçoit plus de mises à jour de sécurité devrait être remplacé ou retiré du réseau.', true,
            'Les failles découvertes après la fin du support ne seront jamais corrigées. L\'appareil devient une porte d\'entrée durable.'),
          {
            id: 'q6', type: 'multiple',
            enonce: 'Qu\'est-ce qui doit être mis à jour ? (plusieurs réponses)',
            choix: ['Le système d\'exploitation', 'Le navigateur et ses extensions', 'Le routeur ou la box', 'Les applications du téléphone'],
            reponse: [0, 1, 2, 3],
            explication: 'Tout ce qui exécute du code peut avoir des failles, y compris la box et les extensions de navigateur, souvent oubliées.',
          },
        ],
      },
      {
        id: 'reflexes-defi',
        unite: 'Unité 2 · Entretenir ses équipements',
        titre: 'Défi : les bons réflexes',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Votre navigateur propose d\'enregistrer le mot de passe de la messagerie professionnelle sur votre ordinateur personnel. La meilleure réponse ?',
            choix: ['Oui, c\'est pratique', 'Non : on évite de mélanger comptes pros et équipements persos', 'Oui, si l\'ordinateur a un antivirus', 'Seulement le week-end'],
            reponse: 1,
            explication: 'Un ordinateur personnel est rarement aussi protégé qu\'un poste géré par l\'entreprise, et il est souvent partagé. Utilisez les outils fournis par votre organisation.',
          },
          vraiFaux('q2', 'Un antivirus à jour dispense de faire attention aux pièces jointes.', false,
            'Les antivirus ne détectent pas tout, en particulier les attaques récentes ou ciblées. Votre vigilance reste la première barrière.'),
          {
            id: 'q3', type: 'unique',
            enonce: 'Le mot de passe « Ete2025! » respecte la politique de votre entreprise (majuscule, chiffre, symbole). Est-il bon ?',
            choix: ['Oui, il coche toutes les cases', 'Non : saison + année + point d\'exclamation est l\'un des schémas les plus testés', 'Oui, s\'il est changé chaque été', 'Oui, car il est court donc facile à retenir'],
            reponse: 1,
            explication: 'Les attaquants connaissent ces habitudes et testent en priorité « Saison+Année+! ». Respecter les règles n\'est pas suffisant : visez la longueur et l\'imprévisibilité.',
          },
          {
            id: 'q4', type: 'unique',
            enonce: 'Quel compte protéger en priorité avec la double authentification ?',
            choix: ['Le compte de la boulangerie en ligne', 'La messagerie : elle permet de réinitialiser tous les autres', 'Un forum de jardinage', 'Aucun'],
            reponse: 1,
            explication: 'Qui contrôle votre messagerie peut cliquer sur « mot de passe oublié » partout. C\'est le compte le plus précieux.',
          },
          {
            id: 'q5', type: 'multiple',
            enonce: 'Lesquelles de ces pratiques sont de bons réflexes ? (plusieurs réponses)',
            choix: ['Verrouiller son téléphone avec un code', 'Noter ses mots de passe sur un post-it sous le clavier', 'Activer le chiffrement du disque', 'Désactiver les mises à jour automatiques pour ne pas être dérangé'],
            reponse: [0, 2],
            explication: 'Code de verrouillage et chiffrement protègent vos données en cas de perte ou de vol. Le post-it sous le clavier est le premier endroit où l\'on cherche.',
          },
          vraiFaux('q6', 'Se déconnecter de ses comptes sur un ordinateur partagé (hôtel, salle de réunion) est indispensable.', true,
            'Sinon, la personne suivante hérite de votre session. Préférez aussi la navigation privée sur ces postes.'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'hameconnage',
    titre: 'Hameçonnage & arnaques',
    description: 'E-mails piégés, faux liens, SMS et appels frauduleux : apprendre à flairer le piège.',
    couleur: 'orange',
    icone: 'hamecon',
    lecons: [
      {
        id: 'hameconnage-email',
        unite: 'Unité 1 · Flairer le piège',
        titre: 'Repérer un e-mail piégé',
        questions: [
          piege('q1', {
            type: 'email',
            de: 'Service Client <support@amazon-livraison-fr.info>',
            objet: 'Votre colis est bloqué – action requise sous 24h',
            corps: 'Bonjour,\n\nVotre colis n°FR-88213 n\'a pas pu être livré en raison de frais de douane impayés (1,99 €).\n\nSans régularisation sous 24 heures, il sera renvoyé à l\'expéditeur.',
            lien: 'Régler les frais maintenant',
          }, true, 'Domaine sans rapport avec la marque, urgence artificielle, petite somme pour obtenir vos coordonnées bancaires : tous les ingrédients d\'un hameçonnage.'),
          {
            id: 'q2', type: 'multiple',
            enonce: 'Quels signes doivent vous alerter dans un e-mail ? (plusieurs réponses)',
            choix: ['Une urgence ou une menace (« sous 24 h », « compte suspendu »)', 'Une adresse d\'expéditeur qui ne correspond pas à l\'organisation', 'Une demande d\'identifiants ou de paiement', 'Le logo officiel de l\'entreprise'],
            reponse: [0, 1, 2],
            explication: 'Le logo, n\'importe qui peut le copier : ce n\'est jamais une preuve. Urgence, expéditeur bizarre et demande sensible sont les vrais signaux.',
          },
          piege('q3', {
            type: 'email',
            de: 'Ressources Humaines <rh@votre-entreprise.fr>',
            objet: 'Planning des entretiens annuels',
            corps: 'Bonjour à tous,\n\nLe planning des entretiens annuels est disponible dans l\'espace RH habituel de l\'intranet. Merci de choisir un créneau avant la fin du mois.\n\nL\'équipe RH',
          }, false, 'Expéditeur interne cohérent, pas de lien ni de pièce jointe, aucune urgence, renvoi vers un outil que vous connaissez déjà : rien d\'anormal. Dans le doute, passez par l\'intranet vous-même plutôt que par un lien.'),
          {
            id: 'q4', type: 'unique',
            enonce: 'Vous recevez une facture en pièce jointe « Facture_0923.zip » d\'un fournisseur que vous ne connaissez pas. Que faites-vous ?',
            choix: ['Je l\'ouvre pour vérifier le montant', 'Je ne l\'ouvre pas et je la signale', 'Je la transfère à la comptabilité', 'Je l\'ouvre sur mon téléphone, c\'est plus sûr'],
            reponse: 1,
            explication: 'Les archives .zip et les documents Office demandant d\'« activer le contenu » sont des vecteurs de logiciels malveillants très courants. Ne la transférez pas non plus : vous propageriez le risque.',
          },
          vraiFaux('q5', 'Si l\'e-mail affiche le nom exact de votre directeur comme expéditeur, il vient forcément de lui.', false,
            'Le nom affiché se choisit librement. Seule l\'adresse réelle compte, et même elle peut être usurpée. En cas de demande inhabituelle, vérifiez par un autre canal.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'Vous avez cliqué sur un lien suspect et saisi votre mot de passe. Et maintenant ?',
            choix: ['Je n\'en parle à personne', 'Je change immédiatement mon mot de passe et je préviens le service informatique', 'J\'attends de voir s\'il se passe quelque chose', 'J\'éteins l\'ordinateur pour toujours'],
            reponse: 1,
            explication: 'Tout le monde peut se faire avoir. Ce qui compte, c\'est la vitesse de réaction : signaler tout de suite permet de couper l\'accès avant que l\'attaquant ne s\'en serve. Personne ne vous le reprochera.',
          },
        ],
      },
      {
        id: 'hameconnage-liens',
        unite: 'Unité 1 · Flairer le piège',
        titre: 'Lire une adresse web',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Quel est le vrai domaine de ce lien ?',
            support: { type: 'url', url: 'https://www.impots.gouv.fr.remboursement-dossier.com/connexion' },
            choix: ['impots.gouv.fr', 'remboursement-dossier.com', 'connexion', 'www.impots'],
            reponse: 1,
            explication: 'Le domaine se lit juste avant la première barre oblique « / », en partant de la droite : ici remboursement-dossier.com. Tout ce qui précède n\'est qu\'un décor choisi par l\'attaquant.',
          },
          piege('q2', { type: 'url', url: 'https://www.paypa1.com/signin' }, true,
            'Le « l » de PayPal a été remplacé par le chiffre « 1 ». Ces substitutions (rn pour m, 0 pour o…) sont faites pour tromper un œil pressé.', 'Ce lien mène-t-il au vrai site ?'),
          piege('q3', { type: 'url', url: 'https://www.service-public.fr/particuliers/vosdroits' }, false,
            'service-public.fr est bien le domaine officiel, juste avant la première barre oblique. Le chemin qui suit ne change rien.', 'Ce lien mène-t-il au vrai site ?'),
          vraiFaux('q4', 'Un cadenas dans la barre d\'adresse prouve que le site est légitime.', false,
            'Le cadenas indique seulement que la connexion est chiffrée. La grande majorité des sites d\'hameçonnage ont leur cadenas : le certificat est gratuit et s\'obtient en quelques secondes.'),
          {
            id: 'q5', type: 'unique',
            enonce: 'Comment voir où mène vraiment un lien dans un e-mail, sans cliquer ?',
            choix: ['On ne peut pas', 'Survoler le lien avec la souris (ou appui long sur mobile) et lire l\'adresse affichée', 'Le copier dans un moteur de recherche', 'Regarder la couleur du lien'],
            reponse: 1,
            explication: 'Le texte d\'un lien peut afficher une adresse et pointer vers une autre. Le survol révèle la destination réelle.',
          },
          piege('q6', { type: 'url', url: 'https://login.microsoftonline.com.secure-auth.app/oauth' }, true,
            'Le domaine réel est secure-auth.app. « login.microsoftonline.com » n\'est ici qu\'un sous-domaine trompeur.', 'Ce lien mène-t-il au vrai site ?'),
        ],
      },
      {
        id: 'hameconnage-sms',
        unite: 'Unité 2 · Au-delà de l\'e-mail',
        titre: 'SMS, appels et QR codes',
        questions: [
          piege('q1', {
            type: 'sms',
            de: '+33 7 56 12 98 04',
            corps: 'Ameli : votre nouvelle carte Vitale est disponible. Confirmez vos informations avant expiration : ameli-carte-renouv.fr',
          }, true, 'Numéro mobile ordinaire, lien vers un domaine qui n\'est pas ameli.fr, pression du délai : c\'est du « smishing ». En France, on transfère ces SMS au 33700.'),
          {
            id: 'q2', type: 'unique',
            enonce: 'Votre « conseiller bancaire » vous appelle : une opération suspecte est en cours, il faut valider une annulation dans votre appli. Que faites-vous ?',
            choix: ['Je valide pour bloquer la fraude', 'Je raccroche et je rappelle ma banque au numéro habituel', 'Je lui donne le code reçu par SMS', 'Je lui demande son prénom'],
            reponse: 1,
            explication: 'C\'est l\'arnaque au faux conseiller : la « validation » autorise en réalité un virement vers l\'escroc. Le numéro affiché peut être usurpé. Votre banque ne vous demandera jamais de valider une opération pour l\'annuler.',
          },
          {
            id: 'q3', type: 'unique',
            enonce: 'Sur un horodateur, un autocollant QR code propose de « payer plus vite ». Le risque ?',
            choix: ['Aucun, c\'est pratique', 'Un QR code collé par-dessus peut renvoyer vers un faux site de paiement', 'Le téléphone peut chauffer', 'La batterie se vide'],
            reponse: 1,
            explication: 'C\'est le « quishing ». Un QR code est un lien que l\'on ne peut pas lire à l\'œil nu. Vérifiez l\'adresse affichée avant d\'ouvrir, et méfiez-vous des autocollants rajoutés.',
          },
          piege('q4', {
            type: 'sms',
            de: 'Maman',
            corps: 'Coucou c\'est moi, j\'ai cassé mon téléphone, voici mon nouveau numéro. Tu peux me faire un virement urgent ? Je t\'explique après',
          }, true, 'L\'arnaque « Coucou maman / papa » : l\'escroc se fait passer pour un proche avec un nouveau numéro et réclame de l\'argent en urgence. Appelez l\'ancien numéro ou posez une question que seul le proche connaît.', 'Ce message est-il fiable ?'),
          vraiFaux('q5', 'Avec l\'IA, une voix au téléphone peut imiter celle d\'un proche ou d\'un dirigeant à partir de quelques secondes d\'enregistrement.', true,
            'Le clonage vocal est accessible à tous. Pour toute demande sensible par téléphone, convenez d\'un mot de passe familial ou rappelez sur un numéro connu.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'À qui transférer un SMS frauduleux en France ?',
            choix: ['Au 17', 'Au 33700', 'À l\'expéditeur, pour se plaindre', 'À tous ses contacts, pour les prévenir'],
            reponse: 1,
            explication: 'Le 33700 est le numéro gratuit de signalement des SMS et appels indésirables, utilisé par les opérateurs pour bloquer les numéros frauduleux.',
          },
        ],
      },
      {
        id: 'hameconnage-president',
        unite: 'Unité 2 · Au-delà de l\'e-mail',
        titre: 'Fraude au président et faux fournisseurs',
        questions: [
          piege('q1', {
            type: 'email',
            de: 'Claire Martin (PDG) <c.martin.direction@gmail.com>',
            objet: 'Confidentiel – opération en cours',
            corps: 'Bonjour,\n\nJe suis en réunion et ne peux pas être dérangée. Nous finalisons une acquisition strictement confidentielle. J\'ai besoin que vous effectuiez un virement de 48 500 € aujourd\'hui. N\'en parlez à personne pour le moment, je vous envoie l\'IBAN.\n\nClaire',
          }, true, 'Adresse personnelle, urgence, confidentialité imposée, demande de virement hors circuit : la « fraude au président » classique. On vérifie toujours par un autre canal, même si la demande semble venir de très haut.'),
          {
            id: 'q2', type: 'unique',
            enonce: 'Un fournisseur habituel écrit : « Nous avons changé de banque, voici notre nouvel IBAN pour les prochaines factures ». Que faire ?',
            choix: ['Mettre à jour l\'IBAN tout de suite', 'Appeler le fournisseur à un numéro déjà connu (pas celui de l\'e-mail) pour confirmer', 'Répondre à l\'e-mail pour demander confirmation', 'Payer sur les deux comptes par précaution'],
            reponse: 1,
            explication: 'Le compte e-mail du fournisseur a pu être piraté : répondre au message, c\'est demander confirmation à l\'escroc. Seul un contre-appel à un numéro connu fait foi.',
          },
          {
            id: 'q3', type: 'multiple',
            enonce: 'Quels éléments caractérisent la fraude au président ? (plusieurs réponses)',
            choix: ['Urgence', 'Secret demandé', 'Contournement des procédures habituelles', 'Facture accompagnée d\'un bon de commande validé'],
            reponse: [0, 1, 2],
            explication: 'L\'escroc isole sa cible (« n\'en parlez à personne ») et la presse pour l\'empêcher de suivre la procédure. Une demande conforme au circuit habituel est rassurante, pas l\'inverse.',
          },
          vraiFaux('q4', 'Si un dirigeant insiste et s\'agace, il vaut mieux exécuter la demande pour éviter les ennuis.', false,
            'La pression fait partie de la technique. Aucun dirigeant ne vous reprochera d\'avoir vérifié une demande de virement. Les procédures sont là pour vous protéger.'),
          {
            id: 'q5', type: 'unique',
            enonce: 'Dans un e-mail urgent, l\'adresse affichée est « direction@votre-entrepirse.fr ». Qu\'est-ce qui cloche ?',
            choix: ['Rien', 'Le domaine contient une faute (« entrepirse ») : c\'est un domaine imitant le vôtre', 'Le mot « direction »', 'Le « .fr »'],
            reponse: 1,
            explication: 'Les fraudeurs achètent des domaines quasi identiques au vôtre (typosquatting). Une lettre inversée passe facilement inaperçue.',
          },
          vraiFaux('q6', 'Mettre en place une double validation pour les virements importants ou les changements d\'IBAN réduit fortement ce risque.', true,
            'C\'est l\'une des mesures les plus efficaces : un escroc doit alors tromper deux personnes au lieu d\'une.'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'mobilite',
    titre: 'Bureau & mobilité',
    description: 'Wi-Fi public, clés USB, poste de travail laissé ouvert : la sécurité au quotidien, au bureau comme en déplacement.',
    couleur: 'vert',
    icone: 'valise',
    lecons: [
      {
        id: 'mobilite-wifi',
        unite: 'Unité 1 · En déplacement',
        titre: 'Wi-Fi public et réseaux',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'À la gare, deux réseaux s\'affichent : « SNCF_WIFI_INOUI » et « SNCF WiFi Gratuit ». Le risque ?',
            choix: ['Aucun', 'L\'un des deux peut être un faux point d\'accès créé par un attaquant', 'Le second est plus rapide', 'Les deux sont payants'],
            reponse: 1,
            explication: 'N\'importe qui peut créer un réseau Wi-Fi au nom rassurant (« evil twin »). Une fois connecté, l\'attaquant peut observer ou détourner votre trafic.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Quelle est la solution la plus sûre pour travailler en déplacement ?',
            choix: ['Le Wi-Fi gratuit du café', 'Le partage de connexion de son téléphone, ou le VPN de l\'entreprise', 'Le Wi-Fi de l\'hôtel sans mot de passe', 'Emprunter l\'ordinateur de l\'hôtel'],
            reponse: 1,
            explication: 'Le partage de connexion 4G/5G évite les réseaux inconnus ; le VPN de l\'entreprise chiffre tout le trafic, quel que soit le réseau.',
          },
          vraiFaux('q3', 'Sur un Wi-Fi public, on peut consulter sans risque ses comptes bancaires tant que le site est en HTTPS.', false,
            'HTTPS protège le contenu, mais un faux réseau peut vous rediriger vers un faux site ou exploiter une erreur d\'avertissement de certificat. Évitez les opérations sensibles sur un réseau que vous ne maîtrisez pas.'),
          {
            id: 'q4', type: 'unique',
            enonce: 'Votre navigateur affiche « Votre connexion n\'est pas privée » sur le site de la messagerie, depuis le Wi-Fi de l\'hôtel. Que faites-vous ?',
            choix: ['Je clique sur « Continuer quand même »', 'Je me déconnecte de ce réseau et je passe par mon téléphone', 'Je réessaie plus tard sur le même réseau', 'Je désactive l\'antivirus'],
            reponse: 1,
            explication: 'Cet avertissement sur un site que vous utilisez tous les jours est un signal fort d\'interception. Ne le contournez jamais.',
          },
          vraiFaux('q5', 'Il est préférable de désactiver la connexion automatique aux réseaux Wi-Fi connus.', true,
            'Un attaquant peut imiter le nom d\'un réseau que votre appareil connaît déjà (« Free_Wifi », « Starbucks ») pour qu\'il s\'y connecte tout seul.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'Dans le train, vous devez traiter un dossier confidentiel. Le meilleur réflexe ?',
            choix: ['Travailler normalement', 'Utiliser un filtre de confidentialité et éviter les appels sur des sujets sensibles', 'Agrandir l\'écran pour mieux lire', 'Imprimer le dossier'],
            reponse: 1,
            explication: 'Regard par-dessus l\'épaule et conversations entendues sont des fuites bien réelles. Un filtre écran coûte quelques euros.',
          },
        ],
      },
      {
        id: 'mobilite-usb',
        unite: 'Unité 1 · En déplacement',
        titre: 'Clés USB et périphériques',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Vous trouvez une clé USB étiquetée « Salaires 2025 » sur le parking. Que faites-vous ?',
            choix: ['Je la branche pour trouver son propriétaire', 'Je la remets au service informatique sans la brancher', 'Je la branche sur un ordinateur personnel', 'Je la garde'],
            reponse: 1,
            explication: 'Abandonner des clés piégées avec une étiquette attirante est une technique éprouvée. Une clé peut se faire passer pour un clavier et taper des commandes en quelques secondes.',
          },
          vraiFaux('q2', 'Un câble de recharge prêté par un inconnu est sans danger : il ne fait que charger.', false,
            'Il existe des câbles piégés, visuellement identiques aux vrais, capables de transmettre des données ou d\'injecter des commandes. Utilisez votre propre câble.'),
          {
            id: 'q3', type: 'unique',
            enonce: 'À l\'aéroport, vous devez recharger votre téléphone. Le plus sûr ?',
            choix: ['La prise USB du siège', 'Votre chargeur branché sur une prise électrique classique, ou une batterie externe', 'Le câble d\'un voisin', 'La borne de recharge sans fil'],
            reponse: 1,
            explication: 'Une prise USB publique peut transmettre des données (« juice jacking »). Une prise électrique ne transmet que du courant.',
          },
          {
            id: 'q4', type: 'unique',
            enonce: 'Un prestataire vous tend sa clé USB pour vous transmettre une présentation. La bonne réponse ?',
            choix: ['Je la branche tout de suite', 'Je lui propose plutôt un partage par l\'outil de l\'entreprise, ou je fais analyser la clé', 'Je la branche sur l\'ordinateur de la salle de réunion', 'Je copie tout son contenu'],
            reponse: 1,
            explication: 'Même de bonne foi, un prestataire peut avoir une clé infectée. Les outils de partage de l\'entreprise ou une station de décontamination évitent le problème.',
          },
          vraiFaux('q5', 'Une clé USB contenant des données de l\'entreprise devrait être chiffrée.', true,
            'Une clé se perd très facilement. Chiffrée, sa perte n\'est qu\'un désagrément ; en clair, c\'est une fuite de données.'),
          vraiFaux('q6', 'Brancher son téléphone personnel sur son poste de travail pour le recharger est une bonne pratique.', false,
            'Le téléphone devient un périphérique de stockage connecté au poste professionnel, avec les risques de transfert de fichiers dans les deux sens.'),
        ],
      },
      {
        id: 'mobilite-poste',
        unite: 'Unité 2 · Au bureau',
        titre: 'Mon poste de travail',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Vous partez chercher un café pour deux minutes. Votre ordinateur ?',
            choix: ['Je le laisse ouvert, c\'est rapide', 'Je le verrouille (Windows + L, ou Ctrl + Cmd + Q sur Mac)', 'J\'éteins l\'écran', 'Je ferme mes onglets'],
            reponse: 1,
            explication: 'Deux minutes suffisent pour envoyer un e-mail en votre nom ou brancher une clé. Verrouiller prend une seconde : faites-en un automatisme.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Une personne inconnue, les bras chargés de cartons, vous demande de lui tenir la porte du bureau sécurisé. Que faites-vous ?',
            choix: ['Je tiens la porte, c\'est poli', 'Je lui propose de l\'aide en l\'accompagnant à l\'accueil pour qu\'on vérifie son badge', 'Je lui prête mon badge', 'Je fais semblant de ne pas la voir'],
            reponse: 1,
            explication: 'Le « tailgating » exploite notre politesse. On peut rester aimable tout en appliquant la règle : chacun badge, les visiteurs passent par l\'accueil.',
          },
          {
            id: 'q3', type: 'multiple',
            enonce: 'Que ne faut-il pas laisser sur son bureau en partant le soir ? (plusieurs réponses)',
            choix: ['Des documents confidentiels', 'Un post-it avec un mot de passe', 'Son badge d\'accès', 'Une plante verte'],
            reponse: [0, 1, 2],
            explication: 'C\'est la politique du « bureau propre » : personnel d\'entretien, visiteurs, prestataires passent dans les locaux en votre absence.',
          },
          vraiFaux('q4', 'Jeter un document confidentiel à la corbeille à papier est suffisant.', false,
            'Fouiller les poubelles est une technique de renseignement bien réelle. Les documents sensibles vont au broyeur ou dans les bacs de destruction sécurisée.'),
          {
            id: 'q5', type: 'unique',
            enonce: 'Le « support informatique » vous appelle et vous demande d\'installer un logiciel pour prendre la main sur votre poste. Vous n\'avez rien demandé. Que faites-vous ?',
            choix: ['J\'installe, ils savent ce qu\'ils font', 'Je refuse poliment et je rappelle le support au numéro interne connu', 'Je donne mon mot de passe à la place', 'Je redémarre'],
            reponse: 1,
            explication: 'Les arnaques au faux support visent à installer un outil de prise de main à distance. Le vrai support peut toujours être rappelé par le canal officiel.',
          },
          vraiFaux('q6', 'Installer soi-même un logiciel gratuit trouvé sur Internet sur son poste professionnel est sans conséquence tant qu\'il est utile.', false,
            'C\'est du « shadow IT » : logiciels non vérifiés, parfois piégés, données envoyées on ne sait où. Demandez au service informatique, qui a souvent une alternative validée.'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'donnees',
    titre: 'Données & RGPD',
    description: 'Données personnelles, partage de fichiers, IA générative : manipuler l\'information sans la laisser fuir.',
    couleur: 'bleu',
    icone: 'dossier',
    lecons: [
      {
        id: 'donnees-bases',
        unite: 'Unité 1 · Les fondamentaux',
        titre: 'Données personnelles : les bases',
        questions: [
          {
            id: 'q1', type: 'multiple',
            enonce: 'Lesquelles sont des données personnelles ? (plusieurs réponses)',
            choix: ['Une adresse e-mail nominative', 'Une adresse IP', 'Une photo d\'un collègue', 'Le chiffre d\'affaires annuel de l\'entreprise'],
            reponse: [0, 1, 2],
            explication: 'Est personnelle toute information permettant d\'identifier une personne, directement ou indirectement. L\'adresse IP en fait partie. Le chiffre d\'affaires d\'une entreprise, non.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Laquelle de ces données est considérée comme « sensible » par le RGPD ?',
            choix: ['Le numéro de téléphone professionnel', 'Une information de santé', 'Le nom du service', 'La date d\'embauche'],
            reponse: 1,
            explication: 'Santé, origine, opinions politiques, convictions religieuses, appartenance syndicale, orientation sexuelle, données biométriques ou génétiques : leur traitement est en principe interdit, sauf exceptions encadrées.',
          },
          vraiFaux('q3', 'Le principe de « minimisation » impose de ne collecter que les données strictement nécessaires à l\'objectif poursuivi.', true,
            'Moins on stocke de données, moins on en perd en cas d\'incident. Avant de créer un fichier, demandez-vous de quoi vous avez vraiment besoin.'),
          {
            id: 'q4', type: 'unique',
            enonce: 'Un client demande à consulter les données que votre entreprise détient sur lui. Que faire ?',
            choix: ['Refuser, c\'est confidentiel', 'Transmettre la demande au référent données personnelles (DPO) : c\'est un droit, avec un délai de réponse', 'Lui envoyer tout le fichier clients', 'Ignorer la demande'],
            reponse: 1,
            explication: 'Le droit d\'accès est garanti par le RGPD ; la réponse est due en principe sous un mois. Le DPO sait comment y répondre sans exposer les données d\'autres personnes.',
          },
          vraiFaux('q5', 'On peut garder indéfiniment les CV des candidats non retenus, « au cas où ».', false,
            'Chaque donnée a une durée de conservation limitée, fixée selon son usage. Pour un CV non retenu, la CNIL recommande au maximum deux ans, et avec l\'accord du candidat.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'Qui est l\'autorité de contrôle du RGPD en France ?',
            choix: ['L\'ANSSI', 'La CNIL', 'L\'Arcom', 'La DGSI'],
            reponse: 1,
            explication: 'La CNIL contrôle l\'application du RGPD et peut sanctionner. L\'ANSSI, elle, est l\'autorité nationale de la sécurité des systèmes d\'information.',
          },
        ],
      },
      {
        id: 'donnees-partage',
        unite: 'Unité 1 · Les fondamentaux',
        titre: 'Partager sans fuiter',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Vous voulez qu\'un assistant d\'IA en ligne grand public résume un contrat client confidentiel. Bonne idée ?',
            choix: ['Oui, c\'est un gain de temps', 'Non, sauf outil d\'IA validé par l\'entreprise : le texte peut être conservé et réutilisé par le fournisseur', 'Oui, si on supprime la conversation après', 'Oui, s\'il est en français'],
            reponse: 1,
            explication: 'Ce que vous collez dans un service grand public sort de l\'entreprise. Utilisez les outils d\'IA approuvés par votre organisation, configurés pour ne pas réutiliser vos données.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Pour envoyer un fichier volumineux et confidentiel à un partenaire, le mieux est :',
            choix: ['Un service de transfert gratuit trouvé en ligne', 'L\'outil de partage fourni par l\'entreprise, avec un lien restreint et une date d\'expiration', 'Sa messagerie personnelle', 'Une clé USB par la poste'],
            reponse: 1,
            explication: 'L\'outil de l\'entreprise permet de contrôler qui accède au fichier, combien de temps, et de retirer l\'accès en cas d\'erreur.',
          },
          vraiFaux('q3', 'Un lien de partage « Toute personne disposant du lien » est adapté pour un document contenant des données RH.', false,
            'Ce lien peut être transféré, indexé ou intercepté, et donne accès à n\'importe qui. Limitez l\'accès aux personnes nommées.'),
          {
            id: 'q4', type: 'unique',
            enonce: 'Vous envoyez par erreur un fichier de salaires à la mauvaise personne. Que faites-vous ?',
            choix: ['Rien, elle ne l\'ouvrira peut-être pas', 'Je préviens immédiatement mon responsable ou le DPO : c\'est peut-être une violation de données à déclarer', 'Je lui demande de le supprimer et je n\'en parle pas', 'J\'envoie un second e-mail pour noyer le premier'],
            reponse: 1,
            explication: 'Une erreur de destinataire est l\'une des causes les plus fréquentes de violation de données. L\'entreprise a des obligations de délai : il faut le savoir tout de suite.',
          },
          {
            id: 'q5', type: 'multiple',
            enonce: 'Avant d\'envoyer un e-mail contenant des données sensibles, que vérifier ? (plusieurs réponses)',
            choix: ['Les destinataires, un par un (l\'autocomplétion peut tromper)', 'L\'utilisation de « Cci » pour les envois groupés externes', 'Que les pièces jointes sont les bonnes', 'La couleur de la signature'],
            reponse: [0, 1, 2],
            explication: 'L\'autocomplétion propose parfois un homonyme externe ; un envoi groupé en « À » expose toutes les adresses. Trois vérifications, trois secondes.',
          },
          vraiFaux('q6', 'Transférer des documents de travail sur sa messagerie personnelle pour les consulter le week-end est sans risque.', false,
            'Les données sortent alors du périmètre protégé par l\'entreprise, sur un compte qu\'elle ne peut ni sécuriser ni effacer. Utilisez les accès distants prévus.'),
        ],
      },
      {
        id: 'donnees-violation',
        unite: 'Unité 2 · Quand ça tourne mal',
        titre: 'Violation de données',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Qu\'est-ce qu\'une violation de données personnelles ?',
            choix: ['Uniquement un piratage', 'Toute perte, destruction, altération, divulgation ou accès non autorisé, accidentel ou volontaire', 'Seulement si les données sont publiées sur Internet', 'Un bug du logiciel'],
            reponse: 1,
            explication: 'Un ordinateur portable perdu, un e-mail au mauvais destinataire, un fichier effacé par erreur sans sauvegarde : ce sont aussi des violations.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Quel est le délai pour notifier une violation à risque à la CNIL ?',
            choix: ['24 heures', '72 heures après en avoir pris connaissance', '1 mois', 'Aucun délai'],
            reponse: 1,
            explication: 'Le RGPD (article 33) impose 72 heures. C\'est court : d\'où l\'importance de signaler immédiatement en interne tout incident, même incertain.',
          },
          vraiFaux('q3', 'Si la violation présente un risque élevé pour les personnes, il faut aussi les informer directement.', true,
            'Les personnes concernées doivent être prévenues pour pouvoir se protéger : changer de mot de passe, surveiller leurs comptes, se méfier des arnaques ciblées.'),
          {
            id: 'q4', type: 'unique',
            enonce: 'Votre ordinateur portable professionnel vous est volé dans le train. Premier réflexe ?',
            choix: ['Porter plainte et attendre', 'Prévenir immédiatement le service informatique pour bloquer les accès et, si possible, effacer l\'appareil à distance', 'En racheter un sans rien dire', 'Changer seulement son fond d\'écran'],
            reponse: 1,
            explication: 'Le service informatique peut couper les sessions, révoquer les certificats et évaluer si des données sont exposées. Le dépôt de plainte vient ensuite.',
          },
          vraiFaux('q5', 'Un disque chiffré réduit fortement les conséquences d\'un vol d\'ordinateur.', true,
            'Sans la clé, les données sont illisibles. C\'est souvent ce qui fait la différence entre un simple vol de matériel et une violation de données à notifier.'),
          vraiFaux('q6', 'Mieux vaut attendre d\'être certain qu\'il y a eu fuite avant de prévenir son responsable.', false,
            'Signaler tôt, même un doute, permet d\'enquêter dans les délais. Une fausse alerte ne coûte rien ; un signalement tardif peut coûter très cher.'),
        ],
      },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    id: 'incident',
    titre: 'Réagir à un incident',
    description: 'Rançongiciel, compte piraté, comportement suspect : les bons gestes dans les premières minutes.',
    couleur: 'rouge',
    icone: 'sirene',
    lecons: [
      {
        id: 'incident-reconnaitre',
        unite: 'Unité 1 · Détecter',
        titre: 'Reconnaître un incident',
        questions: [
          {
            id: 'q1', type: 'multiple',
            enonce: 'Quels signes peuvent indiquer que votre poste est compromis ? (plusieurs réponses)',
            choix: ['Des fichiers renommés avec une extension inconnue', 'Des e-mails envoyés en votre nom que vous n\'avez pas écrits', 'Un antivirus désactivé sans raison', 'Une mise à jour programmée par le service informatique'],
            reponse: [0, 1, 2],
            explication: 'Extensions étranges (signe de chiffrement), messages fantômes et protection désactivée sont des signaux typiques. Une mise à jour annoncée par l\'informatique est normale.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Des collègues reçoivent depuis votre adresse un e-mail avec un lien que vous n\'avez jamais envoyé. Que se passe-t-il probablement ?',
            choix: ['Un bug de la messagerie', 'Votre compte est compromis et sert à piéger vos contacts', 'Un collègue fait une blague', 'Rien de grave'],
            reponse: 1,
            explication: 'Les attaquants utilisent les comptes volés pour hameçonner les contacts, qui font confiance à l\'expéditeur. Changez votre mot de passe et prévenez l\'informatique tout de suite.',
          },
          vraiFaux('q3', 'Une petite anomalie qui « disparaît toute seule » ne mérite pas d\'être signalée.', false,
            'Beaucoup d\'attaques commencent discrètement et l\'équipe sécurité recoupe des signaux faibles. Votre signalement peut être la pièce qui manquait.'),
          {
            id: 'q4', type: 'unique',
            enonce: 'Votre navigateur ouvre une page : « Virus détecté ! Appelez Microsoft au 01 xx xx xx xx ». L\'écran semble bloqué. Que faites-vous ?',
            choix: ['J\'appelle le numéro', 'Je ferme le navigateur (au besoin en forçant) sans appeler, et je préviens l\'informatique si le problème persiste', 'Je paie l\'antivirus proposé', 'Je donne accès à mon ordinateur au technicien'],
            reponse: 1,
            explication: 'C\'est une arnaque au faux support. Microsoft n\'affiche jamais de numéro à appeler dans une page web. Le « blocage » n\'est qu\'une page en plein écran.',
          },
          {
            id: 'q5', type: 'unique',
            enonce: 'Qui doit signaler un incident de sécurité dans l\'entreprise ?',
            choix: ['Uniquement le service informatique', 'Uniquement les managers', 'Tout le monde, dès qu\'un doute existe', 'Personne, ça se voit dans les journaux'],
            reponse: 2,
            explication: 'Chaque collaborateur est un capteur. Plus le signalement est rapide, plus les dégâts sont limités.',
          },
          vraiFaux('q6', 'Il vaut mieux essayer de régler soi-même un incident avant d\'en parler, pour ne pas déranger.', false,
            'Tenter de « nettoyer » soi-même peut effacer des traces utiles ou aggraver la situation. Signalez d\'abord, agissez ensuite selon les consignes.'),
        ],
      },
      {
        id: 'incident-rancongiciel',
        unite: 'Unité 1 · Détecter',
        titre: 'Rançongiciel : les bons gestes',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Un message s\'affiche : vos fichiers sont chiffrés, payez en bitcoins pour les récupérer. Premier geste ?',
            choix: ['Éteindre l\'ordinateur', 'Débrancher le câble réseau et couper le Wi-Fi, sans éteindre, puis alerter immédiatement', 'Payer vite avant que le prix augmente', 'Redémarrer pour voir si ça part'],
            reponse: 1,
            explication: 'Isoler la machine empêche le rançongiciel de se propager aux autres. La laisser allumée préserve des informations en mémoire utiles à l\'enquête : c\'est la consigne de l\'ANSSI.',
          },
          vraiFaux('q2', 'Payer la rançon garantit de récupérer ses données.', false,
            'Rien ne le garantit : les clés fournies sont parfois défaillantes, et les données ont souvent déjà été copiées pour un second chantage. Payer finance aussi les prochaines attaques. Les autorités recommandent de ne pas payer.'),
          {
            id: 'q3', type: 'unique',
            enonce: 'Quelle est la meilleure protection pour pouvoir se relever d\'un rançongiciel ?',
            choix: ['Un antivirus payant', 'Des sauvegardes régulières, dont une copie déconnectée, et testées', 'Un mot de passe sur le fond d\'écran', 'Un pare-feu personnel'],
            reponse: 1,
            explication: 'Avec une sauvegarde saine et hors d\'atteinte, on peut tout reconstruire sans rien devoir aux attaquants.',
          },
          {
            id: 'q4', type: 'unique',
            enonce: 'Comment les rançongiciels entrent-ils le plus souvent ?',
            choix: ['Par la prise électrique', 'Par un e-mail piégé, des identifiants volés ou une faille non corrigée', 'Par l\'imprimante uniquement', 'Par le Bluetooth de la souris'],
            reponse: 1,
            explication: 'Hameçonnage, accès distants mal protégés et retards de mise à jour : c\'est pour cela que tous les parcours de ce module se tiennent.',
          },
          vraiFaux('q5', 'Après une attaque, il faut changer les mots de passe depuis une machine saine, pas depuis le poste infecté.', true,
            'Sur un poste compromis, un enregistreur de frappe peut capturer le nouveau mot de passe dès sa saisie.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'Un collègue vous écrit sur la messagerie interne pendant l\'attaque pour vous demander vos identifiants « pour restaurer les sauvegardes ». Que faites-vous ?',
            choix: ['Je les donne, c\'est l\'urgence', 'Je vérifie son identité par un autre canal : les attaquants profitent souvent du chaos', 'Je les envoie par SMS, c\'est plus sûr', 'Je les change puis je les donne'],
            reponse: 1,
            explication: 'Pendant une crise, les procédures sautent et les attaquants le savent. Les identifiants restent personnels, même en pleine crise.',
          },
        ],
      },
      {
        id: 'incident-signaler',
        unite: 'Unité 2 · Signaler',
        titre: 'Signaler et se faire aider',
        questions: [
          {
            id: 'q1', type: 'unique',
            enonce: 'Quel numéro court a été lancé en France pour les victimes de cybermalveillance ?',
            choix: ['Le 15', 'Le 17Cyber (17cyber.gouv.fr)', 'Le 3615', 'Le 112Cyber'],
            reponse: 1,
            explication: '17Cyber oriente particuliers, entreprises et collectivités vers une assistance adaptée et, si besoin, les forces de l\'ordre. Il s\'appuie sur cybermalveillance.gouv.fr.',
          },
          {
            id: 'q2', type: 'unique',
            enonce: 'Dans votre entreprise, à qui signaler en premier un e-mail suspect ?',
            choix: ['À toute l\'entreprise par e-mail', 'Au service informatique ou sécurité, via le bouton ou l\'adresse de signalement prévus', 'À l\'expéditeur', 'Sur les réseaux sociaux'],
            reponse: 1,
            explication: 'Le service sécurité peut bloquer l\'expéditeur et retirer le message des autres boîtes. Un e-mail d\'alerte à tous risque d\'inciter certains à cliquer « pour voir ».',
          },
          {
            id: 'q3', type: 'unique',
            enonce: 'Sur quelle plateforme signaler un contenu illicite en ligne (escroquerie, contenu pédocriminel…) ?',
            choix: ['Pharos (internet-signalement.gouv.fr)', 'Doctolib', 'Le site de sa banque', 'Un forum'],
            reponse: 0,
            explication: 'Pharos est la plateforme officielle de signalement des contenus illicites sur Internet, traitée par des policiers et gendarmes.',
          },
          {
            id: 'q4', type: 'multiple',
            enonce: 'Que noter lors d\'un incident pour aider l\'enquête ? (plusieurs réponses)',
            choix: ['L\'heure à laquelle vous avez remarqué le problème', 'Ce que vous faisiez juste avant (lien cliqué, fichier ouvert)', 'Les messages affichés (une photo de l\'écran suffit)', 'Votre humeur du jour'],
            reponse: [0, 1, 2],
            explication: 'Ces éléments aident à reconstituer la chronologie et à trouver le point d\'entrée.',
          },
          vraiFaux('q5', 'Un collaborateur qui a cliqué sur un lien piégé et le signale aussitôt doit être sanctionné.', false,
            'Une culture du blâme pousse à cacher les erreurs, ce qui aggrave les incidents. Un signalement rapide est un réflexe à saluer.'),
          {
            id: 'q6', type: 'unique',
            enonce: 'Le site cybermalveillance.gouv.fr permet notamment de :',
            choix: ['Acheter un antivirus', 'Diagnostiquer sa situation et être mis en relation avec des prestataires de proximité', 'Récupérer gratuitement toute rançon payée', 'Pirater les pirates'],
            reponse: 1,
            explication: 'Le dispositif national d\'assistance propose diagnostic, fiches pratiques et un annuaire de professionnels référencés.',
          },
        ],
      },
    ],
  },
];

// Catalogue complet : la cybersécurité, puis le droit des sociétés, les
// métiers de l'entreprise et la formation (troubles dys, CFA), dans les fichiers voisins. L'ordre fixe celui des parcours.
// Les parcours droit et métiers s'ouvrent sur une leçon « lexique » et se
// terminent par une leçon « niveau expert ».
const avecExpert = (p) => {
  if (!LEXIQUE[p.id]) throw new Error(`Parcours ${p.id} : leçon lexique manquante`);
  if (!EXPERT[p.id]) throw new Error(`Parcours ${p.id} : leçon expert manquante`);
  return { ...p, lecons: [LEXIQUE[p.id], ...p.lecons, EXPERT[p.id]] };
};

export const CATALOGUE = [
  ...CYBER.map((p) => ({ ...p, categorie: 'cyber' })),
  ...DROIT.map(avecExpert),
  ...METIERS.map(avecExpert),
  // Lexique et niveau expert sont déjà inclus dans formation.js.
  ...FORMATION,
];
