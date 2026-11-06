import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
  grid: "rgba(255,255,255,0.03)",
  success: "#7FD8B5",
};

const CELL = 28;
const SIDE = 20;
const ENTER_DURATION = 420;
const ENTER_OFFSET = 12;

/* ------------------------------------------------------------------
   OUTILS
------------------------------------------------------------------ */

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Lundi 00:00 de la semaine en cours
const startOfWeek = (d) => {
  const day = (d.getDay() + 6) % 7;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
};

const toDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateOf = (s) => s.completedAt || s.updatedAt;

// « Terminé aujourd’hui », « Terminé le 24 sept. 2026 »
const doneLabel = (iso) => {
  const d = toDate(iso);
  if (!d) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Terminé aujourd’hui";
  if (diff === 1) return "Terminé hier";
  if (diff < 7) return `Terminé il y a ${diff} jours`;
  return `Terminé le ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// « FEN-001 · Fenêtre chambre » → { ref: "FEN-001", title: "Fenêtre chambre" }
const splitName = (name = "") => {
  const i = name.indexOf(" · ");
  return i > 0 ? { ref: name.slice(0, i), title: name.slice(i + 3) } : { ref: "", title: name };
};

const norm = (s = "") => {
  let t = String(s).toLowerCase();
  try {
    t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (e) {
    // moteur sans normalize : texte tel quel
  }
  return t;
};

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

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
   RECHERCHE ET FILTRES
------------------------------------------------------------------ */

function SearchBar({ value, onChangeText }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.search, focused && styles.searchFocused]}>
      <Ionicons name="search" size={18} color={COLORS.textSoft} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Client, chantier, adresse…"
        placeholderTextColor={COLORS.placeholder}
        accessibilityLabel="Rechercher un client, un chantier ou une adresse"
        selectionColor={COLORS.white}
        keyboardAppearance="dark"
        returnKeyType="search"
        autoCorrect={false}
        maxFontSizeMultiplier={1.3}
        style={styles.searchInput}
      />
      {value.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.searchClear}
        >
          <Ionicons name="close-circle" size={18} color={COLORS.textMute} />
        </Pressable>
      )}
    </View>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <View accessibilityRole="tablist" style={styles.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.label}, ${o.count}`}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, on && styles.segItemOn]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.15}
              style={[styles.segText, on && styles.segTextOn]}
            >
              {o.label}
              <Text style={[styles.segCount, on && styles.segCountOn]}>{`  ${o.count}`}</Text>
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DropdownChip({ label, active, open, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtrer par type${active ? ` : ${label}` : ""}`}
      accessibilityState={{ expanded: !!open, selected: !!active }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.dd, (active || open) && styles.ddOn, pressed && styles.pressed]}
    >
      <Ionicons name="funnel-outline" size={14} color={COLORS.white} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={styles.ddText}>
        {label}
      </Text>
      <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={COLORS.white} />
    </Pressable>
  );
}

function ChoiceChips({ options, value, onPick }) {
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => onPick(o.key)}
            style={({ pressed }) => [styles.choice, on && styles.choiceOn, pressed && styles.pressed]}
          >
            {on && <Ionicons name="checkmark" size={14} color={COLORS.brand} />}
            <Text maxFontSizeMultiplier={1.2} style={[styles.choiceText, on && styles.choiceTextOn]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------
   ÉLÉMENTS DE CARTE
------------------------------------------------------------------ */

function Tags({ items = [], max = 3 }) {
  const shown = items.slice(0, max);
  const extra = items.length - shown.length;
  if (!shown.length) return null;
  return (
    <View style={styles.tags}>
      {shown.map((t, i) => (
        <View key={`${t}-${i}`} style={styles.tag}>
          <Text maxFontSizeMultiplier={1.15} style={styles.tagText}>
            {t}
          </Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={styles.tag}>
          <Text maxFontSizeMultiplier={1.15} style={styles.tagText}>
            +{extra}
          </Text>
        </View>
      )}
    </View>
  );
}

// Vignette : photo, sinon icône de document
const Thumb = memo(function Thumb({ uri, size = 56 }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: 14 };
  if (uri && !failed) {
    return (
      <Image source={{ uri }} resizeMode="cover" accessible={false} onError={() => setFailed(true)} style={[styles.thumb, box]} />
    );
  }
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.thumb, styles.thumbFallback, box]}>
      <Ionicons name="document-text-outline" size={Math.round(size * 0.44)} color={COLORS.white} />
    </View>
  );
});

function SmallButton({ label, icon, variant = "soft", onPress, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => [
        styles.btn,
        variant === "primary" ? styles.btnPrimary : styles.btnSoft,
        pressed && styles.btnPressed,
      ]}
    >
      <Ionicons name={icon} size={17} color={COLORS.white} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.btnText}>
        {label}
      </Text>
    </Pressable>
  );
}

function IconButton({ name, onPress, accessibilityLabel, size = 42 }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconBtn,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.btnPressed,
      ]}
    >
      <Ionicons name={name} size={Math.round(size * 0.5)} color={COLORS.white} />
    </Pressable>
  );
}

function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={COLORS.white} />
      </View>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.emptyTitle}>
        {title}
      </Text>
      {!!text && (
        <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
          {text}
        </Text>
      )}
      {!!actionLabel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          style={({ pressed }) => [styles.emptyBtn, pressed && styles.btnPressed]}
        >
          <Ionicons name="refresh" size={19} color={COLORS.white} />
          <Text maxFontSizeMultiplier={1.2} style={styles.emptyBtnText}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------
   CARTE FICHE
------------------------------------------------------------------ */

const SheetCard = memo(function SheetCard({ sheet, onView, onPdf, onMore }) {
  const { ref, title } = splitName(sheet.name);
  const done = doneLabel(dateOf(sheet));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Voir la fiche ${sheet.name}`}
      onPress={() => onView?.(sheet)}
      android_ripple={{ color: "rgba(255,255,255,0.06)" }}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.top}>
        <Thumb uri={sheet.photo} />
        <View style={styles.body}>
          {!!ref && (
            <View style={styles.ref}>
              <Text maxFontSizeMultiplier={1.15} style={styles.refText}>
                {ref}
              </Text>
            </View>
          )}
          <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={styles.name}>
            {title}
          </Text>
          {!!sheet.address && (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.addr}>
              {sheet.address}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.infoRow}>
        {!!done && (
          <View style={styles.dateRow}>
            <Ionicons name="checkmark-circle" size={15} color={COLORS.success} />
            <Text maxFontSizeMultiplier={1.2} style={styles.date}>
              {done}
            </Text>
          </View>
        )}
        <Tags items={sheet.elements || []} />
      </View>

      <View style={styles.actions}>
        <SmallButton
          label="Voir"
          icon="eye-outline"
          accessibilityLabel={`Voir la fiche ${sheet.name}`}
          onPress={() => onView?.(sheet)}
        />
        <SmallButton
          label="PDF"
          icon="download-outline"
          variant="primary"
          accessibilityLabel={`Télécharger le PDF de ${sheet.name}`}
          onPress={() => onPdf?.(sheet)}
        />
        <IconButton
          name="ellipsis-horizontal"
          accessibilityLabel={`Plus d’actions pour ${sheet.name}`}
          onPress={() => onMore?.(sheet)}
        />
      </View>
    </Pressable>
  );
});

/* ------------------------------------------------------------------
   ÉCRAN (la barre de navigation est gérée par App.js)
------------------------------------------------------------------ */

/**
 * Props
 *  - sheets : relevés terminés [{ id, name, client?, address?, photo?, elements?, completedAt? | updatedAt? }]
 *  - onViewSheet(sheet), onDownloadPdf(sheet), onMoreSheet(sheet)
 */
function SheetsScreen({ sheets = [], onViewSheet, onDownloadPdf, onMoreSheet }) {
  const { width, height } = useWindowDimensions();

  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState(null);
  const [typeOpen, setTypeOpen] = useState(false);
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

  const types = useMemo(() => {
    const set = new Set();
    sheets.forEach((s) => (s.elements || []).forEach((e) => set.add(e)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [sheets]);

  const inPeriod = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    return (s, p) => {
      if (p === "all") return true;
      const d = toDate(dateOf(s));
      if (!d) return false;
      if (p === "week") return d.getTime() >= weekStart;
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: sheets.length,
      week: sheets.filter((s) => inPeriod(s, "week")).length,
      month: sheets.filter((s) => inPeriod(s, "month")).length,
    }),
    [sheets, inPeriod]
  );

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return sheets
      .filter((s) => {
        if (!inPeriod(s, period)) return false;
        if (type && !(s.elements || []).includes(type)) return false;
        if (!q) return true;
        return norm(`${s.name} ${s.client || ""} ${s.address || ""}`).includes(q);
      })
      .sort((a, b) => String(dateOf(b) || "").localeCompare(String(dateOf(a) || "")));
  }, [sheets, query, period, type, inPeriod]);

  const total = sheets.length;
  const filtering = query.trim() !== "" || period !== "all" || !!type;

  const reset = () => {
    setQuery("");
    setPeriod("all");
    setType(null);
    setTypeOpen(false);
  };

  const pickType = (t) => {
    setType(t);
    setTypeOpen(false);
  };

  return (
    <View style={styles.root}>
      <Grid width={width} height={height} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={rise}>
          {/* TITRE */}
          <View style={styles.header}>
            <Text accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.title}>
              Fiches
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              {total ? plural(total, "relevé terminé", "relevés terminés") : "Retrouvez tous vos relevés terminés."}
            </Text>
          </View>

          <SearchBar value={query} onChangeText={setQuery} />

          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { key: "all", label: "Toutes", count: counts.all },
              { key: "week", label: "Semaine", count: counts.week },
              { key: "month", label: "Mois", count: counts.month },
            ]}
          />

          <View style={styles.toolbar}>
            <Text maxFontSizeMultiplier={1.2} style={styles.result}>
              {filtering ? plural(filtered.length, "résultat", "résultats") : "Les plus récentes d’abord"}
            </Text>
            <DropdownChip label={type || "Type"} active={!!type} open={typeOpen} onPress={() => setTypeOpen((o) => !o)} />
          </View>

          {typeOpen && (
            <View style={styles.panel}>
              {types.length === 0 ? (
                <Text maxFontSizeMultiplier={1.3} style={styles.panelEmpty}>
                  Aucun type d’élément pour le moment.
                </Text>
              ) : (
                <ChoiceChips
                  value={type}
                  onPick={pickType}
                  options={[{ key: null, label: "Tous les types" }, ...types.map((t) => ({ key: t, label: t }))]}
                />
              )}
            </View>
          )}

          {/* LISTE */}
          <View style={styles.list}>
            {total === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="Pas encore de fiche"
                text="Les relevés apparaissent ici dès que vous les terminez."
              />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="search"
                title="Aucun résultat"
                text="Essayez une autre recherche ou changez les filtres."
                actionLabel="Réinitialiser les filtres"
                onAction={reset}
              />
            ) : (
              filtered.map((s, i) => (
                <SheetCard
                  key={s.id ?? `${s.name}-${i}`}
                  sheet={s}
                  onView={onViewSheet}
                  onPdf={onDownloadPdf}
                  onMore={onMoreSheet}
                />
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default SheetsScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  gridLine: { position: "absolute", backgroundColor: COLORS.grid },
  pressed: { opacity: 0.7 },
  scroll: { paddingHorizontal: SIDE, paddingTop: 20, paddingBottom: 36 },

  /* Titre */
  header: { marginBottom: 18 },
  title: { color: COLORS.white, fontSize: 32, lineHeight: 38, fontWeight: "800", letterSpacing: -0.8 },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 21, marginTop: 2 },

  /* Recherche */
  search: {
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.fill,
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchFocused: { borderColor: COLORS.line },
  searchInput: { flex: 1, height: "100%", color: COLORS.white, fontSize: 15.5 },
  searchClear: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  /* Sélecteur */
  seg: { flexDirection: "row", padding: 4, borderRadius: 14, backgroundColor: COLORS.fill, gap: 4, marginTop: 12 },
  segItem: { flex: 1, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  segItemOn: { backgroundColor: COLORS.white },
  segText: { color: COLORS.textSoft, fontSize: 14, fontWeight: "600" },
  segTextOn: { color: COLORS.brand, fontWeight: "700" },
  segCount: { color: COLORS.textMute, fontWeight: "600" },
  segCountOn: { color: "rgba(0,50,58,0.55)" },

  /* Barre de résultat + filtre « Type » */
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 16 },
  result: { flex: 1, color: COLORS.textMute, fontSize: 13.5, fontWeight: "600" },
  dd: {
    height: 36,
    maxWidth: 210,
    borderRadius: 18,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  ddOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  ddText: { flexShrink: 1, color: COLORS.white, fontSize: 13.5, fontWeight: "600" },

  panel: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 12,
  },
  panelEmpty: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20, paddingVertical: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  choiceOn: { backgroundColor: COLORS.white, borderColor: COLORS.white },
  choiceText: { color: COLORS.white, fontSize: 14, fontWeight: "500" },
  choiceTextOn: { color: COLORS.brand, fontWeight: "700" },

  /* Liste et cartes */
  list: { marginTop: 14, gap: 12 },
  card: {
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 16,
  },
  cardPressed: { backgroundColor: COLORS.surfaceHi },
  top: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  body: { flex: 1 },
  ref: {
    alignSelf: "flex-start",
    height: 22,
    borderRadius: 6,
    paddingHorizontal: 7,
    backgroundColor: COLORS.fill,
    justifyContent: "center",
    marginBottom: 4,
  },
  refText: { color: COLORS.white, fontSize: 11.5, fontWeight: "800", letterSpacing: 0.5 },
  name: { color: COLORS.white, fontSize: 16.5, lineHeight: 22, fontWeight: "700", letterSpacing: -0.2 },
  addr: { color: COLORS.textSoft, fontSize: 13.5, lineHeight: 19, marginTop: 2 },

  infoRow: { marginTop: 12, gap: 10 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18 },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { height: 26, borderRadius: 8, paddingHorizontal: 9, backgroundColor: COLORS.fill, alignItems: "center", justifyContent: "center" },
  tagText: { color: COLORS.textSoft, fontSize: 12.5, fontWeight: "600" },

  thumb: { backgroundColor: COLORS.fill, overflow: "hidden" },
  thumbFallback: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.accentSoft },

  /* Actions */
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
  },
  btn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSoft: { backgroundColor: COLORS.fill },
  btnPrimary: { backgroundColor: COLORS.accent },
  btnText: { color: COLORS.white, fontSize: 14.5, fontWeight: "700" },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  iconBtn: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.line },

  /* État vide */
  empty: {
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.fill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: COLORS.white, fontSize: 17, lineHeight: 23, fontWeight: "700", textAlign: "center" },
  emptyText: { maxWidth: 290, color: COLORS.textSoft, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 6 },
  emptyBtn: {
    alignSelf: "stretch",
    height: 52,
    borderRadius: 14,
    marginTop: 20,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
});