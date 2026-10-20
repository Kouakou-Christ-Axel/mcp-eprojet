import type { api as apiReelle } from "../../client/http.js";
import { journaliser } from "../../utils/actionsLog.js";
import { lireFormulaire, normaliser, resoudreOption } from "../../utils/parse.js";
import { chercherComposant, chercherExterne, type Candidat } from "./lookups.js";
import { construirePayload } from "./payload.js";
import type { CreerTacheInput } from "./schema.js";

export interface Deps {
  api: typeof apiReelle;
  log: (entree: object) => void;
}

export type Resultat =
  | { mode: "dry_run"; payload: Record<string, string>; externe?: string }
  | {
      mode: "envoyé";
      payload: Record<string, string>;
      externe?: string;
      statut: number;
      location: string | null;
      verifie: false; // non vérifié : aucune relecture de la tâche créée n'est encore possible
    }
  | { candidats: Candidat[] };

// Libellé exact du serveur (casse/accents) : c'est lui qui est envoyé.
async function resoudreComposant(deps: Deps, projetId: string, saisi: string): Promise<string> {
  const libelles = await chercherComposant(deps.api, projetId, saisi);
  const trouve = libelles.find((l) => normaliser(l) === normaliser(saisi));
  if (trouve) return trouve;
  throw new Error(`Composant "${saisi}" inconnu. Disponibles : ${libelles.join(", ") || "aucun"}`);
}

// Un seul résultat, ou le nom exact parmi plusieurs ; sinon les candidats sont renvoyés.
async function resoudreExterne(deps: Deps, projetId: string, nom: string): Promise<Candidat[]> {
  const trouves = await chercherExterne(deps.api, projetId, nom);
  if (trouves.length === 0) throw new Error(`Aucun responsable externe "${nom}" dans ce projet`);
  const exacts = trouves.filter((c) => normaliser(c.nom) === normaliser(nom));
  return trouves.length > 1 && exacts.length === 1 ? exacts : trouves;
}

export async function creerTache(input: CreerTacheInput, deps: Deps): Promise<Resultat> {
  const form = lireFormulaire(await (await deps.api("/taches/useform")).text());
  if (!form.caches.personneId) {
    throw new Error("Formulaire E-Projet inattendu (personneId absent) : page ou session invalide");
  }
  const projetId = resoudreOption(form.options, "projetId", input.projet);
  let saisie = input;
  if (input.nature === "ANOMALIE" && input.composant) {
    saisie = { ...input, composant: await resoudreComposant(deps, projetId, input.composant) };
  }
  let externe: Candidat | undefined;
  if (input.responsable_externe) {
    const trouves = await resoudreExterne(deps, projetId, input.responsable_externe);
    if (trouves.length > 1) return { candidats: trouves };
    externe = trouves[0];
  }
  const payload = construirePayload(saisie, form, externe?.id, projetId);
  const brut = Object.fromEntries(payload);
  const nomExterne = externe ? { externe: externe.nom } : {};
  if (!input.confirmer) return { mode: "dry_run", payload: brut, ...nomExterne };

  // non vérifié : POST réel (réponse succès/erreur à confirmer avec un vrai projet).
  const res = await deps.api("/taches/createuser", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  });
  const location = res.headers.get("location");
  journaliser(deps.log, { outil: "creer_tache", statut: res.status, location, payload: brut });
  if (res.status >= 400) throw new Error(`E-Projet a refusé la tâche (HTTP ${res.status})`);
  return {
    mode: "envoyé",
    payload: brut,
    ...nomExterne,
    statut: res.status,
    location,
    verifie: false,
  };
}
