import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  StatusBar,
  Platform,
  Animated,
  Easing,
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons, FontAwesome } from "@expo/vector-icons";

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
      uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAALD0lEQVR4AeydB6wURRjH3zP2rrFgxV6wocaGsccSxRZRAQsRNRJjw4LdxI5gIfbesGLFEmsUsMSOEisIEpUiWDCo2PH3P/ate+927253vt3bKy/f/83e3sw3X5mdnZs6X1vrr6YWqCsHzJ07d1OwJzgY9AengPPBIDAA9AU9QQ/QtaaWrTLzXDoA4y0P9geXgJHgCzAXnT4Cz4MR4A5wDbgIXAFuAveDp8EbYLLSgCngDTAMHAKW57vcUG4cgGH6gOFgPNaZAZ4E54L9wHogKa1Mwh7gZPAwmEEen4MhoBufa0o1dQAG6AouB9OxwgPgcLAuSJvWJ4MzwCfk/Q44HizO58ypJg5AWdXjT6HtZHAWWBHUirYi4xvAVOTSU9GF68woMweg3GLgBDAB7VSP70uYJ1oCYfRUTEPGm4GqLm6lS5k4AGUORo2J4DqwDsg7HYeAE5H7MiDH8DEdStUBCL8CeALR1WqpZTWDCLFpYVKcDdSa6keYCqXmAAzfH4lV3RxAWM+0LMLfjT4PgEW5NiVzByDkskAvWLXTlzSV1opZMj59SDYO3UybrqYOQLg9EfIzkLcXLCKZ0NpweR89DyQ0ITMHINSZSPQcWAE0Mund8Jinr7OeJg5AGHUJDEaadtAMJD0He3o76evkAASYH6iFc4qTFPWZeBZiDwdO5OQAcn4IqI1P0FSkvqoe7e3tH7hqndgBlPwLyfwg0Gw0FYW3wfhqbHDpRokcgPHVJLvALeu6TP0VUm+L8dWHxaU7xXYAxt+ebNVzSVBz+g4JNEYwmlB4nXA2SIM+hqmM/w2hGcVyAMZfjpwfBVmTStwtZKpf1ZsRrkgpFHXhX3ews4cdCPXjT+MHhxLvWvAucKWxMNgR3qr7ubSjWA4gW7V4suqufZX8TgXdUHxNMACMBONAWUPw/QQwApwMtobHKuA08AWIS2NIIMf+RGhOVTuA0n8pue8CElLVydSNsQWG2xVcA5xfdvCYCq4GGyCFfqVX23p5ifh7ke5XwlSoKgdg/G3I/RyQJknZrVB2f6BHPpW84P0M2BLmR4JyT9JjxNsDzCFealSVA8j9NpAWqWWxC4pK2ffSyqQzX/LTj6iNua/uE4IiGs73vYrupPShogMo/aeT9yYgDRqKomuBUWkwr8STfGeCvYmndw1BgW7inp6Owoe0/5V1AMZfFQE07YPAnPqj6CBzrgkYIof6sjQ2fB7XxydgkThJWQfAVQPmixBa00Eoepc1Uxd+yPMeUEPDhU3stJEOoPQvDbdjgSX9DTO1Kh4nbBEWiHQA3w0ECwJL6kUpe8GSYb3zCnUApV+DDicaK3c6xh9pzLPu2YU6AK0OA8sAK3oc419lxayR+EQ5wLIZNgmDHQGakiopXeIAqp+VSLQjsKB/YaJ6/zfCFoVYoMQBxDkaWNF1VD2pdStYCVlLPmEO6G0okObtG7JrPFZFDqD6UX//RkZq3kjpn2bEq2HZFDkALXsCK9I0FSteDcunswP2MNJ0NKXfdOjOSK7csensAKsBlzS7r3NnRBeBfAdQ/y8GI4vhRi2mewZeLarCAr4DiLspsKD3qX5+tmDUDDyCDtBMAgudX7ZgUi0PntzuYFSdQTM3CioGHaCVg4Wbjv+y/uGlbvOdkPl/tLXl/VpDoYjc1hZ0wGqFO+7/PnFn0fActM6goGTQAQsV7jj+o/5vOaCyDdfoiGLtgNTmz3QI3CCh39oMOmABA+X+MuDRDCz8sZagAyyqoH+awXoGOvrbIgQdoAFzV94aynTl0Qzp/ZkmQQf8YqC5fk0bsGl4FuotKCgZdIDJvHp+EPmPVyGH1r8wC/iNFXMHkJv/hue6ReEWCHWAVf+N/yMjPO/WXSzgV/fBJ8Cx/x6280hz8Oddtf5HWSD0CdBWYVEJ4tzX3Ps48Zsxrta2FfQOPgFWDti9wLn1r5wFvuz40ncAfThTuOnXTVwnpS60hLLY9y2pfHlIV+oAT6rPvdA1yHIB94cIq6HULGC1XEn7KCF2cXe0blitVMlsKiJP7iwwKm1gHDVS/F+wfE5KU5DVd6RfBXncXvRC16Ab1dDmrkxyll57IVmI9FaQSWcHaLX5H8EIDtdaXeOQPHdJtYGshVBvBpkUOYBH40++fA1YkLYJthpntpAnMQ+eZnUfWz0B2lbZl6XIAd7dR7zQIsh8zZWF0CE8tO1xyO3Yt9TjXLQUN8wB2l85NueIBL0oPTtEfFcXt5F/KQQ9CYRSzJsvUssUjZmUOIAI6hOy3JBD2wLHlDNX0bVOWlWQhVAltUuJA7xctIrcu3QONqEUXe3MpQYMkFtbVMoBFrmr5JcU7FAH8BRow4yvLXL1eAxEGa1I9z7mP0BetflVYq1G+VT9lPQ0hDrAM4/1oroRKKWtYzz2uQ+0el5PgJWgobVKOQfcTs7aGZDAhDRc+TxOsFTKRLDOTJDxGO5pA28CE5pGrfJgGKdIB5BAC+usX6B6mb2Ggmlt/hGmY6x7yHYUCayn1w+DZyhFOsCLrcfQ8ikQW22GPRpFtTmGPucGyKTzA+40FkgF+dYonmUdwFPwAwnT2NFET4KODsnNzosYX4cADUFfa7oeO0YW4rIOkCQk1uNY1IGk+0a4EMXHgu5G/GKzIe9VgPpnBsROXDnB90S5BERSRQd4KS1fSB5LP5Dx5YShGMKfN+9/m+IF+anDUH3z26WUzbkU4LLTfapyAEzGIaCOlCJIjfSDR6dV6GC28o5wEAGj63yDcwi/hc3lQO19AnP6FLtF1v0duVXlAEWG2WWEOnyHIDXSu0E7dOnwtTsxkkk/EnzawW5ATUFtPaxOQm1lmZYi6nTThicV+VftAI9TX0KNDBGkSppdp+bgGIymg9fuI+wNqh5rJu5G4EigDca1O6KWTmkXAItJyJWUv4ACq6HSSvGKVshUjAxTbV6a5XivZNLRgypNKr3jMegcoBZU1LownZKnuZfaavgeGGgHXe0AwGUm9Dp2UtVWVWZxn4A2mGsr4FpuWa++Gf2GiFoHZrXWrSoDdoqk5qYKS6fb0R9jO0CscIJ69c7TdQu+BTSaqP3wYnViJnKAssQJepHlZRd1iVRLqMo7FJu8HVeIxA5QRmSoxy20l0/fNxEGYQud/hpbZScHKDcy1vZm1+u6CaEdwbQB7ZVJdXd2gDLGCdphUX1GehR1qxnwO0rug+5OG9CaOABB1DoaSrgPmAkanXT+sQ50cP5hGsMBlW1KadBO5Fof8HTl2HUb41kk3xBd1Rzn0o1MHSBREOxHoFlk2vyvZAxUceoYJ6JbT6D2voka5g7okAohNbChrgOr+aYdrGsRvkKma6OTeWMjNQcgsN4L0xFaU/p07JX6xnW7nqCOu97osBvQBrTmsqfqgA5pEV4dYmvxWTPMdGIGl7km7fZ4NhJugOyWMwVhWUyZOEBZoshsoI1c5QjtzqjeSX2VJ+jF2hc5VwaDQdnBFAvBM3NAUFgUexZoLZmWtOpHjMaeg1GyvFb3usaCdR7Z1silXtfM8q+JAzq0Q9lJ4Ayg7uJ+3FdVFaszizRJSCVdU0V0ANzq5H8m0Il8SXg5pampA4KSY4B7QR/QlfvaQFxd3tr6WDswJn0BqgqRse+Fp4Y8dSAbWbSrpA/kQgtS+Kp2lBsHBE2AYdR6epTwLLAvUBOwnThbAM0x1SCLZq/plA9NbdFp3jp8R2vTdNyhxgpWJd2SQMbuR3gV0FmTsMgP5dIBUebBgGPBc0DHFN5BOAxcDIYAHT91H6GOOxxDqGW3Uayqvp92xP8AAAD//9/G7g8AAAAGSURBVAMApqXM7iEs5QEAAAAASUVORK5CYII=',
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

const FONT = { title: "Poppins_600SemiBold" };

const CELL = 28;
const SIDE = 24;
const ENTER_DURATION = 320;
const ENTER_OFFSET = 14;

// Le domaine ne peut pas commencer par un point (refuse « nom@.domaine.fr »)
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

const validators = {
  email: (v) => (EMAIL_RE.test(v.trim()) ? "" : "Saisissez une adresse e-mail valide."),
  password: (v) => (v.length > 0 ? "" : "Saisissez votre mot de passe."),
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
   COMPOSANTS
------------------------------------------------------------------ */

const Field = memo(
  React.forwardRef(function Field({ name, label, value, onChange, onBlur, error, right, ...inputProps }, ref) {
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

const SocialButton = memo(function SocialButton({ item, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Se connecter avec ${item.label}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => onPress(item.provider)}
      android_ripple={{ color: "rgba(255,255,255,0.12)" }}
      style={({ pressed }) => [styles.social, (pressed || disabled) && styles.socialPressed]}
    >
      <FontAwesome name={SOCIAL_ICONS[item.provider]} size={24} color={COLORS.white} />
    </Pressable>
  );
});

/* ------------------------------------------------------------------
   ÉCRAN
------------------------------------------------------------------ */

/**
 * Props
 *  - onBack()                      : retour à l'écran de bienvenue
 *  - onLogin({ email, password })  : async, renvoie { error?: string } ;
 *                                    si pas d'erreur, onSuccess() est appelé
 *  - onSocialSignIn(provider)      : async, renvoie { error?: string }
 *  - onForgotPassword(email)       : « Mot de passe oublié ? »
 *  - onCreateAccount()             : « Créer un compte »
 *  - onSuccess(info)               : connexion réussie ({ provider } pour un réseau social)
 *  - initialEmail                  : pré-remplit l'adresse e-mail
 */
function LoginScreen({ onBack, onLogin, onSocialSignIn, onForgotPassword, onCreateAccount, onSuccess, initialEmail = "" }) {
  const { width, height } = useWindowDimensions();

  const [data, setData] = useState({ email: initialEmail, password: "" });
  const [touched, setTouched] = useState({});
  const [showErrors, setShowErrors] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [reduceMotion, setReduceMotion] = useState(false);

  const enter = useRef(new Animated.Value(0)).current;
  const inputs = useRef({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

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

  // Bouton retour Android
  const backRef = useRef(onBack);
  backRef.current = onBack;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!backRef.current) return false;
      backRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  const setField = useCallback((key, value) => {
    setFormError("");
    setData((d) => ({ ...d, [key]: value }));
  }, []);

  const touch = useCallback((key) => {
    setTouched((t) => (t[key] ? t : { ...t, [key]: true }));
  }, []);

  const errors = {
    email: validators.email(data.email),
    password: validators.password(data.password),
  };
  const err = (k) => (touched[k] || showErrors ? errors[k] : "");
  const valid = !errors.email && !errors.password;

  // Bouton désactivé : un appui montre ce qui manque
  const submit = async () => {
    if (loading) return;
    if (!valid) {
      setShowErrors(true);
      inputs.current[errors.email ? "email" : "password"]?.focus();
      return;
    }
    Keyboard.dismiss();
    setFormError("");
    setLoading(true);
    try {
      const res = await onLogin?.({ email: data.email.trim(), password: data.password });
      if (!mounted.current) return;
      if (res?.error) {
        setFormError(res.error);
        setLoading(false);
        return;
      }
      setLoading(false);
      onSuccess?.({ provider: null });
    } catch (e) {
      if (!mounted.current) return;
      setFormError("Connexion impossible pour le moment. Réessayez.");
      setLoading(false);
    }
  };

  const social = async (provider) => {
    if (loading) return;
    Keyboard.dismiss();
    setFormError("");
    setLoading(true);
    try {
      const res = await onSocialSignIn?.(provider);
      if (!mounted.current) return;
      if (res?.error) {
        setFormError(res.error);
        setLoading(false);
        return;
      }
      setLoading(false);
      onSuccess?.({ provider });
    } catch (e) {
      if (!mounted.current) return;
      setFormError("Connexion impossible pour le moment. Réessayez.");
      setLoading(false);
    }
  };

  const contentStyle = {
    opacity: enter,
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [ENTER_OFFSET, 0] }) }],
  };

  const reg = (key) => (el) => {
    inputs.current[key] = el;
  };

  const idle = !valid && !loading;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brand} />
      <Grid width={width} height={height} />

      <SafeAreaView style={styles.safeArea}>
        {/* EN-TÊTE : retour */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => onBack?.()}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={26} color={COLORS.white} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={contentStyle}>
              <Text accessibilityRole="header" maxFontSizeMultiplier={1.2} style={styles.title}>
                Content de vous revoir
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
                Connectez-vous pour retrouver vos chantiers et vos relevés.
              </Text>

              <Field
                ref={reg("email")}
                name="email"
                label="Adresse e-mail"
                placeholder="jean@menuiserie-martin.fr"
                value={data.email}
                onChange={setField}
                onBlur={touch}
                error={err("email")}
                editable={!loading}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => inputs.current.password?.focus()}
              />

              <Field
                ref={reg("password")}
                name="password"
                label="Mot de passe"
                placeholder="Votre mot de passe"
                value={data.password}
                onChange={setField}
                onBlur={touch}
                error={err("password")}
                editable={!loading}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
                textContentType="password"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={submit}
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mot de passe oublié ?"
                onPress={() => onForgotPassword?.(data.email.trim())}
                hitSlop={8}
                style={({ pressed }) => [styles.forgot, pressed && styles.pressed]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.forgotText}>
                  Mot de passe oublié ?
                </Text>
              </Pressable>

              {!!formError && (
                <View accessibilityLiveRegion="polite" style={styles.formError}>
                  <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                  <Text maxFontSizeMultiplier={1.3} style={styles.formErrorText}>
                    {formError}
                  </Text>
                </View>
              )}

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
                    <SocialButton key={s.provider} item={s} onPress={social} disabled={loading} />
                  ))}
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* ACTION PRINCIPALE */}
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Se connecter"
              accessibilityHint={idle ? "Renseignez votre e-mail et votre mot de passe" : undefined}
              accessibilityState={{ disabled: loading, busy: loading }}
              onPress={submit}
              disabled={loading}
              android_ripple={{ color: "rgba(0,50,58,0.12)" }}
              style={({ pressed }) => [styles.primary, idle && styles.primaryIdle, pressed && styles.primaryPressed]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.brand} />
                  <Text maxFontSizeMultiplier={1.3} style={styles.primaryText}>
                    Connexion…
                  </Text>
                </View>
              ) : (
                <Text maxFontSizeMultiplier={1.3} style={[styles.primaryText, idle && styles.primaryTextIdle]}>
                  Se connecter
                </Text>
              )}
            </Pressable>

            <View style={styles.createRow}>
              <Text maxFontSizeMultiplier={1.3} style={styles.createText}>
                Pas encore de compte ?
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer un compte"
                onPress={() => onCreateAccount?.()}
                hitSlop={8}
                style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.createLink}>
                  Créer un compte
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export default LoginScreen;

/* ------------------------------------------------------------------
   STYLES
------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.brand },
  flex: { flex: 1 },
  safeArea: { flex: 1, paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0 },
  gridLine: { position: "absolute", backgroundColor: COLORS.grid },
  pressed: { opacity: 0.6 },

  /* En-tête */
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SIDE - 8, paddingTop: 8 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },

  /* Contenu */
  scroll: { paddingHorizontal: SIDE, paddingTop: 24, paddingBottom: 24 },
  title: { color: COLORS.white, fontSize: 29, lineHeight: 38, fontFamily: FONT.title, letterSpacing: -0.4, marginBottom: 6 },
  subtitle: { color: COLORS.textSoft, fontSize: 15, lineHeight: 22, marginBottom: 28 },

  block: { marginBottom: 18 },
  label: { color: COLORS.white, fontSize: 14, lineHeight: 19, fontWeight: "600", marginBottom: 8 },
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

  /* Mot de passe oublié */
  forgot: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", marginTop: -10, marginBottom: 4 },
  forgotText: { color: COLORS.white, fontSize: 14, lineHeight: 20, fontWeight: "600", textDecorationLine: "underline" },

  /* Erreur générale (identifiants refusés, réseau…) */
  formError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: "rgba(255,180,169,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  formErrorText: { flex: 1, color: COLORS.error, fontSize: 14, lineHeight: 20 },

  /* Connexion avec Apple / Google / Facebook */
  socialWrap: { marginTop: 20, marginBottom: 8 },
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
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  createRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 6,
    minHeight: 44,
    marginTop: 4,
  },
  createText: { color: COLORS.textSoft, fontSize: 14, lineHeight: 20 },
  createBtn: { paddingVertical: 8 },
  createLink: { color: COLORS.white, fontSize: 14, lineHeight: 20, fontWeight: "600", textDecorationLine: "underline" },
});