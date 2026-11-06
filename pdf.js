// Les modules natifs sont chargés à la demande : l'app démarre même si
// expo-print / expo-sharing ne sont pas (encore) installés.
const load = (name) => {
  try {
    // eslint-disable-next-line global-require
    return require(name);
  } catch (e) {
    return null;
  }
};

/* ------------------------------------------------------------------
   PDF d'une fiche de relevé
   - généré à partir des données ENREGISTRÉES (jamais de l'écran)
   - respecte les réglages : champs affichés, format, nom de fichier
   - ne recalcule aucune dimension
------------------------------------------------------------------ */

const DEFAULT_FIELDS = {
  logo: true,
  contact: true,
  client: true,
  address: true,
  date: true,
  dimensions: true,
  photos: true,
  notes: true,
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const fmtMm = (mm, unit) => {
  if (mm == null) return "—";
  return unit === "cm"
    ? `${(Math.round(mm) / 10).toString().replace(".", ",")} cm`
    : `${Math.round(mm)} mm`;
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const slug = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const fileNameFor = (sheet, project, pattern = "chantier-date") => {
  const site = slug(project?.name) || "Chantier";
  const client = slug(project?.client) || "Client";
  const iso = new Date(sheet.updatedAt || Date.now()).toISOString().slice(0, 10);
  const type = slug(sheet.opening.productLabel) || "Ouvrage";
  const ref = slug(sheet.opening.ref);
  const v = sheet.version > 1 ? `_v${sheet.version}` : "";
  const base = {
    "chantier-date": `${site}_${iso}`,
    "client-chantier": `${client}_${site}`,
    "chantier-type": `${site}_${type}`,
    numero: `Fiche_${ref}`,
  }[pattern] || `${site}_${iso}`;
  return `${base}${pattern === "numero" ? "" : `_${ref}`}${v}`.replace(/_+/g, "_");
};

const CSS = `
  @page { margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #10272C; font-size: 11px; line-height: 1.45; }
  h1 { font-size: 20px; margin: 4px 0 2px; }
  h2 { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: #00323A; border-bottom: 2px solid #00323A; padding-bottom: 3px; margin: 18px 0 8px; }
  .head { display: flex; align-items: center; gap: 12px; }
  .logo { width: 38px; height: 38px; border-radius: 8px; background: #00323A; color: #fff; font-weight: 700; font-size: 18px; text-align: center; line-height: 38px; }
  .muted { color: #5B6F73; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; border: 1px solid #00323A; font-size: 10px; font-weight: 700; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #D5DEE0; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #E8EFF0; font-size: 10px; }
  .kv td:first-child { width: 38%; color: #5B6F73; }
  .pending { color: #9A6A00; font-weight: 700; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; }
  .photos img { width: 150px; height: 112px; object-fit: cover; border: 1px solid #D5DEE0; }
  .alert { margin: 3px 0; }
  .foot { margin-top: 22px; font-size: 9px; color: #5B6F73; border-top: 1px solid #D5DEE0; padding-top: 6px; }
`;

export const buildHtml = ({ sheet, project, config }) => {
  const unit = sheet.unit === "cm" ? "cm" : "mm";
  const f = { ...DEFAULT_FIELDS, ...(config?.pdf?.fields || {}) };
  const acc = config?.account || {};
  const company = (config?.pdf?.displayName || acc.company || "").trim();
  const contact = [acc.phone, acc.email].filter(Boolean).join("  ·  ");
  const o = sheet.opening;
  const status = sheet.status === "done" ? "Terminée" : "Brouillon";

  const measRows = sheet.measurements
    .map(
      (m) =>
        `<tr><td>${esc(m.label)}</td><td><b>${esc(fmtMm(m.valueMm, unit))}</b></td><td>${
          m.status === "pending" ? '<span class="pending">À confirmer (dictée)</span>' : "Confirmée"
        }</td></tr>`
    )
    .join("");

  const gaps = [
    sheet.gaps?.widthMm != null ? `Écart entre les largeurs : ${fmtMm(sheet.gaps.widthMm, unit)}` : "",
    sheet.gaps?.heightMm != null ? `Écart entre les hauteurs : ${fmtMm(sheet.gaps.heightMm, unit)}` : "",
  ].filter(Boolean);

  const config_ = (sheet.configView || [])
    .map(
      (sec) =>
        `<h2>${esc(sec.title)}</h2><table class="kv">${sec.items
          .map((i) => `<tr><td>${esc(i.label)}</td><td>${esc(i.value)}</td></tr>`)
          .join("")}</table>`
    )
    .join("");

  const sev = { info: "Information", watch: "À vérifier", blocking: "Bloquante" };
  const issues = (sheet.issues || [])
    .map((i) => `<div class="alert"><b>${esc(sev[i.severity] || "")}</b> · ${esc(i.description)}</div>`)
    .join("");

  const lvl = { info: "Information", watch: "Vigilance", blocking: "Bloquant" };
  const checks = (sheet.checks || [])
    .map((c) => `<div class="alert"><b>${lvl[c.level]}</b> · ${esc(c.text)}</div>`)
    .join("");

  const photos = (sheet.photos || []).map((u) => `<img src="${esc(u)}" />`).join("");

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><style>${CSS}</style></head><body>
  <div class="head">
    ${f.logo ? `<div class="logo">${esc((company || "P").slice(0, 1).toUpperCase())}</div>` : ""}
    <div><b style="font-size:14px">${esc(company)}</b>${
      f.contact && contact ? `<div class="muted">${esc(contact)}</div>` : ""
    }</div>
  </div>

  <h1>Fiche de relevé<span class="badge">${status}</span></h1>
  <div class="muted">Réf. ${esc(o.ref)} · version ${sheet.version || 1}</div>

  <table class="kv" style="margin-top:10px">
    <tr><td>Chantier</td><td><b>${esc(project?.name || "")}</b></td></tr>
    ${f.client && project?.client ? `<tr><td>Client</td><td>${esc(project.client)}</td></tr>` : ""}
    ${f.address && project?.address ? `<tr><td>Adresse du chantier</td><td>${esc(project.address)}</td></tr>` : ""}
    ${f.date ? `<tr><td>Date du relevé</td><td>${fmtDate(sheet.updatedAt)}</td></tr>` : ""}
  </table>

  <h2>Ouvrage</h2>
  <table class="kv">
    <tr><td>Désignation</td><td>${esc(o.designation)}</td></tr>
    <tr><td>Type</td><td>${esc(o.productLabel)}</td></tr>
    ${o.location ? `<tr><td>Emplacement</td><td>${esc(o.location)}</td></tr>` : ""}
    <tr><td>Type de pose</td><td>${esc(o.installationLabel || "Non renseigné")}</td></tr>
    ${sheet.refFace ? `<tr><td>Convention</td><td>${esc(sheet.refFace)}</td></tr>` : ""}
  </table>

  ${
    f.dimensions
      ? `<h2>Cotes relevées</h2>
  ${
    measRows
      ? `<table><tr><th>Cote</th><th>Valeur</th><th>Statut</th></tr>${measRows}</table>`
      : '<div class="muted">Aucune cote relevée.</div>'
  }
  ${gaps.length ? `<div class="muted" style="margin-top:6px">${gaps.map(esc).join("<br/>")}</div>` : ""}
  <div class="muted" style="margin-top:6px">Cotes relevées sur place. Elles ne constituent pas des dimensions de fabrication.</div>`
      : ""
  }

  ${config_}

  ${f.notes && sheet.observations ? `<h2>Observations</h2><div>${esc(sheet.observations).replace(/\n/g, "<br/>")}</div>` : ""}
  ${issues ? `<h2>Réserves</h2>${issues}` : ""}
  ${checks ? `<h2>Points à vérifier</h2>${checks}` : ""}
  ${f.photos && photos ? `<h2>Photos</h2><div class="photos">${photos}</div>` : ""}

  <div class="foot">Fiche ${esc(o.ref)} — version ${sheet.version || 1} — générée le ${fmtDate(new Date().toISOString())} avec Pro’Mètre</div>
  </body></html>`;
};

/** Crée le PDF puis ouvre la feuille de partage. */
export const exportSheetPdf = async ({ sheet, project, config }) => {
  const Print = load("expo-print");
  const Sharing = load("expo-sharing");
  if (!Print || !Sharing) {
    throw new Error("expo-print et expo-sharing doivent être installés.");
  }

  const landscape = config?.pdf?.format === "a4-paysage";
  const html = buildHtml({ sheet, project, config });

  const { uri } = await Print.printToFileAsync({
    html,
    width: landscape ? 842 : 595,
    height: landscape ? 595 : 842,
  });

  // Renommage facultatif (SDK 54+ : "expo-file-system/legacy", avant : "expo-file-system")
  let finalUri = uri;
  try {
    const FileSystem = load("expo-file-system/legacy") || load("expo-file-system");
    if (FileSystem?.moveAsync) {
      const name = fileNameFor(sheet, project, config?.pdf?.fileName);
      const target = `${FileSystem.cacheDirectory}${name}.pdf`;
      await FileSystem.deleteAsync(target, { idempotent: true });
      await FileSystem.moveAsync({ from: uri, to: target });
      finalUri = target;
    }
  } catch (e) {
    // on partage le fichier tel quel
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(finalUri, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
  return finalUri;
};