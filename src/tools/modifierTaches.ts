import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import {
  modifierTaches,
  modifierTachesSchema,
  modifierTachesShape,
} from "../services/taches/lotModif.js";
import type { Deps } from "../services/taches/service.js";

export const modifierTachesDescription =
  "Modifie plusieurs tâches E-Projet d'un coup (jusqu'à 20), chacune avec reference + les champs de " +
  "modifier_tache. Un seul dry_run (par défaut) pour tout le lot, puis un seul confirmer=true. Rien " +
  "n'est envoyé si une modification est invalide (mode refusé, avec l'erreur de chaque tâche). L'envoi " +
  "est séquentiel et s'arrête à la première erreur (mode partiel). N'utiliser confirmer=true " +
  "qu'après accord explicite de l'utilisateur sur le dry_run.";

export { modifierTachesShape };

export function modifierTachesHandler(deps: Deps) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const r = await modifierTaches(modifierTachesSchema.parse(args), deps);
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
