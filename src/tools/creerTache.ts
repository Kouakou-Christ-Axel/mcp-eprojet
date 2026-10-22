import { ZodError } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { creerTacheSchema, creerTacheShape } from "../services/taches/schema.js";
import { creerTache, type Deps } from "../services/taches/service.js";

export const creerTacheDescription =
  "Crée une tâche dans E-Projet. Par défaut dry_run : montre ce qui serait envoyé sans rien créer ; " +
  "passer confirmer=true pour créer vraiment. Dates en AAAA-MM-JJ. Durée : duree_heures (H. prév, " +
  "heures décimales, 0.5 = 30 min) et jours_prev (Jour prév, pas de 0.25 jour) sont DEUX champs indépendants, " +
  "sans lien imposé par E-Projet ; jours_prev facultatif (défaut : H. prév / 8, arrondi au quart de jour supérieur, " +
  "0.25 minimum même sous 2 h). gravite obligatoire si nature=ANOMALIE. " +
  "Le responsable interne est l'utilisateur connecté. Si plusieurs responsables externes " +
  "correspondent, la liste est renvoyée : relancer avec le nom complet.";

export { creerTacheShape };

export function creerTacheHandler(deps: Deps) {
  return async (args: unknown): Promise<CallToolResult> => {
    try {
      const resultat = await creerTache(creerTacheSchema.parse(args), deps);
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
