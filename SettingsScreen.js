import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Alert,
  StyleSheet,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import LogoCropper from "./LogoCropper";

/* ------------------------------------------------------------------
   TOKENS
------------------------------------------------------------------ */

const COLORS = {
  brand: "#00323A",
  surface: "#073F48",
  surfaceHi: "#0B4B55",
  accent: "#1E7F8C",
  accentSoft: "rgba(30,127,140,0.30)",
  white: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.72)",
  textMute: "rgba(255,255,255,0.50)",
  placeholder: "rgba(255,255,255,0.42)",
  fill: "rgba(255,255,255,0.07)",
  fillStrong: "rgba(255,255,255,0.12)",
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
  grid: "rgba(255,255,255,0.02)", // trame atténuée derrière les listes
  error: "#FFB4A9",
  ink: "#10272C",
};

const FONT = { title: "Poppins_600SemiBold" };

// Pastilles d'icônes « ton sur ton » : fond teinté de la marque + icône turquoise clair
const TILE_BG = "rgba(30,127,140,0.28)";
const TILE_ICON = "#8FDCE4";

const CELL = 28;
const SIDE = 20;
const ENTER_DURATION = 420;
const ENTER_OFFSET = 12;

/* ------------------------------------------------------------------
   DONNÉES
------------------------------------------------------------------ */

const PRODUCTS = [
  { key: "fenetres", label: "Fenêtres" },
  { key: "portes-fenetres", label: "Portes-fenêtres" },
  { key: "baies-coulissantes", label: "Baies coulissantes" },
  { key: "portes-entree", label: "Portes d’entrée" },
  { key: "volets-roulants", label: "Volets roulants" },
  { key: "stores", label: "Stores" },
  { key: "portails", label: "Portails" },
  { key: "clotures", label: "Clôtures" },
];

const UNITS = [
  { value: "mm", label: "Millimètres", hint: "ex. 1 800 mm" },
  { value: "cm", label: "Centimètres", hint: "ex. 180 cm" },
];

// Champs affichés dans les relevés (PDF)
const PDF_FIELDS = [
  { key: "logo", title: "Logo de l’entreprise", hint: "En-tête de la fiche.", icon: "image-outline" },
  { key: "contact", title: "Coordonnées", hint: "Téléphone et e-mail.", icon: "call-outline" },
  { key: "client", title: "Nom du client", hint: "Sous le titre de la fiche.", icon: "person-outline" },
  { key: "address", title: "Adresse du chantier", hint: "Adresse complète.", icon: "location-outline" },
  { key: "date", title: "Date du relevé", hint: "Jour de la prise de mesures.", icon: "calendar-outline" },
  { key: "dimensions", title: "Cotes", hint: "Largeur et hauteur de chaque ouvrage.", icon: "resize-outline" },
  { key: "photos", title: "Photos des ouvrages", hint: "Une photo par ouvrage relevé.", icon: "images-outline" },
  { key: "notes", title: "Notes", hint: "Remarques saisies sur le chantier.", icon: "create-outline" },
];

const FILE_NAMES = [
  { key: "chantier-date", label: "Chantier + date", build: (s) => `${s.site}_${s.iso}` },
  { key: "client-chantier", label: "Client + chantier", build: (s) => `${s.client}_${s.site}` },
  { key: "chantier-type", label: "Chantier + type d’ouvrage", build: (s) => `${s.site}_${s.type}` },
  { key: "numero", label: "Numéro de fiche", build: (s) => `Fiche_${s.num}` },
];

const DEFAULT_FIELDS = {
  logo: true,
  contact: true,
  client: true,
  address: true,
  date: true,
  dimensions: true,
  photos: true,
  notes: true,
};

/* ------------------------------------------------------------------
   OUTILS
------------------------------------------------------------------ */

// Le domaine ne peut pas commencer par un point (refuse « nom@.domaine.fr »)
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
const digits = (s) => String(s || "").replace(/\D/g, "");

const validators = {
  company: (v) => (v.trim().length >= 2 ? "" : "Indiquez le nom de votre entreprise."),
  email: (v) => (EMAIL_RE.test(v.trim()) ? "" : "Saisissez une adresse e-mail valide."),
  phone: (v) => {
    const n = digits(v).length;
    return n >= 9 && n <= 15 ? "" : "Saisissez un numéro de téléphone valide.";
  },
};

// « 06 12 34 56 78 » et « +33 6 12 34 56 78 »
const formatPhone = (raw) => {
  const s = String(raw || "");
  const d = digits(s);
  if (s.trim().startsWith("+")) {
    if (d.startsWith("33")) {
      const rest = d.slice(2, 11);
      const parts = [rest.slice(0, 1), ...(rest.slice(1).match(/.{1,2}/g) || [])].filter(Boolean);
      return `+33 ${parts.join(" ")}`.trim();
    }
    return `+${d.slice(0, 15)}`;
  }
  return (d.slice(0, 10).match(/.{1,2}/g) || []).join(" ");
};

const pad = (n) => String(n).padStart(2, "0");

// Complète une configuration partielle (par ex. connexion sans inscription)
const normalise = (config) => {
  const c = config || {};
  const pdf = { displayName: null, format: "a4-portrait", organisation: "par-produit", ...c.pdf };
  return {
    ...c,
    account: { company: "", fullName: "", email: "", phone: "", ...c.account },
    measure: { unit: "mm", products: [], ...c.measure },
    pdf: {
      ...pdf,
      fileName: pdf.fileName || "chantier-date",
      fields: {
        ...DEFAULT_FIELDS,
        ...(pdf.showContact === false ? { contact: false } : null),
        ...(pdf.includePhotos === false ? { photos: false } : null),
        ...pdf.fields,
      },
    },
    backup: { auto: true, sync: false, ...c.backup },
  };
};

/* ------------------------------------------------------------------
   FOND : TRAME DE PAPIER CALQUE
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

/* ------------------------------------------------------------------
   LISTES GROUPÉES
------------------------------------------------------------------ */

const IconTile = ({ name, size = 32 }) => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={[styles.tile, { width: size, height: size, borderRadius: Math.round(size * 0.3) }]}
  >
    <Ionicons name={name} size={Math.round(size * 0.55)} color={TILE_ICON} />
  </View>
);

const GroupLabel = ({ children }) => (
  <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.groupLabel}>
    {children}
  </Text>
);

const Group = ({ children }) => <View style={styles.group}>{children}</View>;

const Row = memo(function Row({ icon, title, hint, value, onPress, last, busy, switchValue, onSwitch }) {
  const isSwitch = typeof onSwitch === "function";
  const label = value ? `${title}, ${value}` : title;

  const content = (
    <>
      {!!icon && <IconTile name={icon} />}
      <View style={styles.rowText}>
        <Text maxFontSizeMultiplier={1.3} style={styles.rowTitle}>
          {title}
        </Text>
        {!!hint && (
          <Text maxFontSizeMultiplier={1.3} style={styles.rowHint}>
            {hint}
          </Text>
        )}
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={COLORS.textSoft} />
      ) : (
        !!value && (
          <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.rowValue}>
            {value}
          </Text>
        )
      )}
      {isSwitch ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitch}
          trackColor={{ false: COLORS.line, true: COLORS.accent }}
          thumbColor={COLORS.white}
          ios_backgroundColor={COLORS.line}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        />
      ) : (
        !!onPress && <Ionicons name="chevron-forward" size={18} color={COLORS.textMute} />
      )}
      {!last && <View style={[styles.rowLine, { left: icon ? 58 : 14 }]} />}
    </>
  );

  if (isSwitch) {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: !!switchValue }}
        accessibilityLabel={title}
        onPress={() => onSwitch(!switchValue)}
        style={styles.row}
      >
        {content}
      </Pressable>
    );
  }

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={label} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy: !!busy }}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
});

/* ------------------------------------------------------------------
   FENÊTRE (feuille qui monte du bas)
------------------------------------------------------------------ */

function Sheet({ title, onClose, children, footer }) {
  const { height } = useWindowDimensions();

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} pointerEvents="box-none" style={styles.sheetWrap}>
          <View style={[styles.sheet, { maxHeight: height * 0.9 }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" numberOfLines={2} maxFontSizeMultiplier={1.2} style={styles.sheetTitle}>
                {title}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={COLORS.white} />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
              {children}
            </ScrollView>

            {!!footer && <View style={styles.sheetFooter}>{footer}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Bouton « Enregistrer » : désactivé = fond discret et texte grisé (pas de voile)
const SaveButton = ({ onPress, disabled }) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel="Enregistrer"
    accessibilityState={{ disabled: !!disabled }}
    onPress={onPress}
    style={({ pressed }) => [styles.save, disabled && styles.saveIdle, pressed && styles.btnPressed]}
  >
    <Text maxFontSizeMultiplier={1.3} style={[styles.saveText, disabled && styles.saveTextIdle]}>
      Enregistrer
    </Text>
  </Pressable>
);

const Field = memo(
  React.forwardRef(function Field({ label, icon, value, onChangeText, error, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    return (
      <View style={styles.block}>
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          {label}
        </Text>
        <View style={[styles.inputWrap, focused && styles.inputFocused, !!error && styles.inputError]}>
          {!!icon && <Ionicons name={icon} size={18} color={COLORS.textMute} />}
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            accessibilityLabel={label}
            placeholderTextColor={COLORS.placeholder}
            selectionColor={COLORS.white}
            keyboardAppearance="dark"
            maxFontSizeMultiplier={1.3}
            style={styles.input}
            {...rest}
          />
        </View>
        {!!error && (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    );
  })
);

// Choix unique en carte (radio)
const Option = memo(function Option({ title, hint, on, onPress }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={hint ? `${title}, ${hint}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.option, on && styles.optionOn, pressed && styles.pressed]}
    >
      <View style={styles.optionText}>
        <Text maxFontSizeMultiplier={1.3} style={styles.optionTitle}>
          {title}
        </Text>
        {!!hint && (
          <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.optionHint}>
            {hint}
          </Text>
        )}
      </View>
      <View style={[styles.radio, on && styles.radioOn]}>{on && <Ionicons name="checkmark" size={14} color={COLORS.white} />}</View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------
   FENÊTRES DE MODIFICATION
------------------------------------------------------------------ */

function ProfileSheet({ account, logoUri, logoWide, onLogo, onSave, onClose }) {
  const [d, setD] = useState({
    company: account.company || "",
    fullName: account.fullName || "",
    email: account.email || "",
    phone: formatPhone(account.phone),
  });
  const [show, setShow] = useState(false);
  const refs = useRef({});

  const set = (k) => (v) => setD((x) => ({ ...x, [k]: k === "phone" ? formatPhone(v) : v }));
  const errors = {
    company: validators.company(d.company),
    email: validators.email(d.email),
    phone: validators.phone(d.phone),
  };
  const valid = !errors.company && !errors.email && !errors.phone;
  const err = (k) => (show ? errors[k] : "");

  const save = () => {
    if (!valid) {
      setShow(true);
      const first = ["company", "email", "phone"].find((k) => errors[k]);
      refs.current[first]?.focus();
      return;
    }
    onSave({ company: d.company.trim(), fullName: d.fullName.trim(), email: d.email.trim(), phone: d.phone });
  };

  return (
    <Sheet title="Profil de l’entreprise" onClose={onClose} footer={<SaveButton onPress={save} disabled={!valid && show} />}>
      {/* Logo */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={logoUri ? "Modifier le logo" : "Ajouter un logo"}
        onPress={() => onLogo?.(d)}
        style={({ pressed }) => [styles.logoField, pressed && styles.pressed]}
      >
        {logoUri ? (
          <View style={[styles.logoThumb, logoWide && styles.logoThumbWide]}>
            <Image source={{ uri: logoUri }} resizeMode="contain" accessible={false} style={styles.fillImg} />
          </View>
        ) : (
          <IconTile name="image-outline" size={44} />
        )}
        <View style={styles.logoFieldText}>
          <Text maxFontSizeMultiplier={1.3} style={styles.logoFieldTitle}>
            {logoUri ? "Modifier le logo" : "Ajouter un logo"}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.logoFieldHint}>
            Affiché en en-tête de vos fiches PDF.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMute} />
      </Pressable>

      <Field
        ref={(el) => (refs.current.company = el)}
        label="Nom de l’entreprise"
        icon="business-outline"
        placeholder="Menuiserie Martin"
        value={d.company}
        onChangeText={set("company")}
        error={err("company")}
        autoCapitalize="words"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => refs.current.fullName?.focus()}
      />
      <Field
        ref={(el) => (refs.current.fullName = el)}
        label="Nom et prénom"
        icon="person-outline"
        placeholder="Jean Martin"
        value={d.fullName}
        onChangeText={set("fullName")}
        autoCapitalize="words"
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => refs.current.email?.focus()}
      />
      <Field
        ref={(el) => (refs.current.email = el)}
        label="Adresse e-mail"
        icon="mail-outline"
        placeholder="jean@menuiserie-martin.fr"
        value={d.email}
        onChangeText={set("email")}
        error={err("email")}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        blurOnSubmit={false}
        onSubmitEditing={() => refs.current.phone?.focus()}
      />
      <Field
        ref={(el) => (refs.current.phone = el)}
        label="Numéro de téléphone"
        icon="call-outline"
        placeholder="06 12 34 56 78"
        value={d.phone}
        onChangeText={set("phone")}
        error={err("phone")}
        keyboardType="phone-pad"
        returnKeyType="done"
        onSubmitEditing={save}
      />
    </Sheet>
  );
}

function UnitSheet({ value, onPick, onClose }) {
  return (
    <Sheet title="Unité de mesure" onClose={onClose}>
      <Text maxFontSizeMultiplier={1.3} style={styles.sheetIntro}>
        Les cotes saisies et celles des fiches PDF utilisent cette unité.
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {UNITS.map((o) => (
          <Option key={o.value} title={o.label} hint={o.hint} on={o.value === value} onPress={() => onPick(o.value)} />
        ))}
      </View>
    </Sheet>
  );
}

function ProductsSheet({ value, onSave, onClose }) {
  const [sel, setSel] = useState(value);
  const [show, setShow] = useState(false);

  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const save = () => {
    if (!sel.length) {
      setShow(true);
      return;
    }
    onSave(sel);
  };

  return (
    <Sheet title="Produits utilisés" onClose={onClose} footer={<SaveButton onPress={save} disabled={!sel.length} />}>
      <Text maxFontSizeMultiplier={1.3} style={styles.sheetIntro}>
        Choisissez les produits que vous mesurez. Ils apparaissent en raccourcis sur l’écran d’accueil.
      </Text>
      <View style={styles.chips}>
        {PRODUCTS.map((p) => {
          const on = sel.includes(p.key);
          return (
            <Pressable
              key={p.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={p.label}
              onPress={() => toggle(p.key)}
              style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
            >
              <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={[styles.chipText, on && styles.chipTextOn]}>
                {p.label}
              </Text>
              <View style={[styles.check, on && styles.checkOn]}>{on && <Ionicons name="checkmark" size={13} color={COLORS.white} />}</View>
            </Pressable>
          );
        })}
      </View>
      {show && !sel.length ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          Choisissez au moins un produit.
        </Text>
      ) : (
        <Text style={styles.helper}>
          {sel.length} sur {PRODUCTS.length} sélectionné{sel.length > 1 ? "s" : ""}
        </Text>
      )}
    </Sheet>
  );
}

function FieldsSheet({ fields, onToggle, onClose }) {
  return (
    <Sheet title="Champs affichés" onClose={onClose}>
      <Text maxFontSizeMultiplier={1.3} style={styles.sheetIntro}>
        Choisissez les informations qui apparaissent sur vos fiches PDF. Les modifications sont enregistrées automatiquement.
      </Text>
      <Group>
        {PDF_FIELDS.map((f, i) => (
          <Row
            key={f.key}
            icon={f.icon}
            title={f.title}
            hint={f.hint}
            switchValue={!!fields[f.key]}
            onSwitch={(v) => onToggle(f.key, v)}
            last={i === PDF_FIELDS.length - 1}
          />
        ))}
      </Group>
    </Sheet>
  );
}

function FileNameSheet({ value, sample, onPick, onClose }) {
  return (
    <Sheet title="Nom des fichiers" onClose={onClose}>
      <Text maxFontSizeMultiplier={1.3} style={styles.sheetIntro}>
        Chaque PDF exporté est nommé automatiquement selon ce modèle.
      </Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {FILE_NAMES.map((o) => (
          <Option key={o.key} title={o.label} hint={`${o.build(sample)}.pdf`} on={o.key === value} onPress={() => onPick(o.key)} />
        ))}
      </View>
    </Sheet>
  );
}

function PreviewSheet({ cfg, onClose }) {
  const { width } = useWindowDimensions();
  const { account, pdf, measure } = cfg;
  const f = pdf.fields;
  const landscape = pdf.format === "a4-paysage";

  const paperW = Math.min(width - SIDE * 2, 340);
  const paperH = paperW * (landscape ? 0.707 : 1.414);

  const now = new Date();
  const date = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const name = (pdf.displayName || account.company || "Votre entreprise").trim();
  const product = PRODUCTS.find((p) => p.key === measure.products[0])?.label || "Fenêtres";
  const dims = measure.unit === "cm" ? "124 × 145 cm" : "1 240 × 1 450 mm";
  const contact = [account.phone ? formatPhone(account.phone) : "", account.email].filter(Boolean).join("  ·  ");
  const logoUri = pdf.hasLogo !== false && pdf.logoUri ? pdf.logoUri : null;

  return (
    <Sheet title="Aperçu du modèle PDF" onClose={onClose}>
      <Text maxFontSizeMultiplier={1.3} style={styles.sheetIntro}>
        Aperçu indicatif de vos fiches ({landscape ? "A4 paysage" : "A4 portrait"}), selon vos réglages.
      </Text>

      <View style={[styles.paper, { width: paperW, height: paperH }]}>
        <View style={styles.paperHead}>
          {f.logo &&
            (logoUri ? (
              <View style={styles.paperLogoImg}>
                <Image source={{ uri: logoUri }} resizeMode="contain" style={styles.fillImg} />
              </View>
            ) : (
              <View style={styles.paperLogo}>
                <Text style={styles.paperLogoText}>{name.slice(0, 1).toUpperCase()}</Text>
              </View>
            ))}
          <View style={styles.paperHeadText}>
            <Text numberOfLines={1} style={styles.paperName}>
              {name}
            </Text>
            {f.contact && !!contact && (
              <Text numberOfLines={1} style={styles.paperSmall}>
                {contact}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.paperRule} />
        <Text style={styles.paperTitle}>Fiche de relevé</Text>
        <Text style={styles.paperSite}>Villa des Pins</Text>

        {f.client && <Text style={styles.paperLine}>Client : Sophie Laurent</Text>}
        {f.address && <Text style={styles.paperLine}>Adresse : 27 chemin des Pins, Rambouillet</Text>}
        {f.date && <Text style={styles.paperLine}>Date : {date}</Text>}

        <View style={styles.paperTable}>
          <View style={styles.paperTh}>
            <Text style={styles.paperThText}>Ouvrage</Text>
            {f.dimensions && <Text style={styles.paperThText}>Cotes</Text>}
          </View>
          <View style={styles.paperTr}>
            <Text style={styles.paperTd}>{product}</Text>
            {f.dimensions && <Text style={styles.paperTd}>{dims}</Text>}
          </View>
        </View>

        {f.photos && (
          <View style={styles.paperPhoto}>
            <Ionicons name="image-outline" size={18} color="#5B6F73" />
          </View>
        )}
        {f.notes && <Text style={styles.paperNote}>Notes : pose en rénovation, dormant à déposer.</Text>}
      </View>
    </Sheet>
  );
}

/* ------------------------------------------------------------------
   ÉCRAN (la barre de navigation est gérée par App.js)
------------------------------------------------------------------ */

const InfoLine = ({ icon, text, empty }) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={17} color={COLORS.textSoft} />
    <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={[styles.infoText, !text && styles.infoEmpty]}>
      {text || empty}
    </Text>
  </View>
);

/**
 * Props
 *  - config           : configuration issue de l'inscription (account, measure, pdf…)
 *  - onChange(config) : appelé à chaque modification (à enregistrer)
 *  - version          : numéro de version affiché (ex. "1.0.0")
 *  - onOpenGuide(), onOpenDictation(), onContact(), onReportProblem()
 *  - onExportData(), onImportData() : async, renvoient { error?: string }
 *  - onOpenLegal("terms" | "privacy")
 */
function SettingsScreen({
  config,
  onChange,
  version = "1.0.0",
  onOpenGuide,
  onOpenDictation,
  onContact,
  onReportProblem,
  onExportData,
  onImportData,
  onOpenLegal,
}) {
  const { width, height } = useWindowDimensions();
  const [modal, setModal] = useState(null);
  const [crop, setCrop] = useState(null); // écran de recadrage du logo
  const [busy, setBusy] = useState(null);
  const [draft, setDraft] = useState(null); // saisie du profil gardée pendant le choix du logo
  const [reduceMotion, setReduceMotion] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;

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
  }, [reduceMotion, enter]);

  const rise = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [ENTER_OFFSET, 0] }) }],
  };

  const cfg = useMemo(() => normalise(config), [config]);
  const { account, measure, pdf, backup } = cfg;

  const patch = (section, values) => onChange?.({ ...cfg, [section]: { ...cfg[section], ...values } });

  const close = () => setModal(null);

  const soon = (what) => Alert.alert(what, "Cette fonction sera bientôt disponible.");

  const call = (fn, what) => () => (fn ? fn() : soon(what));

  const run = async (key, fn, what) => {
    if (!fn) {
      soon(what);
      return;
    }
    if (busy) return;
    setBusy(key);
    try {
      const res = await fn();
      if (res?.error) Alert.alert(what, res.error);
    } catch (e) {
      Alert.alert(what, "L’opération a échoué. Réessayez.");
    } finally {
      setBusy(null);
    }
  };

  const toggleField = (key, value) => {
    const fields = { ...pdf.fields, [key]: value };
    patch("pdf", { fields, showContact: fields.contact, includePhotos: fields.photos });
  };

  /* ----- logo : depuis la fenêtre « Profil » ----- */

  // iOS refuse d'ouvrir un écran pendant qu'un autre se ferme : on laisse le temps
  const wait = (ms) => new Promise((res) => setTimeout(res, Platform.OS === "ios" ? ms : 0));

  const reopenProfile = async () => {
    await wait(450);
    setModal("profile");
  };

  const pickLogo = async (d) => {
    setDraft(d);
    setModal(null);
    await wait(550);
    let uri = null;
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (!r.canceled && r.assets?.[0]?.uri) uri = r.assets[0].uri;
    } catch (e) {
      Alert.alert("Logo", "Impossible d’ouvrir la photothèque.");
    }
    if (uri) {
      await wait(350);
      setCrop({ uri, format: pdf.logoFormat || "square", view: null });
    } else {
      reopenProfile();
    }
  };

  const finishCrop = (r) => {
    patch("pdf", { hasLogo: true, logoUri: r.uri, logoFormat: r.format, logoSource: r.source });
    setCrop(null);
    reopenProfile();
  };

  const cancelCrop = () => {
    setCrop(null);
    reopenProfile();
  };

  const saveProfile = (values) => {
    const renamed = !pdf.displayName || pdf.displayName === account.company;
    onChange?.({
      ...cfg,
      account: { ...cfg.account, ...values },
      pdf: renamed ? { ...cfg.pdf, displayName: values.company } : cfg.pdf,
    });
    setDraft(null);
    close();
  };

  /* ----- valeurs affichées ----- */

  const company = account.company.trim();
  const phone = account.phone ? formatPhone(account.phone) : "";
  const logoUri = pdf.hasLogo !== false && pdf.logoUri ? pdf.logoUri : null;
  const wideLogo = !!logoUri && pdf.logoFormat === "wide";
  const fileSample = {
    site: "Villa-des-Pins",
    client: "Laurent",
    type: (PRODUCTS.find((p) => p.key === measure.products[0])?.label || "Fenêtre").replace(/\s+/g, "-"),
    iso: new Date().toISOString().slice(0, 10),
    num: "0012",
  };
  const fileLabel = FILE_NAMES.find((o) => o.key === pdf.fileName)?.label || "";
  const fieldCount = Object.values(pdf.fields).filter(Boolean).length;

  return (
    <View style={styles.root}>
      <Grid width={width} height={height} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={rise}>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.title}>
            Réglages
          </Text>

          {/* PROFIL */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profil de l’entreprise. Appuyez pour modifier"
            onPress={() => setModal("profile")}
            android_ripple={{ color: "rgba(255,255,255,0.06)" }}
            style={({ pressed }) => [styles.profile, pressed && styles.profilePressed]}
          >
            <View style={styles.profileTop}>
              {logoUri ? (
                <View style={styles.profileLogo}>
                  <Image source={{ uri: logoUri }} resizeMode="contain" accessible={false} style={styles.fillImg} />
                </View>
              ) : (
                <View style={styles.profileIcon}>
                  <Ionicons name="business" size={26} color={COLORS.white} />
                </View>
              )}
              <View style={styles.profileText}>
                <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={[styles.company, !company && styles.infoEmpty]}>
                  {company || "Nom de l’entreprise"}
                </Text>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.person}>
                  {account.fullName || "Modifier le profil"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMute} />
            </View>
            <View style={styles.profileRule} />
            <InfoLine icon="mail-outline" text={account.email} empty="Ajouter une adresse e-mail" />
            <InfoLine icon="call-outline" text={phone} empty="Ajouter un numéro de téléphone" />
          </Pressable>

          {/* FICHES ET MESURES */}
          <GroupLabel>Fiches et mesures</GroupLabel>
          <Group>
            <Row
              icon="resize-outline"
              title="Unité de mesure"
              value={measure.unit === "cm" ? "Centimètres" : "Millimètres"}
              onPress={() => setModal("unit")}
            />
            <Row
              icon="grid-outline"
              title="Produits utilisés"
              hint="Raccourcis de l’écran d’accueil"
              value={`${measure.products.length}/${PRODUCTS.length}`}
              onPress={() => setModal("products")}
              last
            />
          </Group>

          {/* EXPORT PDF */}
          <GroupLabel>Export PDF</GroupLabel>
          <Group>
            <Row icon="list-outline" title="Champs affichés" value={`${fieldCount}/${PDF_FIELDS.length}`} onPress={() => setModal("fields")} />
            <Row icon="document-text-outline" title="Nom des fichiers" value={fileLabel} onPress={() => setModal("fileName")} />
            <Row icon="eye-outline" title="Aperçu du modèle PDF" onPress={() => setModal("preview")} last />
          </Group>

          {/* DONNÉES ET SAUVEGARDE */}
          <GroupLabel>Données et sauvegarde</GroupLabel>
          <Group>
            <Row
              icon="cloud-done-outline"
              title="Sauvegarde automatique"
              switchValue={backup.auto}
              onSwitch={(v) => patch("backup", { auto: v })}
            />
            <Row
              icon="sync-outline"
              title="Synchronisation"
              hint="Entre vos appareils"
              switchValue={backup.sync}
              onSwitch={(v) => patch("backup", { sync: v })}
            />
            <Row
              icon="share-outline"
              title="Exporter toutes mes données"
              busy={busy === "export"}
              onPress={() => run("export", onExportData, "Exporter mes données")}
            />
            <Row
              icon="download-outline"
              title="Importer des données"
              busy={busy === "import"}
              onPress={() => run("import", onImportData, "Importer des données")}
              last
            />
          </Group>

          {/* AIDE */}
          <GroupLabel>Aide et assistance</GroupLabel>
          <Group>
            <Row icon="book-outline" title="Guide d’utilisation" onPress={call(onOpenGuide, "Guide d’utilisation")} />
            <Row icon="mic-outline" title="Utiliser la dictée" onPress={call(onOpenDictation, "Dictée vocale")} />
            <Row icon="chatbubbles-outline" title="Nous contacter" onPress={call(onContact, "Nous contacter")} />
            <Row icon="bug-outline" title="Signaler un problème" onPress={call(onReportProblem, "Signaler un problème")} last />
          </Group>

          {/* À PROPOS */}
          <GroupLabel>À propos</GroupLabel>
          <Group>
            <Row icon="information-circle-outline" title="Version" value={version} />
            <Row
              icon="reader-outline"
              title="Conditions d’utilisation"
              onPress={call(onOpenLegal && (() => onOpenLegal("terms")), "Conditions d’utilisation")}
            />
            <Row
              icon="shield-checkmark-outline"
              title="Politique de confidentialité"
              onPress={call(onOpenLegal && (() => onOpenLegal("privacy")), "Politique de confidentialité")}
              last
            />
          </Group>

          <Text maxFontSizeMultiplier={1.3} style={styles.footer}>
            Pro’Mètre · version {version}
          </Text>
        </Animated.View>
      </ScrollView>

      <LogoCropper visible={!!crop} source={crop} onCancel={cancelCrop} onDone={finishCrop} />

      {modal === "profile" && (
        <ProfileSheet
          account={{ ...account, ...(draft || {}) }}
          logoUri={logoUri}
          logoWide={wideLogo}
          onLogo={pickLogo}
          onSave={saveProfile}
          onClose={() => {
            setDraft(null);
            close();
          }}
        />
      )}
      {modal === "unit" && (
        <UnitSheet
          value={measure.unit}
          onPick={(u) => {
            patch("measure", { unit: u });
            close();
          }}
          onClose={close}
        />
      )}
      {modal === "products" && (
        <ProductsSheet
          value={measure.products}
          onSave={(p) => {
            patch("measure", { products: p });
            close();
          }}
          onClose={close}
        />
      )}
      {modal === "fields" && <FieldsSheet fields={pdf.fields} onToggle={toggleField} onClose={close} />}
      {modal === "fileName" && (
        <FileNameSheet
          value={pdf.fileName}
          sample={fileSample}
          onPick={(k) => {
            patch("pdf", { fileName: k });
            close();
          }}
          onClose={close}
        />
      )}
      {modal === "preview" && <PreviewSheet cfg={cfg} onClose={close} />}
    </View>
  );
}

export default SettingsScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  gridLine: { position: "absolute", backgroundColor: COLORS.grid },
  pressed: { opacity: 0.7 },
  scroll: { paddingHorizontal: SIDE, paddingTop: 20, paddingBottom: 40 },
  fillImg: { width: "100%", height: "100%" },

  title: { color: COLORS.white, fontSize: 30, lineHeight: 40, fontFamily: FONT.title, letterSpacing: -0.5, marginBottom: 16 },

  /* Carte profil */
  profile: { borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.lineSoft, padding: 16 },
  profilePressed: { backgroundColor: COLORS.surfaceHi },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  profileLogo: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.white, padding: 6, overflow: "hidden" },
  profileIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  profileText: { flex: 1 },
  company: { color: COLORS.white, fontSize: 17.5, lineHeight: 25, fontFamily: FONT.title },
  person: { color: COLORS.textSoft, fontSize: 14, lineHeight: 19 },
  profileRule: { height: 1, backgroundColor: COLORS.lineSoft, marginTop: 14, marginBottom: 4 },
  infoRow: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { flex: 1, color: COLORS.white, fontSize: 14.5, lineHeight: 20 },
  infoEmpty: { color: COLORS.placeholder, fontWeight: "500" },

  /* Listes groupées */
  groupLabel: {
    color: COLORS.textMute,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 8,
    marginLeft: 4,
  },
  group: { borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.lineSoft, overflow: "hidden" },
  tile: { backgroundColor: TILE_BG, alignItems: "center", justifyContent: "center" },
  row: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowPressed: { backgroundColor: "rgba(255,255,255,0.05)" },
  rowLine: { position: "absolute", right: 0, bottom: 0, height: 1, backgroundColor: COLORS.lineSoft },
  rowText: { flex: 1 },
  rowTitle: { color: COLORS.white, fontSize: 15.5, lineHeight: 21, fontWeight: "600" },
  rowHint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 1 },
  rowValue: { flexShrink: 1, maxWidth: "42%", color: COLORS.textSoft, fontSize: 14.5, textAlign: "right" },

  footer: { color: COLORS.textMute, fontSize: 13, textAlign: "center", marginTop: 28 },

  /* Fenêtres */
  backdrop: { flex: 1, backgroundColor: "rgba(0,12,15,0.62)" },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.brand,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.line,
    paddingTop: 8,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 6 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: SIDE, paddingRight: SIDE - 4, paddingVertical: 6 },
  sheetTitle: { flex: 1, color: COLORS.white, fontSize: 20, lineHeight: 28, fontFamily: FONT.title },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.fill, alignItems: "center", justifyContent: "center" },
  sheetBody: { paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 24 },
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
  },
  sheetIntro: { color: COLORS.textSoft, fontSize: 14.5, lineHeight: 21, marginBottom: 18 },

  save: { height: 54, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  saveIdle: { backgroundColor: COLORS.fillStrong },
  saveText: { color: COLORS.brand, fontSize: 16, lineHeight: 22, fontFamily: FONT.title },
  saveTextIdle: { color: COLORS.textMute },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  /* Champs */
  block: { marginBottom: 16 },
  label: { color: COLORS.white, fontSize: 14, lineHeight: 19, fontWeight: "600", marginBottom: 8 },
  inputWrap: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { flex: 1, height: "100%", color: COLORS.white, fontSize: 16 },
  inputFocused: { borderColor: COLORS.white },
  inputError: { borderColor: COLORS.error },
  error: { color: COLORS.error, fontSize: 13, lineHeight: 18, marginTop: 6 },
  helper: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginTop: 12 },

  /* Logo (profil) */
  logoField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 12,
    marginBottom: 20,
  },
  logoThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.white, padding: 4, overflow: "hidden" },
  logoThumbWide: { width: 96, height: 34, borderRadius: 8 },
  logoFieldText: { flex: 1 },
  logoFieldTitle: { color: COLORS.white, fontSize: 15.5, fontWeight: "600" },
  logoFieldHint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 1 },

  /* Choix unique */
  options: { gap: 10 },
  option: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionOn: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  optionText: { flex: 1 },
  optionTitle: { color: COLORS.white, fontSize: 15.5, lineHeight: 21, fontWeight: "600" },
  optionHint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 2 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.line, alignItems: "center", justifyContent: "center" },
  radioOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },

  /* Produits */
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
  },
  chipOn: { borderColor: COLORS.accent, backgroundColor: COLORS.accentSoft },
  chipText: { flex: 1, color: COLORS.white, fontSize: 15, lineHeight: 19, fontWeight: "500" },
  chipTextOn: { fontWeight: "700" },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.line, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },

  /* Aperçu PDF : une feuille blanche en miniature */
  paper: { alignSelf: "center", backgroundColor: COLORS.white, borderRadius: 6, padding: 16, overflow: "hidden" },
  paperHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  paperLogo: { width: 34, height: 34, borderRadius: 8, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  paperLogoImg: { width: 34, height: 34 },
  paperLogoText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  paperHeadText: { flex: 1 },
  paperName: { color: COLORS.ink, fontSize: 13, fontFamily: FONT.title },
  paperSmall: { color: "#5B6F73", fontSize: 8.5, lineHeight: 12 },
  paperRule: { height: 2, backgroundColor: COLORS.brand, marginTop: 12, marginBottom: 10 },
  paperTitle: { color: "#5B6F73", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase" },
  paperSite: { color: COLORS.ink, fontSize: 16, fontFamily: FONT.title, marginBottom: 8 },
  paperLine: { color: COLORS.ink, fontSize: 9.5, lineHeight: 15 },
  paperTable: { marginTop: 12, borderWidth: 1, borderColor: "#D5DEE0" },
  paperTh: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#E8EFF0", paddingHorizontal: 8, paddingVertical: 5 },
  paperThText: { color: COLORS.ink, fontSize: 9, fontWeight: "700" },
  paperTr: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6 },
  paperTd: { color: COLORS.ink, fontSize: 9.5 },
  paperPhoto: { height: 60, marginTop: 10, backgroundColor: "#E8EFF0", alignItems: "center", justifyContent: "center" },
  paperNote: { color: "#5B6F73", fontSize: 9, lineHeight: 13, marginTop: 10 },
});