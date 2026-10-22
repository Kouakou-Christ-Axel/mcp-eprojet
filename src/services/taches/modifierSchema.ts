import { z } from "zod";
import { DUREE_AIDE } from "../../utils/duree.js";
import { GRAVITES, NATURES } from "./schema.js";

const iso = z.string().describe("Date ISO AAAA-MM-JJ");

const objet = z.object({
  reference: z.string().min(1).describe("Référence de la tâche à modifier (ex. PRJ-576-0418)"),
  libelle: z.string().min(1).max(255).optional(),
  nature: z.enum(NATURES).optional(),
  gravite: z.enum(GRAVITES).optional(),
  composant: z.string().optional().describe("Anomalie uniquement ; libellé du composant"),
  type_tache: z.string().min(1).optional().describe("Libellé du type de tâche"),
  statut: z.string().min(1).optional().describe("A Faire, En cours, Bloqué ou Prêt pour QA"),
  tache_interne: z.boolean().optional(),
  responsable_externe: z.string().optional().describe("Nom (recherché dans le projet)"),
  debut_prev: iso.optional(),
  fin_prev: iso.optional(),
  duree_heures: z.number().optional().describe(DUREE_AIDE),
  commentaire: z.string().optional(),
  confirmer: z.boolean().default(false).describe("false = dry_run ; true = envoie vraiment"),
});

export const modifierTacheShape = objet.shape;

export const modifierTacheSchema = objet.refine(
  (v) =>
    Object.entries(v).some(([k, x]) => x !== undefined && k !== "reference" && k !== "confirmer"),
  { message: "Aucune modification demandée : préciser au moins un champ à changer" },
);

export type ModifierTacheInput = z.infer<typeof modifierTacheSchema>;
