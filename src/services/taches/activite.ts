import * as cheerio from "cheerio";

export interface TacheResume {
  id?: string;
  reference: string;
  libelle: string;
  type: string;
  projet: string;
  statut?: string;
  finPrev: string;
  pourcentageAvanc: string;
  hPrev: string;
  hReelle: string;
}

const DATE = /\d{2}\/\d{2}\/\d{4}/;

// Lit un tableau de la page Activité (id : tabActivityStarted | tabActivityAvenir).
// Sélecteurs isolés ici : champs nommés listTaches[i].*, plutôt que la position des colonnes.
export function lireTableauActivite(html: string, tableId: string): TacheResume[] {
  const $ = cheerio.load(html);
  const taches: TacheResume[] = [];
  $(`#${tableId} tbody tr`).each((_, tr) => {
    const $tr = $(tr);
    const champ = (nom: string) => $tr.find(`[name$=".${nom}"]`).first().attr("value") ?? "";
    const reference = champ("reference");
    if (!reference) return;
    taches.push({
      id: champ("id"),
      reference,
      libelle: champ("libelle"),
      type: champ("typeTacheLibelle"),
      projet: champ("projetLibelle"),
      statut: $tr.find('select[name$=".statutTacheId"] option[selected]').text().trim(),
      finPrev: DATE.exec($tr.find("td").eq(3).text())?.[0] ?? "",
      pourcentageAvanc: champ("pourcentageAvanc"),
      hPrev: $tr.find("td.ts-cell-hprev").text().trim(),
      hReelle: $tr.find("td.ts-cell-hreelle").text().trim(),
    });
  });
  return taches;
}
