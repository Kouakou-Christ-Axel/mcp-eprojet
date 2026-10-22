import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { lireTache, lireTacheSchema, lireTacheShape } from "../services/taches/lireTache.js";
import type { Deps } from "../services/taches/service.js";

export const lireTacheDescription =
  "Lit le détail d'une tâche E-Projet (lecture seule), repérée par sa référence : libellé, projet, " +
  "type, nature, gravité, statut, % d'avancement, dates et durée prévue, heures réelles, " +
  "commentaire, responsable externe et composant (vides si non renseignés). Unités : heures_prev et heures_reelles en heures décimales " +
  "(0.5 = 30 min), jours_prev en jours (1 jour = 8 h, 0.5 = demi-journée).";

export { lireTacheShape };

export function lireTacheHandler(deps: Pick<Deps, "api">) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const r = await lireTache(lireTacheSchema.parse(args), deps);
      return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
    } catch (e) {
      return {
        isError: true,
        content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }],
      };
    }
  };
}
