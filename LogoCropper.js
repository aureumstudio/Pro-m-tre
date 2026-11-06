import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  PanResponder,
  StyleSheet,
  Platform,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";

// Pour changer la forme du format horizontal, modifie "ratio" (largeur / hauteur)
export const LOGO_FORMATS = [
  { value: "square", label: "Carré", icon: "square-outline", ratio: 1, outW: 800 },
  { value: "wide", label: "Horizontal", icon: "tablet-landscape-outline", ratio: 3, outW: 1200 },
];

const COLORS = {
  brand: "#00323A",
  accent: "#1E7F8C",
  accentSoft: "rgba(30,127,140,0.30)",
  white: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.72)",
  textMute: "rgba(255,255,255,0.50)",
  fill: "rgba(255,255,255,0.07)",
  fillStrong: "rgba(255,255,255,0.12)",
  line: "rgba(255,255,255,0.18)",
  lineSoft: "rgba(255,255,255,0.10)",
};

const FONT = { title: "Poppins_600SemiBold" };

const SIDE = 24;

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

/*
  source : { uri, format, view: { z, nx, ny } | null }
  onDone : ({ uri, format, source }) => void
*/
export default function LogoCropper({ visible, source, onCancel, onDone }) {
  const { width } = useWindowDimensions();

  const [format, setFormat] = useState("square");
  const [img, setImg] = useState(null); // { w, h }
  const [tf, setTf] = useState({ s: 1, x: 0, y: 0 });
  const [busy, setBusy] = useState(false);

  const frameRef = useRef(null);
  const tfRef = useRef(tf);
  const geo = useRef({});
  const restore = useRef(null);
  const gest = useRef({ mode: "drag", start: tf, d0: 0, dx0: 0, dy0: 0 });

  /* ----- géométrie du cadre ----- */

  const fmt = LOGO_FORMATS.find((f) => f.value === format) || LOGO_FORMATS[0];
  const maxW = Math.min(width - SIDE * 2, 340);
  const FW = format === "square" ? Math.min(maxW, 280) : maxW;
  const FH = FW / fmt.ratio;

  const minS = img ? Math.min(FW / img.w, FH / img.h) : 1; // logo entier visible
  const coverS = img ? Math.max(FW / img.w, FH / img.h) : 1; // cadre rempli
  const maxS = Math.max(minS, coverS) * 4;

  geo.current = { FW, FH, img, minS, coverS, maxS };

  const clampTf = (t) => {
    const g = geo.current;
    if (!g.img) return t;
    const s = Math.min(g.maxS, Math.max(g.minS, t.s));
    const limX = Math.abs(g.img.w * s - g.FW) / 2;
    const limY = Math.abs(g.img.h * s - g.FH) / 2;
    return {
      s,
      x: Math.min(limX, Math.max(-limX, t.x)),
      y: Math.min(limY, Math.max(-limY, t.y)),
    };
  };

  const apply = (t) => {
    const c = clampTf(t);
    tfRef.current = c;
    setTf(c);
  };

  /* ----- ouverture : chargement de l'image ----- */

  useEffect(() => {
    if (!visible || !source?.uri) {
      setImg(null);
      setBusy(false);
      return undefined;
    }
    let cancelled = false;
    setImg(null);
    setBusy(false);
    restore.current = source.view ? { format: source.format, ...source.view } : null;
    setFormat(source.format || "square");
    Image.getSize(
      source.uri,
      (w, h) => {
        if (!cancelled) setImg({ w, h });
      },
      () => {
        if (cancelled) return;
        Alert.alert("Logo", "Impossible de lire cette image.");
        onCancel?.();
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, source?.uri]);

  /* ----- position initiale (ou position enregistrée) ----- */

  useEffect(() => {
    if (!img) return;
    const r = restore.current;
    if (r && r.format === format) {
      restore.current = null;
      apply({ s: minS * r.z, x: r.nx * FW, y: r.ny * FH });
    } else {
      apply({ s: minS, x: 0, y: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, format, FW]);

  /* ----- gestes : glisser (1 doigt) et pincer (2 doigts) ----- */

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        gest.current = { mode: "drag", start: tfRef.current, d0: 0, dx0: 0, dy0: 0 };
      },
      onPanResponderMove: (e, gs) => {
        const t = e.nativeEvent.touches;
        const st = gest.current;
        if (t.length >= 2) {
          const d = dist(t);
          if (st.mode !== "pinch") {
            gest.current = { ...st, mode: "pinch", start: tfRef.current, d0: d };
            return;
          }
          apply({ ...st.start, s: (st.start.s * d) / st.d0 });
        } else {
          if (st.mode !== "drag") {
            gest.current = { mode: "drag", start: tfRef.current, d0: 0, dx0: gs.dx, dy0: gs.dy };
            return;
          }
          apply({ s: st.start.s, x: st.start.x + gs.dx - st.dx0, y: st.start.y + gs.dy - st.dy0 });
        }
      },
    })
  ).current;

  const zoomBy = (f) => apply({ ...tfRef.current, s: tfRef.current.s * f });
  const fit = () => apply({ s: minS, x: 0, y: 0 });
  const fill = () => apply({ s: coverS, x: 0, y: 0 });

  /* ----- validation : on enregistre ce qu'on voit dans le cadre ----- */

  const confirm = async () => {
    if (busy || !img || !source?.uri) return;
    setBusy(true);
    try {
      let out = await captureRef(frameRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: fmt.outW,
        height: Math.round(fmt.outW / fmt.ratio),
      });
      if (typeof out === "string" && out.startsWith("/")) out = `file://${out}`;
      const t = tfRef.current;
      const g = geo.current;
      onDone?.({
        uri: out,
        format,
        source: { uri: source.uri, format, view: { z: t.s / g.minS, nx: t.x / g.FW, ny: t.y / g.FH } },
      });
    } catch (e) {
      Alert.alert("Logo", "Impossible de créer l’image. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  /* ----- rendu ----- */

  const dw = img ? img.w * tf.s : 0;
  const dh = img ? img.h * tf.s : 0;
  const ready = !!img && !busy;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Votre logo
            </Text>
            <Text style={styles.subtitle}>Choisissez le format, puis placez votre logo dans le cadre.</Text>
          </View>

          <View style={styles.body}>
            {/* Format : sélection en teinte accent (même langage que l'app) */}
            <View accessibilityRole="radiogroup" style={styles.segmented}>
              {LOGO_FORMATS.map((f) => {
                const on = f.value === format;
                return (
                  <Pressable
                    key={f.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Format ${f.label}`}
                    onPress={() => setFormat(f.value)}
                    style={[styles.segment, on && styles.segmentOn]}
                  >
                    <Ionicons name={f.icon} size={18} color={COLORS.white} />
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Cadre */}
            <View style={styles.frameWrap}>
              <View {...responder.panHandlers} style={{ width: FW, height: FH }}>
                <View
                  ref={frameRef}
                  collapsable={false}
                  style={{ width: FW, height: FH, backgroundColor: "#FFFFFF", overflow: "hidden" }}
                >
                  {img && source?.uri ? (
                    <Image
                      source={{ uri: source.uri }}
                      resizeMode="stretch"
                      style={{
                        position: "absolute",
                        width: dw,
                        height: dh,
                        left: FW / 2 + tf.x - dw / 2,
                        top: FH / 2 + tf.y - dh / 2,
                      }}
                    />
                  ) : (
                    <View style={styles.loader}>
                      {visible && source?.uri ? (
                        <ActivityIndicator color={COLORS.brand} />
                      ) : (
                        <Text style={{ color: COLORS.brand }}>Aucune image sélectionnée</Text>
                      )}
                    </View>
                  )}
                </View>
                <View pointerEvents="none" style={styles.frameBorder} />
              </View>
            </View>

            <View style={styles.hintRow}>
              <Ionicons name="hand-left-outline" size={15} color={COLORS.textSoft} />
              <Text style={styles.hint}>Glissez pour déplacer, pincez pour zoomer.</Text>
            </View>

            {/* Zoom */}
            <View style={styles.tools}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dézoomer"
                onPress={() => zoomBy(1 / 1.2)}
                style={({ pressed }) => [styles.round, pressed && styles.pressed]}
              >
                <Ionicons name="remove" size={22} color={COLORS.white} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Zoomer"
                onPress={() => zoomBy(1.2)}
                style={({ pressed }) => [styles.round, pressed && styles.pressed]}
              >
                <Ionicons name="add" size={22} color={COLORS.white} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tout afficher"
                onPress={fit}
                style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
              >
                <Ionicons name="contract-outline" size={17} color={COLORS.white} />
                <Text style={styles.pillText}>Tout afficher</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remplir le cadre"
                onPress={fill}
                style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
              >
                <Ionicons name="expand-outline" size={17} color={COLORS.white} />
                <Text style={styles.pillText}>Remplir</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Valider"
              accessibilityState={{ disabled: !ready, busy }}
              onPress={confirm}
              style={({ pressed }) => [styles.primary, !img && styles.primaryIdle, pressed && styles.primaryPressed]}
            >
              {busy ? (
                <ActivityIndicator color={COLORS.brand} />
              ) : (
                <Text style={[styles.primaryText, !img && styles.primaryTextIdle]}>Valider</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Annuler"
              onPress={onCancel}
              hitSlop={8}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  safe: { flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0 },
  pressed: { opacity: 0.65 },

  header: { paddingHorizontal: SIDE, paddingTop: 24 },
  title: { color: COLORS.white, fontSize: 27, lineHeight: 36, fontFamily: FONT.title, letterSpacing: -0.4, marginBottom: 4 },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  body: { flex: 1, paddingHorizontal: SIDE },

  /* Format */
  segmented: { flexDirection: "row", gap: 10, marginBottom: 20 },
  segment: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  segmentOn: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  segmentText: { color: COLORS.white, fontSize: 15, fontWeight: "600" },
  segmentTextOn: { fontWeight: "700" },

  /* Cadre */
  frameWrap: { alignItems: "center", justifyContent: "center", minHeight: 300 },
  frameBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1.5, borderColor: "rgba(0,50,58,0.45)" },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },

  hintRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, marginBottom: 16 },
  hint: { color: COLORS.textSoft, fontSize: 13, lineHeight: 18 },

  /* Outils de zoom */
  tools: { flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 10 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    backgroundColor: COLORS.fill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  pillText: { color: COLORS.white, fontSize: 14, fontWeight: "600" },

  /* Bas d'écran */
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    paddingHorizontal: SIDE,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 20,
  },
  primary: { height: 56, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  primaryIdle: { backgroundColor: COLORS.fillStrong },
  primaryPressed: { transform: [{ scale: 0.98 }], opacity: 0.92 },
  primaryText: { color: COLORS.brand, fontSize: 16, lineHeight: 22, fontFamily: FONT.title },
  primaryTextIdle: { color: COLORS.textMute },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 4 },
  cancelText: { color: COLORS.textSoft, fontSize: 15, fontWeight: "600" },
});