import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";

// Pages de connexion officielles. AddSession force Google à afficher le
// formulaire même si un compte est déjà connecté sur le téléphone.
const URLS = {
  google: "https://accounts.google.com/AddSession?hl=fr",
  facebook: "https://m.facebook.com/login.php",
  apple: "https://appleid.apple.com/sign-in",
};

export async function socialSignIn(provider) {
  try {
    // Apple sur iOS : vraie feuille native (fonctionne dans Expo Go)
    if (provider === "apple" && Platform.OS === "ios") {
      const available = await AppleAuthentication.isAvailableAsync();
      if (available) {
        await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        return {};
      }
    }

    // Google, Facebook (et Apple sur Android) : vraie page de connexion.
    // preferEphemeralSession (iOS) : session vierge, sans les cookies de Safari,
    // donc le formulaire s'affiche toujours au lieu d'ouvrir le compte déjà connecté.
    await WebBrowser.openAuthSessionAsync(URLS[provider], "exp://", {
      preferEphemeralSession: true,
    });

    // Mode démonstration : fenêtre refermée = connecté.
    // (Aucune vérification : à remplacer par un vrai flux OAuth en production.)
    return {};
  } catch (e) {
    if (e?.code === "ERR_REQUEST_CANCELED") {
      return { error: "Connexion annulée." };
    }
    return { error: "Connexion impossible pour le moment. Réessayez." };
  }
}