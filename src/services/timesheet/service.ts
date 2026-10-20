import type { api as apiReelle } from "../../client/http.js";
import { journaliser } from "../../utils/actionsLog.js";
import { isoVersFr } from "../../utils/dates.js";
import { resoudreOption } from "../../utils/parse.js";
import { lirePageTimesheet, type FormTs, type LigneTs, type PageTs } from "./page.js";
import { avertissements, verifierCoherence } from "./regles.js";
import type { SaisirTimesheetInput, TacheSaisie } from "./schema.js";

export interface DepsTs {
  api: typeof apiReelle;
  log: (entree: object) => void;
  aujourdhui: () => string; // AAAA-MM-JJ
}

interface Cible {
  form: FormTs;
  ligne: LigneTs;
  tache: TacheSaisie;
  statutId: string;
  statutLibelle: string;
}
interface Modification {
  reference: string;
  heures: number;
  statut: string;
  pourcentage: number;
  commentaire?: string;
}
export type ResultatTs =
  | { mode: "dry_run"; date: string; modifications: Modification[]; avertissements: string[] }
  | {
      mode: "envoyé";
      date: string;
      modifications: Modification[];
      avertissements: string[];
      enregistres: string[];
      verifie: boolean;
      ecarts: string[];
    };

const charger = async (deps: DepsTs, chemin: string): Promise<PageTs> =>
  lirePageTimesheet(await (await deps.api(chemin)).text());

function trouverCible(page: PageTs, tache: TacheSaisie): Cible {
  const trouves = page.formulaires.flatMap((form) =>
    form.lignes.filter((l) => l.reference === tache.reference).map((ligne) => ({ form, ligne })),
  );
  if (trouves.length !== 1) {
    throw new Error(
      trouves.length === 0
        ? `Tâche ${tache.reference} introuvable parmi les tâches actives, à venir ou en rattrapage`
        : `Tâche ${tache.reference} présente dans plusieurs tableaux`,
    );
  }
  const { form, ligne } = trouves[0]!;
  const statutId = resoudreOption({ statut: ligne.statuts }, "statut", tache.statut);
  const statutLibelle = ligne.statuts.find((s) => s.valeur === statutId)!.libelle;
  verifierCoherence(statutLibelle, tache.pourcentage);
  return { form, ligne, tache, statutId, statutLibelle };
}

function corps(form: FormTs, cibles: Cible[]): URLSearchParams {
  const valeurs = new Map(form.champs);
  for (const { ligne, tache, statutId } of cibles) {
    const p = `listTaches[${ligne.index}].`;
    valeurs.set(`${p}nbHeureTravaille`, String(tache.heures));
    valeurs.set(`${p}statutTacheId`, statutId);
    valeurs.set(`${p}pourcentageAvanc`, String(tache.pourcentage));
    if (tache.commentaire !== undefined) valeurs.set(`${p}commentaire`, tache.commentaire);
  }
  return new URLSearchParams([...valeurs]);
}

// Relit la journée enregistrée et compare à ce qui a été envoyé.
function comparer(page: PageTs, cibles: Cible[]): string[] {
  const ecarts: string[] = [];
  for (const { tache, statutId, ligne } of cibles) {
    const relue = page.formulaires.flatMap((f) =>
      f.lignes.filter((l) => l.reference === ligne.reference).map((l) => ({ f, l })),
    )[0];
    if (!relue) {
      ecarts.push(`${tache.reference} : introuvable à la relecture`);
      continue;
    }
    const c = new Map(relue.f.champs);
    const p = `listTaches[${relue.l.index}].`;
    if (parseFloat(c.get(`${p}nbHeureTravaille`) ?? "") !== tache.heures) {
      ecarts.push(
        `${tache.reference} : heures relues "${c.get(`${p}nbHeureTravaille`)}" au lieu de ${tache.heures}`,
      );
    }
    if (c.get(`${p}statutTacheId`) !== statutId)
      ecarts.push(`${tache.reference} : statut différent à la relecture`);
    if (parseFloat(c.get(`${p}pourcentageAvanc`) ?? "") !== tache.pourcentage) {
      ecarts.push(
        `${tache.reference} : % relu "${c.get(`${p}pourcentageAvanc`)}" au lieu de ${tache.pourcentage}`,
      );
    }
  }
  return ecarts;
}

export async function saisirTimesheet(
  input: SaisirTimesheetInput,
  deps: DepsTs,
): Promise<ResultatTs> {
  const date = input.date ?? deps.aujourdhui();
  const libelleJour = isoVersFr(date).replaceAll("/", "-");
  const accueil = await charger(deps, "/timeSheetTacheParJour/activity");
  const jour = accueil.jours.find((j) => j.libelle.endsWith(libelleJour));
  if (!jour) {
    throw new Error(
      `Jour ${libelleJour} non proposé. Disponibles : ${accueil.jours.map((j) => j.libelle).join(", ")}`,
    );
  }
  const page = await charger(deps, jour.chemin);
  const cibles = input.taches.map((t) => trouverCible(page, t));

  const modifications = cibles.map(({ tache, statutLibelle }): Modification => ({
    reference: tache.reference,
    heures: tache.heures,
    statut: statutLibelle,
    pourcentage: tache.pourcentage,
    ...(tache.commentaire !== undefined && { commentaire: tache.commentaire }),
  }));
  const alertes = avertissements({
    seuil: page.seuil,
    lignes: page.formulaires.flatMap((f) =>
      f.lignes.map((l) => {
        const c = cibles.find((x) => x.ligne === l);
        return {
          cite: Boolean(c),
          reference: l.reference,
          statut: c?.statutLibelle ?? "",
          heures: c?.tache.heures ?? l.heuresActuelles,
          heuresActuelles: l.heuresActuelles,
          hPrev: l.hPrev,
          hReelle: l.hReelle,
        };
      }),
    ),
  });
  if (!input.confirmer) return { mode: "dry_run", date, modifications, avertissements: alertes };

  // Vérifié le 2026-10-20 par un envoi réel : POST tableau complet accepté, relecture conforme.
  const enregistres: string[] = [];
  for (const form of page.formulaires.filter((f) => cibles.some((c) => c.form === f))) {
    const lot = cibles.filter((c) => c.form === form);
    const res = await deps.api(form.action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corps(form, lot),
    });
    journaliser(deps.log, {
      outil: "saisir_timesheet",
      date,
      formulaire: form.tableId,
      statut: res.status,
      modifications: modifications.filter((m) =>
        lot.some((c) => c.tache.reference === m.reference),
      ),
    });
    if (res.status >= 400) {
      throw new Error(
        `E-Projet a refusé l'enregistrement du formulaire ${form.tableId} (HTTP ${res.status}). Déjà enregistrés : ${enregistres.join(", ") || "aucun"}`,
      );
    }
    enregistres.push(form.tableId);
  }
  const ecarts = comparer(await charger(deps, jour.chemin), cibles);
  return {
    mode: "envoyé",
    date,
    modifications,
    avertissements: alertes,
    enregistres,
    verifie: ecarts.length === 0,
    ecarts,
  };
}
