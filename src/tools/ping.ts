import * as cheerio from "cheerio";
import { z } from "zod";
import { api } from "../client/http.js";

export const pingShape = {
  chemin: z.string().default("/").describe("Chemin relatif à la base E-Projet, ex. /"),
};

// Outil de validation login/session/parsing : renvoie statut + <title> de la page.
export async function ping({ chemin }: { chemin: string }) {
  const res = await api(chemin);
  const title = cheerio
    .load(await res.text())("title")
    .text()
    .trim();
  return {
    content: [
      { type: "text" as const, text: `HTTP ${res.status} — titre : ${title || "(aucun)"}` },
    ],
  };
}
