import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import {
  lireTimesheet,
  lireTimesheetSchema,
  lireTimesheetShape,
} from "../services/timesheet/lire.js";
import type { DepsTs } from "../services/timesheet/service.js";

export const lireTimesheetDescription =
  "Lit les heures déjà saisies dans le timesheet E-Projet (lecture seule). du / au : AAAA-MM-JJ " +
  "(aujourd'hui par défaut ; E-Projet ne propose que les derniers jours). Pour chaque jour : " +
  "total d'heures et tâches avec heures, statut, % et commentaire. Un jour absent de la réponse " +
  "n'est pas proposé par E-Projet. Limite : E-Projet n'affiche pas les heures du jour des tâches " +
  "terminées (rattrapage) ; elles ne sont pas comptées ici.";

export { lireTimesheetShape };

export function lireTimesheetHandler(deps: Pick<DepsTs, "api" | "aujourdhui">) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const r = await lireTimesheet(lireTimesheetSchema.parse(args), deps);
      return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
    } catch (e) {
      const message =
        e instanceof ZodError
          ? e.issues.map((i) => `${i.path.join(".") || "entrée"} : ${i.message}`).join("\n")
          : e instanceof Error
            ? e.message
            : String(e);
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  };
}
