import { z } from "zod";

export const CATEGORIES = ["actives", "a_venir", "terminees"] as const;

export const listerTachesShape = {
  categorie: z
    .enum(CATEGORIES)
    .default("actives")
    .describe("actives, a_venir ou terminees (historique)"),
  recherche: z.string().optional().describe("Mot-clé (référence, libellé, projet)"),
  limite: z.number().int().min(1).max(100).default(20),
  debut: z.number().int().min(0).default(0).describe("Position de départ, pour la page suivante"),
};

export const listerTachesSchema = z.object(listerTachesShape);
export type ListerTachesInput = z.infer<typeof listerTachesSchema>;
