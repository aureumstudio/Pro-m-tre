import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";
import {
  useFonts,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import WelcomeScreen from "./WelcomeScreen";
import SetupScreen from "./SetupScreen";
import LoginScreen from "./LoginScreen";
import HomeScreen from "./HomeScreen";
import ProjectsScreen from "./ProjectsScreen";
import ProjectDetailScreen from "./ProjectDetailScreen";
import SheetsScreen from "./SheetsScreen1";
import SheetDetailScreen from "./SheetDetailScreen";
import SettingsScreen from "./SettingsScreen";
import NewMeasureScreen from "./NewMeasureScreen";
import NavBar from "./NavBar";
import { exportSheetPdf } from "./pdf";
import { socialSignIn } from "./socialSignIn";

// Numéro de version affiché dans Réglages : à augmenter à chaque mise à jour
const APP_VERSION = "1.0.0";

// Passez à true pour voir l'accueil avec des chantiers d'exemple
const DEMO_PROJECTS = false;

const SAMPLE = [
  {
    id: "1",
    name: "Résidence Les Tilleuls",
    client: "Syndic Hubert",
    place: "Versailles",
    address: "12 avenue de Paris, 78000 Versailles",
    photo: "https://picsum.photos/seed/tilleuls/300/300",
    measureCount: 12,
    elementCount: 12,
    elements: ["Fenêtre", "Porte d’entrée", "Volet", "Baie coulissante", "Pergola"],
    status: "draft",
    updatedAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Maison Dupont",
    client: "Marc Dupont",
    place: "Saint-Germain-en-Laye",
    address: "4 rue des Lilas, 78100 Saint-Germain-en-Laye",
    photo: "https://picsum.photos/seed/dupont/300/300",
    measureCount: 5,
    elementCount: 5,
    elements: ["Fenêtre", "Volet", "Portail"],
    status: "done",
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "3",
    name: "Villa des Pins",
    client: "Sophie Laurent",
    place: "Rambouillet",
    address: "27 chemin des Pins, 78120 Rambouillet",
    photo: "https://picsum.photos/seed/pins/300/300",
    measureCount: 8,
    elementCount: 8,
    elements: ["Baie coulissante", "Porte-fenêtre", "Store"],
    status: "done",
    updatedAt: new Date(2026, 8, 24).toISOString(),
  },
];

const TAB_TITLES = {};

// « 4 rue des Lilas, 78100 Saint-Germain » → « Saint-Germain »
const placeFrom = (address = "") => {
  const m = address.match(/\d{5}\s+(.+)$/);
  return m ? m[1].trim() : "";
};

function Placeholder({ title }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>Bientôt disponible</Text>
    </View>
  );
}

export default function App() {
  // Police de la marque (Poppins) : chargée avant d'afficher l'app
  const [fontsLoaded] = useFonts({ Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold });

  const [screen, setScreen] = useState("welcome");
  const [tab, setTab] = useState("home");
  const [config, setConfig] = useState(null);

  // Données (en mémoire : à brancher sur une base locale pour les conserver)
  const [projects, setProjects] = useState(DEMO_PROJECTS ? SAMPLE : []);
  const [sheets, setSheets] = useState([]);

  // Navigation secondaire
  const [projectId, setProjectId] = useState(null);
  const [editProject, setEditProject] = useState(false);
  const [sheetId, setSheetId] = useState(null);
  const [sheetBack, setSheetBack] = useState("app");
  const [measureInit, setMeasureInit] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(null);

  /* ---------------------------------------------------------------
     DONNÉES DÉRIVÉES
     Les compteurs des chantiers sont calculés à partir des fiches :
     rien à synchroniser à la main lors d'une création ou suppression.
  --------------------------------------------------------------- */

  const viewProjects = useMemo(
    () =>
      projects.map((p) => {
        const own = sheets.filter((s) => s.projectId === p.id);
        const refs = new Set(own.map((s) => s.opening.ref));
        const count = (p.measureCount || 0) + refs.size;
        const elements = [
          ...new Set([...(p.elements || []), ...own.map((s) => s.opening.productLabel)].filter(Boolean)),
        ];
        const latest = own.reduce((a, s) => (s.updatedAt > a ? s.updatedAt : a), p.updatedAt || "");
        return { ...p, measureCount: count, elementCount: count, elements, updatedAt: latest };
      }),
    [projects, sheets]
  );

  // Fiches terminées, dans leur dernière version (pour l'onglet Fiches)
  const doneSheets = useMemo(() => {
    const done = sheets.filter((s) => s.status === "done");
    return done
      .filter(
        (s) =>
          !done.some(
            (t) =>
              t.projectId === s.projectId &&
              t.opening.ref === s.opening.ref &&
              (t.version || 1) > (s.version || 1)
          )
      )
      .map((s) => {
        const p = viewProjects.find((x) => x.id === s.projectId);
        return {
          id: s.id,
          name: `${s.opening.ref} · ${s.opening.designation}`,
          client: p?.client,
          address: [p?.name, p?.address].filter(Boolean).join(" — "),
          photo: s.photos?.[0],
          elements: [s.opening.productLabel].filter(Boolean),
          elementCount: 1,
          completedAt: s.updatedAt,
        };
      });
  }, [sheets, viewProjects]);

  const project = viewProjects.find((p) => p.id === projectId);
  const sheet = sheets.find((s) => s.id === sheetId);
  const sheetProject = sheet ? viewProjects.find((p) => p.id === sheet.projectId) : null;

  // Si le chantier ou la fiche a disparu (supprimé), on retombe sur l'app
  const view =
    (screen === "project" && !project) || (screen === "sheet" && !sheet) ? "app" : screen;

  /* ---------------------------------------------------------------
     ACTIONS
  --------------------------------------------------------------- */

  const openProject = (p, edit = false) => {
    setProjectId(p.id);
    setEditProject(edit);
    setScreen("project");
  };

  const openSheet = (s, from = "app") => {
    setSheetId(s.id);
    setSheetBack(from);
    setScreen("sheet");
  };

  // productKey : raccourci de l'accueil. opts : { projectId, sheet, revise, returnTo }
  const newMeasure = (productKey, opts = {}) => {
    setMeasureInit({ productKey, ...opts });
    setScreen("measure");
  };

  const closeMeasure = () => {
    const back = measureInit?.returnTo;
    setScreen(back === "project" || back === "sheet" ? back : "app");
  };

  const saveMeasure = (s) => {
    // À enregistrer en base (fiche structurée, cotes en millimètres)
    console.log("Fiche", s);

    let pid = s.projectId;
    if (s.newProject) {
      pid = `p_${Date.now()}`;
      const np = s.newProject;
      setProjects((l) => [
        {
          id: pid,
          ...np,
          place: placeFrom(np.address),
          status: "draft",
          measureCount: 0,
          elementCount: 0,
          elements: [],
          updatedAt: s.updatedAt,
        },
        ...l,
      ]);
    }
    const saved = { ...s, projectId: pid, newProject: null };
    setSheets((l) =>
      l.some((x) => x.id === saved.id) ? l.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...l]
    );
    setSheetId(saved.id);

    const back = measureInit?.returnTo;
    if (back === "project") {
      setProjectId(pid);
      setEditProject(false);
      setScreen("project");
    } else if (measureInit?.sheet) {
      setSheetBack(measureInit.sheetBack || "app");
      setScreen("sheet");
    } else {
      setTab("projects");
      setScreen("app");
    }
  };

  const saveProject = (id, values) =>
    setProjects((l) =>
      l.map((p) =>
        p.id === id ? { ...p, ...values, place: placeFrom(values.address), updatedAt: new Date().toISOString() } : p
      )
    );

  const toggleStatus = (id) =>
    setProjects((l) =>
      l.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "done" ? "draft" : "done", updatedAt: new Date().toISOString() }
          : p
      )
    );

  const deleteProject = (id) => {
    setProjects((l) => l.filter((p) => p.id !== id));
    setSheets((l) => l.filter((s) => s.projectId !== id));
    setProjectId(null);
    setScreen("app");
  };

  const deleteSheet = (id) => {
    const s = sheets.find((x) => x.id === id);
    setSheets((l) => l.filter((x) => x.id !== id));
    setSheetId(null);
    if (sheetBack === "project" && s) {
      setProjectId(s.projectId);
      setScreen("project");
    } else {
      setScreen("app");
    }
  };

  const exportPdf = async (s) => {
    if (pdfBusy) return;
    setPdfBusy(s.id);
    try {
      await exportSheetPdf({
        sheet: s,
        project: viewProjects.find((p) => p.id === s.projectId),
        config,
      });
    } catch (e) {
      console.warn("PDF", e);
      Alert.alert(
        "PDF",
        "Impossible de créer le PDF. Vérifiez que expo-print, expo-sharing et expo-file-system sont installés."
      );
    } finally {
      setPdfBusy(null);
    }
  };

  // Menu « … » d'un chantier
  const projectMenu = (p) =>
    Alert.alert(p.name, undefined, [
      {
        text: p.status === "done" ? "Repasser en cours" : "Marquer terminé",
        onPress: () => toggleStatus(p.id),
      },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () =>
          Alert.alert("Supprimer ce chantier ?", "Ses fiches seront aussi supprimées.", [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: "destructive", onPress: () => deleteProject(p.id) },
          ]),
      },
      { text: "Annuler", style: "cancel" },
    ]);

  // Menu « … » d'une fiche (l'objet reçu vient de l'onglet Fiches)
  const sheetMenu = (v) => {
    const s = sheets.find((x) => x.id === v.id);
    if (!s) return;
    Alert.alert(s.opening.ref, undefined, [
      { text: "Exporter en PDF", onPress: () => exportPdf(s) },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () =>
          Alert.alert("Supprimer cette fiche ?", `La fiche ${s.opening.ref} sera supprimée.`, [
            { text: "Annuler", style: "cancel" },
            { text: "Supprimer", style: "destructive", onPress: () => deleteSheet(s.id) },
          ]),
      },
      { text: "Annuler", style: "cancel" },
    ]);
  };

  /* ---------------------------------------------------------------
     ÉCRANS
  --------------------------------------------------------------- */

  // Le temps de charger Poppins : simple fond aux couleurs de la marque
  if (!fontsLoaded) return <View style={styles.shell} />;

  if (screen === "setup") {
    return (
      <SetupScreen
        onBack={() => setScreen("welcome")}
        onLogin={() => setScreen("login")}
        // Affiche la vraie fenêtre de connexion Apple / Google / Facebook
        onSocialSignIn={socialSignIn}
        onComplete={(c) => {
          // À enregistrer (profil, préférences, raccourcis, PDF, autorisations)
          console.log("Configuration", c);
          setConfig(c);
          setTab("home");
          setScreen("app");
        }}
      />
    );
  }

  if (screen === "login") {
    return (
      <LoginScreen
        onBack={() => setScreen("welcome")}
        onCreateAccount={() => setScreen("setup")}
        // À brancher sur votre backend : renvoyer { error: "message" } si refusé
        onLogin={async ({ email }) => {
          console.log("Connexion", email);
          return {};
        }}
        // Affiche la vraie fenêtre de connexion Apple / Google / Facebook
        onSocialSignIn={socialSignIn}
        onForgotPassword={(email) => console.log("Mot de passe oublié", email)}
        onSuccess={() => {
          setTab("home");
          setScreen("app");
        }}
      />
    );
  }

  // Écrans plein écran (sans barre de navigation)
  if (view === "measure" || view === "project" || view === "sheet") {
    let content = null;

    if (view === "measure") {
      content = (
        <NewMeasureScreen
          projects={viewProjects}
          products={config?.measure?.products ?? []}
          unit={config?.measure?.unit ?? "mm"}
          initialProduct={measureInit?.productKey}
          initialProjectId={measureInit?.projectId}
          initialSheet={measureInit?.sheet}
          revise={!!measureInit?.revise}
          onClose={closeMeasure}
          onSave={saveMeasure}
          // Optionnels : sans eux, un message « bientôt disponible » s'affiche
          // onDictate={async ({ mode, unit }) => ({ measures: { L1: 1185 }, observations: "…" })}
          // onAddPhoto={async () => uriDeLaPhoto}
        />
      );
    } else if (view === "project") {
      content = (
        <ProjectDetailScreen
          project={project}
          sheets={sheets.filter((s) => s.projectId === project.id)}
          startEditing={editProject}
          pdfBusy={pdfBusy}
          onBack={() => setScreen("app")}
          onNewMeasure={() => newMeasure(undefined, { projectId: project.id, returnTo: "project" })}
          onOpenSheet={(s) => openSheet(s, "project")}
          onPdf={exportPdf}
          onSaveProject={(v) => saveProject(project.id, v)}
          onToggleStatus={() => toggleStatus(project.id)}
          onDelete={() => deleteProject(project.id)}
        />
      );
    } else if (view === "sheet") {
      content = (
        <SheetDetailScreen
          sheet={sheet}
          project={sheetProject}
          versions={sheets
            .filter((s) => s.projectId === sheet.projectId && s.opening.ref === sheet.opening.ref)
            .sort((a, b) => (b.version || 1) - (a.version || 1))}
          pdfBusy={pdfBusy === sheet.id}
          onBack={() => {
            if (sheetBack === "project" && sheetProject) {
              setProjectId(sheetProject.id);
              setEditProject(false);
              setScreen("project");
            } else {
              setScreen("app");
            }
          }}
          onPdf={() => exportPdf(sheet)}
          onEdit={() =>
            newMeasure(undefined, {
              sheet,
              revise: sheet.status === "done",
              returnTo: "sheet",
              sheetBack,
            })
          }
          onOpenVersion={(v) => openSheet(v, sheetBack)}
          onDelete={() => deleteSheet(sheet.id)}
        />
      );
    }

    return (
      <View style={styles.shell}>
        <StatusBar barStyle="light-content" backgroundColor="#00323A" />
        <SafeAreaView style={styles.safe}>{content}</SafeAreaView>
      </View>
    );
  }

  if (view === "app") {
    return (
      <View style={styles.shell}>
        <StatusBar barStyle="light-content" backgroundColor="#00323A" />
        <SafeAreaView style={styles.safe}>
          <View style={styles.content}>
            {tab === "home" ? (
              <HomeScreen
                companyName={config?.account?.company ?? ""}
                products={config?.measure?.products ?? []}
                projects={viewProjects}
                logo={config?.pdf?.logoUri ? { uri: config.pdf.logoUri } : undefined}
                onNewMeasure={(key) => newMeasure(key)}
                onCreateProject={() => newMeasure()}
                onSeeAllProjects={() => setTab("projects")}
                onOpenProject={(p) => openProject(p)}
                onOpenSettings={() => setTab("settings")}
              />
            ) : tab === "projects" ? (
              <ProjectsScreen
                projects={viewProjects}
                onOpenProject={(p) => openProject(p)}
                onEditProject={(p) => openProject(p, true)}
                onMoreProject={projectMenu}
                onCreateProject={() => newMeasure()}
              />
            ) : tab === "sheets" ? (
              <SheetsScreen
                // Les fiches = les relevés terminés (dernière version de chaque ouverture)
                sheets={doneSheets}
                onViewSheet={(v) => {
                  const s = sheets.find((x) => x.id === v.id);
                  if (s) openSheet(s, "app");
                }}
                onDownloadPdf={(v) => {
                  const s = sheets.find((x) => x.id === v.id);
                  if (s) exportPdf(s);
                }}
                onMoreSheet={sheetMenu}
              />
            ) : tab === "settings" ? (
              <SettingsScreen
                config={config}
                // À enregistrer (profil, unité, produits, PDF, sauvegarde)
                onChange={setConfig}
                version={APP_VERSION}
                onOpenGuide={() => console.log("Guide d’utilisation")}
                onOpenDictation={() => console.log("Guide de la dictée")}
                onContact={() => console.log("Nous contacter")}
                onReportProblem={() => console.log("Signaler un problème")}
                onExportData={async () => {
                  console.log("Exporter mes données");
                  return {};
                }}
                onImportData={async () => {
                  console.log("Importer des données");
                  return {};
                }}
                onOpenLegal={(type) => console.log("Document légal", type)}
              />
            ) : (
              <Placeholder title={TAB_TITLES[tab]} />
            )}
          </View>

          <NavBar active={tab} onChange={(key) => (key === "new" ? newMeasure() : setTab(key))} />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <WelcomeScreen
      onCreateAccount={() => setScreen("setup")}
      onLogin={() => setScreen("login")}
    />
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: "#00323A" },
  safe: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0,
  },
  content: { flex: 1 },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00323A",
  },
  placeholderTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginBottom: 6 },
  placeholderText: { color: "rgba(255,255,255,0.72)", fontSize: 15 },
});