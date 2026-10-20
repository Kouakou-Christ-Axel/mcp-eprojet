import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Deps } from "../services/taches/service.js";
import {
  supprimerTache,
  supprimerTacheSchema,
  supprimerTacheShape,
} from "../services/taches/supprimer.js";

export const supprimerTacheDescription =
  "SUPPRIME DÉFINITIVEMENT une tâche d'E-Projet (actives, à venir ou en rattrapage), repérée par sa " +
  "référence. Par défaut dry_run : montre la tâche concernée et les avertissements sans rien " +
  "supprimer. N'utiliser confirmer=true qu'après accord explicite de l'utilisateur sur cette tâche.";

export { supprimerTacheShape };

export function supprimerTacheHandler(deps: Deps) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const resultat = await supprimerTache(supprimerTacheSchema.parse(args), deps);
      return { content: [{ type: "text", text: JSON.stringify(resultat, null, 2) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
      };
    }
  };
}
