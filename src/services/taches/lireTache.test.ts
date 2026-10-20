import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lireTache } from "./lireTache.js";

const activite = readFileSync("src/utils/__fixtures__/activity-min.html", "utf8");
const edition = readFileSync("src/utils/__fixtures__/edit-min.html", "utf8");
const appels: { path: string; method?: string | undefined }[] = [];
const deps = {
  api: async (path: string, init?: RequestInit) => {
    appels.push({ path, method: init?.method });
    return new Response(path.startsWith("/taches/useform/") ? edition : activite);
  },
};

test("détail : champs du formulaire d'édition + heures réelles, GET uniquement", async () => {
  const t = await lireTache({ reference: "PRJ-576-0417" }, deps);
  assert.equal(t.reference, "PRJ-576-0417");
  assert.equal(t.libelle.length > 0, true);
  assert.match(t.debut_prev, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(typeof t.pourcentage, "number");
  assert.equal(t.heures_reelles, "0.5");
  assert.deepEqual(appels.map((a) => a.path).slice(-1), ["/taches/useform/7811"]);
  assert.equal(
    appels.every((a) => !a.method || a.method === "GET"),
    true,
  );
});

test("référence inconnue : erreur claire", async () => {
  await assert.rejects(lireTache({ reference: "XXX" }, deps), /XXX/);
});
