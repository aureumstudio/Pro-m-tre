/* ------------------------------------------------------------------
   PRO'MÈTRE — Questionnaires par famille de produits

   Règles :
   - Aucune cote de fabrication, aucun jeu de pose, aucun seuil n'est défini ici.
   - Les réponses déterminent les champs affichés (show) : questionnaire conditionnel.
   - Tout est configurable : ce fichier est le référentiel à faire valider
     et compléter avec le métreur (options, libellés, champs obligatoires).

   Champ : { k, l, t, o?, show?(ctx), req?, hint?, ph?, small? }
     t = "single" | "multi" | "text" | "measure"
     ctx = { a: réponses, product, install }
------------------------------------------------------------------ */

export const PRODUCTS = [
  { key: "fenetres", label: "Fenêtre", prefix: "FEN", family: "fenetre" },
  { key: "portes-fenetres", label: "Porte-fenêtre", prefix: "PF", family: "fenetre" },
  { key: "baies-coulissantes", label: "Baie coulissante", prefix: "BAIE", family: "baie" },
  { key: "portes-entree", label: "Porte d’entrée", prefix: "PEN", family: "porte" },
  { key: "volets-roulants", label: "Volet roulant", prefix: "VR", family: "volet" },
  { key: "portes-garage", label: "Porte de garage", prefix: "GAR", family: "garage" },
  { key: "portails", label: "Portail", prefix: "POR", family: "portail" },
  { key: "stores", label: "Store", prefix: "STO", family: "store" },
  { key: "pergolas", label: "Pergola", prefix: "PER", family: "pergola" },
  { key: "clotures", label: "Clôture", prefix: "CLO", family: "cloture" },
];

export const familyOf = (productKey) =>
  PRODUCTS.find((p) => p.key === productKey)?.family || null;

/* Constructeurs */
const S = (k, l, o, x = {}) => ({ k, l, t: "single", o, ...x });
const M = (k, l, o, x = {}) => ({ k, l, t: "multi", o, ...x });
const T = (k, l, x = {}) => ({ k, l, t: "text", ...x });
const D = (k, l, x = {}) => ({ k, l, t: "measure", ...x });

/* Conditions */
const notNew = (c) => !!c.install && c.install !== "neuf";
const reno = (c) => c.install === "renovation";
const is = (c, k, v) => c.a[k] === v;
const incl = (c, k, txt) => {
  const v = c.a[k];
  return Array.isArray(v) ? v.some((x) => x.includes(txt)) : String(v || "").includes(txt);
};

/* Listes communes */
const SIDE = ["Gauche", "Droite"];
const MAT = ["PVC", "Aluminium", "Bois", "Acier", "Autre"];
const SUPPORT = ["Maçonnerie", "Béton", "Bois", "Ossature", "Autre"];
const WORKS = [
  "Dépose et évacuation",
  "Reprises de maçonnerie",
  "Calfeutrement / étanchéité",
  "Habillage intérieur",
  "Habillage extérieur",
  "Finitions",
];
const YN = ["Oui", "Non"];
const OPEN_TO = ["Vers l’intérieur", "Vers l’extérieur"];

const works = { title: "Travaux associés", fields: [M("travaux", "Travaux prévus", WORKS)] };

/* ------------------------------------------------------------------
   FAMILLES
------------------------------------------------------------------ */

export const FORMS = {
  /* ---------------- PORTE D'ENTRÉE ---------------- */
  porte: {
    grid: true,
    refFace: "Côtés et sens d’ouverture vus de l’intérieur du logement (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("type", "Type de porte", ["Porte d’entrée", "Porte de service", "Autre"]),
          S("vantaux", "Nombre de vantaux", ["1 vantail", "2 vantaux", "Autre"]),
          S("remplissage", "Remplissage", ["Pleine", "Vitrée", "Semi-vitrée"]),
          S("fixes", "Parties fixes", ["Aucune", "Latérales", "Imposte", "Latérales et imposte"]),
          S("matiere", "Matériau", MAT),
          T("couleurInt", "Couleur intérieure"),
          T("couleurExt", "Couleur extérieure"),
          T("gamme", "Gamme / modèle (si connu)"),
        ],
      },
      {
        title: "Existant",
        fields: [
          S("support", "Nature du support", SUPPORT),
          S("dormant", "État de l’ancien dormant", ["Bon état", "Dégradé", "À déposer"], { show: notNew }),
          M("existant", "Éléments existants", ["Tapées", "Couvre-joints", "Habillages", "Seuil existant"]),
          S("seuil", "État du seuil", ["Bon état", "Dégradé", "À remplacer"]),
          T("defauts", "Défauts constatés", { ph: "Déformation, humidité…" }),
        ],
      },
      {
        title: "Ouverture et quincaillerie",
        fields: [
          S("ouvre", "Ouverture", OPEN_TO),
          S("paumelles", "Paumelles côté", SIDE),
          S("poignee", "Poignée côté", SIDE),
          S("principal", "Vantail principal", SIDE, { show: (c) => is(c, "vantaux", "2 vantaux") }),
          S("serrure", "Verrouillage", ["1 point", "3 points", "5 points", "Autre"]),
          T("cylindre", "Cylindre / béquille / tirage"),
          M("acc", "Accessoires", ["Entrebâilleur", "Ferme-porte", "Contrôle d’accès"]),
        ],
      },
      {
        title: "Vitrage",
        fields: [
          T("vitrage", "Type de vitrage", { show: (c) => !!c.a.remplissage && c.a.remplissage !== "Pleine" }),
          T("decor", "Décor / petits bois", { show: (c) => !!c.a.remplissage && c.a.remplissage !== "Pleine" }),
        ],
      },
      works,
    ],
    measures: [
      D("epMur", "Épaisseur du mur / tableau"),
      D("passL", "Largeur de passage"),
      D("passH", "Hauteur de passage"),
      D("dormL", "Largeur de l’ancien dormant", { show: reno }),
      D("dormH", "Hauteur de l’ancien dormant", { show: reno }),
      D("seuilH", "Hauteur du seuil", { small: true }),
      D("impH", "Hauteur de l’imposte", { show: (c) => incl(c, "fixes", "mposte") }),
      D("fixL", "Largeur d’une partie fixe latérale", { show: (c) => incl(c, "fixes", "atérales") }),
    ],
  },

  /* ---------------- FENÊTRE / PORTE-FENÊTRE ---------------- */
  fenetre: {
    grid: true,
    refFace: "Côtés et sens d’ouverture vus de l’intérieur du logement (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("vantaux", "Nombre de vantaux", ["1", "2", "3", "4 ou plus"]),
          S("meca", "Ouverture", ["Oscillo-battant", "À la française", "Soufflet", "Fixe", "Autre"]),
          S("fixes", "Partie fixe ou imposte", ["Non", "Oui"]),
          S("matiere", "Matière", MAT),
          T("couleurInt", "Couleur intérieure"),
          T("couleurExt", "Couleur extérieure"),
          T("vitrage", "Type de vitrage"),
          S("petitsbois", "Petits bois / croisillons", YN),
          T("gamme", "Gamme (si connue)"),
        ],
      },
      {
        title: "Existant",
        fields: [
          S("support", "Nature du support", SUPPORT),
          S("appui", "Appui", ["Maçonné", "Préfabriqué", "Aucun", "Autre"]),
          S("volet", "Volet roulant existant", ["Aucun", "Coffre intérieur", "Coffre extérieur", "Coffre tunnel"]),
          S("dormant", "Ancien dormant", ["À conserver", "À déposer"], { show: notNew }),
          M("existant", "Éléments existants", ["Tapées", "Couvre-joints", "Habillages", "Bavette"]),
          T("defauts", "Défauts constatés"),
        ],
      },
      {
        title: "Ouverture",
        fields: [
          S("ouvre", "Ouverture", OPEN_TO, { show: (c) => c.a.meca !== "Fixe" }),
          S("paumelles", "Paumelles côté", SIDE, { show: (c) => !!c.a.meca && c.a.meca !== "Fixe" }),
          S("poignee", "Poignée côté", SIDE, { show: (c) => !!c.a.meca && c.a.meca !== "Fixe" }),
          S("principal", "Vantail principal", SIDE, {
            show: (c) => !!c.a.vantaux && c.a.vantaux !== "1",
          }),
        ],
      },
      {
        title: "Exigences et options",
        fields: [
          M("opts", "Options", [
            "Grilles de ventilation",
            "Vitrage dépoli",
            "Exigence acoustique",
            "Exigence thermique",
          ]),
        ],
      },
      works,
    ],
    measures: [
      D("profT", "Profondeur du tableau"),
      D("epMur", "Épaisseur du mur"),
      D("dormL", "Largeur de l’ancien dormant", { show: reno }),
      D("dormH", "Hauteur de l’ancien dormant", { show: reno }),
      D("allege", "Hauteur d’allège", { show: (c) => c.product === "fenetres" }),
      D("seuilH", "Hauteur du seuil", { small: true, show: (c) => c.product === "portes-fenetres" }),
      D("coffreL", "Largeur du coffre existant", { show: (c) => !!c.a.volet && c.a.volet !== "Aucun" }),
      D("coffreH", "Hauteur du coffre existant", { show: (c) => !!c.a.volet && c.a.volet !== "Aucun" }),
      D("fixL", "Largeur de la partie fixe / imposte", { show: (c) => is(c, "fixes", "Oui") }),
    ],
  },

  /* ---------------- BAIE COULISSANTE ---------------- */
  baie: {
    grid: true,
    refFace: "Côtés et sens de refoulement vus de l’intérieur du logement (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("type", "Type", ["Coulissante", "Galandage"]),
          S("vantaux", "Nombre de vantaux", ["2", "3", "4", "Autre"]),
          S("rails", "Nombre de rails", ["2", "3", "4"]),
          T("fixesMob", "Vantaux fixes et mobiles", { ph: "1 fixe, 1 mobile" }),
          S("refoul", "Sens de refoulement", ["Vers la gauche", "Vers la droite", "Central", "Des deux côtés"]),
          S("matiere", "Matière", MAT),
          T("couleurInt", "Couleur intérieure"),
          T("couleurExt", "Couleur extérieure"),
          T("vitrage", "Type de vitrage"),
          T("poignee", "Poignée et verrouillage"),
        ],
      },
      {
        title: "Existant",
        fields: [
          S("support", "Nature du support", SUPPORT),
          S("seuil", "Configuration du seuil", ["Standard", "À rupture / accessibilité", "Encastré", "Autre"]),
          S("coffre", "Coffre de volet présent", YN),
          S("dormant", "Ancien dormant", ["À conserver", "À déposer"], { show: notNew }),
          T("defauts", "Défauts constatés"),
        ],
      },
      works,
    ],
    measures: [
      D("passL", "Largeur de passage"),
      D("passH", "Hauteur de passage"),
      D("profRails", "Profondeur disponible pour les rails"),
      D("seuilH", "Hauteur du seuil", { small: true }),
      D("retG", "Retour de maçonnerie gauche", { small: true }),
      D("retD", "Retour de maçonnerie droit", { small: true }),
      D("coffreL", "Largeur du coffre", { show: (c) => is(c, "coffre", "Oui") }),
      D("coffreH", "Hauteur du coffre", { show: (c) => is(c, "coffre", "Oui") }),
      D("galL", "Largeur de la réservation de galandage", { show: (c) => is(c, "type", "Galandage") }),
      D("galH", "Hauteur de la réservation de galandage", { show: (c) => is(c, "type", "Galandage") }),
    ],
  },

  /* ---------------- VOLET ROULANT ---------------- */
  volet: {
    grid: true,
    refFace: "Côté de manœuvre vu de l’intérieur du logement (convention à valider).",
    sections: [
      {
        title: "Type de volet",
        fields: [
          S("projet", "Projet", ["Volet neuf", "Remplacement"]),
          S("posev", "Pose", ["Sous linteau", "En façade", "Autre"]),
          S("coffre", "Coffre", ["Intérieur", "Extérieur", "Intégré"]),
          S("assoc", "Volet", ["Indépendant", "Associé à une fenêtre"]),
          S("existantV", "Installation existante", ["Conservée", "Déposée", "Sans objet"]),
          S("support", "Nature du support", SUPPORT),
        ],
      },
      {
        title: "Manœuvre et motorisation",
        fields: [
          S("manoeuvre", "Manœuvre", ["Manuelle", "Motorisée"]),
          S("cote", "Côté de manœuvre", SIDE, { show: (c) => is(c, "manoeuvre", "Manuelle") }),
          S("commande", "Commande", ["Filaire", "Radio", "Autre"], { show: (c) => is(c, "manoeuvre", "Motorisée") }),
          S("centr", "Type de commande", ["Individuelle", "Centralisée"], {
            show: (c) => is(c, "manoeuvre", "Motorisée"),
          }),
          T("posCmd", "Position de la commande", { show: (c) => is(c, "manoeuvre", "Motorisée") }),
          S("alim", "Alimentation électrique", ["Présente", "Absente", "À prévoir"], {
            show: (c) => is(c, "manoeuvre", "Motorisée"),
          }),
          T("moteur", "Référence moteur (si connue)", { show: (c) => is(c, "manoeuvre", "Motorisée") }),
        ],
      },
      {
        title: "Éléments du produit",
        fields: [
          T("tablier", "Type et finition du tablier"),
          T("couleur", "Couleur"),
          T("lame", "Lame finale et accessoires"),
          T("obstacles", "Obstacles et contraintes de fixation"),
        ],
      },
      works,
    ],
    measures: [
      D("hautTot", "Hauteur totale nécessaire au tablier"),
      D("coffreL", "Largeur du coffre"),
      D("coffreH", "Hauteur du coffre"),
      D("coffreP", "Profondeur du coffre"),
      D("coulisses", "Dimension des coulisses"),
      D("espaceH", "Espace disponible au-dessus de la baie"),
    ],
  },

  /* ---------------- PORTE DE GARAGE ---------------- */
  garage: {
    grid: false,
    refFace: "Côtés vus de l’intérieur du garage (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("type", "Type de porte", ["Sectionnelle", "Basculante", "Enroulable", "Battante", "Autre"]),
          S("matiere", "Matériau", MAT),
          T("couleur", "Couleur"),
          S("portillon", "Portillon intégré", YN),
          S("hublots", "Hublots / vitrages", YN),
        ],
      },
      {
        title: "Existant et contraintes",
        fields: [
          S("support", "Nature du support", SUPPORT),
          S("ancienne", "Ancienne porte", ["À déposer", "À conserver", "Sans objet"]),
          T("obstacles", "Obstacles (gaines, rails, éclairage…)"),
        ],
      },
      {
        title: "Motorisation",
        fields: [
          S("motor", "Motorisation", ["Non", "Oui"]),
          S("alim", "Alimentation électrique", ["Présente", "Absente", "À prévoir"], {
            show: (c) => is(c, "motor", "Oui"),
          }),
          T("commande", "Commandes (télécommande, clavier…)", { show: (c) => is(c, "motor", "Oui") }),
        ],
      },
      works,
    ],
    measures: [
      D("largeur", "Largeur de la baie", { req: true }),
      D("hauteur", "Hauteur de la baie", { req: true }),
      D("retombee", "Retombée de linteau", { small: true }),
      D("ecoinG", "Écoinçon gauche", { small: true }),
      D("ecoinD", "Écoinçon droit", { small: true }),
      D("refoul", "Profondeur de refoulement disponible"),
      D("plafond", "Hauteur sous plafond"),
    ],
  },

  /* ---------------- PORTAIL ---------------- */
  portail: {
    grid: false,
    refFace: "Sens d’ouverture vu de l’extérieur, depuis la voie (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("type", "Type", ["Battant", "Coulissant"]),
          S("vantaux", "Nombre de vantaux", ["1", "2"], { show: (c) => is(c, "type", "Battant") }),
          S("ouvre", "Ouverture", OPEN_TO, { show: (c) => is(c, "type", "Battant") }),
          S("refoulC", "Côté de refoulement", SIDE, { show: (c) => is(c, "type", "Coulissant") }),
          S("matiere", "Matière", ["Aluminium", "Acier", "PVC", "Bois", "Autre"]),
          T("couleur", "Couleur et finition"),
        ],
      },
      {
        title: "Existant et site",
        fields: [
          S("piliers", "Piliers", ["Existants", "À créer", "Aucun"]),
          S("pente", "Pente ou dénivelé", YN),
          T("obstacles", "Obstacles (arbres, murs, réseaux…)"),
        ],
      },
      {
        title: "Motorisation",
        fields: [
          S("motor", "Motorisation", ["Non", "Oui"]),
          S("alim", "Alimentation électrique", ["Présente", "Absente", "À prévoir"], {
            show: (c) => is(c, "motor", "Oui"),
          }),
          T("acc", "Accessoires (interphone, feux, clavier…)", { show: (c) => is(c, "motor", "Oui") }),
        ],
      },
      works,
    ],
    measures: [
      D("largeur", "Largeur de passage", { req: true }),
      D("hauteur", "Hauteur", { req: true }),
      D("entraxe", "Entraxe des piliers"),
      D("section", "Section des piliers"),
      D("refoul", "Refoulement disponible", { show: (c) => is(c, "type", "Coulissant") }),
      D("denivele", "Dénivelé", { small: true, show: (c) => is(c, "pente", "Oui") }),
    ],
  },

  /* ---------------- STORE ---------------- */
  store: {
    grid: false,
    refFace: "Côté de commande vu de l’intérieur (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("pos", "Emplacement", ["Intérieur", "Extérieur"]),
          S("type", "Type de store", ["Store banne", "Store vertical / screen", "Enrouleur", "Autre"]),
          S("commande", "Commande", ["Manuelle", "Motorisée"]),
          T("toile", "Toile / coloris"),
          T("armature", "Coloris de l’armature"),
        ],
      },
      {
        title: "Fixation et contraintes",
        fields: [
          S("support", "Support de fixation", SUPPORT),
          S("fixation", "Fixation", ["En façade", "Sous plafond / linteau", "Entre tableaux", "Autre"]),
          T("exposition", "Exposition et contraintes", { ph: "Vent, orientation…" }),
          S("alim", "Alimentation électrique", ["Présente", "Absente", "À prévoir"], {
            show: (c) => is(c, "commande", "Motorisée"),
          }),
        ],
      },
      works,
    ],
    measures: [
      D("largeur", "Largeur", { req: true }),
      D("avancee", "Avancée / projection", { req: true, show: (c) => is(c, "type", "Store banne") }),
      D("hauteur", "Hauteur de pose"),
      D("encomb", "Encombrement disponible"),
    ],
  },

  /* ---------------- PERGOLA ---------------- */
  pergola: {
    grid: false,
    refFace: "Positions repérées depuis la façade de la maison (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("implant", "Implantation", ["Adossée", "Autoportée"]),
          S("toit", "Couverture", ["Lames orientables", "Toile", "Panneaux pleins", "Autre"]),
          T("couleur", "Couleur et finition"),
          T("poteaux", "Nombre et position des poteaux"),
        ],
      },
      {
        title: "Support et site",
        fields: [
          S("support", "Nature des supports / sol", ["Dalle béton", "Terrasse bois", "Terre / gazon", "Carrelage", "Autre"]),
          S("eaux", "Évacuation des eaux", ["Prévue", "À prévoir", "Sans objet"]),
          T("obstacles", "Obstacles (arbres, réseaux, murs…)"),
        ],
      },
      {
        title: "Motorisation",
        fields: [
          S("motor", "Motorisation", ["Non", "Oui"]),
          S("alim", "Alimentation électrique", ["Présente", "Absente", "À prévoir"], {
            show: (c) => is(c, "motor", "Oui"),
          }),
        ],
      },
      works,
    ],
    measures: [
      D("largeur", "Largeur", { req: true }),
      D("profondeur", "Profondeur", { req: true }),
      D("hauteur", "Hauteur", { req: true }),
      D("hauteurMur", "Hauteur de fixation au mur", { show: (c) => is(c, "implant", "Adossée") }),
    ],
  },

  /* ---------------- CLÔTURE ---------------- */
  cloture: {
    grid: false,
    refFace: "Côtés repérés depuis la voie (convention à valider).",
    sections: [
      {
        title: "Configuration",
        fields: [
          S("type", "Type de clôture", ["Grillage", "Panneaux rigides", "Lames / bois", "Alu / acier", "Autre"]),
          T("couleur", "Couleur et finition"),
          S("poteaux", "Poteaux", ["À fournir", "Existants", "À sceller", "À fixer sur platine"]),
          S("pente", "Terrain en pente", YN),
        ],
      },
      {
        title: "Site",
        fields: [
          S("support", "Support / sol", ["Terre", "Muret", "Dalle béton", "Autre"]),
          T("obstacles", "Obstacles (arbres, réseaux, mitoyen…)"),
        ],
      },
      works,
    ],
    measures: [
      D("longueur", "Longueur totale", { req: true }),
      D("hauteur", "Hauteur", { req: true }),
      D("entraxe", "Entraxe des poteaux"),
      D("denivele", "Dénivelé", { small: true, show: (c) => is(c, "pente", "Oui") }),
    ],
  },
};
