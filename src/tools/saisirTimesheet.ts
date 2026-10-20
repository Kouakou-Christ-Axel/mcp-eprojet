import { ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { saisirTimesheetSchema, saisirTimesheetShape } from "../services/timesheet/schema.js";
import { saisirTimesheet, type DepsTs } from "../services/timesheet/service.js";

export const saisirTimesheetDescription =
  "Saisit les heures du timesheet E-Projet pour une journée (dry_run par défaut : montre ce qui serait " +
  "enregistré sans rien écrire ; confirmer=true pour enregistrer vraiment). date AAAA-MM-JJ (aujourd'hui " +
  "par défaut, 8 derniers jours). Pour chaque tâche : reference, heures (0 à 24, pas 0,25), statut, " +
  "pourcentage ; commentaire facultatif. Règle : statut Terminée <=> 100 %. Les tâches non citées sont " +
  "inchangées. Demander les heures à l'utilisateur plutôt que de les deviner. La réponse contient des " +
  "avertissements (non bloquants) et, après envoi, une relecture (verifie, ecarts).";

export { saisirTimesheetShape };

export function saisirTimesheetHandler(deps: DepsTs) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const r = await saisirTimesheet(saisirTimesheetSchema.parse(args), deps);
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
