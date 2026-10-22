interface Erreur {
  index: number;
  libelle: string;
  erreur: string;
}
export type ResultatLot<R> =
  | { mode: "dry_run"; taches: { libelle: string; resultat: R }[] }
  | { mode: "refusé"; erreurs: Erreur[] }
  | { mode: "envoyé"; taches: { libelle: string; resultat: R }[] }
  | { mode: "partiel"; crees: string[]; echec: Erreur };

interface Options<T, R> {
  libelle: (t: T) => string;
  apercu: (t: T) => Promise<R>; // valide et prépare sans rien envoyer ; lève une erreur si invalide
  envoyer: (t: T) => Promise<R>;
  confirmer: boolean;
  pauseMs?: number;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Un seul dry-run puis une seule confirmation pour tout le lot. Tout est validé avant d'envoyer
// quoi que ce soit ; l'envoi est séquentiel, avec une pause, et s'arrête à la première erreur.
export async function traiterLot<T, R>(items: T[], o: Options<T, R>): Promise<ResultatLot<R>> {
  const erreurs: Erreur[] = [];
  const apercus: { libelle: string; resultat: R }[] = [];
  for (const [index, t] of items.entries()) {
    try {
      apercus.push({ libelle: o.libelle(t), resultat: await o.apercu(t) });
    } catch (e) {
      erreurs.push({ index, libelle: o.libelle(t), erreur: message(e) });
    }
  }
  if (erreurs.length > 0) return { mode: "refusé", erreurs };
  if (!o.confirmer) return { mode: "dry_run", taches: apercus };

  const envoyees: { libelle: string; resultat: R }[] = [];
  for (const [index, t] of items.entries()) {
    if (index > 0) await attendre(o.pauseMs ?? 500);
    try {
      envoyees.push({ libelle: o.libelle(t), resultat: await o.envoyer(t) });
    } catch (e) {
      const echec = { index, libelle: o.libelle(t), erreur: message(e) };
      return { mode: "partiel", crees: envoyees.map((x) => x.libelle), echec };
    }
  }
  return { mode: "envoyé", taches: envoyees };
}
