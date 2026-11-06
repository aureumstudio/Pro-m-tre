import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Alert,
  StyleSheet,
  Platform,
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

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

const dateLabel = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return "Aujourd’hui";
  if (diff === 1) return "Hier";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

// Une ouverture = une référence. On affiche sa version la plus récente.
const latestPerOpening = (sheets) => {
  const map = new Map();
  sheets.forEach((s) => {
    const cur = map.get(s.opening.ref);
    if (!cur || (s.version || 1) > (cur.version || 1) || (s.version === cur.version && s.updatedAt > cur.updatedAt))
      map.set(s.opening.ref, s);
  });
  return Array.from(map.values()).sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
};

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

const Chevron = () => <Hidden style={styles.chevron} />;

/* ------------------------------------------------------------------
   BLOCS
------------------------------------------------------------------ */

const OpeningCard = memo(function OpeningCard({ sheet, onOpen, onPdf, busy }) {
  const done = sheet.status === "done";
  const o = sheet.opening;
  const blocking = (sheet.checks || []).filter((c) => c.level === "blocking").length;
  const watch = (sheet.checks || []).filter((c) => c.level === "watch").length;
  const meta = [o.productLabel, o.installationLabel].filter(Boolean).join(" · ");

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir la fiche ${o.ref}, ${o.designation}. ${done ? "Terminée" : "Brouillon"}`}
        onPress={() => onOpen(sheet)}
        android_ripple={{ color: "rgba(255,255,255,0.08)" }}
        style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
      >
        <Hidden style={styles.refBadge}>
          <Text style={styles.refText}>{o.ref}</Text>
        </Hidden>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.cardTitle}>
              {o.designation}
            </Text>
            {(sheet.version || 1) > 1 && (
              <Text maxFontSizeMultiplier={1.2} style={styles.version}>
                v{sheet.version}
              </Text>
            )}
          </View>
          {!!meta && (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.25} style={styles.cardMeta}>
              {meta}
            </Text>
          )}
          <View style={styles.foot}>
            <View style={[styles.status, done ? styles.statusDone : styles.statusLive]}>
              <Text maxFontSizeMultiplier={1.2} style={styles.statusText}>
                {done ? "Terminée" : "Brouillon"}
              </Text>
            </View>
            <Text maxFontSizeMultiplier={1.2} style={styles.cardDate}>
              {sheet.measurements.length} cote{sheet.measurements.length > 1 ? "s" : ""} ·{" "}
              {dateLabel(sheet.updatedAt)}
            </Text>
          </View>
          {(blocking > 0 || watch > 0) && (
            <Text maxFontSizeMultiplier={1.2} style={[styles.alerts, blocking > 0 && { color: COLORS.error }]}>
              {blocking > 0
                ? `${blocking} point${blocking > 1 ? "s" : ""} bloquant${blocking > 1 ? "s" : ""}`
                : `${watch} point${watch > 1 ? "s" : ""} à vérifier`}
            </Text>
          )}
        </View>
        <Chevron />
      </Pressable>

      {done && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Exporter le PDF de ${o.ref}`}
          accessibilityState={{ busy: !!busy }}
          onPress={() => onPdf(sheet)}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          style={({ pressed }) => [styles.pdfRow, pressed && styles.cardPressed]}
        >
          <Text maxFontSizeMultiplier={1.25} style={styles.pdfText}>
            {busy ? "Création du PDF…" : "Exporter le PDF"}
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const Field = ({ label, value, onChangeText, error, ...rest }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.block}>
      <Text maxFontSizeMultiplier={1.3} style={styles.label}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={label}
        placeholderTextColor={COLORS.placeholder}
        selectionColor={COLORS.white}
        keyboardAppearance="dark"
        maxFontSizeMultiplier={1.3}
        style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError]}
        {...rest}
      />
      {!!error && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      )}
    </View>
  );
};

function EditSheet({ project, onSave, onClose }) {
  const { height } = useWindowDimensions();
  const [d, setD] = useState({
    name: project.name || "",
    client: project.client || "",
    address: project.address || "",
  });
  const [show, setShow] = useState(false);
  const error = d.name.trim().length < 2 ? "Indiquez le nom du chantier." : "";

  const save = () => {
    if (error) return setShow(true);
    onSave({ name: d.name.trim(), client: d.client.trim(), address: d.address.trim() });
  };

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { maxHeight: height * 0.9 }]}>
            <View style={styles.grabber} />
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.sheetTitle}>
                Modifier le chantier
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={onClose}
                hitSlop={8}
                style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.closeText}>
                  Fermer
                </Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
              <Field
                label="Nom du chantier"
                value={d.name}
                onChangeText={(t) => setD((x) => ({ ...x, name: t }))}
                error={show ? error : ""}
                autoCapitalize="words"
              />
              <Field
                label="Client"
                value={d.client}
                onChangeText={(t) => setD((x) => ({ ...x, client: t }))}
                autoCapitalize="words"
              />
              <Field
                label="Adresse du chantier"
                value={d.address}
                onChangeText={(t) => setD((x) => ({ ...x, address: t }))}
                autoCapitalize="words"
              />
            </ScrollView>
            <View style={styles.sheetFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Enregistrer"
                onPress={save}
                style={({ pressed }) => [styles.primaryWhite, pressed && styles.btnPressed]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.primaryWhiteText}>
                  Enregistrer
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------
   ÉCRAN
------------------------------------------------------------------ */

/**
 * Props
 *  - project         : chantier { id, name, client?, address?, status? }
 *  - sheets          : toutes les fiches du chantier (toutes versions)
 *  - startEditing    : ouvre directement la fenêtre de modification
 *  - onBack()
 *  - onNewMeasure()  : nouveau relevé rattaché à ce chantier
 *  - onOpenSheet(sheet)
 *  - onPdf(sheet)    : exporter le PDF d'une fiche terminée
 *  - pdfBusy         : id de la fiche en cours d'export
 *  - onSaveProject({ name, client, address })
 *  - onToggleStatus()
 *  - onDelete()
 */
function ProjectDetailScreen({
  project,
  sheets = [],
  startEditing = false,
  pdfBusy,
  onBack,
  onNewMeasure,
  onOpenSheet,
  onPdf,
  onSaveProject,
  onToggleStatus,
  onDelete,
}) {
  const { width, height } = useWindowDimensions();
  const [editing, setEditing] = useState(startEditing);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (startEditing) setEditing(true);
  }, [startEditing]);

  const openings = useMemo(() => latestPerOpening(sheets), [sheets]);
  const done = project.status === "done";
  const doneCount = openings.filter((s) => s.status === "done").length;

  const confirmDelete = () =>
    Alert.alert(
      "Supprimer ce chantier ?",
      `« ${project.name} » et ses ${sheets.length} fiche${sheets.length > 1 ? "s" : ""} seront supprimés.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: onDelete },
      ]
    );

  return (
    <View style={styles.root}>
      <Grid width={width} height={height} />

      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={onBack}
          hitSlop={6}
          style={({ pressed }) => [styles.topBtn, pressed && styles.pressed]}
        >
          <Hidden style={styles.back} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.topTitle}>
          Chantier
        </Text>
        <View style={styles.topBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* IDENTITÉ */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text numberOfLines={3} maxFontSizeMultiplier={1.2} style={styles.name}>
              {project.name}
            </Text>
            <View style={[styles.status, done ? styles.statusDone : styles.statusLive]}>
              <Text maxFontSizeMultiplier={1.2} style={styles.statusText}>
                {done ? "Terminé" : "En cours"}
              </Text>
            </View>
          </View>
          {!!project.client && (
            <Text maxFontSizeMultiplier={1.25} style={styles.info}>
              {project.client}
            </Text>
          )}
          {!!project.address && (
            <Text maxFontSizeMultiplier={1.25} style={styles.infoSoft}>
              {project.address}
            </Text>
          )}

          <View style={styles.stats}>
            <View accessible accessibilityLabel={`${openings.length} ouvertures`} style={styles.stat}>
              <Text style={styles.statValue}>{openings.length}</Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.statLabel}>
                ouverture{openings.length > 1 ? "s" : ""}
              </Text>
            </View>
            <View accessible accessibilityLabel={`${doneCount} terminées`} style={styles.stat}>
              <Text style={styles.statValue}>{doneCount}</Text>
              <Text maxFontSizeMultiplier={1.2} style={styles.statLabel}>
                terminée{doneCount > 1 ? "s" : ""}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nouveau relevé pour ce chantier"
            onPress={onNewMeasure}
            android_ripple={{ color: "rgba(255,255,255,0.15)" }}
            style={({ pressed }) => [styles.primary, pressed && styles.btnPressed]}
          >
            <Text maxFontSizeMultiplier={1.25} style={styles.primaryText}>
              Nouveau relevé
            </Text>
          </Pressable>

          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Modifier le chantier"
              onPress={() => setEditing(true)}
              style={({ pressed }) => [styles.ghost, pressed && styles.btnPressed]}
            >
              <Text maxFontSizeMultiplier={1.2} style={styles.ghostText}>
                Modifier
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={done ? "Repasser le chantier en cours" : "Marquer le chantier comme terminé"}
              onPress={onToggleStatus}
              style={({ pressed }) => [styles.ghost, pressed && styles.btnPressed]}
            >
              <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={styles.ghostText}>
                {done ? "Repasser en cours" : "Marquer terminé"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* OUVERTURES */}
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.section}>
          Ouvertures
        </Text>

        {openings.length === 0 ? (
          <View style={styles.empty}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.emptyTitle}>
              Aucune ouverture relevée
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
              Lancez un relevé pour ajouter la première fenêtre, porte ou volet de ce chantier.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {openings.map((s) => (
              <OpeningCard key={s.id} sheet={s} onOpen={onOpenSheet} onPdf={onPdf} busy={pdfBusy === s.id} />
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer le chantier"
          onPress={confirmDelete}
          style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={1.25} style={styles.dangerText}>
            Supprimer le chantier
          </Text>
        </Pressable>
      </ScrollView>

      {editing && (
        <EditSheet
          project={project}
          onClose={() => setEditing(false)}
          onSave={(v) => {
            onSaveProject?.(v);
            setEditing(false);
          }}
        />
      )}
    </View>
  );
}

export default ProjectDetailScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  gridLine: { position: "absolute", backgroundColor: COLORS.grid },
  pressed: { opacity: 0.65 },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },

  top: { flexDirection: "row", alignItems: "center", paddingHorizontal: SIDE - 8, paddingTop: 8 },
  topBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, textAlign: "center", color: COLORS.white, fontSize: 17, fontWeight: "700" },
  back: {
    width: 12,
    height: 12,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: COLORS.white,
    transform: [{ rotate: "45deg" }],
    marginLeft: 4,
  },

  scroll: { paddingHorizontal: SIDE, paddingTop: 12, paddingBottom: 40 },

  hero: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    padding: 20,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  name: {
    flex: 1,
    color: COLORS.white,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  info: { color: COLORS.white, fontSize: 15.5, lineHeight: 22, marginTop: 8, fontWeight: "500" },
  infoSoft: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20, marginTop: 2 },

  stats: { flexDirection: "row", gap: 12, marginTop: 18, marginBottom: 18 },
  stat: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statValue: { color: COLORS.white, fontSize: 24, lineHeight: 29, fontWeight: "700", fontVariant: ["tabular-nums"] },
  statLabel: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18 },

  primary: {
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, marginTop: 10 },
  ghost: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { color: COLORS.white, fontSize: 14.5, fontWeight: "600" },

  status: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statusLive: { backgroundColor: COLORS.accent },
  statusDone: { borderWidth: 1, borderColor: COLORS.line, backgroundColor: "transparent" },
  statusText: { color: COLORS.white, fontSize: 12, lineHeight: 16, fontWeight: "600" },

  section: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginTop: 30,
    marginBottom: 12,
  },
  list: { gap: 12 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  cardMain: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, minHeight: 88 },
  cardPressed: { backgroundColor: "rgba(255,255,255,0.05)" },
  refBadge: {
    minWidth: 58,
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  refText: { color: COLORS.white, fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  cardBody: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flexShrink: 1, color: COLORS.white, fontSize: 16, lineHeight: 21, fontWeight: "700" },
  version: { color: COLORS.textSoft, fontSize: 12.5, fontWeight: "700" },
  cardMeta: { color: COLORS.textSoft, fontSize: 13.5, lineHeight: 19, marginTop: 2 },
  foot: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
  cardDate: { color: COLORS.textSoft, fontSize: 12.5, lineHeight: 17 },
  alerts: { color: COLORS.warn, fontSize: 12.5, lineHeight: 17, marginTop: 6, fontWeight: "600" },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: COLORS.textSoft,
    transform: [{ rotate: "45deg" }],
    marginRight: 4,
  },
  pdfRow: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  pdfText: { color: COLORS.white, fontSize: 14.5, fontWeight: "600", textDecorationLine: "underline" },

  empty: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    padding: 24,
    alignItems: "center",
  },
  emptyTitle: { color: COLORS.white, fontSize: 16, fontWeight: "700", textAlign: "center" },
  emptyText: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 6, maxWidth: 280 },

  danger: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 32 },
  dangerText: { color: COLORS.error, fontSize: 15, fontWeight: "600" },

  /* Fenêtre de modification */
  backdrop: { flex: 1, backgroundColor: "rgba(0,12,15,0.62)" },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    backgroundColor: COLORS.brand,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.line,
    paddingTop: 8,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.line, marginBottom: 6 },
  sheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: SIDE, paddingRight: SIDE - 8 },
  sheetTitle: { flex: 1, color: COLORS.white, fontSize: 22, lineHeight: 28, fontWeight: "700", paddingVertical: 8 },
  close: { minHeight: 44, minWidth: 64, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  closeText: { color: COLORS.white, fontSize: 15, fontWeight: "600", textDecorationLine: "underline" },
  sheetBody: { paddingHorizontal: SIDE, paddingTop: 8, paddingBottom: 24 },
  sheetFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
  },
  primaryWhite: { height: 56, borderRadius: 12, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  primaryWhiteText: { color: COLORS.brand, fontSize: 16, fontWeight: "600" },

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
});
