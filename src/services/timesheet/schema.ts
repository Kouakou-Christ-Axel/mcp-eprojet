import { z } from "zod";
import { isoVersFr } from "../../utils/dates.js";

const tacheSchema = z.object({
  reference: z.string().min(1).describe("Référence de la tâche, ex. PRJ-576-0417"),
  heures: z.number().min(0).max(24).multipleOf(0.25).describe("Heures travaillées ce jour-là"),
  statut: z.string().min(1).describe("Libellé du statut (ex. En cours, Terminée)"),
  pourcentage: z.number().min(0).max(100).describe("% d'avancement ; 100 <=> statut Terminée"),
  commentaire: z.string().optional(),
});

export const saisirTimesheetShape = {
  date: z.string().optional().describe("AAAA-MM-JJ ; aujourd'hui par défaut (8 derniers jours)"),
  taches: z.array(tacheSchema).min(1),
  confirmer: z.boolean().default(false).describe("false = dry_run ; true = enregistre vraiment"),
};

export const saisirTimesheetSchema = z.object(saisirTimesheetShape).superRefine((v, ctx) => {
  const erreur = (message: string) => ctx.addIssue({ code: "custom", message });
  const vues = new Set<string>();
  for (const t of v.taches) {
    if (vues.has(t.reference)) erreur(`Tâche ${t.reference} citée plusieurs fois`);
    vues.add(t.reference);
  }
  if (v.date) {
    try {
      isoVersFr(v.date);
    } catch (e) {
      erreur((e as Error).message);
    }
  }
});

export type SaisirTimesheetInput = z.infer<typeof saisirTimesheetSchema>;
export type TacheSaisie = SaisirTimesheetInput["taches"][number];
