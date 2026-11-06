import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
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
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
  error: "#FFB4A9",
  warn: "#FFD99A",
};

const CELL = 28;
const SIDE = 24;

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const dateLabel = (iso) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtMm = (mm, unit) => {
  if (mm == null) return "—";
  return unit === "cm"
    ? `${(Math.round(mm) / 10).toString().replace(".", ",")} cm`
    : `${Math.round(mm)} mm`;
};

const SEVERITY = { info: "Information", watch: "À vérifier", blocking: "Bloquante" };
const LEVEL = { info: "Information", watch: "Vigilance", blocking: "Bloquant" };

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

const Section = ({ title, children }) => (
  <View style={styles.sectionWrap}>
    <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={styles.section}>
      {title}
    </Text>
    {children}
  </View>
);

const Rows = ({ rows }) => (
  <View style={styles.group}>
    {rows.map((r, i) => (
      <View key={`${r.k}-${i}`} style={[styles.kv, i < rows.length - 1 && styles.kvDivider]}>
        <Text maxFontSizeMultiplier={1.25} style={styles.k}>
          {r.k}
        </Text>
        <Text maxFontSizeMultiplier={1.25} style={[styles.v, r.warn && { color: COLORS.warn }]}>
          {r.v}
        </Text>
      </View>
    ))}
  </View>
);

/**
 * Props
 *  - sheet, project
 *  - versions        : toutes les versions de cette ouverture (triées)
 *  - unit            : unité d'affichage (la fiche garde son unité d'origine si elle existe)
 *  - pdfBusy
 *  - onBack, onPdf, onEdit (reprendre un brouillon / créer une révision)
 *  - onOpenVersion(sheet), onDelete()
 */
function SheetDetailScreen({ sheet, project, versions = [], pdfBusy, onBack, onPdf, onEdit, onOpenVersion, onDelete }) {
  const { width, height } = useWindowDimensions();
  const o = sheet.opening;
  const unit = sheet.unit === "cm" ? "cm" : "mm";
  const done = sheet.status === "done";
  const others = versions.filter((v) => v.id !== sheet.id);

  const confirmDelete = () =>
    Alert.alert("Supprimer cette fiche ?", `La fiche ${o.ref} (v${sheet.version || 1}) sera supprimée.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onDelete },
    ]);

  const identity = [
    { k: "Chantier", v: project?.name || "—" },
    ...(project?.client ? [{ k: "Client", v: project.client }] : []),
    { k: "Type", v: o.productLabel || "—" },
    ...(o.location ? [{ k: "Emplacement", v: o.location }] : []),
    { k: "Type de pose", v: o.installationLabel || "Non renseigné", warn: !o.installationLabel },
    { k: "Mis à jour", v: dateLabel(sheet.updatedAt) },
  ];

  const measures = sheet.measurements.map((m) => ({
    k: m.label,
    v: `${fmtMm(m.valueMm, unit)}${m.status === "pending" ? "  · à confirmer" : ""}`,
    warn: m.status === "pending",
  }));

  const gaps = [
    sheet.gaps?.widthMm != null ? { k: "Écart entre les largeurs", v: fmtMm(sheet.gaps.widthMm, unit) } : null,
    sheet.gaps?.heightMm != null ? { k: "Écart entre les hauteurs", v: fmtMm(sheet.gaps.heightMm, unit) } : null,
  ].filter(Boolean);

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
          <View accessible={false} importantForAccessibility="no-hide-descendants" style={styles.back} />
        </Pressable>
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.topTitle}>
          Fiche {o.ref}
        </Text>
        <View style={styles.topBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text numberOfLines={3} maxFontSizeMultiplier={1.2} style={styles.title}>
            {o.designation}
          </Text>
          <View style={[styles.status, done ? styles.statusDone : styles.statusLive]}>
            <Text maxFontSizeMultiplier={1.2} style={styles.statusText}>
              {done ? "Terminée" : "Brouillon"}
            </Text>
          </View>
        </View>
        <Text maxFontSizeMultiplier={1.25} style={styles.sub}>
          Version {sheet.version || 1}
          {sheet.revisionOf ? " · révision" : ""}
        </Text>

        <Section title="Ouvrage">
          <Rows rows={identity} />
          {!!sheet.refFace && (
            <Text maxFontSizeMultiplier={1.3} style={styles.note}>
              Convention : {sheet.refFace}
            </Text>
          )}
        </Section>

        <Section title="Cotes relevées">
          {measures.length ? (
            <Rows rows={measures} />
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={styles.muted}>
              Aucune cote relevée.
            </Text>
          )}
          {gaps.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Rows rows={gaps} />
            </View>
          )}
          <Text maxFontSizeMultiplier={1.3} style={styles.note}>
            Cotes relevées sur place : ce ne sont pas des dimensions de fabrication.
          </Text>
        </Section>

        {(sheet.configView || []).map((sec) => (
          <Section key={sec.title} title={sec.title}>
            <Rows rows={sec.items.map((i) => ({ k: i.label, v: i.value }))} />
          </Section>
        ))}

        {!!sheet.observations && (
          <Section title="Observations">
            <View style={styles.group}>
              <Text maxFontSizeMultiplier={1.3} style={styles.paragraph}>
                {sheet.observations}
              </Text>
            </View>
          </Section>
        )}

        {sheet.issues?.length > 0 && (
          <Section title="Réserves">
            <View style={styles.group}>
              {sheet.issues.map((i, idx) => (
                <View key={i.id} style={[styles.kv, idx < sheet.issues.length - 1 && styles.kvDivider]}>
                  <Text maxFontSizeMultiplier={1.25} style={[styles.k, { color: COLORS.white, fontWeight: "700" }]}>
                    {SEVERITY[i.severity]}
                  </Text>
                  <Text maxFontSizeMultiplier={1.25} style={styles.v}>
                    {i.description}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {sheet.photos?.length > 0 && (
          <Section title="Photos">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {sheet.photos.map((u, i) => (
                <Image
                  key={`${u}-${i}`}
                  source={{ uri: u }}
                  resizeMode="cover"
                  accessibilityLabel={`Photo ${i + 1}`}
                  style={styles.photo}
                />
              ))}
            </ScrollView>
          </Section>
        )}

        {sheet.checks?.length > 0 && (
          <Section title="Points à vérifier">
            <View style={styles.group}>
              {sheet.checks.map((c, i) => (
                <View key={i} style={[styles.kv, i < sheet.checks.length - 1 && styles.kvDivider]}>
                  <Text
                    maxFontSizeMultiplier={1.25}
                    style={[
                      styles.k,
                      { fontWeight: "700", color: c.level === "blocking" ? COLORS.error : c.level === "watch" ? COLORS.warn : COLORS.white },
                    ]}
                  >
                    {LEVEL[c.level]}
                  </Text>
                  <Text maxFontSizeMultiplier={1.25} style={styles.v}>
                    {c.text}
                  </Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {others.length > 0 && (
          <Section title="Versions">
            <View style={styles.group}>
              {others.map((v, i) => (
                <Pressable
                  key={v.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ouvrir la version ${v.version || 1}`}
                  onPress={() => onOpenVersion(v)}
                  style={({ pressed }) => [styles.kv, i < others.length - 1 && styles.kvDivider, pressed && styles.pressed]}
                >
                  <Text maxFontSizeMultiplier={1.25} style={[styles.k, { color: COLORS.white, fontWeight: "700" }]}>
                    Version {v.version || 1}
                  </Text>
                  <Text maxFontSizeMultiplier={1.25} style={styles.v}>
                    {v.status === "done" ? "Terminée" : "Brouillon"} · {dateLabel(v.updatedAt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Section>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer la fiche"
          onPress={confirmDelete}
          style={({ pressed }) => [styles.danger, pressed && styles.pressed]}
        >
          <Text maxFontSizeMultiplier={1.25} style={styles.dangerText}>
            Supprimer la fiche
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={done ? "Créer une révision" : "Reprendre le relevé"}
          onPress={onEdit}
          android_ripple={{ color: "rgba(255,255,255,0.10)" }}
          style={({ pressed }) => [styles.btnGhost, pressed && styles.btnPressed]}
        >
          <Text maxFontSizeMultiplier={1.2} style={styles.btnGhostText}>
            {done ? "Réviser" : "Reprendre"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exporter en PDF"
          accessibilityState={{ busy: !!pdfBusy }}
          onPress={onPdf}
          android_ripple={{ color: "rgba(255,255,255,0.15)" }}
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
        >
          <Text maxFontSizeMultiplier={1.2} style={styles.btnPrimaryText}>
            {pdfBusy ? "Création du PDF…" : "Exporter en PDF"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default SheetDetailScreen;

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

  scroll: { paddingHorizontal: SIDE, paddingTop: 12, paddingBottom: 32 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  title: { flex: 1, color: COLORS.white, fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.6 },
  sub: { color: COLORS.textSoft, fontSize: 14.5, lineHeight: 20, marginTop: 4 },

  status: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 6 },
  statusLive: { backgroundColor: COLORS.accent },
  statusDone: { borderWidth: 1, borderColor: COLORS.line },
  statusText: { color: COLORS.white, fontSize: 12, lineHeight: 16, fontWeight: "600" },

  sectionWrap: { marginTop: 28 },
  section: { color: COLORS.white, fontSize: 18, lineHeight: 24, fontWeight: "700", letterSpacing: -0.2, marginBottom: 12 },
  group: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.lineSoft,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  kv: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  kvDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.lineSoft },
  k: { flexShrink: 1, maxWidth: "48%", color: COLORS.textSoft, fontSize: 14.5, lineHeight: 20 },
  v: { flex: 1, color: COLORS.white, fontSize: 15, lineHeight: 21, fontWeight: "600", textAlign: "right" },
  paragraph: { color: COLORS.white, fontSize: 15, lineHeight: 22, padding: 16 },
  note: { color: COLORS.textSoft, fontSize: 13, lineHeight: 19, marginTop: 10, fontStyle: "italic" },
  muted: { color: COLORS.textSoft, fontSize: 14.5 },
  photo: { width: 120, height: 120, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.07)" },

  danger: { minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 30 },
  dangerText: { color: COLORS.error, fontSize: 15, fontWeight: "600" },

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
  btnPrimary: { flex: 1.6, height: 56, borderRadius: 12, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  btnPrimaryText: { color: COLORS.white, fontSize: 16, fontWeight: "600" },
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
});
