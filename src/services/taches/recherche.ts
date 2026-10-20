import { normaliser } from "../../utils/parse.js";
import { lireTableauActivite, type TacheResume } from "./activite.js";
import type { Deps } from "./service.js";

const TABLES = ["tabActivityStarted", "tabActivityAvenir", "tabActivityTermineeRattrapage"];

// Retrouve une tâche (avec son id) dans les tableaux de la page Activité.
export async function trouverTache(
  deps: Pick<Deps, "api">,
  reference: string,
): Promise<TacheResume & { id: string }> {
  const html = await (await deps.api("/timeSheetTacheParJour/activity")).text();
  const t = TABLES.flatMap((id) => lireTableauActivite(html, id)).find(
    (x) => normaliser(x.reference) === normaliser(reference),
  );
  if (!t?.id) {
    throw new Error(
      `Tâche ${reference} introuvable parmi les tâches actives, à venir ou en rattrapage`,
    );
  }
  return { ...t, id: t.id };
}
