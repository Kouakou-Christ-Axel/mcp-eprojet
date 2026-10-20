import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { saisirTimesheet, type DepsTs } from "./service.js";
import { saisirTimesheetSchema } from "./schema.js";

const html = readFileSync("src/utils/__fixtures__/timesheet-jour.html", "utf8");

interface Options {
  apresPost?: (h: string) => string;
  statutPost?: (n: number) => number;
}
function fake({ apresPost = (h) => h, statutPost = () => 302 }: Options = {}) {
  const appels: { path: string; method: string; body?: URLSearchParams | undefined }[] = [];
  const journal: object[] = [];
  let posts = 0;
  const deps: DepsTs = {
    api: async (path, init) => {
      const method = init?.method ?? "GET";
      appels.push({ path, method, body: init?.body as URLSearchParams | undefined });
      if (method === "POST") return new Response("", { status: statutPost(++posts) });
      return new Response(posts > 0 ? apresPost(html) : html);
    },
    log: (e) => journal.push(e),
    aujourdhui: () => "2026-10-20",
  };
  return { deps, appels, journal };
}
const t0 = { reference: "PRJ-576-0417", heures: 2, statut: "En cours", pourcentage: 60 };
const parse = (o: object) => saisirTimesheetSchema.parse(o);
const posts = <T extends { method: string }>(a: T[]) => a.filter((c) => c.method === "POST");

test("dry_run : aucun POST, modifications et avertissements, jour par défaut = aujourd'hui", async () => {
  const { deps, appels } = fake();
  const r = await saisirTimesheet(parse({ taches: [t0] }), deps);
  assert.ok("mode" in r && r.mode === "dry_run");
  assert.equal(posts(appels).length, 0);
  assert.ok(appels.some((a) => a.path === "/timeSheetTacheParJour/activityByDay/399"));
  assert.deepEqual(r.modifications, [
    { reference: "PRJ-576-0417", heures: 2, statut: "En cours", pourcentage: 60 },
  ]);
});

test("date explicite : charge le bon jour ; hors des jours proposés : erreur listant les dates", async () => {
  const { deps, appels } = fake();
  await saisirTimesheet(parse({ date: "2026-10-19", taches: [t0] }), deps);
  assert.ok(appels.some((a) => a.path === "/timeSheetTacheParJour/activityByDay/398"));
  await assert.rejects(
    saisirTimesheet(parse({ date: "2026-09-01", taches: [t0] }), deps),
    /Mardi 20-10-2026/,
  );
});

test("refus : référence inconnue, statut inconnu, incohérence Terminée / 100 %", async () => {
  const { deps, appels } = fake();
  await assert.rejects(
    saisirTimesheet(parse({ taches: [{ ...t0, reference: "XXX" }] }), deps),
    /XXX/,
  );
  await assert.rejects(
    saisirTimesheet(parse({ taches: [{ ...t0, statut: "Fini" }] }), deps),
    /En cours/,
  );
  await assert.rejects(
    saisirTimesheet(parse({ taches: [{ ...t0, statut: "Terminée", pourcentage: 90 }] }), deps),
    /100/,
  );
  assert.equal(posts(appels).length, 0);
});

test("confirmer : un POST du formulaire Actives, toutes les lignes, seule la tâche citée change", async () => {
  const { deps, appels, journal } = fake({
    apresPost: (h) =>
      h
        .replace(/(listTaches\[0\]\.nbHeureTravaille"\s+value=")"/, "$1" + '2"')
        .replace(/(listTaches\[0\]\.pourcentageAvanc"\s+value=")40"/, "$1" + '60"'),
  });
  const r = await saisirTimesheet(
    parse({ taches: [{ ...t0, commentaire: "ok" }], confirmer: true }),
    deps,
  );
  const [p] = posts(appels);
  assert.equal(posts(appels).length, 1);
  assert.equal(p!.path, "/timeSheetTacheParJour/TimeSheetTacheActivitySaveUpdate");
  assert.equal(p!.body!.get("listTaches[0].nbHeureTravaille"), "2");
  assert.equal(p!.body!.get("listTaches[0].pourcentageAvanc"), "60");
  assert.equal(p!.body!.get("listTaches[0].statutTacheId"), "-3");
  assert.equal(p!.body!.get("listTaches[0].commentaire"), "ok");
  assert.equal(p!.body!.get("listTaches[1].nbHeureTravaille"), "1.5");
  assert.equal(p!.body!.get("listTaches[1].statutTacheId"), "-1");
  assert.ok("mode" in r && r.mode === "envoyé" && r.verifie === true);
  assert.equal(journal.length, 1);
});

test("relecture qui ne correspond pas : verifie false avec les écarts", async () => {
  const { deps } = fake();
  const r = await saisirTimesheet(parse({ taches: [t0], confirmer: true }), deps);
  assert.ok("mode" in r && r.mode === "envoyé" && r.verifie === false);
  assert.ok(r.ecarts.length > 0);
});

test("deux formulaires : Actives puis À venir ; au premier échec, arrêt et rapport", async () => {
  const deux = [t0, { reference: "PRJ-576-0500", heures: 1, statut: "En cours", pourcentage: 10 }];
  const ok = fake();
  await saisirTimesheet(parse({ taches: deux, confirmer: true }), ok.deps);
  assert.equal(posts(ok.appels).length, 2);
  const ko = fake({ statutPost: () => 500 });
  await assert.rejects(
    saisirTimesheet(parse({ taches: deux, confirmer: true }), ko.deps),
    /500.*tabActivityStarted|tabActivityStarted.*500/s,
  );
  assert.equal(posts(ko.appels).length, 1);
  assert.equal(ko.journal.length, 1);
});

test("un journal en panne ne masque pas un envoi réussi", async () => {
  const { deps } = fake();
  deps.log = () => {
    throw new Error("disque plein");
  };
  const r = await saisirTimesheet(parse({ taches: [t0], confirmer: true }), deps);
  assert.ok("mode" in r && r.mode === "envoyé");
});
