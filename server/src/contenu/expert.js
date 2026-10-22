// Leçons « niveau expert » : une cinquième leçon, difficile, ajoutée à la fin de
// chaque parcours droit et métiers (clé = id du parcours). Même format de
// question que catalogue.js.

const vraiFaux = (id, enonce, vrai, explication) => ({
  id, type: 'unique', enonce, choix: ['Vrai', 'Faux'], reponse: vrai ? 0 : 1, explication,
});

const UNITE = 'Niveau expert';

export const EXPERT = {
  // ---------------------------------------------------------------------------
  'droit-bases': {
    id: 'droit-expert',
    unite: UNITE,
    titre: 'Majorités, délais et registres',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'SARL, première consultation : à quelle majorité une décision ordinaire (comme l’approbation des comptes) est-elle adoptée ?',
        choix: ['Par des associés représentant plus de la moitié des parts sociales', 'Par la majorité des associés présents, quel que soit leur nombre de parts', 'Par les deux tiers des parts sociales', 'À l’unanimité'],
        reponse: 0,
        explication: 'Plus de la moitié des parts sociales sur première consultation. Si elle n’est pas atteinte, une seconde consultation peut statuer à la majorité des votes émis, sauf clause contraire des statuts.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'SARL constituée après 2005 : sauf clause plus exigeante, à quelle majorité modifie-t-on les statuts ?',
        choix: ['Les deux tiers des parts détenues par les associés présents ou représentés', 'Plus de la moitié des parts sociales', 'Les trois quarts du capital social', 'L’unanimité'],
        reponse: 0,
        explication: 'Deux tiers des parts des associés présents ou représentés, avec un quorum d’un quart des parts sur première convocation et d’un cinquième sur la seconde. Les SARL plus anciennes peuvent rester aux trois quarts du capital.',
      },
      {
        id: 'q3', type: 'multiple',
        enonce: 'Lesquelles de ces décisions exigent l’unanimité des associés ? (plusieurs réponses)',
        choix: ['Augmenter les engagements d’un associé', 'Transformer une SARL en SNC', 'Changer la dénomination d’une SAS', 'Approuver les comptes d’une SAS'],
        reponse: [0, 1],
        explication: 'Nul ne peut voir ses engagements augmentés sans son accord, et passer en SNC rend chaque associé indéfiniment responsable des dettes : unanimité dans les deux cas. Les deux autres suivent les majorités statutaires.',
      },
      {
        id: 'q4', type: 'unique',
        enonce: 'Une société qui clôture au 31 décembre ne pourra pas approuver ses comptes avant le 30 juin. Que doit faire le dirigeant ?',
        choix: [
          'Rien : ce délai n’est qu’indicatif',
          'Demander, avant l’expiration du délai, une prolongation au président du tribunal de commerce par requête',
          'Décaler rétroactivement la date de clôture',
          'Faire approuver des comptes provisoires',
        ],
        reponse: 1,
        explication: 'La prolongation s’obtient sur requête, déposée avant le 30 juin. Une fois le délai expiré, il est trop tard pour la demander.',
      },
      vraiFaux('q5', 'Dans une SAS, la loi impose de réunir physiquement les associés pour approuver les comptes.', false,
        'Les statuts fixent les modes de décision : assemblée, visioconférence, consultation écrite, acte signé par tous… La décision collective est obligatoire, la réunion physique non.'),
      {
        id: 'q6', type: 'unique',
        enonce: 'Dans un registre papier, comment les procès-verbaux doivent-ils être consignés ?',
        choix: ['Sur des feuillets cotés et paraphés, sans blanc ni rature', 'Sur papier libre, dans un classeur', 'Uniquement par e-mail', 'Au crayon, pour pouvoir corriger'],
        reponse: 0,
        explication: 'Feuillets numérotés et paraphés, à la suite, sans blanc : le registre doit être infalsifiable. C’est cette exigence que la version électronique remplit avec la signature et l’horodatage.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  avocat: {
    id: 'avocat-expert',
    unite: UNITE,
    titre: 'Dossiers épineux',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Une SAS veut faire entrer un investisseur par une augmentation de capital qui lui est réservée. Qui la décide ?',
        choix: [
          'Les associés, par une décision collective, en supprimant leur droit préférentiel de souscription au profit de l’investisseur',
          'Le président seul',
          'Le commissaire aux comptes',
          'Le greffe du tribunal de commerce',
        ],
        reponse: 0,
        explication: 'L’augmentation de capital relève d’une décision collective des associés. Réserver les nouvelles actions à un tiers suppose de supprimer le droit préférentiel de souscription des associés existants.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Le droit préférentiel de souscription permet aux associés existants…',
        choix: [
          'De souscrire en priorité aux nouvelles actions, à proportion de leur participation, pour éviter d’être dilués',
          'De toucher un dividende prioritaire',
          'De voter deux fois',
          'De vendre leurs actions avant les autres',
        ],
        reponse: 0,
        explication: 'Il protège contre la dilution. Il peut être supprimé, mais par une décision collective motivée : c’est le cas de toute augmentation réservée.',
      },
      {
        id: 'q3', type: 'multiple',
        enonce: 'Lors d’une cession d’actions de SAS, qu’est-ce qui peut s’imposer en vertu des statuts ou du pacte ? (plusieurs réponses)',
        choix: ['Une clause d’agrément', 'Un droit de préemption', 'Une clause de sortie conjointe', 'Une autorisation préalable de l’administration fiscale'],
        reponse: [0, 1, 2],
        explication: 'Agrément, préemption, sortie conjointe : avant toute cession, l’avocat passe statuts et pacte au crible. Le fisc intervient pour les droits d’enregistrement, pas pour autoriser la vente.',
      },
      {
        id: 'q4', type: 'unique',
        enonce: 'Une clause de « drag along » (sortie forcée) permet…',
        choix: [
          'Aux majoritaires qui vendent d’obliger les minoritaires à céder aux mêmes conditions',
          'Aux minoritaires de vendre en même temps que les majoritaires',
          'D’interdire toute cession pendant cinq ans',
          'D’augmenter le capital sans vote',
        ],
        reponse: 0,
        explication: 'Drag along : on « entraîne » les minoritaires pour offrir 100 % à l’acheteur. Le tag along (sortie conjointe), c’est l’inverse : le droit des minoritaires de suivre la vente.',
      },
      vraiFaux('q5', 'Dans une SAS à plusieurs associés, une convention conclue entre la société et son président fait en principe l’objet d’un rapport soumis aux associés.', true,
        'C’est le régime des conventions réglementées : rapport du président ou du commissaire aux comptes, puis vote des associés. Les conventions courantes conclues à des conditions normales y échappent.'),
      {
        id: 'q6', type: 'unique',
        enonce: 'SARL : combien de temps avant l’assemblée les associés doivent-ils être convoqués par lettre recommandée ?',
        choix: ['15 jours au moins', '8 jours', '1 mois', '48 heures'],
        reponse: 0,
        explication: 'Quinze jours au moins avant la réunion, avec l’ordre du jour. Pour l’approbation des comptes, les documents doivent aussi être communiqués aux associés dans ce délai.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'expert-comptable': {
    id: 'ec-expert',
    unite: UNITE,
    titre: 'Les cas qui piquent',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Capital : 100 000 €. Réserve légale déjà constituée : 9 000 €. Bénéfice : 50 000 €. Combien faut-il obligatoirement affecter à la réserve légale ?',
        choix: ['1 000 €', '2 500 €', '5 000 €', '10 000 €'],
        reponse: 0,
        explication: 'En principe 5 % du bénéfice, soit 2 500 €, mais la dotation cesse dès que la réserve atteint 10 % du capital : il manque seulement 1 000 € pour arriver à 10 000 €.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Le bénéfice distribuable, c’est…',
        choix: [
          'Le résultat de l’exercice, diminué des pertes antérieures et des dotations obligatoires aux réserves, augmenté du report à nouveau bénéficiaire',
          'Le chiffre d’affaires moins les charges',
          'La trésorerie disponible en banque',
          'Le capital social',
        ],
        reponse: 0,
        explication: 'On peut aussi distribuer des réserves disponibles, sur décision expresse. Mais sans bénéfice distribuable ni réserves disponibles, pas de dividende.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Les pertes ont fait passer les capitaux propres sous la moitié du capital social. Que faut-il faire ?',
        choix: [
          'Rien de particulier',
          'Consulter les associés dans les 4 mois suivant l’approbation des comptes, pour décider s’il y a lieu de dissoudre la société',
          'Fermer la société immédiatement',
          'Doubler le capital dans le mois',
        ],
        reponse: 1,
        explication: 'Si la dissolution n’est pas décidée, la situation doit être régularisée dans un délai encadré par la loi, et la décision fait l’objet de formalités de publicité.',
      },
      {
        id: 'q4', type: 'multiple',
        enonce: 'Une société ne dépose pas ses comptes au greffe. À quoi s’expose-t-elle ? (plusieurs réponses)',
        choix: ['Une injonction de déposer, sous astreinte, du président du tribunal de commerce', 'Une amende pénale pour ses dirigeants', 'La radiation automatique du registre du commerce', 'Une dissolution d’office immédiate'],
        reponse: [0, 1],
        explication: 'Injonction sous astreinte et contravention pour les dirigeants. Ni radiation ni dissolution automatiques, mais la situation se voit vite lors d’une demande de financement ou d’un audit.',
      },
      vraiFaux('q5', 'Une société peut verser un acompte sur dividendes avant l’approbation des comptes, sous conditions.', true,
        'Il faut un bilan, établi en cours ou en fin d’exercice et certifié par un commissaire aux comptes, faisant apparaître un bénéfice suffisant.'),
      {
        id: 'q6', type: 'unique',
        enonce: 'Une fois votés, les dividendes doivent être mis en paiement au plus tard…',
        choix: ['Dans les 9 mois suivant la clôture de l’exercice, sauf prolongation par décision de justice', 'Le jour même de l’assemblée', 'Dans les 2 ans', 'Quand le dirigeant le souhaite'],
        reponse: 0,
        explication: 'Neuf mois après la clôture. Les modalités de paiement sont fixées par les associés ou, à défaut, par les dirigeants.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  juriste: {
    id: 'juriste-expert',
    unite: UNITE,
    titre: 'Situations complexes',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Une filiale SAS est détenue à 100 % par la société mère. Pour approuver ses comptes, on établit…',
        choix: ['Une décision de l’associé unique', 'Une assemblée avec quorum et feuille de présence', 'Une décision du conseil de prud’hommes', 'Rien : l’approbation est automatique'],
        reponse: 0,
        explication: 'L’associé unique (la société mère, représentée par son dirigeant) exerce seul les pouvoirs des associés. La décision est consignée dans le registre comme toute autre.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Mme X détient 60 % d’une holding, qui détient 50 % du capital de la société Y. Quelle est sa détention indirecte dans Y, et est-elle bénéficiaire effective ?',
        choix: ['30 % : oui, c’est plus de 25 %', '60 % : oui', '50 % : non, la holding s’interpose', '10 % : non'],
        reponse: 0,
        explication: '60 % × 50 % = 30 % de détention indirecte : au-delà du seuil de 25 %. Le contrôle exercé par d’autres moyens compte aussi.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Dans quel délai faut-il déclarer une modification des bénéficiaires effectifs ?',
        choix: ['30 jours suivant le fait ou l’acte', '6 mois', 'À la prochaine approbation des comptes', 'Aucun délai n’est prévu'],
        reponse: 0,
        explication: 'Trente jours. Dans un groupe où les cessions intra-groupe sont fréquentes, c’est une échéance facile à manquer.',
      },
      {
        id: 'q4', type: 'multiple',
        enonce: 'Un dirigeant, président de 12 filiales, démissionne. Que faut-il faire dans chacune ? (plusieurs réponses)',
        choix: [
          'Nommer un successeur selon les règles prévues par les statuts',
          'Déclarer la modification au guichet unique',
          'Mettre à jour les bénéficiaires effectifs si sa situation de détention ou de contrôle change',
          'Obtenir l’accord du comité social et économique',
        ],
        reponse: [0, 1, 2],
        explication: 'Nomination, formalité, bénéficiaires effectifs : trois actions multipliées par douze entités. Le CSE peut devoir être informé dans certains cas, mais il n’autorise pas la nomination d’un mandataire social.',
      },
      vraiFaux('q5', 'Une délégation de pouvoirs trop générale ou mal rédigée peut ne pas exonérer le dirigeant de sa responsabilité pénale.', true,
        'Pour être efficace, elle doit être précise et confiée à une personne dotée de la compétence, de l’autorité et des moyens nécessaires.'),
      {
        id: 'q6', type: 'unique',
        enonce: 'Une société mère et ses filiales concluent une convention de trésorerie. Pourquoi le juriste y prête-t-il attention ?',
        choix: [
          'Elle peut relever des conventions réglementées si des dirigeants sont communs, et doit respecter l’intérêt social de chaque société',
          'Elle est interdite entre sociétés d’un même groupe',
          'Elle n’a aucun enjeu juridique',
          'Elle doit être publiée au Journal officiel',
        ],
        reponse: 0,
        explication: 'Les flux intra-groupe sont légitimes, mais chaque filiale reste une personne morale distincte : une convention déséquilibrée peut engager la responsabilité des dirigeants.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-dev': {
    id: 'dev-expert',
    unite: UNITE,
    titre: 'Questions de pro',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Une opération « idempotente », c’est une opération qui…',
        choix: ['Produit le même résultat qu’on l’exécute une ou plusieurs fois', 'S’exécute très rapidement', 'Ne peut pas être annulée', 'Est réservée aux administrateurs'],
        reponse: 0,
        explication: 'Si un utilisateur clique deux fois sur « Signer » ou si le réseau rejoue une requête, une opération idempotente ne crée pas deux signatures.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Deux utilisateurs modifient le même procès-verbal au même moment. Quel risque classique ?',
        choix: ['Une condition de concurrence : la dernière sauvegarde écrase l’autre', 'Une injection SQL', 'Un déni de service', 'Aucun risque'],
        reponse: 0,
        explication: 'Sans verrou ni détection de conflit, le travail du premier disparaît silencieusement. On parle aussi de « race condition ».',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Un client voit les sociétés d’un autre client en changeant le numéro dans l’URL. Comment s’appelle cette faille ?',
        choix: ['Une IDOR (référence directe à un objet non sécurisée), une forme de contrôle d’accès défaillant', 'Une XSS', 'Une CSRF', 'Du phishing'],
        reponse: 0,
        explication: 'Le serveur doit vérifier à chaque requête que l’objet demandé appartient bien à l’utilisateur, et non se fier à ce que le navigateur envoie.',
      },
      {
        id: 'q4', type: 'multiple',
        enonce: 'Lesquelles de ces catégories figurent dans le Top 10 OWASP des risques web ? (plusieurs réponses)',
        choix: ['Contrôle d’accès défaillant', 'Injection', 'Mots de passe trop longs', 'Défaillances cryptographiques'],
        reponse: [0, 1, 3],
        explication: 'Le contrôle d’accès défaillant est en tête du classement. Un mot de passe long, lui, n’a jamais été un risque.',
      },
      vraiFaux('q5', 'Chiffrer et hacher un mot de passe, c’est la même chose.', false,
        'Le chiffrement est réversible avec la clé ; le hachage ne l’est pas. On stocke les mots de passe hachés avec un sel et un algorithme volontairement lent (bcrypt, scrypt, Argon2).'),
      {
        id: 'q6', type: 'unique',
        enonce: 'Une page met 30 secondes à s’afficher : elle exécute une requête pour la liste, puis une requête par société. Comment s’appelle ce problème ?',
        choix: ['Le problème « N+1 »', 'Une fuite mémoire', 'Un interblocage (deadlock)', 'Un bug d’affichage'],
        reponse: 0,
        explication: 'Avec 500 sociétés, 501 requêtes. On regroupe les données en une ou deux requêtes : invisible en test avec trois sociétés, flagrant chez un gros cabinet.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-devops': {
    id: 'devops-expert',
    unite: UNITE,
    titre: 'Production sous pression',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Un déploiement « blue-green », c’est…',
        choix: [
          'Faire tourner deux environnements identiques et basculer tout le trafic de l’ancien vers le nouveau, avec retour arrière immédiat',
          'Envoyer d’abord la nouvelle version à une petite part des utilisateurs',
          'Déployer uniquement le week-end',
          'Tester directement en production, sans préproduction',
        ],
        reponse: 0,
        explication: 'La bascule est instantanée dans les deux sens. Envoyer d’abord à une petite part du trafic, c’est l’autre stratégie : le déploiement « canary ».',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Un déploiement « canary », c’est…',
        choix: [
          'Envoyer d’abord la nouvelle version à une petite part du trafic, puis élargir si les indicateurs restent bons',
          'Basculer tout le trafic d’un coup vers un environnement neuf',
          'Supprimer l’ancienne version avant d’installer la nouvelle',
          'Déployer sur un seul serveur de test',
        ],
        reponse: 0,
        explication: 'Comme le canari des mineurs : s’il y a un problème, seule une petite partie des utilisateurs le voit, et on arrête tout.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Objectif de disponibilité (SLO) : 99,9 % sur 30 jours. Combien d’indisponibilité le « budget d’erreur » autorise-t-il ?',
        choix: ['Environ 43 minutes', 'Environ 4 minutes', 'Environ 7 heures', 'Environ 3 jours'],
        reponse: 0,
        explication: '30 × 24 × 60 = 43 200 minutes ; 0,1 % de 43 200 ≈ 43 minutes. Budget épuisé ? On gèle les nouveautés risquées et on consolide.',
      },
      {
        id: 'q4', type: 'multiple',
        enonce: 'Comment éviter qu’un secret (clé d’API, mot de passe de base de données) ne fuite ? (plusieurs réponses)',
        choix: [
          'Le stocker dans un coffre ou des variables d’environnement, jamais dans le code versionné',
          'Le renouveler régulièrement, et immédiatement s’il a pu être exposé',
          'Limiter ses droits au strict nécessaire',
          'Le partager dans le canal de discussion de l’équipe',
        ],
        reponse: [0, 1, 2],
        explication: 'Un secret poussé dans un dépôt doit être considéré comme compromis, même après suppression : l’historique le garde.',
      },
      vraiFaux('q5', 'Une migration qui supprime une colonne de la base peut être déployée en même temps que le code qui ne l’utilise plus, sans précaution.', false,
        'Pendant le déploiement, l’ancienne version tourne encore et lit cette colonne. On procède en deux temps : d’abord le code qui ne l’utilise plus, ensuite la suppression.'),
      {
        id: 'q6', type: 'unique',
        enonce: 'Un service sature chaque matin à 9 h. Le faire évoluer « horizontalement », c’est…',
        choix: ['Ajouter des serveurs identiques derrière le répartiteur de charge', 'Donner plus de mémoire et de processeur au même serveur', 'Redémarrer le serveur chaque matin', 'Demander aux clients de se connecter à 10 h'],
        reponse: 0,
        explication: 'Ajouter de la puissance au même serveur, c’est l’évolution verticale : plus simple, mais limitée, et sans protection contre la panne de cette machine.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-marketing': {
    id: 'mkt-expert',
    unite: UNITE,
    titre: 'Les chiffres qui trompent',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Valeur vie client (LTV) : 12 000 €. Coût d’acquisition (CAC) : 3 000 €. Que vaut le ratio LTV/CAC ?',
        choix: ['4, au-dessus du repère de 3 souvent cité', '0,25', '9 000 €', '36 000'],
        reponse: 0,
        explication: '12 000 / 3 000 = 4. En dessous de 1, chaque client coûte plus qu’il ne rapporte ; autour de 3 ou plus, l’acquisition est jugée saine.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'CAC : 3 000 €. Le client paie 250 € par mois avec 80 % de marge brute. En combien de mois le CAC est-il remboursé ?',
        choix: ['12 mois', '15 mois', '20 mois', '3 mois'],
        reponse: 1,
        explication: '250 € × 80 % = 200 € de marge par mois ; 3 000 / 200 = 15 mois. Si le client part avant, il n’a jamais été rentable.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Quel est le biais de l’attribution « au dernier clic » ?',
        choix: [
          'Elle donne tout le mérite au dernier contact avant la conversion et ignore le webinaire ou l’article qui ont fait connaître l’offre',
          'Elle surestime le premier contact',
          'Elle est imposée par le RGPD',
          'Elle n’a aucun biais',
        ],
        reponse: 0,
        explication: 'En B2B, le parcours compte souvent de nombreux contacts sur plusieurs mois. Couper le contenu « qui ne convertit pas » peut tarir la source.',
      },
      vraiFaux('q4', 'En B2B, on peut prospecter un professionnel par e-mail sur son adresse professionnelle sans consentement préalable, si le message concerne sa fonction et qu’il peut s’y opposer.', true,
        'C’est la position de la CNIL : information de la personne, rapport avec sa profession et possibilité simple de se désinscrire. Pour les particuliers, le consentement préalable est la règle.'),
      {
        id: 'q5', type: 'multiple',
        enonce: 'Quels indicateurs mesurent l’efficacité réelle d’une campagne ? (plusieurs réponses)',
        choix: ['Les rendez-vous commerciaux obtenus', 'Le pipeline généré', 'Le nombre d’impressions', 'Le taux de conversion de contact en client'],
        reponse: [0, 1, 3],
        explication: 'Les impressions disent combien de personnes ont vu le message, pas combien ont avancé vers un achat.',
      },
      {
        id: 'q6', type: 'unique',
        enonce: 'Test A/B : 5,2 % de conversion pour B contre 5,0 % pour A, sur 200 visiteurs par version. Que conclure ?',
        choix: ['Rien de fiable : l’écart est bien trop faible pour un si petit échantillon', 'B gagne, on généralise', 'A gagne, on arrête B', 'Il faut arrêter les tests A/B'],
        reponse: 0,
        explication: 'Cela représente une dizaine de conversions par version : un seul contact de plus suffit à inverser le résultat. Il faut beaucoup plus de données pour conclure.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-commercial': {
    id: 'sales-expert',
    unite: UNITE,
    titre: 'Pipe, remises et qualification',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Dans la méthode de qualification MEDDIC, que désigne le « E » ?',
        choix: ['L’Economic buyer : la personne qui a le pouvoir final sur le budget', 'L’e-mail de relance', 'L’engagement du client', 'L’évaluation de la démo'],
        reponse: 0,
        explication: 'Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion. Ne pas connaître le décideur budgétaire est l’une des premières causes d’affaires qui s’enlisent.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Pipe de 400 000 € pondéré à 25 % en moyenne, objectif trimestriel de 150 000 €. Quel constat ?',
        choix: ['Le pipe pondéré (100 000 €) ne couvre pas l’objectif : il faut créer de nouvelles affaires', 'L’objectif est largement couvert', 'Le pipe vaut 400 000 €, tout va bien', 'On ne peut rien conclure'],
        reponse: 0,
        explication: '400 000 × 25 % = 100 000 €, soit 50 000 € de moins que l’objectif. D’où la règle souvent citée d’un pipe brut égal à trois à quatre fois l’objectif.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Une remise de 20 % est accordée sur un contrat de 10 000 € par an, engagé sur 3 ans. Quel est le manque à gagner total ?',
        choix: ['6 000 €', '2 000 €', '20 000 €', '600 €'],
        reponse: 0,
        explication: '2 000 € par an pendant 3 ans. Et au renouvellement, le client partira du prix remisé : la remise coûte souvent bien plus que prévu.',
      },
      vraiFaux('q4', 'Une affaire immobile depuis 90 jours, sans prochaine étape datée, doit rester dans le pipe avec sa probabilité initiale.', false,
        'Une affaire sans prochaine étape n’avance plus : il faut la requalifier, baisser sa probabilité ou la clôturer. Sinon, la prévision ment.'),
      {
        id: 'q5', type: 'multiple',
        enonce: 'Quels signaux montrent qu’une affaire est vraiment qualifiée ? (plusieurs réponses)',
        choix: ['Un problème identifié et chiffré par le client', 'Le décideur budgétaire identifié et impliqué', 'Un calendrier de décision connu', 'Le prospect a trouvé la démo très sympa'],
        reponse: [0, 1, 2],
        explication: 'Une démo appréciée est un bon début, pas une qualification : sans douleur chiffrée, décideur et calendrier, l’affaire peut traîner indéfiniment.',
      },
      {
        id: 'q6', type: 'unique',
        enonce: 'Un appel d’offres arrive avec un cahier des charges visiblement taillé pour un concurrent. Quelle est la meilleure attitude ?',
        choix: ['Évaluer froidement ses chances (go / no go) avant d’y consacrer des jours', 'Répondre à tout prix', 'Se plaindre auprès du client', 'Copier l’offre du concurrent'],
        reponse: 0,
        explication: 'Répondre coûte cher. Parfois, la meilleure décision commerciale est de ne pas y aller, ou d’y aller en posant ses conditions.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-csm': {
    id: 'csm-expert',
    unite: UNITE,
    titre: 'Rétention : les vrais calculs',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Début d’année : 1 000 000 € de revenu récurrent. Départs : 80 000 €. Réductions : 20 000 €. Extensions : 150 000 €. Quelle est la rétention nette du revenu (NRR) ?',
        choix: ['105 %', '90 %', '115 %', '95 %'],
        reponse: 0,
        explication: '(1 000 000 − 80 000 − 20 000 + 150 000) / 1 000 000 = 105 %. Les extensions font plus que compenser les pertes.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Mêmes chiffres. Quelle est la rétention brute du revenu (GRR) ?',
        choix: ['90 %', '105 %', '92 %', '100 %'],
        reponse: 0,
        explication: 'La rétention brute ignore les extensions : (1 000 000 − 80 000 − 20 000) / 1 000 000 = 90 %. Elle ne peut jamais dépasser 100 %.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Enquête : 50 % de promoteurs, 30 % de passifs, 20 % de détracteurs. Quel est le NPS ?',
        choix: ['30', '50', '70', '80'],
        reponse: 0,
        explication: 'NPS = % de promoteurs − % de détracteurs = 50 − 20 = 30. Les passifs ne comptent pas, mais ils ne sont pas acquis pour autant.',
      },
      vraiFaux('q4', 'Un client qui ne se plaint jamais est forcément un client satisfait.', false,
        'Le silence cache souvent un désengagement : un client qui n’utilise plus l’outil ne prend même plus la peine de signaler un problème. C’est un risque, pas un signe de santé.'),
      {
        id: 'q5', type: 'multiple',
        enonce: 'Un client clé perd son « champion », l’interlocuteur qui avait porté le projet. Que faire ? (plusieurs réponses)',
        choix: ['Identifier et rencontrer rapidement son successeur', 'Refaire la démonstration de la valeur obtenue', 'Revoir le plan de compte avant le renouvellement', 'Attendre l’échéance pour voir'],
        reponse: [0, 1, 2],
        explication: 'Le départ du champion est l’un des premiers facteurs de résiliation. Le nouvel interlocuteur n’a pas choisi l’outil : il faut le convaincre à son tour.',
      },
      {
        id: 'q6', type: 'unique',
        enonce: 'Le churn « involontaire », c’est…',
        choix: ['Un client perdu à cause d’un échec de paiement (carte expirée, prélèvement rejeté), sans l’avoir décidé', 'Un client qui part fâché', 'Un client racheté par un concurrent', 'Un client qui change d’interlocuteur'],
        reponse: 0,
        explication: 'C’est le churn le plus bête : relances de paiement, mise à jour des moyens de paiement et alertes permettent souvent de l’éviter.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-cto': {
    id: 'cto-expert',
    unite: UNITE,
    titre: 'Résilience et architecture',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Dans un plan de reprise, que mesure le RPO ?',
        choix: ['La quantité maximale de données qu’on accepte de perdre, exprimée en temps', 'Le délai maximal pour rétablir le service', 'Le nombre de serveurs de secours', 'Le coût d’une heure de panne'],
        reponse: 0,
        explication: 'RPO (Recovery Point Objective) : jusqu’où on remonte. RTO (Recovery Time Objective) : en combien de temps on redémarre. On les confond souvent.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Les sauvegardes ont lieu chaque nuit à minuit. La base est perdue à 23 h. Combien de données perd-on ?',
        choix: ['Environ 23 heures de saisie', 'Aucune', 'Une heure', 'Une semaine'],
        reponse: 0,
        explication: 'Avec une sauvegarde quotidienne, le RPO réel atteint presque 24 heures. En pleine saison des AG, c’est une journée de travail perdue chez tous les clients.',
      },
      {
        id: 'q3', type: 'multiple',
        enonce: 'Que prévoit la règle « 3-2-1 » des sauvegardes ? (plusieurs réponses)',
        choix: ['3 copies des données', 'Sur 2 supports différents', 'Dont 1 hors site', '1 sauvegarde par an suffit'],
        reponse: [0, 1, 2],
        explication: 'Trois copies, deux supports, une hors site, et idéalement une copie hors ligne ou immuable, que même un rançongiciel ne peut pas chiffrer.',
      },
      {
        id: 'q4', type: 'unique',
        enonce: 'Une base répartie sur deux sites subit une coupure réseau entre eux. Selon le théorème CAP, entre quoi faut-il choisir ?',
        choix: ['Cohérence et disponibilité', 'Coût et performance', 'Sécurité et rapidité', 'Front-end et back-end'],
        reponse: 0,
        explication: 'Pendant la coupure, soit on refuse certaines écritures pour rester cohérent, soit on les accepte des deux côtés au risque de divergences à réconcilier.',
      },
      vraiFaux('q5', 'Une certification ISO 27001 garantit qu’une entreprise ne subira jamais de faille de sécurité.', false,
        'Elle certifie un système de management de la sécurité : risques identifiés, mesures en place, amélioration continue. Elle réduit le risque, elle ne l’annule pas.'),
      {
        id: 'q6', type: 'unique',
        enonce: 'Le « bus factor » d’une équipe, c’est…',
        choix: ['Le nombre de personnes qui peuvent disparaître avant qu’un projet soit bloqué faute de savoir', 'Le nombre de bugs par sprint', 'Le budget transport', 'La vitesse du réseau interne'],
        reponse: 0,
        explication: 'S’il vaut 1, une seule personne détient un savoir critique. Revues de code, documentation et rotation des sujets le font monter.',
      },
    ],
  },

  // ---------------------------------------------------------------------------
  'metier-ceo': {
    id: 'ceo-expert',
    unite: UNITE,
    titre: 'Capital, dilution et valorisation',
    questions: [
      {
        id: 'q1', type: 'unique',
        enonce: 'Les fondateurs détiennent 100 %. Une première levée donne 20 % du capital aux investisseurs, une seconde 25 % (après opération). Que détiennent encore les fondateurs ?',
        choix: ['60 %', '55 %', '45 %', '75 %'],
        reponse: 0,
        explication: 'Les dilutions se multiplient, elles ne s’additionnent pas : 100 % × 80 % × 75 % = 60 %.',
      },
      {
        id: 'q2', type: 'unique',
        enonce: 'Valorisation avant levée (pre-money) : 4 M€. Montant levé : 1 M€. Quelle part du capital l’investisseur obtient-il ?',
        choix: ['20 %', '25 %', '10 %', '40 %'],
        reponse: 0,
        explication: 'Post-money = 4 + 1 = 5 M€, et 1 / 5 = 20 %. Le piège courant : diviser par le pre-money, ce qui donne 25 %.',
      },
      {
        id: 'q3', type: 'unique',
        enonce: 'Règle des 40 pour un éditeur de logiciel : croissance de 30 % et marge d’EBITDA de −5 %. Quel est le score ?',
        choix: ['25, sous le repère de 40', '35, sous le repère de 40', '40, pile le repère', '−150'],
        reponse: 0,
        explication: 'Croissance + marge = 30 − 5 = 25. Le repère : au moins 40, en arbitrant entre croissance et rentabilité.',
      },
      vraiFaux('q4', 'Une clause de liquidation préférentielle peut permettre à un investisseur de récupérer sa mise avant les fondateurs lors d’une vente.', true,
        'En cas de vente à prix modeste, les investisseurs se servent en premier. Le prix affiché ne dit donc pas ce que touchent réellement les fondateurs.'),
      {
        id: 'q5', type: 'multiple',
        enonce: 'Dans beaucoup de start-ups, qu’est-ce qui passe par le conseil (board) plutôt que par le CEO seul ? (plusieurs réponses)',
        choix: ['Valider le budget annuel', 'Préparer une levée de fonds avant le vote des associés', 'Nommer ou révoquer le CEO', 'Choisir l’outil de visioconférence'],
        reponse: [0, 1, 2],
        explication: 'Le pacte d’associés liste souvent ces « décisions importantes » soumises au conseil. Elles laissent une trace : procès-verbaux et registres.',
      },
      {
        id: 'q6', type: 'unique',
        enonce: 'Les BSPCE, ce sont…',
        choix: ['Des bons permettant aux salariés de souscrire des actions à un prix fixé à l’avance, pour les associer à la réussite', 'Une prime de fin d’année', 'Un prêt bancaire garanti par l’État', 'Une assurance des dirigeants'],
        reponse: 0,
        explication: 'Si la valeur de la société augmente, le salarié achète au prix fixé et profite de l’écart. Leur émission est décidée par les associés et suivie dans les registres.',
      },
    ],
  },
};
