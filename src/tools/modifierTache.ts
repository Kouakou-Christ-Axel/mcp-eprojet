import { ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { modifierTache } from "../services/taches/modifier.js";
import { modifierTacheSchema, modifierTacheShape } from "../services/taches/modifierSchema.js";
import type { Deps } from "../services/taches/service.js";

export const modifierTacheDescription =
  "Modifie une tâche existante d'E-Projet (actives, à venir ou en rattrapage), repérée par sa " +
  "référence. Seuls les champs cités changent. Par défaut dry_run : montre les changements " +
  "avant/après sans rien envoyer ; confirmer=true pour modifier vraiment. duree_heures (H. prév, heures décimales) et jours_prev (Jour prév, pas de 0.25) sont deux champs " +
  "indépendants : on peut changer l'un sans l'autre ; si seul duree_heures est donné, Jour prév est recalculé " +
  "(H. prév / 8, quart de jour supérieur). Dans les changements, nbHeurePrev est en heures et nbJourPrev en jours. Le statut d'une tâche à " +
  "100 % ne se change pas ici (utiliser saisir_timesheet). Le responsable externe et le composant " +
  "actuels sont conservés sauf si on les change.";

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
