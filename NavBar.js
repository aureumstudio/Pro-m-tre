import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const COLORS = {
  brand: "#00323A",
  accent: "#1E7F8C",
  white: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.62)",
  lineSoft: "rgba(255,255,255,0.10)",
  pill: "rgba(255,255,255,0.14)", // fond de l'onglet actif
};

const FONT = { medium: "Poppins_500Medium", semi: "Poppins_600SemiBold" };

/* ------------------------------------------------------------------
   DIMENSIONS (toutes les positions en découlent)
------------------------------------------------------------------ */

const BAR_HEIGHT = 62; // hauteur utile de la barre
const PAD_TOP = 7; // espace au-dessus des icônes
const PILL_W = 54; // largeur de la pastille active
const PILL_H = 30; // hauteur de la pastille active
const ICON_SIZE = 22;
const LABEL_GAP = 4; // espace pastille → libellé
const FAB_SIZE = 56;
const FAB_LIFT = 22; // dépassement du bouton + au-dessus de la barre

const ICONS = {
  home: { uri: "data:image/png;base64,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" },
  projects: { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAFZUlEQVR42u2dv4skRRTHPz0/VgSPvRVU9A8wMjg8RgRRThBXMFMxURCDU8HMQKNLjFVMxGUvNZK7QFFQLjkW4WD3/IGYGZhdoHDjoYK3O9NlMK+g7Kue6emu2Z6d+X6hmdnZnu6e96n36lXN1OvMOYfUnjoygQAIgCQAAiAJgABIAiAAkgAIgCQAAiAdj3oJj5UBXSC353XkrFGM7fnKK0s0HZ0twGDZOkDoJTTUKeAd4CngT+Az4FbQssveC7AJvAqcBvaAj4C/1gFCUw/wYec08DXwWKLr2geeB4YW0lYWQieBB42AD834ty1++y2vuIXvuW3H+sD+7skDphv/PLBjhkxhLBfAOwdcC84lD4gYf9de6ybOpvrAV8DAztWVB8SNPzaQxdRzPKfRi40ht9eGwLPAdYMwXmcAVY3vaowF8giEsRn9N+CswejYvsduqxkZ3UIBZGb8oxnGd8H+exVbq7M09Gxg8BiEA2DbIGy0AGEUfLYs2fmdc7O2LHh+3k00cs7l7v/K7XVn+zHntmvvPXJ3yh933zm3VePYKba7C+fupDjuLA/wA6F7LS18PZhqKLb83FrqG8BF85i8onf59++ah40iGZV/7UfgC/O+4xofbAIvAPcA3wPv2XU0DofTAHgjnwKuWDYSCxFlxh/NGV/9HNAl4EULd/0K/UQbGgJPAz8H150cgM843gcu2ADprgUYv5gSbwLfTgGet9QJ+/7uyPqg74AngwlIl7oP8DHumnNuHMThMObnhZjfaxgT/Tm3LN67yHmXQf6adu16u4W+svLWqZB23Shxe2ctvWnLL8v9ty39XMbc319TmBHWGthWAfBTJP8d2Xt3zPgbCacKfEgbAi/bY9dcf9Ti5iIQwjFRt04fVWXnafM7vy9oYORj/3XzhBvWIfda3GJT4+HA9CqwNS+EKpNn0zqX/gIzk3AAdgZ4xTpoqP+NW5OQ83aJgT2EJyx52A68dpwCQF04qSB0gD+Aj1uO+1+agbci2ZmHMChAmBkdTsKX8nkwFdLWtlGYCom17iKEh6nw/fhJ+VWEa7kDPjQDewi/VoCwBzw4K2TqZynzTcb5Pulxe+xGsr+eAXsAeNcaT1cA0iYGN80TDkrmvLpm+EeDMCoAiSEMgeeAH0qmp7MqYyMBqA+hb55wgfKfz2QCsPjs7J8mYxMBaJ6dNfqxgACkgSAAJ1UCIAACIAmAAEgCIACSAAiAJAACIAmAAEgCIACSAAiAJAACIAmAAEgCIADSEgLIZMJmNug0PMHRmntRx2ywUADTfmJ9P8tTPqAN4+fAffa3Sw3AH/BMxBP8ooS3mCzR9Et41kW+dM8A+HRKI3RVDjQLwEPEV3j4hXO+ZFmq1fInwfjhYrwt4gWqciaL+2p7gD/gFdtvVPL/sUF4zfbpr5nxYysh/fLaq7P60RTlarx3/MukyuHBinpCmfE7kT7Tr6h8BvjbPMTNC8BDqFKwqVhk44B2yootssM9nMP4n1v/OGRW9d+EJcvG9njTOTdoqazYIreBfbbws4Y6KpSwqVTWrEnRPr9utswTPmF1SkxOqxURtvyLTMr3+GWqMyPAvGUr+wbhTSalamK13eqUrDwpin22mPErV9BqUrh1x0DEars5VqzAasTbGxu/LgBfWnjE9CqHq67Gxq87GeeCdDRlubK1M35dDwg9oVhq8jAYJ6xazf9w4LkBXAZeomHVxKY3cAhLTX5Duhs4LLv2mdSJuFUYjB47gHBWMLyFyRD4ZcWM/oiloeEtVhZaOXde91y3m9Mn+cypMhfHnbexWrWxgJ/PSXqbrVQeIDXsRCUBEABJAARAEgABkARAAKRj0n9eHZerDXJRNgAAAABJRU5ErkJggg==" },
  sheets: { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAFmklEQVR42u2dTYgcRRSAv56e3fU/ycGLJwUvggcVTbyIMTGXFT1IEDWCKCQrepGAeNGb6MkfRNBkFSURJSAIXkWRiFGDIoJX/64RTdS97GxPt4d+xZSTnp7Zma6fmX4PimQ7m6mu91W9eu/VzyRFUaASTjqqAgWgAFQUgAJQCSNdD3WkQGEB9+V2JVKXXXffY/2TvaRjNzSJrcGxvVPXYSORhj4GPCTPTgE/S2/MHZrVHLgeOCgjMAG+BF4G/o0JgqsRYOaWt4DDEfX+s8A9wIVYzJELAKk07nHgHaAnz4ZHh2sZblgGrAAngEeBJWBrEQEYE/AFcIcoIo1kBGTyfk8A62KCs0V1Q3sRurmmIxwX05h58gS9AuhY9pYRdjYXM+Wi5GOcg0R+LwoILiveijQATKyY4Lg8C2aOuo4bWjUxJsCvwG+O3MGdwM1WXVFD8D30+lLn28CLjuq4Hfh6DIA6CF69o1C2b0Ua32SPM+7v5RO4pskYCKnMJc7jhFC2uJAGuirjJuGqkZALhFcFSOIjZmlLNtT05L+tn4sR3tHTAiIX/SQKYHYxo+I0cEiUmldASMX+HxYIfdcQ2rYecBXwgUTC6RAcI0syL3mB0DYAxqwcA45Yys0rnBMvENq4IpYDy+Lt7AXObxNCRwHMFhyaFboV4CtgFfiH6tW6Kgh5k3prG4AtUeIWsCnPvgH2AL8PeUxVEE4BuwRCI+aou6C9fNSzq4G7hkxOF9gA3gReGGHrDYQHgOuAu+X/MGuwtogANmtG+k3A52PihaRGVz3gNuAZ4Hkr+lYAltxQ0zOLmh47iZdjUhR7m+j9iwbAKOPhbaYippk3ezoJ1ys591CHAhihlJMMMpyuVtY0DqgQEyi9J0HWstjsaYsX3SzaJGzmgSOUizIPMtiYtV2zsZPxK2sKYASABHhXyrQy6cqaAhgBIp3SVZxkZU0BTDgnzOJF6STcBlEACkABqCgABaCiANopscUBdvDk8kSl+fzgx5S6kY1GO3hyHQjlVuBVtB2AWaPdDzxJmQg7LaWJE5Uml7MDeMT6/FcIfGqyG5HyzdYPI/sc17uPckvKKvBXKAidSJR/I+VutZxy90Ff/mx617S94LIJ7JZREEwXoUeAmXQPWna56xn+fWKaLuDvCK26oRoHlGK8no+s98lwd4LSLuYY7SeU5wbSNs4BZp/lT8Aag2NLqYeyQnmU9qgntzdaL8hAWAd+AZ6i3Mfv6oiQ2dcZxeUdscQBBsJnUnyKBmIWhGnXcWeJvDUVUTEp+wLeei9I3dAI38n1+Vwv53/n1QTZ++0T3NwzlA2ByBXAQCF94FLgEsrDcy4uzrA/v8Dt/XVzAcDuic9RZkWvBL4DzjTsJu4A7geuAL4HngV+CAkhFgA55QV/a9bzA1JcyQHgVsozYz+GghBDNjQTZaxRnl5Mqb5KoEnHI5G6dgGvUy4EtXIEGC9sP4MbSjoWHJeyJIBvEdP0Jy1OR5/DfzbSHNjboMyMJiF7YCjJpOHvCwRzW1XmoZj80xuUCbkOAdISoU2QOfxwDrgX+Bi4xmP9x4CXuHhHRqu8INMTz1IepD4kNhncpqPPAJ+i2dD/QfgDeM2zC6zZ0KGe6eua4yKU2YkVgFFKRotE09EKQAGoKAAFoKIA2indgOC7xHlSP/UZj4RSwAaDpFhsYt7p/CICMCZvFbiMwOuxI8SkJ661fp5LAEUNgDulzIPMLYClmn/LI+z5VYp3Pg+4AGAUu7umBzV+B7O6oRfL8hz08mk7WBLzCDAvd0LsfG/MvDBP80BfOtbJpuaHtn2ZZxOyTvkFEDQxwl0BqPo6W4BviWARZIrAbI/8/UPKiwCTpkZ0G7/QOao2uQ7EzO2FhYdJ3/XEa5Tf6Ah2PQJUArqhKgpAAagoAAWgUiP/ASC051v6mmp6AAAAAElFTkSuQmCC" },
  settings: { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAFZUlEQVR42u2bTYgcRRTHf9UzE5DEBD/YoCge1FxEFgU/ECRCDqM3L6ISVFQErzF7FDx4FW8BSTCKQRLx5knBi+hFVggxBkRRb4ISs656yuxMedhXUClqZrcn013VNe9B0cxuV3X3+1e9r6q/sdaikk4qVYECoACoKAAKgIoCoACoKAAKgIoCoACotCf9Jf1uE5l8E6D1wphZomKcAXqi6MkMi1AB47bAWAYAnOK3vL8dAA4B++T3f8BPwGZgHRoHonQAKm+2rwAvAk8Cq8Ctwb2XgQvA58BHwJ+RMRSAGtKTGbwfeAN4HTjo/d96s9tIc/IH8B7wLvCPN5YCUFP5DwDvyxUxQ84Bm6CP9RyxC07OA6/KtREQSgTAKeoh4AvgJmAkSjW7HMMKWANgAxgC602AUBoAzl7fD3wlyh+L4qYpmhnAuL4bwGHg4qJ9QkkAONOyD/haQJim/HGQC1jvXjMFhIvA4xIxLSxnqAqb/WPgmCh/FFG+c7w9uX8T+FuU7kzUJGLSRjLmMXlGlcMK6HmzoEqRRQaz3wK3AJeAmyORjfV+fwB8DHwvCr0HeEoUfEBAqCLAXQHuA/7yAHfPn883WGvnaWbOfk2343ZbRvZamUi7bK0dzuh/yFr7rfQZB2O4MY8vUid1V4DxZsTLwPPyt0+AX5pOWnbhfN+RkNMGM9i90xD4UqIbvyRhPFOzIitjJRhnIvddkLziXuAZueesrCoTOPeFr4BK2knbHdmS62n5hj0zvm8g15eCvruRk55+GlkBLgZ+RZKbq4GTMxk4YhN5DzdzDwPfBLZ72gq/EfhVfIqN+BIbzPIxsEeSttN18oU63tw98AX5qF7QqgxaLLt10c6PXrY76xuNhJqXAvMVhrvh909EN7VM0LJsyEzEvte5/2obL9avubwBzgBPtPWCczhjEwlP9wN3yUrYyQRZ4AYpVzOjZkTEBJ2pa47rAOASkA+BR4HXOjL7x/KdT0sEMwsAt2/wMHBHJB/wI6aw3ynRTVUnJ7jeMPQ5L33PwQmvSv0nfFcL/Csh6m8Shm4FtSDfcX4HPBgA4O7dECCdqRoD59oKQ3NPxNamJGIuqVq31t4WCavd77619tQOidhaykQsXHb10G7W9u9UinCz+XfgTeAzKSkA7AUeA94GHokU8WKlCOOFuMxbiuhfp23NKcrps72NeAJ4S6KeQSRbvl1i9SvAD14t6M6g+umL2xs4Ic/oc+0es5aja5SjrZfHxCqllZaj5xOnwE3gqDjLWEZqvEruWNqE+Fkhf0PmqIxtF2l2S0vEJt5sHXogjCJKM0EWH4I58pQ/lDF7iy42lpgJu1m7Dhxhe0N9IArfYvpZH7ci3Mb9QPoeoaH94NJ8wLTioR5LSRye6sGsDKIjPZqYERB6ODejnCGMoPR4+rKJMmQUAAVARQFQAFQUAAVAJYGk4glnkwglzwhbTMSyLAUsAwBZF8NKByD7cnDJAHRiQ6RUADrD0y0RgE7xdEsDoHM83ZIA6CRPt6RMuJM83S6vAJ8n7BKsNnm6hvTcZJ9lmQVPOCVPN3VLyhP+FPhZ4vZVmuXpngfWSM9Jvht4lg7whNvi6aaWLHjCbfJ0U0uWPOE2ebqpW6d4wtnydFPLonnCqXi6qSVrnnAbPN3Ukpwn7JTUNk83tRN2JZRseMIpebpLkYiFy86PdFLxdJOXczxT26gTjtl2X7md5OkuYzk6K55uSeXoTvJ0SwIAOsjTLQ0Af9Z2gqdbkg+YVrzTYymJAPAjH9CDWUkA8G29Hk1MBEAIhB7OTQRALGcIIyg9nq7S/TBURQFQAFQUAAVARQFQAFQUAAVARQFQAFSmyP9QVR5V3Gs/hwAAAABJRU5ErkJggg==" },
  plus: { uri: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAADPElEQVR42u2dQYrUQBSGv6Qz4Lhp8QqewIULRwQ3gjvFC7j3Ai50aYMnmL0XEGcnuBR14YAX0BOIMq0igulkFr6CInTPVHeqOl2Z/4cidCbNVOqrV1Uv+dMp2rZFGk6lmkAABEASAAGQBEAAJAEQAEkABEASgFAVVrJVlWm9J7ZdrPgsAImj1jX01LZz72+NhqC0Pb8BHgJHwBcrR7av8aIhjzE0o/sBrnc/B56uOGYGPMspEnIBMLFh5z7wGqhXjP0V8MAiYpLDnJDTEFQAj4HWa2y3CnJzWWvHZLMyyiECCmvYK8BX4Kp97jay2/cDuAaceN9VBESEMarcIAcArdVzDryzfQ0jUZlRPVvgkwdFAAbQHiNTbgBaAZAEQAAkARAASQAEQBIAAZAEQAAkARAASQAEQBocQPZezW2fXyxr4jKvZpGgnuUaxzvbSqybOC0JvKhVpCha5dWMJWfE+h3YUN8SRUB0L2oVoecv+O/LfAQcWK97D3yOPFQ2wJ0zIsFF3GXgBfA3cuNfB24Z4A/AS+AVPR14fYxZIV7Nsau3F3VTAOd5NRvS3EAvA+eBOtEEXHbG/t5e1D4AGuANcNf+cXXBen9t7fAWuNeZC5MCCPVqjl1RvKhKxDJMxFoLvTlw3FkfXyQt7NyPrS0mm8x7Zc8QPPSGntr2pS6hdUtZam84Puyz4Ch70C9t9p91Ms/UZZ1LBqmKO9+ZtUG56SjQ9wGNbiJ2M9FqyE1u+8ClgN7/01ZpKR7QqIGPu5CIsSQdn3q9NOaqyJ3kEyv1EtBuVXJiWWvsyyGtt92ZSxEu6Zp0KpZKfwIb6jvwK/HipWBHLsb5mWGqXKDyEp8Q7XnjdYqMvIl5YinCNEXSs8kqKGWdBssDJAEQAEkABEASAAGQBEAAJAEQAEkABEASAAGQRg6gEIBh9U8AhpFzONwYWyTkAKAwAFPg9tjmrjH+Ztw6944FILBBQ7yoUbyaAnA2iFVe1GheTQFYrvO8qNG8mluf4DJ7n/CyhwIh4kNzAhAWtb4XFTJ+hUmR6Ru1R/MSnyLzV5oXayxPd1K5P9mY/W9J62qoAAiAJAACIAmAAEgCIACSAAiAtEWdAiZZFuzAc2KHAAAAAElFTkSuQmCC" },
}; 

const TABS = [
  { key: "home", label: "Accueil", icon: "home", iconOff: "home-outline" },
  { key: "projects", label: "Chantiers", icon: "construct", iconOff: "construct-outline" },
  { key: "new", label: "Relevé", a11y: "Nouveau relevé", center: true },
  { key: "sheets", label: "Fiches", icon: "document-text", iconOff: "document-text-outline" },
  { key: "settings", label: "Réglages", icon: "settings", iconOff: "settings-outline" },
];

const Tab = memo(function Tab({ tab, active, onPress }) {
  /* Bouton central : rond surélevé + libellé aligné sur les autres */
  if (tab.center) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tab.a11y}
        onPress={() => onPress(tab.key)}
        style={styles.slot}
      >
        {({ pressed }) => (
          <>
            <View style={[styles.fab, pressed && styles.fabPressed]}>
              <Ionicons name="add" size={30} color={COLORS.white} />
            </View>
            <View style={styles.pillSpace} />
            {/* Même style que les onglets inactifs : un seul onglet paraît sélectionné */}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={styles.label}>
              {tab.label}
            </Text>
          </>
        )}
      </Pressable>
    );
  }

  const color = active ? COLORS.white : COLORS.textSoft;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      onPress={() => onPress(tab.key)}
      style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
    >
      {/* Pastille : visible uniquement sur l'onglet actif */}
      <View style={[styles.pill, active && styles.pillOn]}>
        <Ionicons
          name={active ? tab.icon : tab.iconOff}
          size={ICON_SIZE}
          color={color}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>
      <Text numberOfLines={1} maxFontSizeMultiplier={1.15} style={[styles.label, active && styles.labelOn]}>
        {tab.label}
      </Text>
    </Pressable>
  );
});

/**
 * active   : "home" | "projects" | "sheets" | "settings"
 * onChange : (key) => void — reçoit aussi "new" (bouton +)
 */
function NavBar({ active, onChange }) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {TABS.map((t) => (
        <Tab key={t.key} tab={t} active={t.key === active} onPress={onChange} />
      ))}
    </View>
  );
}

export default memo(NavBar);

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: COLORS.brand,
    borderTopWidth: 1,
    borderTopColor: COLORS.lineSoft,
    paddingHorizontal: 6,
    paddingBottom: Platform.OS === "ios" ? 2 : 8,
  },

  /* Chaque onglet : même hauteur, pastille puis libellé, centrés */
  slot: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: "center",
    paddingTop: PAD_TOP,
  },
  pressed: { opacity: 0.6 },

  /* Pastille de l'onglet actif */
  pill: {
    width: PILL_W,
    height: PILL_H,
    borderRadius: PILL_H / 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: LABEL_GAP,
    backgroundColor: "transparent",
  },
  pillOn: { backgroundColor: COLORS.pill },
  pillSpace: { height: PILL_H, marginBottom: LABEL_GAP },

  label: {
    color: COLORS.textSoft,
    fontSize: 11.5,
    lineHeight: 15,
    fontFamily: FONT.medium,
  },
  labelOn: { color: COLORS.white, fontFamily: FONT.semi },

  /* Bouton + : centré, posé à cheval sur la bordure (sans ombre, selon la charte) */
  fab: {
    position: "absolute",
    top: -FAB_LIFT,
    alignSelf: "center",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: COLORS.accent,
    borderWidth: 4,
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  fabPressed: { transform: [{ scale: 0.94 }], opacity: 0.92 },
});