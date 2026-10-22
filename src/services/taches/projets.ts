import { z } from "zod";
import { lireFormulaire, normaliser, type Option } from "../../utils/parse.js";
import { chercherExterne, type Candidat } from "./lookups.js";
import type { Deps } from "./service.js";

export const listerProjetsShape = {
  projet: z
    .string()
    .optional()
    .describe("Projet (id, libellé ou « Client | Projet ») dont on veut les responsables externes"),
  recherche: z.string().optional().describe("Filtre sur nom/prénoms des responsables externes"),
  limite: z.number().int().min(1).max(100).default(20).describe("Responsables externes renvoyés"),
};
export const listerProjetsSchema = z.object(listerProjetsShape);
export type ListerProjetsInput = z.infer<typeof listerProjetsSchema>;

export interface Projet {
  id: string;
  client: string;
  libelle: string;
}
export type ResultatProjets =
  { projets: Projet[] } | { projet: Projet; total: number; externes: Candidat[] };

// Option "Client | Projet" du select projetId de /taches/useform.
export const versProjet = (o: Option): Projet => {
  const [client, ...reste] = o.libelle.split(" | ");
  return reste.length
    ? { id: o.valeur, client: client!, libelle: reste.join(" | ") }
    : { id: o.valeur, client: "", libelle: o.libelle };
};

export function choisir(projets: Projet[], saisi: string): Projet {
  const n = normaliser(saisi);
  const exacts = projets.filter((p) =>
    [p.id, p.libelle, `${p.client} | ${p.libelle}`].some((v) => normaliser(v) === n),
  );
  const trouves = exacts.length
    ? exacts
    : projets.filter((p) => normaliser(`${p.client} | ${p.libelle}`).includes(n));
  if (trouves.length === 1) return trouves[0]!;
  const dispo = (trouves.length ? trouves : projets).map(
    (p) => `${p.id} = ${p.client} | ${p.libelle}`,
  );
  throw new Error(
    `${trouves.length ? "Plusieurs projets correspondent" : "Projet inconnu"} pour "${saisi}". Choix : ${dispo.join(" ; ")}`,
  );
}

// Lecture seule. Les responsables externes dépendent du client du projet (pas du projet seul).
export async function listerProjets(
  input: ListerProjetsInput,
  deps: Pick<Deps, "api">,
): Promise<ResultatProjets> {
  const html = await (await deps.api("/taches/useform")).text();
  const projets = (lireFormulaire(html).options["projetId"] ?? []).map(versProjet);
  if (!input.projet) return { projets };
  const projet = choisir(projets, input.projet);
  const tous = await chercherExterne(deps.api, projet.id, input.recherche ?? "");
  return { projet, total: tous.length, externes: tous.slice(0, input.limite) };
}
