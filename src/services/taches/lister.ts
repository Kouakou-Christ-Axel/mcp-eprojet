import { normaliser } from "../../utils/parse.js";
import { lireTableauActivite, type TacheResume } from "./activite.js";
import type { ListerTachesInput } from "./listerSchema.js";
import { lireJson } from "./lookups.js";
import type { Deps } from "./service.js";

export interface ListeTaches {
  categorie: string;
  total: number;
  taches: TacheResume[];
}

const TABLES = {
  actives: "tabActivityStarted",
  a_venir: "tabActivityAvenir",
  rattrapage: "tabActivityTermineeRattrapage",
} as const;

interface LigneHistorique {
  reference?: string;
  libelle?: string;
  typeTacheLibelle?: string;
  projetLibelle?: string;
  dateFinPrev?: string;
  pourcentageAvanc?: number | string | null;
  nbHeurePrev?: number | string | null;
  nbHeureRelle?: number | string | null;
}

const texte = (v: unknown) => (v === null || v === undefined ? "" : String(v));

// non vérifié : lignes réelles (aucune tâche terminée au moment de l'écriture).
async function terminees(input: ListerTachesInput, deps: Pick<Deps, "api">): Promise<ListeTaches> {
  const q = new URLSearchParams({
    draw: "1",
    start: String(input.debut),
    length: String(input.limite),
    "search[value]": input.recherche ?? "",
  });
  const res = await deps.api(`/timeSheetTacheParJour/tachesTermineesHistorique?${q}`);
  const json = await lireJson<{ recordsFiltered: number; data: LigneHistorique[] }>(
    res,
    "l'historique des tâches terminées",
  );
  return {
    categorie: "terminees",
    total: json.recordsFiltered,
    taches: json.data.map((l) => ({
      reference: texte(l.reference),
      libelle: texte(l.libelle),
      type: texte(l.typeTacheLibelle),
      projet: texte(l.projetLibelle),
      finPrev: texte(l.dateFinPrev),
      pourcentageAvanc: texte(l.pourcentageAvanc),
      hPrev: texte(l.nbHeurePrev),
      hReelle: texte(l.nbHeureRelle),
    })),
  };
}

async function enCours(
  categorie: Exclude<ListerTachesInput["categorie"], "terminees">,
  input: ListerTachesInput,
  deps: Pick<Deps, "api">,
): Promise<ListeTaches> {
  const html = await (await deps.api("/timeSheetTacheParJour/activity")).text();
  const motCle = normaliser(input.recherche ?? "");
  const filtrees = lireTableauActivite(html, TABLES[categorie]).filter((t) =>
    normaliser(`${t.reference} ${t.libelle} ${t.projet}`).includes(motCle),
  );
  return {
    categorie,
    total: filtrees.length,
    taches: filtrees.slice(input.debut, input.debut + input.limite),
  };
}

export function listerTaches(
  input: ListerTachesInput,
  deps: Pick<Deps, "api">,
): Promise<ListeTaches> {
  return input.categorie === "terminees"
    ? terminees(input, deps)
    : enCours(input.categorie, input, deps);
}
