import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import {
  listerProjets,
  listerProjetsSchema,
  listerProjetsShape,
} from "../services/taches/projets.js";
import type { Deps } from "../services/taches/service.js";

export const listerProjetsDescription =
  "Liste les projets auxquels l'utilisateur est associé dans E-Projet (lecture seule) : id, client, " +
  "libellé. Avec projet (id, libellé ou « Client | Projet »), liste plutôt les responsables externes " +
  "de ce projet (ils dépendent du client), filtrables par recherche, 20 par défaut (max 100). " +
  "Utile avant creer_tache ou modifier_tache pour choisir un projet ou un responsable externe.";

export { listerProjetsShape };

export function listerProjetsHandler(deps: Pick<Deps, "api">) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const r = await listerProjets(listerProjetsSchema.parse(args), deps);
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
