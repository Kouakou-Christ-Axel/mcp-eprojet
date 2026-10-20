import { ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { modifierTache } from "../services/taches/modifier.js";
import { modifierTacheSchema, modifierTacheShape } from "../services/taches/modifierSchema.js";
import type { Deps } from "../services/taches/service.js";

export const modifierTacheDescription =
  "Modifie une tâche existante d'E-Projet (actives, à venir ou en rattrapage), repérée par sa " +
  "référence. Seuls les champs cités changent. Par défaut dry_run : montre les changements " +
  "avant/après sans rien envoyer ; confirmer=true pour modifier vraiment. Le statut d'une tâche à " +
  "100 % ne se change pas ici (utiliser saisir_timesheet). Attention : E-Projet ne recharge pas " +
  "le responsable externe ni le composant à l'édition ; les repréciser sinon ils sont effacés.";

export { modifierTacheShape };

export function modifierTacheHandler(deps: Deps) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const resultat = await modifierTache(modifierTacheSchema.parse(args), deps);
      return { content: [{ type: "text", text: JSON.stringify(resultat, null, 2) }] };
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
