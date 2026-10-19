import type { api as apiReelle } from "../../client/http.js";

type Api = typeof apiReelle;

export interface Candidat {
  id: string;
  nom: string;
}

const chemin = (base: string, terme: string) => `${base}${terme ? encodeURIComponent(terme) : "*"}`;

async function lireJson<T>(res: Response, quoi: string): Promise<T> {
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("json")) {
    throw new Error(`Réponse inattendue d'E-Projet pour ${quoi} (HTTP ${res.status})`);
  }
  return (await res.json()) as T;
}

// GET /PersonneExterne/search/byProjet/tachesUser/{projetId}/{terme|*} -> [{id, nom, prenoms}]
export async function chercherExterne(
  api: Api,
  projetId: string,
  terme: string,
): Promise<Candidat[]> {
  const res = await api(chemin(`/PersonneExterne/search/byProjet/tachesUser/${projetId}/`, terme));
  const data = await lireJson<{ id: number | string; nom?: string; prenoms?: string }[]>(
    res,
    "la recherche de responsable externe",
  );
  return data.map((p) => ({ id: String(p.id), nom: `${p.nom ?? ""} ${p.prenoms ?? ""}`.trim() }));
}

// GET /composantProjet/search/byProjet/{projetId}/{terme|*} -> [{libelle}] ; la valeur envoyée est le libellé.
export async function chercherComposant(
  api: Api,
  projetId: string,
  terme: string,
): Promise<string[]> {
  const res = await api(chemin(`/composantProjet/search/byProjet/${projetId}/`, terme));
  const data = await lireJson<{ libelle: string }[]>(res, "la recherche de composant");
  return data.map((c) => c.libelle);
}
