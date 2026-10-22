import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { creerTaches, creerTachesSchema, creerTachesShape } from "../services/taches/lot.js";
import type { Deps } from "../services/taches/service.js";

export const creerTachesDescription =
  "Crée plusieurs tâches E-Projet d'un coup (jusqu'à 20), chacune avec les champs de creer_tache. " +
  "Un seul dry_run (par défaut) pour tout le lot, puis un seul confirmer=true. Rien n'est envoyé si " +
  "une tâche est invalide (mode refusé, avec l'erreur de chaque tâche). L'envoi est séquentiel et " +
  "s'arrête à la première erreur (mode partiel : liste des tâches déjà créées). N'utiliser " +
  "confirmer=true qu'après accord explicite de l'utilisateur sur le dry_run.";

export { creerTachesShape };

export function creerTachesHandler(deps: Deps) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const r = await creerTaches(creerTachesSchema.parse(args), deps);
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
