import * as cheerio from "cheerio";
import { serialiser, type Option } from "../../utils/parse.js";

export interface LigneTs {
  index: number;
  reference: string;
  statuts: Option[];
  hPrev: number;
  hReelle: number;
  heuresActuelles: number;
}
export interface FormTs {
  tableId: string;
  action: string;
  champs: [string, string][]; // ce que le navigateur enverrait (serialize)
  lignes: LigneTs[];
}
export interface JourTs {
  libelle: string;
  chemin: string;
}
export interface PageTs {
  jours: JourTs[];
  formulaires: FormTs[];
  seuil: number;
}

const TABLES = ["tabActivityStarted", "tabActivityAvenir", "tabActivityTermineeRattrapage"];
const nombre = (s: string | undefined) => parseFloat(s ?? "") || 0;
// Les URLs de la page portent le contexte d'application ; api() ajoute déjà la base.
const sansContexte = (url: string) => url.replace(/^.*?(?=\/timeSheetTacheParJour\/)/, "");

// Sélecteurs isolés ici : si la page change, c'est le seul fichier du timesheet à adapter.
export function lirePageTimesheet(html: string): PageTs {
  const $ = cheerio.load(html);
  const jours = $("select[id^='timeSheetTachePar_timeSheetJourId']")
    .first()
    .find("option")
    .map((_, o) => ({
      libelle: $(o).text().replace(/\s+/g, " ").trim(),
      chemin: sansContexte($(o).attr("value") ?? ""),
    }))
    .get();

  const formulaires = TABLES.flatMap((tableId): FormTs[] => {
    const $form = $(`#${tableId}`).closest("form");
    if ($form.length === 0) return [];
    const champs = serialiser($, `#${tableId}`);
    const lignes: LigneTs[] = [];
    $(`#${tableId} tbody tr`).each((_, tr) => {
      const $tr = $(tr);
      const ref = $tr.find("[name$='.reference']").first();
      const index = /\[(\d+)\]/.exec(ref.attr("name") ?? "")?.[1];
      if (!ref.attr("value") || index === undefined) return;
      lignes.push({
        index: Number(index),
        reference: ref.attr("value")!,
        statuts: $tr
          .find("select[name$='.statutTacheId'] option")
          .map((_, o) => ({ valeur: $(o).attr("value") ?? "", libelle: $(o).text().trim() }))
          .get(),
        hPrev: nombre($tr.find("td.ts-cell-hprev").text()),
        hReelle: nombre($tr.find("td.ts-cell-hreelle").text()),
        heuresActuelles: nombre($tr.find("[name$='.nbHeureTravaille']").attr("value")),
      });
    });
    return [{ tableId, action: sansContexte($form.attr("action") ?? ""), champs, lignes }];
  });

  const seuil = /tsSeuilDepassementBudgetPourcentage\s*=\s*(\d+(?:\.\d+)?)/.exec(html)?.[1];
  return { jours, formulaires, seuil: seuil ? Number(seuil) : 100 };
}
