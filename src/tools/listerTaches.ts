import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { listerTaches } from "../services/taches/lister.js";
import { listerTachesSchema, listerTachesShape } from "../services/taches/listerSchema.js";
import type { Deps } from "../services/taches/service.js";

export const listerTachesDescription =
  "Liste les tâches de l'utilisateur dans E-Projet (lecture seule). categorie : actives (défaut), " +
  "a_venir (planifiées) ou terminees (historique complet). recherche : mot-clé sur la référence, " +
  "le libellé ou le projet. hPrev et hReelle sont en heures décimales (0.5 = 30 min). 20 résultats par défaut (max 100) ; utiliser debut pour la page suivante.";

export { listerTachesShape };

export function listerTachesHandler(deps: Pick<Deps, "api">) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const liste = await listerTaches(listerTachesSchema.parse(args), deps);
      return { content: [{ type: "text", text: JSON.stringify(liste, null, 2) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
      };
    }
  };
}
