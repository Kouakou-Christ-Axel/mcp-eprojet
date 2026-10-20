import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { listerTaches } from "./lister.js";
import { listerTachesSchema } from "./listerSchema.js";
import type { Deps } from "./service.js";

const html = readFileSync("src/utils/__fixtures__/activity-min.html", "utf8");
const parse = (o: object) => listerTachesSchema.parse(o);

function fake(historique: unknown = { recordsTotal: 0, recordsFiltered: 0, data: [] }) {
  const urls: string[] = [];
  const deps: Pick<Deps, "api"> = {
    api: async (path) => {
      urls.push(path);
      if (path.startsWith("/timeSheetTacheParJour/tachesTermineesHistorique")) {
        return new Response(JSON.stringify(historique), {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(html);
    },
  };
  return { deps, urls };
}

test("actives par défaut : lit le tableau HTML", async () => {
  const { deps } = fake();
  const r = await listerTaches(parse({}), deps);
  assert.equal(r.total, 2);
  assert.deepEqual(r.taches[0], {
    id: "7811",
    reference: "PRJ-576-0417",
    libelle: "Creation d une tache de test",
    type: "Formation",
    projet: "Actions interne Back end",
    statut: "En cours",
    finPrev: "20/10/2026",
    pourcentageAvanc: "40",
    hPrev: "0.25",
    hReelle: "0.5",
  });
});

test("a_venir vide : total 0", async () => {
  const r = await listerTaches(parse({ categorie: "a_venir" }), fake().deps);
  assert.deepEqual([r.total, r.taches.length], [0, 0]);
});

test("recherche locale sans casse ni accents, limite et début", async () => {
  const { deps } = fake();
  const r = await listerTaches(parse({ recherche: "REVUE" }), deps);
  assert.deepEqual(
    r.taches.map((t) => t.reference),
    ["PRJ-576-0420"],
  );
  const p = await listerTaches(parse({ limite: 1, debut: 1 }), deps);
  assert.equal(p.total, 2);
  assert.deepEqual(
    p.taches.map((t) => t.reference),
    ["PRJ-576-0420"],
  );
});

test("terminees : paramètres DataTables envoyés au serveur et lignes converties", async () => {
  const { deps, urls } = fake({
    recordsTotal: 30,
    recordsFiltered: 12,
    data: [
      {
        reference: "PRJ-1",
        libelle: "Fini",
        typeTacheLibelle: "Test",
        dateFinPrev: "01/09/2026",
        pourcentageAvanc: 100,
        nbHeurePrev: 2,
        nbHeureRelle: 3,
        projetLibelle: "Alpha",
      },
    ],
  });
  const r = await listerTaches(
    parse({ categorie: "terminees", recherche: "fin", limite: 5, debut: 10 }),
    deps,
  );
  const q = new URL(urls[0]!, "http://x").searchParams;
  assert.deepEqual([q.get("start"), q.get("length"), q.get("search[value]")], ["10", "5", "fin"]);
  assert.equal(r.total, 12);
  assert.deepEqual(r.taches[0], {
    reference: "PRJ-1",
    libelle: "Fini",
    type: "Test",
    projet: "Alpha",
    finPrev: "01/09/2026",
    pourcentageAvanc: "100",
    hPrev: "2",
    hReelle: "3",
  });
});

test("limite hors bornes refusée ; terminees en HTML : erreur lisible", async () => {
  assert.throws(() => parse({ limite: 101 }));
  assert.throws(() => parse({ limite: 0 }));
  const deps: Pick<Deps, "api"> = { api: async () => new Response("<html>", { status: 500 }) };
  await assert.rejects(
    listerTaches(parse({ categorie: "terminees" }), deps),
    /réponse inattendue/i,
  );
});

test("rattrapage : lit le tableau des terminées encore modifiables", async () => {
  const r = await listerTaches(parse({ categorie: "rattrapage" }), fake().deps);
  assert.equal(r.total, 1);
  assert.deepEqual(r.taches[0], {
    id: "7700",
    reference: "PRJ-576-0300",
    libelle: "Tache rattrapable",
    type: "Formation",
    projet: "Actions interne Back end",
    statut: "Terminée",
    finPrev: "20/10/2026",
    pourcentageAvanc: "100.00",
    hPrev: "0.25",
    hReelle: "0.25",
  });
});
