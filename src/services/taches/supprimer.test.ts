import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Deps } from "./service.js";
import { supprimerTache, supprimerTacheSchema } from "./supprimer.js";

const activite = readFileSync("src/utils/__fixtures__/activity-min.html", "utf8");

function fake() {
  const appels: string[] = [];
  const journal: object[] = [];
  let supprime = false;
  const deps: Deps = {
    api: async (path) => {
      appels.push(path);
      if (path.startsWith("/taches/delete/")) {
        supprime = true;
        return new Response("", { status: 302 });
      }
      // Après suppression, la tâche 7811 disparaît de la page.
      return new Response(supprime ? activite.replaceAll("PRJ-576-0417", "PRJ-0") : activite);
    },
    log: (e) => journal.push(e),
  };
  return { deps, appels, journal };
}
const parse = (o: object) => supprimerTacheSchema.parse({ reference: "PRJ-576-0417", ...o });
const suppressions = (a: string[]) => a.filter((p) => p.startsWith("/taches/delete/"));

test("dry_run : montre la tâche et les avertissements, aucune suppression", async () => {
  const { deps, appels, journal } = fake();
  const r = await supprimerTache(parse({}), deps);
  assert.ok(r.mode === "dry_run");
  assert.equal(r.tache.id, "7811");
  assert.match(r.avertissements.join(" "), /définitive/);
  assert.match(r.avertissements.join(" "), /h réelles/);
  assert.equal(suppressions(appels).length, 0);
  assert.equal(journal.length, 0);
});

test("confirmer : GET /taches/delete/{id}, journal, disparition vérifiée", async () => {
  const { deps, appels, journal } = fake();
  const r = await supprimerTache(parse({ confirmer: true }), deps);
  assert.deepEqual(suppressions(appels), ["/taches/delete/7811"]);
  assert.ok(r.mode === "envoyé" && r.verifie === true);
  assert.equal(journal.length, 1);
});

test("référence inconnue : refus sans suppression", async () => {
  const { deps, appels } = fake();
  await assert.rejects(supprimerTache(parse({ reference: "XXX", confirmer: true }), deps), /XXX/);
  assert.equal(suppressions(appels).length, 0);
});
