import { z } from "zod";
import { dureeVersJoursHeures } from "../../utils/duree.js";
import { verifierPeriode } from "../../utils/dates.js";

export const NATURES = ["TACHE", "ANOMALIE", "EVOLUTION"] as const;
export const GRAVITES = ["BLOQUANTE", "MAJEURE", "MINEURE", "COSMETIQUE"] as const;

const iso = z.string().describe("Date ISO AAAA-MM-JJ");

const objet = z.object({
  projet: z.string().min(1).describe("Nom du projet"),
  libelle: z.string().min(1).max(255),
  nature: z.enum(NATURES),
  gravite: z.enum(GRAVITES).optional().describe("Obligatoire si nature = ANOMALIE"),
  composant: z.string().optional().describe("Anomalie uniquement ; libellé du composant"),
  type_tache: z.string().min(1).describe("Libellé du type de tâche"),
  statut: z.string().min(1).describe("Libellé du statut (ex. A Faire, En cours)"),
  tache_interne: z.boolean().default(true),
  responsable_externe: z.string().optional().describe("Nom (recherché dans le projet)"),
  debut_prev: iso,
  fin_prev: iso,
  duree_heures: z.number().describe("Heures décimales (1.5 = 1 h 30), pas de 0.25, max 300"),
  commentaire: z.string().optional(),
  confirmer: z.boolean().default(false).describe("false = dry_run ; true = envoie vraiment"),
});

export const creerTacheShape = objet.shape;

export const creerTacheSchema = objet.superRefine((v, ctx) => {
  const erreur = (message: string) => ctx.addIssue({ code: "custom", message });
  if (v.nature === "ANOMALIE" && !v.gravite) erreur("La gravité est obligatoire pour une anomalie");
  try {
    verifierPeriode(v.debut_prev, v.fin_prev);
    dureeVersJoursHeures(v.duree_heures);
  } catch (e) {
    erreur((e as Error).message);
  }
});

export type CreerTacheInput = z.infer<typeof creerTacheSchema>;
