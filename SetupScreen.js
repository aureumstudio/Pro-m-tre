import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Linking,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { requestRecordingPermissionsAsync } from "expo-audio";
import * as Notifications from "expo-notifications";
import * as MediaLibrary from "expo-media-library";
import LogoCropper, { LOGO_FORMATS } from "./LogoCropper";

// Connexions tierces
const SOCIALS = [
  {
    provider: 'apple',
    label: 'Apple',
    logo: {
      uri: 'data:image/png;base64,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',
    },
    width: 20,
    height: 26,
  },
  {
    provider: 'google',
    label: 'Google',
    logo: {
      uri: 'data:image/png;base64,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',
    },
    width: 22,
    height: 22,
  },
  {
    provider: "facebook",
    label: "Facebook",
    logo: { uri: "data:image/png;base64,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" },
    width: 24,
    height: 24,
  },
];

// Logo FontAwesome choisi selon le fournisseur
const SOCIAL_ICONS = { apple: "apple", google: "google", facebook: "facebook" };

/* ------------------------------------------------------------------
   TOKENS
------------------------------------------------------------------ */

const COLORS = {
  brand: "#00323A",
  accent: "#1E7F8C",
  white: "#FFFFFF",
  grid: "rgba(255,255,255,0.04)",
  textSoft: "rgba(255,255,255,0.72)",
  textMute: "rgba(255,255,255,0.50)",
  placeholder: "rgba(255,255,255,0.42)",
  fill: "rgba(255,255,255,0.07)",
  fillStrong: "rgba(255,255,255,0.12)",
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
  error: "#FFB4A9",
};

const FONT = { title: "Poppins_600SemiBold", medium: "Poppins_500Medium" };

const CELL = 28;
const SIDE = 24;
const STEPS = 5;

const ENTER_DURATION = 260;
const ENTER_OFFSET = 18;

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

const FORMATS = [
  { value: "a4-portrait", label: "A4 portrait" },
  { value: "a4-paysage", label: "A4 paysage" },
];

const ORGANISATIONS = [
  { value: "par-produit", label: "Par produit" },
  { value: "par-chantier", label: "Par chantier" },
];

const STEP_TEXT = [
  { title: "Votre compte", subtitle: "Commencez par votre adresse e-mail et un mot de passe." },
  { title: "Votre entreprise", subtitle: "Quelques informations pour créer votre espace." },
  { title: "Vos relevés", subtitle: "Adaptez l’application à votre façon de mesurer." },
  { title: "Vos documents", subtitle: "Personnalisez les fiches PDF de vos relevés." },
  { title: "Autorisations", subtitle: "Activez ce dont vous avez besoin, vous pourrez changer plus tard." },
];

const PERMISSION_LABELS = {
  microphone: "au microphone",
  camera: "à l’appareil photo",
  notifications: "aux notifications",
  files: "aux fichiers",
};

const DEFAULT_DATA = {
  company: "",
  fullName: "",
  email: "",
  phone: "",
  password: "",
  acceptTerms: false,
  provider: null, // "apple" | "google" | "facebook" | null (e-mail)
  unit: "mm",
  products: [],
  docName: null, // null = identique au nom de l'entreprise
  hasLogo: false,
  logoUri: null, // image finale recadrée
  logoFormat: "square", // "square" | "wide"
  logoSource: null, // image d'origine + position (pour « Recadrer »)
  showContact: true,
  includePhotos: true,
  format: "a4-portrait",
  organisation: "par-produit",
  microphone: false,
  camera: false,
  notifications: false,
  files: false,
};

/* ------------------------------------------------------------------
   VALIDATION
------------------------------------------------------------------ */

// Le domaine ne peut pas commencer par un point (refuse « nom@.domaine.fr »)
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;
const digits = (s) => String(s || "").replace(/\D/g, "");

const validators = {
  company: (v) => (v.trim().length >= 2 ? "" : "Indiquez le nom de votre entreprise."),
  fullName: (v) => (v.trim().length >= 2 ? "" : "Indiquez votre nom."),
  email: (v) => (EMAIL_RE.test(v.trim()) ? "" : "Saisissez une adresse e-mail valide."),
  phone: (v) => {
    const n = digits(v).length;
    return n >= 9 && n <= 15 ? "" : "Saisissez un numéro de téléphone valide.";
  },
  password: (v) =>
    v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? "" : "8 caractères minimum, avec au moins une lettre et un chiffre.",
};

// « 06 12 34 56 78 » et « +33 6 12 34 56 78 » pendant la saisie
const formatPhone = (raw) => {
  const s = String(raw);
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
   COMPOSANTS DE FORMULAIRE
------------------------------------------------------------------ */

const Field = memo(
  forwardRef(function Field({ name, label, value, onChange, onBlur, error, right, ...inputProps }, ref) {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.block}>
        <Text style={styles.label}>{label}</Text>
        <View>
          <TextInput
            ref={ref}
            value={value}
            onChangeText={(t) => onChange(name, t)}
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false);
              onBlur?.(name);
            }}
            accessibilityLabel={label}
            placeholderTextColor={COLORS.placeholder}
            selectionColor={COLORS.white}
            keyboardAppearance="dark"
            maxFontSizeMultiplier={1.3}
            style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError, !!right && styles.inputWithRight]}
            {...inputProps}
          />
          {right}
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

// Choix unique : la sélection est un bloc blanc, bien visible
const Segmented = memo(function Segmented({ name, label, options, value, onChange }) {
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.segmented}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={o.hint ? `${o.label}, ${o.hint}` : o.label}
              onPress={() => onChange(name, o.value)}
              style={[styles.segment, on && styles.segmentOn]}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.segmentTitle, on && styles.segmentTitleOn]}>
                {o.label}
              </Text>
              {!!o.hint && (
                <Text maxFontSizeMultiplier={1.3} style={[styles.segmentHint, on && styles.segmentHintOn]}>
                  {o.hint}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

// Case de choix multiple : bloc blanc quand cochée, même épaisseur de texte
// dans les deux états (le libellé ne change pas de largeur ni de ligne)
const Chip = memo(function Chip({ item, selected, onToggle, compact }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={item.label}
      onPress={() => onToggle(item.key)}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
      style={({ pressed }) => [styles.chip, compact && styles.chipCompact, selected && styles.chipOn, pressed && styles.chipPressed]}
    >
      <Text
        numberOfLines={2}
        maxFontSizeMultiplier={1.25}
        style={[styles.chipText, compact && styles.chipTextCompact, selected && styles.chipTextOn]}
      >
        {item.label}
      </Text>
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.chipDot, compact && styles.chipDotCompact, selected && styles.chipDotOn]}
      >
        {selected && <Ionicons name="checkmark" size={13} color={COLORS.white} />}
      </View>
    </Pressable>
  );
});

// Interrupteur : piste colorée + rond blanc quand il est activé (standard iOS / Android)
const SwitchRow = memo(function SwitchRow({ name, caption, title, hint, value, onChange, last }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      onPress={() => onChange(name, !value)}
      style={[styles.row, !last && styles.rowDivider]}
    >
      <View style={styles.rowText}>
        {!!caption && <Text style={styles.rowCaption}>{caption}</Text>}
        <Text maxFontSizeMultiplier={1.3} style={styles.rowTitle}>
          {title}
        </Text>
        {!!hint && (
          <Text maxFontSizeMultiplier={1.3} style={styles.rowHint}>
            {hint}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => onChange(name, v)}
        trackColor={{ false: COLORS.line, true: COLORS.accent }}
        thumbColor={COLORS.white}
        ios_backgroundColor={COLORS.line}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
});

// Case à cocher obligatoire (conditions d'utilisation)
const Consent = memo(function Consent({ checked, error, onToggle, onOpenLegal, onLayout }) {
  return (
    <View style={styles.consent} onLayout={onLayout}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle} hitSlop={6} style={styles.consentRow}>
        <View style={[styles.box, checked && styles.boxOn, !!error && !checked && styles.boxError]}>
          {checked && <Ionicons name="checkmark" size={16} color={COLORS.brand} />}
        </View>
        <Text maxFontSizeMultiplier={1.3} style={styles.consentText}>
          J’accepte les{" "}
          <Text accessibilityRole="link" onPress={() => onOpenLegal?.("terms")} style={styles.consentLink}>
            conditions générales d’utilisation
          </Text>{" "}
          et la{" "}
          <Text accessibilityRole="link" onPress={() => onOpenLegal?.("privacy")} style={styles.consentLink}>
            politique de confidentialité
          </Text>
          .
        </Text>
      </Pressable>
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={[styles.error, styles.consentError]}>
          {error}
        </Text>
      )}
    </View>
  );
});

const SocialButton = memo(function SocialButton({ item, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continuer avec ${item.label}`}
      onPress={() => onPress(item.provider)}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => [styles.social, pressed && styles.socialPressed]}
    >
      <FontAwesome name={SOCIAL_ICONS[item.provider]} size={24} color={COLORS.white} />
    </Pressable>
  );
});

// Ligne du récapitulatif final
const RecapRow = ({ icon, k, v, last }) => (
  <View style={[styles.recapRow, !last && styles.recapDivider]}>
    <Ionicons name={icon} size={18} color={COLORS.textSoft} />
    <Text maxFontSizeMultiplier={1.25} style={styles.recapK}>
      {k}
    </Text>
    <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.recapV}>
      {v}
    </Text>
  </View>
);

/* ------------------------------------------------------------------
   ÉCRAN
------------------------------------------------------------------ */

function SetupScreen({
  onBack,
  onComplete,
  onPickLogo, // optionnel : async () => uri | null (remplace la photothèque)
  onLogin, // optionnel : () => void — « Se connecter » (compte existant)
  onSocialSignIn, // optionnel : async (provider) => ({ error }) — Apple / Google / Facebook
  onOpenLegal, // optionnel : (type: "terms" | "privacy") => void
  initialStep = 0,
  initialData,
}) {
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState(initialStep);
  const [done, setDone] = useState(false);
  const [data, setData] = useState({ ...DEFAULT_DATA, ...initialData });
  const [touched, setTouched] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [crop, setCrop] = useState(null); // source en cours de recadrage

  const enter = useRef(new Animated.Value(1)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const dir = useRef(1);
  const scrollRef = useRef(null);
  const inputs = useRef({});
  const termsY = useRef(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (!cancelled) setReduceMotion(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ----- données ----- */

  const setField = useCallback((key, value) => {
    setData((d) => ({ ...d, [key]: key === "phone" ? formatPhone(value) : value }));
  }, []);

  const touch = useCallback((key) => {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }, []);

  const toggleProduct = useCallback((key) => {
    setData((d) => ({
      ...d,
      products: d.products.includes(key) ? d.products.filter((k) => k !== key) : [...d.products, key],
    }));
  }, []);

  /* ----- autorisations : vraies demandes système ----- */

  const askPermission = useCallback(async (name) => {
    switch (name) {
      case "microphone":
        return (await requestRecordingPermissionsAsync()).granted;
      case "camera":
        return (await ImagePicker.requestCameraPermissionsAsync()).granted;
      case "notifications":
        return (await Notifications.requestPermissionsAsync()).granted;
      case "files":
        return (await MediaLibrary.requestPermissionsAsync(true)).granted;
      default:
        return false;
    }
  }, []);

  const setPermission = useCallback(
    async (name, value) => {
      // Décocher : aucune demande, on désactive simplement
      if (!value) {
        setData((d) => ({ ...d, [name]: false }));
        return;
      }
      // Cocher : le système affiche sa fenêtre d'autorisation
      let granted = false;
      try {
        granted = await askPermission(name);
      } catch (e) {
        granted = false;
      }
      setData((d) => ({ ...d, [name]: !!granted }));
      if (!granted) {
        Alert.alert(
          "Accès refusé",
          `Pour activer l’accès ${PERMISSION_LABELS[name]}, autorisez-le dans les réglages de votre téléphone.`,
          [
            { text: "Plus tard", style: "cancel" },
            { text: "Ouvrir les réglages", onPress: () => Linking.openSettings() },
          ]
        );
      }
    },
    [askPermission]
  );

  /* ----- logo : photothèque directe, puis recadrage ----- */

  // Une image vient d'être choisie : on ouvre l'écran de recadrage
  const setLogo = (uri) => {
    if (!uri) return;
    setTimeout(() => setCrop({ uri, format: data.logoFormat, view: null }), Platform.OS === "ios" ? 350 : 0);
  };

  // Recadrage validé : on garde l'image finale ET la position
  const finishCrop = (r) => {
    setData((d) => ({ ...d, logoUri: r.uri, logoFormat: r.format, logoSource: r.source }));
    setCrop(null);
  };

  // Ouvre directement la photothèque
  const pickLogoFromLibrary = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
      if (!r.canceled) setLogo(r.assets[0].uri);
    } catch (e) {}
  };

  const openLogoPicker = async () => {
    if (onPickLogo) {
      try {
        setLogo(await onPickLogo());
      } catch (e) {}
      return;
    }
    pickLogoFromLibrary();
  };

  // « Recadrer » : on rouvre l'image d'origine à la position enregistrée
  const editLogo = () => {
    if (data.logoSource) setCrop(data.logoSource);
    else openLogoPicker();
  };

  // Interrupteur « logo » : en l'activant, la photothèque s'ouvre aussitôt
  const toggleLogo = (name, value) => {
    setField(name, value);
    if (value && !data.logoUri) openLogoPicker();
  };

  const docName = data.docName ?? data.company;

  const errors = useMemo(
    () => ({
      company: validators.company(data.company),
      fullName: validators.fullName(data.fullName),
      email: validators.email(data.email),
      phone: validators.phone(data.phone),
      password: validators.password(data.password),
      terms: data.acceptTerms ? "" : "Acceptez les conditions pour créer votre compte.",
      products: data.products.length ? "" : "Choisissez au moins un produit.",
      docName: docName.trim().length >= 2 ? "" : "Indiquez le nom à afficher.",
    }),
    [data, docName]
  );

  const stepFields = [["email", "password", "terms"], ["company", "fullName", "phone"], ["products"], ["docName"], []];
  const stepValid = stepFields[step].every((k) => !errors[k]);
  const err = (k) => (touched[k] || showErrors ? errors[k] : "");

  /* ----- navigation ----- */

  const goTo = useCallback((next, direction) => {
    Keyboard.dismiss();
    dir.current = direction;
    setShowErrors(false);
    setStep(next);
  }, []);

  const back = useCallback(() => {
    if (step > 0) goTo(step - 1, -1);
    else onBack?.();
  }, [step, goTo, onBack]);

  const finish = () => {
    Keyboard.dismiss();
    setDone(true);
  };

  const scrollToTerms = () => {
    scrollRef.current?.scrollTo?.({ y: Math.max(termsY.current - 140, 0), animated: true });
  };

  // Bouton désactivé : un appui montre ce qui manque
  const next = () => {
    if (!stepValid) {
      setShowErrors(true);
      if (step <= 1) {
        const first = stepFields[step].find((k) => errors[k]);
        if (first === "terms") scrollToTerms();
        else inputs.current[first]?.focus();
      }
      return;
    }
    if (step < STEPS - 1) goTo(step + 1, 1);
    else finish();
  };

  // Inscription via Apple / Google / Facebook : pas besoin de cocher les conditions
  const social = async (provider) => {
    Keyboard.dismiss();
    if (onSocialSignIn) {
      try {
        const res = await onSocialSignIn(provider);
        if (res?.error) return;
      } catch (e) {
        return;
      }
    }
    setData((d) => ({ ...d, provider }));
    goTo(1, 1);
  };

  const config = () => ({
    account: {
      company: data.company.trim(),
      fullName: data.fullName.trim(),
      email: data.email.trim(),
      phone: data.phone,
      password: data.password,
      provider: data.provider,
      termsAccepted: data.acceptTerms,
    },
    measure: { unit: data.unit, products: data.products },
    pdf: {
      displayName: docName.trim(),
      hasLogo: data.hasLogo,
      logoUri: data.hasLogo ? data.logoUri : null,
      logoFormat: data.hasLogo ? data.logoFormat : null,
      logoSource: data.hasLogo ? data.logoSource : null,
      showContact: data.showContact,
      format: data.format,
      organisation: data.organisation,
      includePhotos: data.includePhotos,
    },
    permissions: {
      microphone: data.microphone,
      camera: data.camera,
      notifications: data.notifications,
      files: data.files,
    },
  });

  // Bouton retour Android
  const backRef = useRef(back);
  backRef.current = back;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (done) return false;
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, [done]);

  /* ----- animations ----- */

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

  useEffect(() => {
    if (!done) return undefined;
    if (reduceMotion) {
      pop.setValue(1);
      return undefined;
    }
    const a = Animated.spring(pop, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [done, reduceMotion, pop]);

  /* ----- rendu des étapes ----- */

  const contentStyle = {
    opacity: enter,
    transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [ENTER_OFFSET * dir.current, 0] }) }],
  };

  const reg = (key) => (el) => {
    inputs.current[key] = el;
  };
  const focusNext = (key) => () => inputs.current[key]?.focus();

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <Field
              ref={reg("email")}
              name="email"
              label="Quelle est votre adresse e-mail ?"
              placeholder="jean@menuiserie-martin.fr"
              value={data.email}
              onChange={setField}
              onBlur={touch}
              error={err("email")}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={focusNext("password")}
            />
            <Field
              ref={reg("password")}
              name="password"
              label="Choisissez un mot de passe"
              placeholder="8 caractères minimum"
              value={data.password}
              onChange={setField}
              onBlur={touch}
              error={err("password")}
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              textContentType="newPassword"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={next}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={8}
                  style={styles.inputAction}
                >
                  <Text style={styles.inputActionText}>{showPassword ? "Masquer" : "Afficher"}</Text>
                </Pressable>
              }
            />

            <Consent
              checked={data.acceptTerms}
              error={err("terms")}
              onToggle={() => setField("acceptTerms", !data.acceptTerms)}
              onOpenLegal={onOpenLegal}
              onLayout={(e) => {
                termsY.current = e.nativeEvent.layout.y;
              }}
            />

            <View style={styles.socialWrap}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text maxFontSizeMultiplier={1.3} style={styles.dividerText}>
                  ou continuer avec
                </Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.socialRow}>
                {SOCIALS.map((s) => (
                  <SocialButton key={s.provider} item={s} onPress={social} />
                ))}
              </View>
            </View>
          </>
        );

      case 1:
        return (
          <>
            <Field
              ref={reg("company")}
              name="company"
              label="Quel est le nom de votre entreprise ?"
              placeholder="Menuiserie Martin"
              value={data.company}
              onChange={setField}
              onBlur={touch}
              error={err("company")}
              autoComplete="organization"
              textContentType="organizationName"
              autoCapitalize="words"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={focusNext("fullName")}
            />
            <Field
              ref={reg("fullName")}
              name="fullName"
              label="Quel est votre nom et prénom ?"
              placeholder="Jean Martin"
              value={data.fullName}
              onChange={setField}
              onBlur={touch}
              error={err("fullName")}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={focusNext("phone")}
            />
            <Field
              ref={reg("phone")}
              name="phone"
              label="Quel est votre numéro de téléphone ?"
              placeholder="06 12 34 56 78"
              value={data.phone}
              onChange={setField}
              onBlur={touch}
              error={err("phone")}
              autoComplete="tel"
              textContentType="telephoneNumber"
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={next}
            />
          </>
        );

      case 2:
        return (
          <>
            <Segmented
              name="unit"
              label="Quelle unité utilisez-vous habituellement ?"
              options={UNITS}
              value={data.unit}
              onChange={setField}
            />

            <View style={styles.block}>
              <View style={styles.labelRow}>
                <Text style={styles.labelFlex}>Quels produits mesurez-vous ?</Text>
                {data.products.length > 0 && (
                  <Text style={styles.count}>
                    {data.products.length} sur {PRODUCTS.length}
                  </Text>
                )}
              </View>
              <View style={styles.chips}>
                {PRODUCTS.map((p) => (
                  <Chip
                    key={p.key}
                    item={p}
                    selected={data.products.includes(p.key)}
                    onToggle={toggleProduct}
                    compact={width < 360}
                  />
                ))}
              </View>
              {err("products") ? (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {err("products")}
                </Text>
              ) : (
                <Text style={[styles.helper, styles.helperGrid]}>Votre sélection personnalise les raccourcis de l’écran d’accueil.</Text>
              )}
            </View>
          </>
        );

      case 3:
        return (
          <>
            <Field
              name="docName"
              label="Quel nom souhaitez-vous afficher sur vos documents ?"
              placeholder="Nom de l’entreprise"
              value={docName}
              onChange={setField}
              onBlur={touch}
              error={err("docName")}
              autoCapitalize="words"
              returnKeyType="done"
            />

            <View style={styles.card}>
              <SwitchRow
                name="hasLogo"
                title="Avez-vous un logo à intégrer ?"
                hint="Il apparaît en en-tête de vos fiches."
                value={data.hasLogo}
                onChange={toggleLogo}
              />
              <SwitchRow
                name="showContact"
                title="Souhaitez-vous afficher vos coordonnées ?"
                hint="Téléphone et e-mail sous votre nom."
                value={data.showContact}
                onChange={setField}
              />
              <SwitchRow
                name="includePhotos"
                title="Souhaitez-vous inclure les photos dans le PDF ?"
                hint="Une photo par ouvrage relevé."
                value={data.includePhotos}
                onChange={setField}
                last
              />
            </View>

            {data.hasLogo &&
              (data.logoUri ? (
                <View style={styles.logoCard}>
                  <View
                    style={[
                      styles.logoImgBox,
                      {
                        aspectRatio: LOGO_FORMATS.find((f) => f.value === data.logoFormat)?.ratio ?? 1,
                        width: data.logoFormat === "wide" ? "100%" : 140,
                      },
                    ]}
                  >
                    <Image source={{ uri: data.logoUri }} resizeMode="contain" style={StyleSheet.absoluteFill} />
                  </View>
                  <View style={styles.logoActions}>
                    <Pressable accessibilityRole="button" accessibilityLabel="Recadrer mon logo" onPress={editLogo} style={styles.logoBtn}>
                      <Ionicons name="crop-outline" size={18} color={COLORS.white} />
                      <Text style={styles.logoBtnText}>Recadrer</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel="Changer mon logo" onPress={openLogoPicker} style={styles.logoBtn}>
                      <Ionicons name="swap-horizontal-outline" size={18} color={COLORS.white} />
                      <Text style={styles.logoBtnText}>Changer</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Ajouter mon logo" onPress={openLogoPicker} style={styles.logoZone}>
                  <Ionicons name="image-outline" size={20} color={COLORS.white} />
                  <Text style={styles.logoZoneText}>Ajouter mon logo</Text>
                </Pressable>
              ))}

            <Segmented
              name="format"
              label="Quel format de document préférez-vous ?"
              options={FORMATS}
              value={data.format}
              onChange={setField}
            />
            <Segmented
              name="organisation"
              label="Souhaitez-vous une fiche par produit ou un PDF regroupant tous les produits du chantier ?"
              options={ORGANISATIONS}
              value={data.organisation}
              onChange={setField}
            />
          </>
        );

      default:
        return (
          <>
            <View style={styles.card}>
              <SwitchRow
                name="microphone"
                caption="MICROPHONE"
                title="Autoriser la dictée vocale des mesures ?"
                hint="Dictez vos cotes sans lâcher le mètre."
                value={data.microphone}
                onChange={setPermission}
              />
              <SwitchRow
                name="camera"
                caption="APPAREIL PHOTO"
                title="Autoriser la prise de photos du chantier ?"
                hint="Joignez une photo à chaque ouvrage relevé."
                value={data.camera}
                onChange={setPermission}
              />
              <SwitchRow
                name="notifications"
                caption="NOTIFICATIONS"
                title="Souhaitez-vous recevoir des rappels ou notifications ?"
                hint="Relevés à terminer, documents prêts."
                value={data.notifications}
                onChange={setPermission}
              />
              <SwitchRow
                name="files"
                caption="FICHIERS"
                title="Autoriser l’export et l’enregistrement des PDF ?"
                hint="Enregistrez et partagez vos fiches."
                value={data.files}
                onChange={setPermission}
                last
              />
            </View>
            <Text style={styles.helper}>
              Chaque autorisation est demandée par votre téléphone au moment où vous l’activez. Vous pourrez la modifier dans les
              réglages.
            </Text>
          </>
        );
    }
  };

  /* ----- rendu ----- */

  if (done) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
        <Grid width={width} height={height} />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.doneWrap} showsVerticalScrollIndicator={false}>
            <Animated.View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.doneCircle,
                { opacity: pop, transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
              ]}
            >
              <Ionicons name="checkmark" size={44} color={COLORS.white} />
            </Animated.View>

            <Text accessibilityRole="header" style={styles.doneTitle}>
              Tout est prêt
            </Text>
            <Text style={styles.doneText}>
              L’espace {data.company.trim()} est configuré. Vos raccourcis vous attendent sur l’écran d’accueil.
            </Text>

            {/* Récapitulatif de la configuration */}
            <View style={styles.recap}>
              <RecapRow icon="business-outline" k="Entreprise" v={data.company.trim()} />
              <RecapRow icon="resize-outline" k="Unité" v={data.unit === "cm" ? "Centimètres" : "Millimètres"} />
              <RecapRow icon="grid-outline" k="Produits" v={`${data.products.length} sur ${PRODUCTS.length}`} />
              <RecapRow icon="document-text-outline" k="Fiches PDF" v={FORMATS.find((f) => f.value === data.format)?.label} last />
            </View>
            <Text style={styles.doneHint}>Tout se modifie ensuite dans Réglages.</Text>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Commencer"
              onPress={() => onComplete?.(config())}
              android_ripple={{ color: "rgba(0,50,58,0.12)" }}
              style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}
            >
              <Text style={styles.primaryText}>Commencer</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const text = STEP_TEXT[step];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <Grid width={width} height={height} />

      <SafeAreaView style={styles.safeArea}>
        {/* EN-TÊTE : retour + progression */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={back}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={COLORS.white} />
          </Pressable>

          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Étape ${step + 1} sur ${STEPS}`}
            accessibilityValue={{ min: 1, max: STEPS, now: step + 1 }}
            style={styles.progress}
          >
            {Array.from({ length: STEPS }, (_, i) => (
              <View key={i} style={[styles.seg, i <= step && styles.segOn]} />
            ))}
          </View>

          <Text style={styles.stepCount}>
            {step + 1}/{STEPS}
          </Text>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={contentStyle}>
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.title}>
                {text.title}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
                {text.subtitle}
              </Text>

              {renderStep()}
            </Animated.View>
          </ScrollView>

          {/* ACTION PRINCIPALE */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={step === STEPS - 1 ? "Terminer" : "Continuer"}
              accessibilityHint={!stepValid ? "Des champs obligatoires restent à remplir" : undefined}
              onPress={next}
              android_ripple={{ color: "rgba(0,50,58,0.12)" }}
              style={({ pressed }) => [styles.primary, !stepValid && styles.primaryIdle, pressed && styles.primaryPressed]}
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.primaryText, !stepValid && styles.primaryTextIdle]}>
                {step === STEPS - 1 ? "Terminer" : "Continuer"}
              </Text>
            </Pressable>

            {step === 0 && (
              <View style={styles.loginRow}>
                <Text maxFontSizeMultiplier={1.3} style={styles.loginText}>
                  Vous avez déjà un compte ?
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Se connecter"
                  onPress={() => onLogin?.()}
                  hitSlop={8}
                  style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.loginLink}>
                    Se connecter
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ÉCRAN DE RECADRAGE DU LOGO */}
      <LogoCropper visible={!!crop} source={crop} onCancel={() => setCrop(null)} onDone={finishCrop} />
    </View>
  );
}

export default SetupScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  flex: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0 },

  gridLine: { position: "absolute", backgroundColor: COLORS.grid },

  /* En-tête */
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SIDE - 8, paddingTop: 8, gap: 8 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  progress: { flex: 1, flexDirection: "row", gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.line },
  segOn: { backgroundColor: COLORS.white },
  stepCount: {
    width: 44,
    textAlign: "right",
    paddingRight: 8,
    color: COLORS.textSoft,
    fontSize: 13,
    fontFamily: FONT.medium,
    fontVariant: ["tabular-nums"],
  },

  /* Contenu */
  scroll: { paddingHorizontal: SIDE, paddingTop: 24, paddingBottom: 24 },
  title: { color: COLORS.white, fontSize: 29, lineHeight: 38, fontFamily: FONT.title, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, marginBottom: 24 },

  block: { marginBottom: 18 },
  label: { color: COLORS.white, fontSize: 14, lineHeight: 19, fontWeight: "600", marginBottom: 8 },
  labelRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 8 },
  labelFlex: { flex: 1, color: COLORS.white, fontSize: 14, lineHeight: 19, fontWeight: "600" },
  count: { color: COLORS.textSoft, fontSize: 13, fontVariant: ["tabular-nums"] },
  helper: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4, marginBottom: 20 },
  helperGrid: { marginTop: 12 },
  error: { color: COLORS.error, fontSize: 13, lineHeight: 18, marginTop: 6 },

  /* Champs */
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
  inputWithRight: { paddingRight: 92 },
  inputAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    minWidth: 76,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inputActionText: { color: COLORS.textSoft, fontSize: 14, fontWeight: "600" },
  inputFocused: { borderColor: COLORS.white },
  inputError: { borderColor: COLORS.error },

  /* Choix unique : sélection en bloc blanc */
  segmented: { flexDirection: "row", gap: 10 },
  segment: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  segmentTitle: { color: COLORS.white, fontSize: 15, lineHeight: 20, fontWeight: "600", textAlign: "center" },
  segmentTitleOn: { color: COLORS.brand },
  segmentHint: { color: COLORS.textSoft, fontSize: 12.5, lineHeight: 17, textAlign: "center", marginTop: 1 },
  segmentHintOn: { color: "rgba(0,50,58,0.65)" },

  /* Choix multiple : grille 2 colonnes, sélection en bloc blanc */
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
  },
  chipCompact: { gap: 6, paddingLeft: 12, paddingRight: 8 },
  chipOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  chipPressed: { opacity: 0.85 },
  // Même épaisseur cochée ou non : le libellé ne change jamais de ligne
  chipText: { flex: 1, color: COLORS.white, fontSize: 15, lineHeight: 19, fontWeight: "500" },
  chipTextCompact: { fontSize: 13.5, lineHeight: 17 },
  chipTextOn: { color: COLORS.brand },
  chipDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  chipDotCompact: { width: 20, height: 20, borderRadius: 10 },
  chipDotOn: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },

  /* Lignes à interrupteur */
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.fill,
    marginBottom: 18,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft },
  rowText: { flex: 1 },
  rowCaption: { color: COLORS.textSoft, fontSize: 11.5, lineHeight: 15, fontWeight: "700", letterSpacing: 0.8, marginBottom: 3 },
  rowTitle: { color: COLORS.white, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  rowHint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18, marginTop: 3 },

  /* Logo */
  logoZone: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.line,
    marginTop: -8,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  logoZoneText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
  logoCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.fill,
    padding: 14,
    marginTop: -8,
    marginBottom: 20,
    alignItems: "center",
    gap: 12,
  },
  logoImgBox: { backgroundColor: COLORS.white, borderRadius: 8, overflow: "hidden" },
  logoActions: { flexDirection: "row", gap: 10, alignSelf: "stretch" },
  logoBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logoBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },

  /* Conditions d'utilisation */
  consent: { marginBottom: 22 },
  consentRow: { minHeight: 44, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  box: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  boxOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  boxError: { borderColor: COLORS.error },
  consentText: { flex: 1, color: COLORS.textSoft, fontSize: 14, lineHeight: 21 },
  consentLink: { color: COLORS.white, fontWeight: "600", textDecorationLine: "underline" },
  consentError: { marginTop: 2, marginLeft: 36 },

  /* Connexion avec Apple / Google / Facebook */
  socialWrap: { marginBottom: 8 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.lineSoft },
  dividerText: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18 },
  socialRow: { flexDirection: "row", gap: 10 },
  social: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  socialPressed: { opacity: 0.7 },

  /* Compte existant */
  loginRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
    minHeight: 44,
    marginTop: 4,
  },
  loginText: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20 },
  loginBtn: { paddingVertical: 8 },
  loginLink: { color: COLORS.white, fontSize: 14, lineHeight: 20, fontWeight: "600", textDecorationLine: "underline" },

  /* Bas d'écran */
  footer: {
    backgroundColor: COLORS.brand,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 16 : 24,
  },
  primary: { height: 56, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  // Désactivé : forme nette, fond discret et texte grisé (pas de voile sur tout le bouton)
  primaryIdle: { backgroundColor: COLORS.fillStrong },
  primaryPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  primaryText: { color: COLORS.brand, fontSize: 16, lineHeight: 22, fontFamily: FONT.title },
  primaryTextIdle: { color: COLORS.textMute },

  /* Écran final */
  doneWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SIDE, paddingVertical: 32 },
  doneCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  doneTitle: {
    color: COLORS.white,
    fontSize: 29,
    lineHeight: 38,
    fontFamily: FONT.title,
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 8,
  },
  doneText: { maxWidth: 320, color: COLORS.textSoft, fontSize: 15, lineHeight: 23, textAlign: "center" },
  recap: {
    alignSelf: "stretch",
    marginTop: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.fill,
    paddingHorizontal: 16,
  },
  recapRow: { minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12 },
  recapDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft },
  recapK: { color: COLORS.textSoft, fontSize: 14.5 },
  recapV: { flex: 1, color: COLORS.white, fontSize: 14.5, fontWeight: "600", textAlign: "right" },
  doneHint: { color: COLORS.textMute, fontSize: 13, marginTop: 12 },
});