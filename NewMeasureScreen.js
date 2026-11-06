import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Switch,
  Alert,
  KeyboardAvoidingView,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";

/* ------------------------------------------------------------------
   TOKENS (mêmes que les autres écrans)
------------------------------------------------------------------ */

const COLORS = {
  brand: "#00323A",
  surface: "#073F48",
  accent: "#1E7F8C",
  white: "#FFFFFF",
  grid: "rgba(255,255,255,0.035)",
  textSoft: "rgba(255,255,255,0.72)",
  placeholder: "rgba(255,255,255,0.42)",
  fill: "rgba(255,255,255,0.07)",
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
  error: "#FFB4A9",
  warn: "#FFD99A",
};

const CELL = 28;
const SIDE = 24;
const ENTER_DURATION = 280;
const ENTER_OFFSET = 12;

/* ------------------------------------------------------------------
   DONNÉES MÉTIER (configurables : aucune cote de fabrication ici)
------------------------------------------------------------------ */

const PRODUCTS = [
  { key: "fenetres", label: "Fenêtre", prefix: "FEN" },
  { key: "portes-fenetres", label: "Porte-fenêtre", prefix: "PF" },
  { key: "baies-coulissantes", label: "Baie coulissante", prefix: "BAIE" },
  { key: "portes-entree", label: "Porte d’entrée", prefix: "PEN" },
  { key: "volets-roulants", label: "Volet roulant", prefix: "VR" },
  { key: "stores", label: "Store", prefix: "STO" },
  { key: "portails", label: "Portail", prefix: "POR" },
  { key: "clotures", label: "Clôture", prefix: "CLO" },
];

// Le type de pose est une donnée structurée (contexte de remplacement)
const INSTALLS = [
  { key: "renovation", label: "Rénovation sur dormant existant", hint: "On conserve l’ancien dormant." },
  { key: "depose-totale", label: "Dépose totale", hint: "L’ancien ouvrage est entièrement déposé." },
  { key: "neuf", label: "Pose en neuf", hint: "Aucun ouvrage existant." },
  { key: "autre", label: "Autre configuration", hint: "À préciser dans les observations." },
];

const UNITS = [
  { value: "mm", label: "mm" },
  { value: "cm", label: "cm" },
];

// 3 largeurs + 3 hauteurs : modèle de base du relevé
const MEASURES = [
  { key: "L1", axis: "width", name: "Largeur", pos: "Haut" },
  { key: "L2", axis: "width", name: "Largeur", pos: "Milieu" },
  { key: "L3", axis: "width", name: "Largeur", pos: "Bas" },
  { key: "H1", axis: "height", name: "Hauteur", pos: "Gauche" },
  { key: "H2", axis: "height", name: "Hauteur", pos: "Centre" },
  { key: "H3", axis: "height", name: "Hauteur", pos: "Droite" },
];

const SEVERITIES = [
  { key: "info", label: "Information", hint: "Ne bloque pas le dossier." },
  { key: "watch", label: "À vérifier", hint: "Cote ou point à revérifier." },
  { key: "blocking", label: "Bloquante", hint: "Empêche de terminer le relevé." },
];

const STEPS = ["Chantier", "Ouvrage", "Mesures", "Détails"];

/* ------------------------------------------------------------------
   OUTILS
------------------------------------------------------------------ */

const pad = (n, l = 3) => String(n).padStart(l, "0");

// Texte saisi → millimètres entiers (stockage dans une unité unique)
const toMm = (text, unit) => {
  const t = String(text || "").trim().replace(/\s/g, "").replace(",", ".");
  if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = parseFloat(t);
  return Math.round(unit === "cm" ? n * 10 : n);
};

// Millimètres → texte affiché (conversion uniquement à l’affichage)
const fromMm = (mm, unit) => {
  if (mm == null) return "";
  if (unit === "cm") return String(Math.round(mm) / 10).replace(".", ",");
  return String(Math.round(mm));
};

const fmt = (mm, unit) => {
  const v = fromMm(mm, unit);
  return v ? `${v} ${unit}` : "—";
};

const cleanInput = (raw, unit) => {
  const s = String(raw).replace(/[^\d.,]/g, "");
  if (unit === "mm") return s.replace(/[.,].*$/, "");
  const m = s.match(/^\d*[.,]?\d{0,1}/);
  return m ? m[0] : "";
};

const spread = (vals) => {
  const v = vals.filter((x) => x != null);
  return v.length >= 2 ? Math.max(...v) - Math.min(...v) : null;
};

/* ------------------------------------------------------------------
   FOND ET PICTOGRAMMES (dessinés en vues : aucune dépendance)
------------------------------------------------------------------ */

const Grid = memo(function Grid({ width, height }) {
  const cols = Math.ceil(width / CELL) + 1;
  const rows = Math.ceil(height / CELL) + 1;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: cols }, (_, i) => (
        <View key={`v${i}`} style={[styles.gridLine, { top: 0, bottom: 0, left: i * CELL, width: 1 }]} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View key={`h${i}`} style={[styles.gridLine, { left: 0, right: 0, top: i * CELL, height: 1 }]} />
      ))}
    </View>
  );
});

const Hidden = ({ style, children }) => (
  <View accessible={false} importantForAccessibility="no-hide-descendants" style={style}>
    {children}
  </View>
);

const BackIcon = () => <Hidden style={styles.back} />;

const MicIcon = ({ color = COLORS.white }) => (
  <Hidden style={icon.box}>
    <View style={[icon.micBody, { borderColor: color }]} />
    <View style={[icon.micArc, { borderColor: color }]} />
    <View style={[icon.micBase, { backgroundColor: color }]} />
  </Hidden>
);

const icon = StyleSheet.create({
  box: { width: 22, height: 22, alignItems: "center" },
  micBody: { width: 9, height: 13, borderRadius: 5, borderWidth: 2 },
  micArc: {
    position: "absolute",
    top: 7,
    width: 15,
    height: 9,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 2,
    borderTopWidth: 0,
  },
  micBase: { position: "absolute", bottom: 1, width: 8, height: 2, borderRadius: 1 },
});

/* ------------------------------------------------------------------
   BLOCS
------------------------------------------------------------------ */

const Label = ({ children }) => (
  <Text maxFontSizeMultiplier={1.3} style={styles.label}>
    {children}
  </Text>
);

const Heading = ({ title, text }) => (
  <View style={styles.heading}>
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.h1}>
      {title}
    </Text>
    {!!text && (
      <Text maxFontSizeMultiplier={1.3} style={styles.lead}>
        {text}
      </Text>
    )}
  </View>
);

const Field = memo(
  React.forwardRef(function Field({ label, error, helper, style, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.block}>
        <Label>{label}</Label>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={COLORS.placeholder}
          selectionColor={COLORS.white}
          keyboardAppearance="dark"
          maxFontSizeMultiplier={1.3}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError, style]}
          {...rest}
        />
        {!!error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : !!helper ? (
          <Text style={styles.helper}>{helper}</Text>
        ) : null}
      </View>
    );
  })
);

const Choice = memo(function Choice({ title, hint, on, onPress, role = "radio" }) {
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={{ checked: on }}
      accessibilityLabel={hint ? `${title}. ${hint}` : title}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
      style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
    >
      <View style={styles.optionText}>
        <Text maxFontSizeMultiplier={1.3} style={[styles.optionTitle, on && styles.optionTitleOn]}>
          {title}
        </Text>
        {!!hint && (
          <Text maxFontSizeMultiplier={1.3} style={[styles.optionHint, on && styles.optionHintOn]}>
            {hint}
          </Text>
        )}
      </View>
      <Hidden style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</Hidden>
    </Pressable>
  );
});

const MeasureRow = memo(function MeasureRow({ m, value, unit, voice, error, onChange, inputRef, onNext }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.mRow}>
      <View style={styles.mLabel}>
        <Text maxFontSizeMultiplier={1.25} style={styles.mKey}>
          {m.key}
        </Text>
        <Text maxFontSizeMultiplier={1.25} style={styles.mPos}>
          {m.pos}
        </Text>
      </View>
      <View style={styles.mInputWrap}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(t) => onChange(m.key, cleanInput(t, unit))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onNext}
          keyboardType={unit === "cm" ? "decimal-pad" : "number-pad"}
          returnKeyType="next"
          blurOnSubmit={false}
          placeholder="—"
          placeholderTextColor={COLORS.placeholder}
          selectionColor={COLORS.white}
          keyboardAppearance="dark"
          maxFontSizeMultiplier={1.3}
          accessibilityLabel={`${m.name} ${m.pos.toLowerCase()}, en ${unit === "cm" ? "centimètres" : "millimètres"}${
            voice ? ", dicté, à confirmer" : ""
          }`}
          style={[
            styles.mInput,
            focused && styles.inputFocused,
            voice && styles.mInputVoice,
            !!error && styles.inputError,
          ]}
        />
        <Text accessible={false} style={styles.mUnit}>
          {unit}
        </Text>
      </View>
    </View>
  );
});

/* ------------------------------------------------------------------
   ÉCRAN
------------------------------------------------------------------ */

/**
 * Props
 *  - projects        : chantiers existants [{ id, name, client?, address?, place?, measureCount? }]
 *  - products        : clés de produits activées dans les Réglages (sinon tous)
 *  - unit            : "mm" | "cm" (unité d’affichage par défaut, Réglages)
 *  - initialProduct  : clé de produit pré-sélectionnée (raccourci de l’accueil)
 *  - initialProjectId: chantier pré-sélectionné
 *  - gapAlert        : écart (en mm) au-delà duquel afficher une vigilance.
 *                      Aucune valeur par défaut : le seuil dépend du produit et de l’entreprise.
 *  - onClose()
 *  - onSave(sheet)   : reçoit la fiche structurée (voir buildSheet)
 *  - onDictate({ mode }) : async, renvoie { measures?: {L1..H3 en mm}, observations?: string }
 *  - onAddPhoto()    : async, renvoie l’uri d’une photo (ou null)
 */
function NewMeasureScreen({
  projects = [],
  products = [],
  unit: defaultUnit = "mm",
  initialProduct,
  initialProjectId,
  gapAlert,
  onClose,
  onSave,
  onDictate,
  onAddPhoto,
}) {
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const enter = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef(null);
  const refs = useRef({});

  // 1. Chantier
  const [projectId, setProjectId] = useState(initialProjectId || (projects.length ? null : "new"));
  const [np, setNp] = useState({ name: "", client: "", address: "" });

  // 2. Ouvrage
  const available = useMemo(() => {
    const list = PRODUCTS.filter((p) => products.includes(p.key));
    return list.length ? list : PRODUCTS;
  }, [products]);
  const [product, setProduct] = useState(
    available.find((p) => p.key === initialProduct)?.key || null
  );
  const [designation, setDesignation] = useState("");
  const [location, setLocation] = useState("");
  const [install, setInstall] = useState(null);

  // 3. Mesures (texte dans l’unité affichée)
  const [unit, setUnit] = useState(defaultUnit === "cm" ? "cm" : "mm");
  const [vals, setVals] = useState({});
  const [voiceKeys, setVoiceKeys] = useState({});
  const [listening, setListening] = useState(false);

  // 4. Détails
  const [notes, setNotes] = useState("");
  const [hasIssue, setHasIssue] = useState(false);
  const [issueText, setIssueText] = useState("");
  const [severity, setSeverity] = useState("watch");
  const [photos, setPhotos] = useState([]);

  const [showErrors, setShowErrors] = useState(false);

  /* Mouvement réduit */
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (!cancelled) setReduceMotion(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo?.({ y: 0, animated: false });
    if (reduceMotion) {
      enter.setValue(1);
      return undefined;
    }
    enter.setValue(0);
    const a = Animated.timing(enter, {
      toValue: 1,
      duration: ENTER_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [step, reduceMotion, enter]);

  const rise = {
    opacity: enter,
    transform: [
      { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [ENTER_OFFSET, 0] }) },
    ],
  };

  /* Données dérivées */
  const project = projects.find((p) => p.id === projectId);
  const prod = PRODUCTS.find((p) => p.key === product);
  const isNew = projectId === "new";

  const ref = useMemo(() => {
    if (!prod) return "";
    const n = (project?.measureCount ?? 0) + 1;
    return `${prod.prefix}-${pad(n)}`;
  }, [prod, project]);

  const mm = useMemo(() => {
    const o = {};
    MEASURES.forEach((m) => (o[m.key] = toMm(vals[m.key], unit)));
    return o;
  }, [vals, unit]);

  const filled = MEASURES.filter((m) => mm[m.key] != null);
  const widths = MEASURES.filter((m) => m.axis === "width").map((m) => mm[m.key]);
  const heights = MEASURES.filter((m) => m.axis === "height").map((m) => mm[m.key]);
  const gapW = spread(widths);
  const gapH = spread(heights);
  const nW = widths.filter((x) => x != null).length;
  const nH = heights.filter((x) => x != null).length;

  // Valeurs manifestement incompatibles avec l’unité (ex. 12 mm ou 120000 mm)
  const implausible = (k) => mm[k] != null && (mm[k] < 50 || mm[k] > 30000);
  const pendingVoice = Object.keys(voiceKeys).filter((k) => voiceKeys[k]).length;

  /* Contrôles : Information / Vigilance / Bloquant */
  const checks = useMemo(() => {
    const out = [];
    if (nW === 0) out.push({ level: "blocking", text: "Aucune largeur relevée." });
    if (nH === 0) out.push({ level: "blocking", text: "Aucune hauteur relevée." });
    if (!install) out.push({ level: "blocking", text: "Type de pose non renseigné." });
    MEASURES.forEach((m) => {
      if (implausible(m.key))
        out.push({
          level: "watch",
          text: `${m.key} (${m.name.toLowerCase()} ${m.pos.toLowerCase()}) : ${fmt(mm[m.key], unit)} semble incompatible avec l’unité. Vérifiez la saisie.`,
        });
    });
    if (nW > 0 && nW < 3) out.push({ level: "info", text: `${nW} largeur sur 3 relevée${nW > 1 ? "s" : ""}.` });
    if (nH > 0 && nH < 3) out.push({ level: "info", text: `${nH} hauteur sur 3 relevée${nH > 1 ? "s" : ""}.` });
    if (gapAlert != null) {
      if (gapW != null && gapW > gapAlert)
        out.push({
          level: "watch",
          text: `Les largeurs diffèrent de ${fmt(gapW, unit)}. Vérifiez les mesures avant de valider.`,
        });
      if (gapH != null && gapH > gapAlert)
        out.push({
          level: "watch",
          text: `Les hauteurs diffèrent de ${fmt(gapH, unit)}. Vérifiez les mesures avant de valider.`,
        });
    }
    if (pendingVoice > 0)
      out.push({
        level: "watch",
        text: `${pendingVoice} cote${pendingVoice > 1 ? "s" : ""} dictée${pendingVoice > 1 ? "s" : ""} à confirmer.`,
      });
    if (hasIssue && issueText.trim() && severity === "blocking")
      out.push({ level: "blocking", text: "Une réserve bloquante reste ouverte." });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nW, nH, install, mm, unit, gapW, gapH, gapAlert, pendingVoice, hasIssue, issueText, severity]);

  const blocking = checks.filter((c) => c.level === "blocking");

  /* Validation par étape */
  const errors = {
    pName: isNew && np.name.trim().length < 2 ? "Indiquez le nom du chantier." : "",
    pick: !isNew && !projectId ? "Choisissez un chantier ou créez-en un." : "",
    product: !product ? "Choisissez le type d’ouvrage." : "",
    install: !install ? "Choisissez le type de pose." : "",
  };
  const stepValid = [
    !errors.pName && !errors.pick,
    !errors.product && !errors.install,
    true,
    true,
  ];

  const next = () => {
    if (!stepValid[step]) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => {
    if (step === 0) return confirmClose();
    setShowErrors(false);
    setStep((s) => s - 1);
  };

  const dirty =
    !!np.name || !!designation || !!location || Object.keys(vals).length > 0 || !!notes || photos.length > 0;

  const confirmClose = () => {
    if (!dirty) return onClose?.();
    Alert.alert("Abandonner ce relevé ?", "Les informations saisies seront perdues.", [
      { text: "Continuer", style: "cancel" },
      { text: "Enregistrer en brouillon", onPress: () => save(false) },
      { text: "Abandonner", style: "destructive", onPress: () => onClose?.() },
    ]);
  };

  /* Mesures */
  const setVal = (k, t) => {
    setVals((v) => ({ ...v, [k]: t }));
    // une saisie manuelle remplace une valeur dictée
    setVoiceKeys((v) => (v[k] ? { ...v, [k]: false } : v));
  };

  const switchUnit = (u) => {
    if (u === unit) return;
    setVals((v) => {
      const o = {};
      MEASURES.forEach((m) => {
        const x = toMm(v[m.key], unit);
        if (x != null) o[m.key] = fromMm(x, u);
      });
      return o;
    });
    setUnit(u);
  };

  const dictate = async () => {
    if (!onDictate) {
      Alert.alert("Dictée vocale", "Cette fonction sera bientôt disponible.");
      return;
    }
    if (listening) return;
    setListening(true);
    try {
      const res = await onDictate({ mode: "continuous", unit });
      if (res?.error) {
        Alert.alert("Dictée vocale", res.error);
        return;
      }
      if (res?.measures) {
        const nv = {};
        const nk = {};
        Object.entries(res.measures).forEach(([k, v]) => {
          if (MEASURES.some((m) => m.key === k) && Number.isFinite(v)) {
            nv[k] = fromMm(Math.round(v), unit);
            nk[k] = true; // proposé, à confirmer
          }
        });
        setVals((v) => ({ ...v, ...nv }));
        setVoiceKeys((v) => ({ ...v, ...nk }));
      }
      if (res?.observations) setNotes((n) => (n ? `${n}\n${res.observations}` : res.observations));
    } catch (e) {
      Alert.alert("Dictée vocale", "La dictée a échoué. Vous pouvez saisir les cotes au clavier.");
    } finally {
      setListening(false);
    }
  };

  const addPhoto = async () => {
    if (!onAddPhoto) {
      Alert.alert("Photos", "Cette fonction sera bientôt disponible.");
      return;
    }
    try {
      const uri = await onAddPhoto();
      if (uri) setPhotos((p) => [...p, uri]);
    } catch (e) {
      Alert.alert("Photos", "Impossible d’ajouter la photo. Réessayez.");
    }
  };

  /* Enregistrement : fiche structurée, cotes en millimètres */
  const buildSheet = (done) => {
    const now = new Date().toISOString();
    const id = `m_${Date.now()}`;
    return {
      id,
      projectId: isNew ? null : projectId,
      newProject: isNew
        ? { name: np.name.trim(), client: np.client.trim(), address: np.address.trim() }
        : null,
      opening: {
        ref,
        designation: designation.trim() || prod?.label || "",
        location: location.trim(),
        product,
        productLabel: prod?.label || "",
        installation: install,
      },
      measurements: MEASURES.filter((m) => mm[m.key] != null).map((m) => ({
        key: m.key,
        axis: m.axis,
        position: m.pos.toLowerCase(),
        valueMm: mm[m.key], // unité de référence unique
        unit: "mm",
        source: voiceKeys[m.key] ? "voice" : "keyboard",
        status: voiceKeys[m.key] ? "pending" : "confirmed",
        recordedAt: now,
      })),
      gaps: { widthMm: gapW, heightMm: gapH }, // information, jamais une cote de fabrication
      observations: notes.trim(),
      issues:
        hasIssue && issueText.trim()
          ? [{ id: `i_${Date.now()}`, description: issueText.trim(), severity, status: "open", createdAt: now }]
          : [],
      photos,
      checks,
      status: done ? "done" : "draft",
      createdAt: now,
      updatedAt: now,
    };
  };

  const save = (done) => {
    if (done && blocking.length) return;
    onSave?.(buildSheet(done));
  };

  const goNext = (k) => {
    const i = MEASURES.findIndex((m) => m.key === k);
    refs.current[MEASURES[i + 1]?.key]?.focus();
  };

  /* ---------------------------------------------------------------
     ÉTAPES
  --------------------------------------------------------------- */

  const renderStep = () => {
    /* 1. CHANTIER */
    if (step === 0)
      return (
        <>
          <Heading
            title="Pour quel chantier ?"
            text="Rattachez ce relevé à un chantier existant ou créez-en un nouveau."
          />

          {projects.length > 0 && (
            <View accessibilityRole="radiogroup" style={styles.options}>
              {projects.map((p) => (
                <Choice
                  key={p.id}
                  title={p.name}
                  hint={[p.client, p.place || p.address].filter(Boolean).join(" · ")}
                  on={projectId === p.id}
                  onPress={() => setProjectId(p.id)}
                />
              ))}
              <Choice
                title="Nouveau chantier"
                hint="Client, adresse du chantier."
                on={isNew}
                onPress={() => setProjectId("new")}
              />
            </View>
          )}

          {!!showErrors && !!errors.pick && (
            <Text accessibilityLiveRegion="polite" style={[styles.error, { marginTop: 10 }]}>
              {errors.pick}
            </Text>
          )}

          {isNew && (
            <View style={projects.length ? styles.newBox : null}>
              <Field
                label="Nom du chantier"
                placeholder="Maison Dupont"
                value={np.name}
                onChangeText={(t) => setNp((x) => ({ ...x, name: t }))}
                error={showErrors ? errors.pName : ""}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => refs.current.client?.focus()}
              />
              <Field
                ref={(el) => (refs.current.client = el)}
                label="Client (facultatif)"
                placeholder="Marc Dupont"
                value={np.client}
                onChangeText={(t) => setNp((x) => ({ ...x, client: t }))}
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => refs.current.address?.focus()}
              />
              <Field
                ref={(el) => (refs.current.address = el)}
                label="Adresse du chantier (facultatif)"
                placeholder="4 rue des Lilas, 78100 Saint-Germain-en-Laye"
                value={np.address}
                onChangeText={(t) => setNp((x) => ({ ...x, address: t }))}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </View>
          )}
        </>
      );

    /* 2. OUVRAGE */
    if (step === 1)
      return (
        <>
          <Heading
            title="Quel ouvrage ?"
            text="Le type d’ouvrage et le type de pose déterminent les mesures à relever."
          />

          <Label>Type d’ouvrage</Label>
          <View style={styles.chips}>
            {available.map((p) => {
              const on = product === p.key;
              return (
                <Pressable
                  key={p.key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={p.label}
                  onPress={() => setProduct(p.key)}
                  android_ripple={{ color: "rgba(255,255,255,0.10)" }}
                  style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
                >
                  <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={[styles.chipText, on && styles.chipTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {showErrors && !!errors.product && <Text style={[styles.error, { marginTop: 8 }]}>{errors.product}</Text>}

          <View style={{ height: 22 }} />

          <Field
            label="Désignation"
            placeholder={prod ? `${prod.label} chambre` : "Fenêtre chambre"}
            value={designation}
            onChangeText={setDesignation}
            autoCapitalize="sentences"
            returnKeyType="next"
            blurOnSubmit={false}
            onSubmitEditing={() => refs.current.location?.focus()}
            helper={ref ? `Référence automatique : ${ref}` : "La référence est créée une fois l’ouvrage choisi."}
          />
          <Field
            ref={(el) => (refs.current.location = el)}
            label="Emplacement (facultatif)"
            placeholder="Étage 1, façade sud"
            value={location}
            onChangeText={setLocation}
            returnKeyType="done"
          />

          <Label>Type de pose</Label>
          <View accessibilityRole="radiogroup" style={styles.options}>
            {INSTALLS.map((o) => (
              <Choice key={o.key} title={o.label} hint={o.hint} on={install === o.key} onPress={() => setInstall(o.key)} />
            ))}
          </View>
          {showErrors && !!errors.install && <Text style={[styles.error, { marginTop: 8 }]}>{errors.install}</Text>}
        </>
      );

    /* 3. MESURES */
    if (step === 2)
      return (
        <>
          <Heading
            title="Mesures"
            text="Relevez chaque cote à sa position. Elles sont conservées une par une, sans moyenne."
          />

          <View style={styles.toolbar}>
            <View accessibilityRole="radiogroup" style={styles.unitSwitch}>
              {UNITS.map((u) => {
                const on = u.value === unit;
                return (
                  <Pressable
                    key={u.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={u.value === "mm" ? "Millimètres" : "Centimètres"}
                    onPress={() => switchUnit(u.value)}
                    style={[styles.unitBtn, on && styles.unitBtnOn]}
                  >
                    <Text maxFontSizeMultiplier={1.2} style={[styles.unitText, on && styles.unitTextOn]}>
                      {u.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dicter les mesures"
              accessibilityState={{ busy: listening }}
              onPress={dictate}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
              style={({ pressed }) => [styles.dictate, listening && styles.dictateOn, pressed && styles.pressed]}
            >
              <MicIcon />
              <Text maxFontSizeMultiplier={1.2} style={styles.dictateText}>
                {listening ? "À l’écoute…" : "Dicter"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.panel}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.25} style={styles.panelTitle}>
              Largeurs
            </Text>
            {MEASURES.filter((m) => m.axis === "width").map((m) => (
              <MeasureRow
                key={m.key}
                m={m}
                unit={unit}
                value={vals[m.key] || ""}
                voice={!!voiceKeys[m.key]}
                error={implausible(m.key)}
                onChange={setVal}
                inputRef={(el) => (refs.current[m.key] = el)}
                onNext={() => goNext(m.key)}
              />
            ))}
            {gapW != null && (
              <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.25} style={styles.gap}>
                Écart entre les largeurs : <Text style={styles.gapStrong}>{fmt(gapW, unit)}</Text>
              </Text>
            )}
          </View>

          <View style={[styles.panel, { marginTop: 14 }]}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.25} style={styles.panelTitle}>
              Hauteurs
            </Text>
            {MEASURES.filter((m) => m.axis === "height").map((m) => (
              <MeasureRow
                key={m.key}
                m={m}
                unit={unit}
                value={vals[m.key] || ""}
                voice={!!voiceKeys[m.key]}
                error={implausible(m.key)}
                onChange={setVal}
                inputRef={(el) => (refs.current[m.key] = el)}
                onNext={() => goNext(m.key)}
              />
            ))}
            {gapH != null && (
              <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.25} style={styles.gap}>
                Écart entre les hauteurs : <Text style={styles.gapStrong}>{fmt(gapH, unit)}</Text>
              </Text>
            )}
          </View>

          {pendingVoice > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirmer les cotes dictées"
              onPress={() => setVoiceKeys({})}
              style={({ pressed }) => [styles.confirmVoice, pressed && styles.pressed]}
            >
              <Text maxFontSizeMultiplier={1.25} style={styles.confirmVoiceText}>
                Confirmer les {pendingVoice} cote{pendingVoice > 1 ? "s" : ""} dictée{pendingVoice > 1 ? "s" : ""}
              </Text>
            </Pressable>
          )}

          <Text style={[styles.helper, { marginTop: 14 }]}>
            Les écarts servent à repérer une irrégularité. La dimension de commande dépend du produit et de la pose :
            elle n’est jamais déduite automatiquement ici.
          </Text>
        </>
      );

    /* 4. DÉTAILS */
    return (
      <>
        <Heading title="Détails et vérification" text="Ajoutez vos observations, une réserve ou des photos." />

        <Field
          label="Observations"
          placeholder="Appui maçonné, volet roulant existant à conserver, mur irrégulier à droite…"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          style={styles.textarea}
        />

        <View style={styles.panel}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: hasIssue }}
            accessibilityLabel="Ajouter une réserve"
            onPress={() => setHasIssue(!hasIssue)}
            style={styles.switchRow}
          >
            <View style={styles.optionText}>
              <Text maxFontSizeMultiplier={1.3} style={styles.rowTitle}>
                Ajouter une réserve
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.rowHint}>
                Support dégradé, cote à revérifier, accès difficile…
              </Text>
            </View>
            <Switch
              value={hasIssue}
              onValueChange={setHasIssue}
              trackColor={{ false: COLORS.line, true: COLORS.white }}
              thumbColor={hasIssue ? COLORS.brand : COLORS.white}
              ios_backgroundColor={COLORS.line}
              accessible={false}
              importantForAccessibility="no-hide-descendants"
            />
          </Pressable>

          {hasIssue && (
            <View style={styles.issueBox}>
              <Field
                label="Description de la réserve"
                placeholder="Présence d’un câble au-dessus du coffre"
                value={issueText}
                onChangeText={setIssueText}
                multiline
                textAlignVertical="top"
                style={styles.textareaSmall}
              />
              <Label>Gravité</Label>
              <View accessibilityRole="radiogroup" style={styles.options}>
                {SEVERITIES.map((s) => (
                  <Choice key={s.key} title={s.label} hint={s.hint} on={severity === s.key} onPress={() => setSeverity(s.key)} />
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 22 }} />
        <Label>Photos</Label>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ajouter une photo"
            onPress={addPhoto}
            style={({ pressed }) => [styles.photoAdd, pressed && styles.pressed]}
          >
            <Text style={styles.photoPlus}>+</Text>
            <Text maxFontSizeMultiplier={1.2} style={styles.photoAddText}>
              Photo
            </Text>
          </Pressable>
          {photos.map((uri, i) => (
            <View key={`${uri}-${i}`} style={styles.photoWrap}>
              <Image source={{ uri }} resizeMode="cover" accessibilityLabel={`Photo ${i + 1}`} style={styles.photo} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer la photo ${i + 1}`}
                onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                hitSlop={8}
                style={styles.photoRemove}
              >
                <Text style={styles.photoRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        {/* RÉCAPITULATIF */}
        <View style={[styles.panel, { marginTop: 24 }]}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.25} style={styles.panelTitle}>
            Récapitulatif
          </Text>
          <Recap k="Chantier" v={isNew ? np.name.trim() || "Nouveau chantier" : project?.name} />
          <Recap k="Ouvrage" v={`${ref}${designation.trim() ? ` · ${designation.trim()}` : prod ? ` · ${prod.label}` : ""}`} />
          <Recap k="Pose" v={INSTALLS.find((i) => i.key === install)?.label} />
          <Recap
            k="Cotes"
            v={filled.length ? `${filled.length} sur 6 relevée${filled.length > 1 ? "s" : ""} (${unit})` : "Aucune"}
            last
          />
        </View>

        {checks.length > 0 && (
          <View accessibilityLiveRegion="polite" style={styles.checks}>
            {checks.map((c, i) => (
              <View key={i} style={styles.checkRow}>
                <View
                  accessible={false}
                  style={[
                    styles.checkDot,
                    c.level === "blocking" && styles.dotBlocking,
                    c.level === "watch" && styles.dotWatch,
                  ]}
                />
                <Text maxFontSizeMultiplier={1.25} style={styles.checkText}>
                  <Text style={styles.checkLevel}>
                    {c.level === "blocking" ? "Bloquant" : c.level === "watch" ? "Vigilance" : "Information"}
                    {" · "}
                  </Text>
                  {c.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </>
    );
  };

  const last = step === STEPS.length - 1;

  return (
    <View style={styles.root}>
      <Grid width={width} height={height} />

      {/* EN-TÊTE */}
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? "Fermer" : "Étape précédente"}
          onPress={back}
          hitSlop={6}
          style={({ pressed }) => [styles.topBtn, pressed && styles.pressed]}
        >
          {step === 0 ? <Text style={styles.closeX}>×</Text> : <BackIcon />}
        </Pressable>

        <View style={styles.topTitleWrap}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.topTitle}>
            Nouveau relevé
          </Text>
          <Text maxFontSizeMultiplier={1.2} style={styles.topStep}>
            Étape {step + 1} sur {STEPS.length} · {STEPS[step]}
          </Text>
        </View>

        <View style={styles.topBtn} />
      </View>

      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Étape ${step + 1} sur ${STEPS.length}`}
        accessibilityValue={{ min: 1, max: STEPS.length, now: step + 1 }}
        style={styles.progress}
      >
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.seg, i <= step && styles.segOn]} />
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Animated.View style={rise}>{renderStep()}</Animated.View>
        </ScrollView>

        {/* PIED : actions */}
        <View style={styles.footer}>
          {last ? (
            <>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enregistrer en brouillon"
                onPress={() => save(false)}
                android_ripple={{ color: "rgba(255,255,255,0.10)" }}
                style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
              >
                <Text maxFontSizeMultiplier={1.2} style={styles.btnGhostText}>
                  Brouillon
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Terminer le relevé"
                accessibilityHint={blocking.length ? "Indisponible : des points bloquants restent à traiter" : undefined}
                accessibilityState={{ disabled: blocking.length > 0 }}
                onPress={() => save(true)}
                android_ripple={{ color: "rgba(255,255,255,0.15)" }}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { flex: 1.4 },
                  blocking.length > 0 && styles.btnIdle,
                  pressed && styles.btnPressed,
                ]}
              >
                <Text maxFontSizeMultiplier={1.2} style={styles.btnPrimaryText}>
                  Terminer le relevé
                </Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continuer"
              onPress={next}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            >
              <Text maxFontSizeMultiplier={1.2} style={styles.btnPrimaryText}>
                Continuer
              </Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const Recap = ({ k, v, last }) => (
  <View style={[styles.recap, !last && styles.recapDivider]}>
    <Text maxFontSizeMultiplier={1.25} style={styles.recapK}>
      {k}
    </Text>
    <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={styles.recapV}>
      {v || "—"}
    </Text>
  </View>
);

export default NewMeasureScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  flex: { flex: 1 },
  gridLine: { position: "absolute", backgroundColor: COLORS.grid },
  pressed: { opacity: 0.65 },

  /* En-tête */
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SIDE - 8,
    paddingTop: 8,
  },
  topBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  closeX: { color: COLORS.white, fontSize: 32, lineHeight: 34 },
  back: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: COLORS.white,
    transform: [{ rotate: "45deg" }],
    marginLeft: 4,
  },
  topTitleWrap: { flex: 1, alignItems: "center" },
  topTitle: { color: COLORS.white, fontSize: 17, lineHeight: 22, fontWeight: "700" },
  topStep: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 1 },

  progress: { flexDirection: "row", gap: 6, paddingHorizontal: SIDE, marginTop: 6, marginBottom: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.lineSoft },
  segOn: { backgroundColor: COLORS.white },

  scroll: { paddingHorizontal: SIDE, paddingTop: 20, paddingBottom: 28 },

  heading: { marginBottom: 22 },
  h1: { color: COLORS.white, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  lead: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, marginTop: 6 },

  /* Champs */
  block: { marginBottom: 18 },
  label: { color: COLORS.white, fontSize: 14, lineHeight: 19, fontWeight: "600", marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 16,
    color: COLORS.white,
    fontSize: 16,
  },
  inputFocused: { borderColor: COLORS.white },
  inputError: { borderColor: COLORS.error },
  error: { color: COLORS.error, fontSize: 13, lineHeight: 18, marginTop: 6 },
  helper: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginTop: 6 },
  textarea: { height: 120, paddingTop: 14 },
  textareaSmall: { height: 88, paddingTop: 14 },

  /* Choix */
  options: { gap: 10 },
  option: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  optionText: { flex: 1 },
  optionTitle: { color: COLORS.white, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  optionTitleOn: { color: COLORS.brand },
  optionHint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 2 },
  optionHintOn: { color: "rgba(0,50,58,0.7)" },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { borderColor: COLORS.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.brand },
  newBox: { marginTop: 22 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
  },
  chipOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  chipText: { color: COLORS.white, fontSize: 15, lineHeight: 19, fontWeight: "500" },
  chipTextOn: { color: COLORS.brand, fontWeight: "700" },

  /* Mesures */
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  unitSwitch: {
    flexDirection: "row",
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    padding: 3,
  },
  unitBtn: { minWidth: 56, paddingHorizontal: 14, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  unitBtnOn: { backgroundColor: COLORS.white },
  unitText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
  unitTextOn: { color: COLORS.brand, fontWeight: "700" },
  dictate: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
  },
  dictateOn: { opacity: 0.85 },
  dictateText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },

  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  panelTitle: { color: COLORS.white, fontSize: 17, lineHeight: 23, fontWeight: "700", marginBottom: 8 },

  mRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  mLabel: { width: 96, flexDirection: "row", alignItems: "baseline", gap: 8 },
  mKey: { color: COLORS.white, fontSize: 15, fontWeight: "700", width: 24 },
  mPos: { color: COLORS.textSoft, fontSize: 14 },
  mInputWrap: { flex: 1, justifyContent: "center" },
  mInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingLeft: 14,
    paddingRight: 44,
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  mInputVoice: { borderColor: COLORS.warn, borderStyle: "dashed" },
  mUnit: { position: "absolute", right: 14, color: COLORS.textSoft, fontSize: 14 },
  gap: { color: COLORS.textSoft, fontSize: 13.5, lineHeight: 19, marginTop: 8 },
  gapStrong: { color: COLORS.white, fontWeight: "700" },
  confirmVoice: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.warn,
    marginTop: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmVoiceText: { color: COLORS.warn, fontSize: 15, fontWeight: "600" },

  /* Détails */
  switchRow: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { color: COLORS.white, fontSize: 15.5, lineHeight: 21, fontWeight: "600" },
  rowHint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 2 },
  issueBox: { marginTop: 14, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.lineSoft },

  photos: { gap: 10, paddingRight: SIDE },
  photoAdd: {
    width: 88,
    height: 88,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlus: { color: COLORS.white, fontSize: 26, lineHeight: 28 },
  photoAddText: { color: COLORS.textSoft, fontSize: 13 },
  photoWrap: { width: 88, height: 88 },
  photo: { width: 88, height: 88, borderRadius: 14, backgroundColor: COLORS.fill },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveText: { color: COLORS.white, fontSize: 18, lineHeight: 20 },

  recap: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 },
  recapDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft },
  recapK: { color: COLORS.textSoft, fontSize: 14 },
  recapV: { flex: 1, color: COLORS.white, fontSize: 14.5, fontWeight: "600", textAlign: "right" },

  checks: { marginTop: 16, gap: 10 },
  checkRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  checkDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7, backgroundColor: COLORS.textSoft },
  dotWatch: { backgroundColor: COLORS.warn },
  dotBlocking: { backgroundColor: COLORS.error },
  checkText: { flex: 1, color: COLORS.textSoft, fontSize: 13.5, lineHeight: 20 },
  checkLevel: { color: COLORS.white, fontWeight: "700" },

  /* Pied */
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    backgroundColor: COLORS.brand,
  },
  btnPrimary: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 16, fontWeight: "600", letterSpacing: 0.1 },
  btnIdle: { opacity: 0.5 },
  btnGhost: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
