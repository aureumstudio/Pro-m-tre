import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  Animated,
  Easing,
  AccessibilityInfo,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// Symbole blanc de la plaquette (02-logos/), copié dans assets/.
// Si le fichier n'est pas encore dans assets/, remplace cette ligne par : const SYMBOL = null;
const SYMBOL = require("./assets/symbole-blanc.png");

function ProMetreSymbol({ size = 48, opacity = 1 }) {
  if (!SYMBOL) return null;
  return (
    <Image
      source={SYMBOL}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no"
      style={{ width: size, height: size, opacity }}
    />
  );
}

/* ------------------------------------------------------------------
   TOKENS
------------------------------------------------------------------ */

const COLORS = {
  brand: "#00323A",
  surface: "#073F48",
  accent: "#1E7F8C",
  white: "#FFFFFF",
  grid: "rgba(255,255,255,0.035)",
  textSoft: "rgba(255,255,255,0.72)",
  textMute: "rgba(255,255,255,0.50)",
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
  tileBg: "rgba(30,127,140,0.28)", // pastilles d'icônes (mêmes que Réglages)
  tileIcon: "#8FDCE4",
};

const FONT = { title: "Poppins_600SemiBold" };

const CELL = 28;
const SIDE = 24;
const SHORTCUT_GAP = 8;

// Logo de l'entreprise en haut à droite (toujours dans un rond)
const AVATAR = 52; // diamètre du rond
const RING = 2; // épaisseur de la bordure blanche
const WIDE_RATIO = 1.4; // au-delà de ce rapport largeur / hauteur, le logo est « horizontal »

const ENTER_DURATION = 460;
const ENTER_STAGGER = 80;
const ENTER_OFFSET = 14;

// Produits : libellé + icône (custom = pictogramme dessiné dans ce fichier)
const PRODUCTS = {
  fenetres: { label: "Fenêtres", icon: "window-closed-variant" },
  "portes-fenetres": { label: "Portes-fenêtres", icon: "window-open-variant" },
  "baies-coulissantes": { label: "Baies coulissantes", icon: "door-sliding" },
  "portes-entree": { label: "Portes d’entrée", icon: "door" },
  "volets-roulants": { label: "Volets roulants", icon: "window-shutter" },
  stores: { label: "Stores", custom: "awning" },
  portails: { label: "Portails", icon: "gate" },
  clotures: { label: "Clôtures", icon: "fence" },
};

/* ------------------------------------------------------------------
   OUTILS
------------------------------------------------------------------ */

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "P";

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const formatDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff} jours`;
  try {
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch (e) {
    return "";
  }
};

// Majuscule automatique au début de chaque mot du nom de l'entreprise
const capitalize = (s = "") =>
  s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 || h >= 18 ? "Bonsoir" : "Bonjour";
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
   PICTOGRAMMES DESSINÉS
------------------------------------------------------------------ */

const Chevron = () => <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.chevron} />;

const Arrow = () => (
  <View
    accessible={false}
    importantForAccessibility="no-hide-descendants"
    style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}
  >
    <View style={styles.arrowLine} />
    <View style={styles.arrowHead} />
  </View>
);

// Store banne : barre de fixation, toile rayée, lambrequin festonné
const AwningIcon = ({ color }) => (
  <View style={awning.box}>
    <View style={[awning.bar, { backgroundColor: color }]} />
    <View style={[awning.cloth, { borderColor: color }]}>
      <View style={[awning.stripe, { backgroundColor: color }]} />
      <View style={[awning.stripe, { backgroundColor: color }]} />
    </View>
    <View style={awning.valance}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[awning.scallop, { backgroundColor: color }]} />
      ))}
    </View>
  </View>
);

const awning = StyleSheet.create({
  box: { width: 20, height: 18, alignItems: "center", justifyContent: "center" },
  bar: { width: 20, height: 2.5, borderRadius: 1.25 },
  cloth: {
    width: 17,
    height: 7,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    flexDirection: "row",
    justifyContent: "space-evenly",
  },
  stripe: { width: 2, height: 7 },
  valance: { width: 17, flexDirection: "row", gap: 0.5 },
  scallop: { flex: 1, height: 3.5, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});

/* ------------------------------------------------------------------
   LOGO DE L'ENTREPRISE (toujours rond, bordure blanche)
------------------------------------------------------------------ */

const CompanyBadge = memo(function CompanyBadge({ logo, name, onPress }) {
  const [ratio, setRatio] = useState(1);
  const uri = logo?.uri;

  // Proportions réelles de l'image
  useEffect(() => {
    if (!uri) return undefined;
    let alive = true;
    Image.getSize(
      uri,
      (w, h) => {
        if (alive && w > 0 && h > 0) setRatio(w / h);
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [uri]);

  const wide = ratio > WIDE_RATIO;

  // Logo horizontal : plus grand rectangle qui tient entièrement dans le rond
  // (sa diagonale est égale au diamètre intérieur) → rien n'est coupé
  const inner = AVATAR - RING * 2;
  const fitW = inner / Math.sqrt(1 + 1 / (ratio * ratio));
  const fitH = fitW / ratio;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Réglages de l’entreprise"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.avatar, !!logo && styles.avatarRing, pressed && styles.pressed]}
    >
      {logo ? (
        wide ? (
          <Image source={logo} resizeMode="contain" accessible={false} style={{ width: fitW, height: fitH }} />
        ) : (
          <Image source={logo} resizeMode="cover" accessible={false} style={styles.avatarLogo} />
        )
      ) : (
        <Text style={styles.avatarText}>{initials(name)}</Text>
      )}
    </Pressable>
  );
});

/* ------------------------------------------------------------------
   BLOCS
------------------------------------------------------------------ */

const SectionHeader = memo(function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.sectionTitle}>
        {title}
      </Text>
      {!!actionLabel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          onPress={onAction}
          hitSlop={8}
          style={({ pressed }) => [styles.sectionAction, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionActionText}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const Stat = memo(function Stat({ value, label }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`} style={styles.stat}>
      <Text maxFontSizeMultiplier={1.2} style={styles.statValue}>
        {value}
      </Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
});

// Raccourci : pastille d'icône, libellé, petit « + » à droite (hauteur fixe)
const ShortcutChip = memo(function ShortcutChip({ item, width, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Nouveau relevé : ${item.label}`}
      onPress={() => onPress(item.key)}
      android_ripple={{ color: "rgba(255,255,255,0.10)" }}
      style={({ pressed }) => [styles.shortcut, { width }, pressed && styles.shortcutPressed]}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.shortcutIcon}>
        {item.custom === "awning" ? (
          <AwningIcon color={COLORS.tileIcon} />
        ) : (
          <MaterialCommunityIcons name={item.icon} size={18} color={COLORS.tileIcon} />
        )}
      </View>
      <Text numberOfLines={2} maxFontSizeMultiplier={1.15} style={styles.shortcutText}>
        {item.label}
      </Text>
      <Ionicons name="add" size={18} color={COLORS.textSoft} accessible={false} importantForAccessibility="no" />
    </Pressable>
  );
});

const ProjectCard = memo(function ProjectCard({ project, onPress, last }) {
  const count = project.measureCount ?? 0;
  const parts = [project.place, count > 0 ? plural(count, "ouvrage", "ouvrages") : "Aucun ouvrage"].filter(Boolean);
  const done = project.status === "done";
  const date = project.updatedAt ? formatDate(project.updatedAt) : "";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${project.name}. ${parts.join(", ")}. ${done ? "Terminé" : "En cours"}`}
      onPress={() => onPress?.(project)}
      android_ripple={{ color: "rgba(255,255,255,0.08)" }}
      style={({ pressed }) => [styles.project, !last && styles.projectDivider, pressed && styles.projectPressed]}
    >
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.projectBadge}>
        <Text style={styles.projectBadgeText}>{initials(project.name).slice(0, 1)}</Text>
      </View>

      <View style={styles.projectBody}>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.projectName}>
          {project.name}
        </Text>
        <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.projectMeta}>
          {parts.join(" · ")}
        </Text>
        <View style={styles.projectFoot}>
          <View style={[styles.status, done ? styles.statusDone : styles.statusLive]}>
            <Text maxFontSizeMultiplier={1.2} style={styles.statusText}>
              {done ? "Terminé" : "En cours"}
            </Text>
          </View>
          {!!date && (
            <Text maxFontSizeMultiplier={1.2} style={styles.projectDate}>
              {date}
            </Text>
          )}
        </View>
      </View>
      <Chevron />
    </Pressable>
  );
});

// État vide : pas de second bouton (la carte « Nouveau relevé » juste au-dessus suffit)
const EmptyProjects = memo(function EmptyProjects() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        {SYMBOL ? (
          <ProMetreSymbol size={32} opacity={0.9} />
        ) : (
          <Ionicons name="construct-outline" size={26} color={COLORS.white} />
        )}
      </View>
      <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.emptyTitle}>
        Pas encore de chantier
      </Text>
      <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
        Vos chantiers apparaîtront ici dès votre premier relevé.
      </Text>
    </View>
  );
});

/* ------------------------------------------------------------------
   ÉCRAN (la barre de navigation est gérée par App.js)
------------------------------------------------------------------ */

/**
 * Props
 *  - companyName, products, projects
 *  - logo : { uri } du logo de l'entreprise (facultatif)
 *  - onNewMeasure(productKey?), onSeeAllProjects(), onOpenProject(project), onOpenSettings()
 */
function HomeScreen({
  companyName = "",
  products = [],
  projects = [],
  logo,
  onNewMeasure,
  onSeeAllProjects,
  onOpenProject,
  onOpenSettings,
}) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);

  const enter = useRef(Array.from({ length: 5 }, () => new Animated.Value(0))).current;

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
      enter.forEach((v) => v.setValue(1));
      return undefined;
    }
    const anim = Animated.stagger(
      ENTER_STAGGER,
      enter.map((v) =>
        Animated.timing(v, {
          toValue: 1,
          duration: ENTER_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    );
    anim.start();
    return () => anim.stop();
  }, [reduceMotion, enter]);

  const rise = (v) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [ENTER_OFFSET, 0] }) }],
  });

  const name = capitalize(companyName) || "Mon entreprise";
  const tileWidth = Math.floor((width - SIDE * 2 - SHORTCUT_GAP) / 2);

  const shortcuts = useMemo(
    () => products.filter((k) => PRODUCTS[k]).map((k) => ({ key: k, ...PRODUCTS[k] })),
    [products]
  );

  const recent = useMemo(() => projects.slice(0, 4), [projects]);
  const hasProjects = projects.length > 0;
  const liveCount = projects.filter((p) => p.status !== "done").length;
  const measureTotal = projects.reduce((s, p) => s + (p.measureCount || 0), 0);

  return (
    <View style={styles.root}>
      <Grid width={width} height={height} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* EN-TÊTE */}
        <Animated.View style={[styles.header, rise(enter[0])]}>
          <View style={styles.headerText}>
            <Text maxFontSizeMultiplier={1.2} style={styles.hello}>
              {greeting()},
            </Text>
            <Text
              accessibilityRole="header"
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
              style={styles.company}
            >
              {name}
            </Text>
          </View>

          <CompanyBadge logo={logo} name={name} onPress={onOpenSettings} />
        </Animated.View>

        <Animated.View style={rise(enter[1])}>
          <Text maxFontSizeMultiplier={1.3} style={styles.tagline}>
            Créez vos relevés de mesure simplement et rapidement.
          </Text>
        </Animated.View>

        {/* ACTION PRINCIPALE : carte teintée, symbole en filigrane */}
        <Animated.View style={rise(enter[2])}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nouveau relevé. Créer un relevé de mesure"
            onPress={() => onNewMeasure?.()}
            android_ripple={{ color: "rgba(255,255,255,0.08)" }}
            style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
          >
            <View pointerEvents="none" style={styles.watermark}>
              <ProMetreSymbol size={190} opacity={0.08} />
            </View>

            <Text maxFontSizeMultiplier={1.2} style={styles.heroTitle}>
              Nouveau relevé
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.heroText}>
              Choisissez l’ouvrage, saisissez vos cotes et exportez la fiche en PDF.
            </Text>

            <View style={styles.heroButton}>
              <Text maxFontSizeMultiplier={1.25} style={styles.heroButtonText}>
                Commencer
              </Text>
              <Arrow />
            </View>
          </Pressable>
        </Animated.View>

        {/* CHIFFRES CLÉS (uniquement s'il y a des chantiers) */}
        {hasProjects && (
          <Animated.View style={[styles.stats, rise(enter[3])]}>
            <Stat value={liveCount} label={liveCount > 1 ? "chantiers en cours" : "chantier en cours"} />
            <Stat value={measureTotal} label={measureTotal > 1 ? "ouvrages relevés" : "ouvrage relevé"} />
          </Animated.View>
        )}

        {/* RACCOURCIS : grille compacte 2 colonnes */}
        {shortcuts.length > 0 && (
          <Animated.View style={[styles.section, rise(enter[3])]}>
            <SectionHeader title="Mesurer un ouvrage" />
            <View style={styles.shortcuts}>
              {shortcuts.map((s) => (
                <ShortcutChip key={s.key} item={s} width={tileWidth} onPress={(k) => onNewMeasure?.(k)} />
              ))}
            </View>
          </Animated.View>
        )}

        {/* CHANTIERS RÉCENTS */}
        <Animated.View style={[styles.section, rise(enter[4])]}>
          <SectionHeader
            title="Chantiers récents"
            actionLabel={hasProjects ? "Voir tout" : undefined}
            onAction={onSeeAllProjects}
          />

          {hasProjects ? (
            <View style={styles.card}>
              {recent.map((p, i) => (
                <ProjectCard key={p.id ?? `${p.name}-${i}`} project={p} onPress={onOpenProject} last={i === recent.length - 1} />
              ))}
            </View>
          ) : (
            <EmptyProjects />
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

export default HomeScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  gridLine: { position: "absolute", backgroundColor: COLORS.grid },
  pressed: { opacity: 0.6 },

  scroll: { paddingHorizontal: SIDE, paddingTop: 24, paddingBottom: 40 },

  /* En-tête */
  header: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  headerText: { flex: 1 },
  hello: { color: COLORS.textSoft, fontSize: 15, lineHeight: 21 },
  company: { color: COLORS.white, fontSize: 30, lineHeight: 40, fontFamily: FONT.title, letterSpacing: -0.5 },

  // Rond : initiales par défaut ; avec un logo, fond et bordure blancs
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.line,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarRing: { borderWidth: RING, borderColor: COLORS.white, backgroundColor: COLORS.white },
  // Logo carré : remplit tout le rond
  avatarLogo: {
    width: AVATAR - RING * 2,
    height: AVATAR - RING * 2,
    borderRadius: (AVATAR - RING * 2) / 2,
  },
  avatarText: { color: COLORS.white, fontSize: 16, fontFamily: FONT.title },

  tagline: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, maxWidth: 320, marginBottom: 22 },

  /* Carte principale */
  hero: {
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    padding: 22,
    overflow: "hidden",
  },
  heroPressed: { transform: [{ scale: 0.985 }], opacity: 0.95 },
  watermark: { position: "absolute", right: -42, bottom: -48 },
  heroTitle: { color: COLORS.white, fontSize: 26, lineHeight: 34, fontFamily: FONT.title, letterSpacing: -0.4 },
  heroText: { maxWidth: 250, color: COLORS.textSoft, fontSize: 14.5, lineHeight: 21, marginTop: 4, marginBottom: 20 },
  heroButton: {
    alignSelf: "flex-start",
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroButtonText: { color: COLORS.white, fontSize: 15.5, lineHeight: 22, fontFamily: FONT.title },
  arrowLine: { position: "absolute", left: 1, width: 15, height: 2.25, borderRadius: 1.5, backgroundColor: COLORS.white },
  arrowHead: {
    position: "absolute",
    right: 2,
    width: 9,
    height: 9,
    borderTopWidth: 2.25,
    borderRightWidth: 2.25,
    borderColor: COLORS.white,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },

  /* Chiffres clés */
  stats: { flexDirection: "row", gap: 12, marginTop: 14 },
  stat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statValue: { color: COLORS.white, fontSize: 26, lineHeight: 34, fontFamily: FONT.title, fontVariant: ["tabular-nums"] },
  statLabel: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18 },

  /* Sections */
  section: { marginTop: 30 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 32,
    marginBottom: 12,
  },
  sectionTitle: { color: COLORS.white, fontSize: 17.5, lineHeight: 26, fontFamily: FONT.title },
  sectionAction: { minHeight: 44, paddingLeft: 16, justifyContent: "center", marginVertical: -6 },
  sectionActionText: { color: COLORS.white, fontSize: 14, lineHeight: 20, fontWeight: "600", textDecorationLine: "underline" },

  /* Raccourcis : hauteur fixe, rangées régulières */
  shortcuts: { flexDirection: "row", flexWrap: "wrap", gap: SHORTCUT_GAP },
  shortcut: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
  },
  shortcutPressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  shortcutIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: COLORS.tileBg,
    alignItems: "center",
    justifyContent: "center",
  },
  shortcutText: { flex: 1, color: COLORS.white, fontSize: 13.5, lineHeight: 16.5, fontWeight: "600" },

  /* Chantiers */
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  project: { minHeight: 88, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  projectDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft },
  projectPressed: { backgroundColor: "rgba(255,255,255,0.05)" },
  projectBadge: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.tileBg,
    alignItems: "center",
    justifyContent: "center",
  },
  projectBadgeText: { color: COLORS.white, fontSize: 18, fontFamily: FONT.title },
  projectBody: { flex: 1 },
  projectName: { color: COLORS.white, fontSize: 16, lineHeight: 21, fontWeight: "600" },
  projectMeta: { color: COLORS.textSoft, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  projectFoot: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  projectDate: { color: COLORS.textSoft, fontSize: 12.5, lineHeight: 17 },

  status: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusLive: { backgroundColor: COLORS.accent },
  statusDone: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: "transparent" },
  statusText: { color: COLORS.white, fontSize: 12, lineHeight: 16, fontWeight: "600" },

  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.textSoft,
    transform: [{ rotate: "45deg" }],
    marginRight: 4,
  },

  /* État vide */
  empty: {
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: "center",
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.tileBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: COLORS.white, fontSize: 17, lineHeight: 25, fontFamily: FONT.title, textAlign: "center", marginBottom: 4 },
  emptyText: { maxWidth: 280, color: COLORS.textSoft, fontSize: 14, lineHeight: 21, textAlign: "center" },
});