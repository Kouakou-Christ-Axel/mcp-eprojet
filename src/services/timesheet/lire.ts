import { z } from "zod";
import { verifierPeriode } from "../../utils/dates.js";
import { lirePageTimesheet, type PageTs } from "./page.js";
import type { DepsTs } from "./service.js";

export const lireTimesheetShape = {
  du: z.string().optional().describe("Premier jour AAAA-MM-JJ ; par défaut = au"),
  au: z.string().optional().describe("Dernier jour AAAA-MM-JJ ; aujourd'hui par défaut"),
};
export const lireTimesheetSchema = z.object(lireTimesheetShape);
export type LireTimesheetInput = z.infer<typeof lireTimesheetSchema>;

export interface LigneLue {
  reference: string;
  heures: number;
  statut: string;
  pourcentage: number;
  commentaire: string;
}
export interface JourLu {
  date: string;
  total: number;
  taches: LigneLue[];
}

// "Mardi 20-10-2026" -> "2026-10-20"
const isoDuLibelle = (libelle: string) =>
  /(\d{2})-(\d{2})-(\d{4})$/.exec(libelle)?.slice(1).reverse().join("-");

function lireJour(page: PageTs, date: string): JourLu {
  const taches = page.formulaires.flatMap((f) => {
    const champs = new Map(f.champs);
    return f.lignes.flatMap((l): LigneLue[] => {
      if (l.heuresActuelles <= 0) return [];
      const c = (k: string) => champs.get(`listTaches[${l.index}].${k}`) ?? "";
      return [
        {
          reference: l.reference,
          heures: l.heuresActuelles,
          statut: l.statuts.find((s) => s.valeur === c("statutTacheId"))?.libelle ?? "",
          pourcentage: parseFloat(c("pourcentageAvanc")) || 0,
          commentaire: c("commentaire"),
        },
      ];
    });
  });
  return { date, total: taches.reduce((s, t) => s + t.heures, 0), taches };
}

// Lecture seule : un GET par jour (la page n'en propose que les derniers jours).
export async function lireTimesheet(
  input: LireTimesheetInput,
  deps: Pick<DepsTs, "api" | "aujourdhui">,
): Promise<{ du: string; au: string; total: number; jours: JourLu[] }> {
  const au = input.au ?? deps.aujourdhui();
  const du = input.du ?? au;
  verifierPeriode(du, au);
  const charger = async (chemin: string) =>
    lirePageTimesheet(await (await deps.api(chemin)).text());
  const accueil = await charger("/timeSheetTacheParJour/activity");
  const proposes = accueil.jours.flatMap((j) => {
    const date = isoDuLibelle(j.libelle);
    return date && date >= du && date <= au ? [{ date, chemin: j.chemin }] : [];
  });
  if (proposes.length === 0) {
    throw new Error(
      `Aucun jour entre ${du} et ${au} parmi ceux proposés : ${accueil.jours.map((j) => j.libelle).join(", ")}`,
    );
  }
  const jours: JourLu[] = [];
  for (const { date, chemin } of proposes.sort((a, b) => a.date.localeCompare(b.date))) {
    jours.push(lireJour(await charger(chemin), date));
  }
  return { du, au, total: jours.reduce((s, j) => s + j.total, 0), jours };
}
