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
  PixelRatio,
  useWindowDimensions,
} from "react-native";

/* ------------------------------------------------------------------
   TOKENS (mêmes que l'accueil et les chantiers)
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
};

const CELL = 28;
const SIDE = 24;
const PHOTO = 88;
const MAX_TAGS = 6;

const ENTER_DURATION = 360;
const ENTER_OFFSET = 14;

// flex proportionnel à la longueur du libellé : « Cette semaine » ne se coupe jamais
const PERIOD_FILTERS = [
  { key: "all", label: "Toutes", flex: 1 },
  { key: "week", label: "Cette semaine", flex: 1.75 },
  { key: "month", label: "Ce mois", flex: 1.25 },
];

// Le texte de la recherche ne doit jamais être coupé :
// on choisit la formule la plus complète qui tient dans la barre.
const SEARCH_OPTIONS = [
  "Rechercher un client, chantier, adresse…",
  "Rechercher client, chantier, adresse…",
  "Client, chantier, adresse…",
];
const SEARCH_FONT = 15;

const searchPlaceholder = (screenWidth) => {
  const scale = Math.min(PixelRatio.getFontScale(), 1.3);
  const room = screenWidth - 110; // marges, loupe, bordures
  const cap = Math.floor(room / (SEARCH_FONT * 0.47 * scale));
  return SEARCH_OPTIONS.find((o) => o.length <= cap) || SEARCH_OPTIONS[2];
};

/* ------------------------------------------------------------------
   OUTILS
------------------------------------------------------------------ */

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// « Terminé aujourd’hui », « Terminé hier », « Terminé le 24 septembre 2026 »
const doneLabel = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Terminé aujourd’hui";
  if (diff === 1) return "Terminé hier";
  return `Terminé le ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const inThisWeek = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const sinceMonday = (now.getDay() + 6) % 7; // lundi = début de semaine
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday).getTime();
  const end = start + 7 * 86400000;
  const t = d.getTime();
  return t >= start && t < end;
};

const inThisMonth = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

// Recherche insensible à la casse et aux accents
const norm = (s = "") => {
  let t = String(s).toLowerCase();
  try {
    t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch (e) {
    // moteur sans normalize : on garde le texte tel quel
  }
  return t;
};

const countLabel = (n) => `${n} ${n > 1 ? "fiches" : "fiche"}`;
const elementsLabel = (n) => `${n} ${n > 1 ? "éléments" : "élément"}`;
const dateOf = (s) => s.date || s.updatedAt;

/* ------------------------------------------------------------------
   FOND : TRAME DE PAPIER CALQUE
------------------------------------------------------------------ */

const Grid = memo(function Grid({ width, height }) {
  const cols = Math.ceil(width / CELL) + 1;
  const rows = Math.ceil(height / CELL) + 1;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: cols }, (_, i) => (
        <View
          key={`v${i}`}
          style={[styles.gridLine, { top: 0, bottom: 0, left: i * CELL, width: 1 }]}
        />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <View
          key={`h${i}`}
          style={[styles.gridLine, { left: 0, right: 0, top: i * CELL, height: 1 }]}
        />
      ))}
    </View>
  );
});

/* ------------------------------------------------------------------
   PICTOGRAMMES (dessinés en vues : aucune dépendance)
------------------------------------------------------------------ */

const SearchIcon = () => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={styles.searchIcon}
  >
    <View style={styles.searchCircle} />
    <View style={styles.searchHandle} />
  </View>
);

const DotsIcon = () => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={styles.dots}
  >
    <View style={styles.dot} />
    <View style={styles.dot} />
    <View style={styles.dot} />
  </View>
);

// Flèche de téléchargement : ↓ posée sur un plateau
const DownloadIcon = () => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={styles.dl}
  >
    <View style={styles.dlStem} />
    <View style={styles.dlHead} />
    <View style={styles.dlTray} />
  </View>
);

/* ------------------------------------------------------------------
   BLOCS
------------------------------------------------------------------ */

const FilterButton = memo(function FilterButton({
  label,
  selected,
  onPress,
  caret,
  open,
  flex = 1,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtre : ${label}`}
      accessibilityState={{ selected, expanded: caret ? open : undefined }}
      onPress={onPress}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
      style={({ pressed }) => [
        styles.filter,
        { flex },
        selected && styles.filterOn,
        pressed && styles.pressed,
      ]}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.15}
        style={[styles.filterText, selected && styles.filterTextOn]}
      >
        {label}
      </Text>
      {caret && (
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[styles.caret, open && styles.caretOpen]}
        />
      )}
    </Pressable>
  );
});

const Photo = memo(function Photo({ uri, name }) {
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        resizeMode="cover"
        accessible={false}
        onError={() => setFailed(true)}
        style={styles.photo}
      />
    );
  }

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.photo, styles.photoFallback]}
    >
      <Text style={styles.photoLetter}>
        {(name || "?").trim().slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
});

const SheetCard = memo(function SheetCard({ sheet, onView, onPdf, onMore }) {
  const elements = sheet.elements || [];
  const count = sheet.elementCount ?? elements.length;
  const date = doneLabel(dateOf(sheet));
  const shown = elements.slice(0, MAX_TAGS);
  const extra = elements.length - shown.length;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Photo uri={sheet.photo} name={sheet.name} />

        <View style={styles.cardBody}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.name}>
            {sheet.name}
          </Text>

          {!!sheet.address && (
            <Text numberOfLines={2} maxFontSizeMultiplier={1.25} style={styles.address}>
              {sheet.address}
            </Text>
          )}

          <View style={styles.meta}>
            <Text maxFontSizeMultiplier={1.2} style={styles.metaStrong}>
              {elementsLabel(count)}
            </Text>
            {!!date && (
              <Text maxFontSizeMultiplier={1.2} style={styles.metaSoft}>
                {date}
              </Text>
            )}
          </View>
        </View>
      </View>

      {shown.length > 0 && (
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
      )}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Voir la fiche de ${sheet.name}`}
          onPress={() => onView?.(sheet)}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
        >
          <Text maxFontSizeMultiplier={1.2} style={styles.btnPrimaryText}>
            Voir
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Télécharger le PDF de ${sheet.name}`}
          onPress={() => onPdf?.(sheet)}
          android_ripple={{ color: "rgba(255,255,255,0.10)" }}
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
        >
          <DownloadIcon />
          <Text maxFontSizeMultiplier={1.2} style={styles.btnGhostText}>
            PDF
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Plus d’actions pour ${sheet.name}`}
          onPress={() => onMore?.(sheet)}
          android_ripple={{ color: "rgba(255,255,255,0.10)" }}
          style={({ pressed }) => [styles.btnMore, pressed && styles.btnPressed]}
        >
          <DotsIcon />
        </Pressable>
      </View>
    </View>
  );
});

const Empty = memo(function Empty({ title, text }) {
  return (
    <View style={styles.empty}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.emptyTitle}>
        {title}
      </Text>
      {!!text && (
        <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
          {text}
        </Text>
      )}
    </View>
  );
});

/* ------------------------------------------------------------------
   ÉCRAN (la barre de navigation est gérée par App.js)
------------------------------------------------------------------ */

/**
 * Props
 *  - sheets : relevés terminés
 *             [{ id, name (chantier), client?, address?, photo?: uri,
 *                elements?: string[] (ex. ["Fenêtre", "Volet"]), elementCount?: number,
 *                date | updatedAt: ISO (date de fin du relevé) }]
 *  - onViewSheet(sheet)  : bouton « Voir »
 *  - onDownloadPdf(sheet): bouton « PDF »
 *  - onMoreSheet(sheet)  : bouton « … »
 */
function SheetsScreen({ sheets = [], onViewSheet, onDownloadPdf, onMoreSheet }) {
  const { width, height } = useWindowDimensions();

  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [type, setType] = useState(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
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

  const types = useMemo(() => {
    const set = new Set();
    sheets.forEach((s) => (s.elements || []).forEach((e) => set.add(e)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [sheets]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    return sheets
      .filter((s) => {
        if (period === "week" && !inThisWeek(dateOf(s))) return false;
        if (period === "month" && !inThisMonth(dateOf(s))) return false;
        if (type && !(s.elements || []).includes(type)) return false;
        if (!q) return true;
        return norm(`${s.name} ${s.client || ""} ${s.address || ""}`).includes(q);
      })
      .sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a))); // plus récentes d'abord
  }, [sheets, query, period, type]);

  const total = sheets.length;
  const filtering = query.trim() !== "" || period !== "all" || !!type;

  const rise = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({
          inputRange: [0, 1],
          outputRange: [ENTER_OFFSET, 0],
        }),
      },
    ],
  };

  const pickType = (t) => {
    setType((cur) => (cur === t ? null : t));
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
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.title}>
            Fiches
          </Text>

          {/* SOUS-TITRE + NOMBRE DE FICHES */}
          <View style={styles.subRow}>
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              Retrouvez tous vos <Text style={styles.subtitleBold}>relevés terminés</Text>.
            </Text>
            <View accessible accessibilityLabel={countLabel(total)} style={styles.count}>
              <Text maxFontSizeMultiplier={1.2} style={styles.countText}>
                {countLabel(total)}
              </Text>
            </View>
          </View>

          {/* RECHERCHE */}
          <View style={[styles.search, searchFocused && styles.searchFocused]}>
            <SearchIcon />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={searchPlaceholder(width)}
              placeholderTextColor={COLORS.placeholder}
              accessibilityLabel="Rechercher un client, un chantier ou une adresse"
              selectionColor={COLORS.white}
              keyboardAppearance="dark"
              returnKeyType="search"
              autoCorrect={false}
              maxFontSizeMultiplier={1.3}
              style={styles.searchInput}
            />
            {query.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => setQuery("")}
                hitSlop={8}
                style={styles.clear}
              >
                <Text style={styles.clearText}>×</Text>
              </Pressable>
            )}
          </View>

          {/* FILTRES */}
          <View style={styles.filters}>
            {PERIOD_FILTERS.map((f) => (
              <FilterButton
                key={f.key}
                label={f.label}
                flex={f.flex}
                selected={period === f.key}
                onPress={() => setPeriod(f.key)}
              />
            ))}
            <FilterButton
              label={type || "Type"}
              flex={1.1}
              selected={!!type || typeOpen}
              caret
              open={typeOpen}
              onPress={() => setTypeOpen((o) => !o)}
            />
          </View>

          {typeOpen && (
            <View style={styles.typePanel}>
              {types.length === 0 ? (
                <Text maxFontSizeMultiplier={1.3} style={styles.typeEmpty}>
                  Aucun type d’élément pour le moment.
                </Text>
              ) : (
                <View style={styles.typeChips}>
                  {types.map((t) => (
                    <Pressable
                      key={t}
                      accessibilityRole="button"
                      accessibilityState={{ selected: type === t }}
                      accessibilityLabel={`Type : ${t}`}
                      onPress={() => pickType(t)}
                      style={({ pressed }) => [
                        styles.typeChip,
                        type === t && styles.typeChipOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        maxFontSizeMultiplier={1.2}
                        style={[styles.typeChipText, type === t && styles.typeChipTextOn]}
                      >
                        {t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* LISTE */}
          <View style={styles.list}>
            {total === 0 ? (
              <Empty title="Pas encore de fiche" />
            ) : filtered.length === 0 ? (
              <Empty
                title="Aucun résultat"
                text={
                  filtering
                    ? "Essayez une autre recherche ou changez les filtres."
                    : undefined
                }
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
  pressed: { opacity: 0.65 },

  scroll: {
    paddingHorizontal: SIDE,
    paddingTop: 24,
    paddingBottom: 32,
  },

  /* En-tête */
  title: {
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  subtitle: {
    flex: 1,
    color: COLORS.textSoft,
    fontSize: 15,
    lineHeight: 22,
  },
  subtitleBold: { color: COLORS.white, fontWeight: "700" },
  count: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },

  /* Recherche */
  search: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    paddingLeft: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchFocused: { borderColor: COLORS.white },
  searchInput: {
    flex: 1,
    height: "100%",
    color: COLORS.white,
    fontSize: SEARCH_FONT,
  },
  searchIcon: { width: 18, height: 18 },
  searchCircle: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.textSoft,
  },
  searchHandle: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 7,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.textSoft,
    transform: [{ rotate: "45deg" }],
  },
  clear: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  clearText: {
    color: COLORS.textSoft,
    fontSize: 24,
    lineHeight: 26,
  },

  /* Filtres */
  filters: { flexDirection: "row", gap: 8, marginTop: 14 },
  filter: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  filterOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  filterText: {
    flexShrink: 1,
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: "500",
  },
  filterTextOn: { fontWeight: "700" },
  caret: {
    width: 7,
    height: 7,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.white,
    transform: [{ rotate: "45deg" }, { translateY: -2 }],
  },
  caretOpen: {
    transform: [{ rotate: "-135deg" }, { translateY: -2 }],
  },

  typePanel: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    padding: 12,
  },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.line,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  typeChipOn: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  typeChipText: { color: COLORS.white, fontSize: 14, fontWeight: "500" },
  typeChipTextOn: { fontWeight: "700" },
  typeEmpty: {
    color: COLORS.textSoft,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 4,
  },

  /* Liste */
  list: { marginTop: 20, gap: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    padding: 14,
  },
  cardTop: { flexDirection: "row", gap: 14 },
  photo: {
    width: PHOTO,
    height: PHOTO,
    borderRadius: 14,
    backgroundColor: COLORS.fill,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  photoLetter: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: "700",
    opacity: 0.85,
  },
  cardBody: { flex: 1 },
  name: {
    color: COLORS.white,
    fontSize: 16.5,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  address: {
    color: COLORS.textSoft,
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 2,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 2,
    marginTop: 8,
  },
  metaStrong: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  metaSoft: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18 },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 14 },
  tag: {
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 11,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: { color: COLORS.white, fontSize: 12.5, fontWeight: "500" },

  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  btnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
  btnGhost: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnGhostText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
  btnMore: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  dots: { flexDirection: "row", gap: 3.5 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },

  /* Pictogramme de téléchargement */
  dl: { width: 16, height: 16, alignItems: "center" },
  dlStem: {
    position: "absolute",
    top: 0,
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: COLORS.white,
  },
  dlHead: {
    position: "absolute",
    top: 3.5,
    width: 8,
    height: 8,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: COLORS.white,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  dlTray: {
    position: "absolute",
    bottom: 0,
    width: 14,
    height: 2,
    borderRadius: 1,
    backgroundColor: COLORS.white,
  },

  /* États vides */
  empty: {
    paddingVertical: 56,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  emptyTitle: {
    color: COLORS.textSoft,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyText: {
    maxWidth: 280,
    color: COLORS.placeholder,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
  },
});