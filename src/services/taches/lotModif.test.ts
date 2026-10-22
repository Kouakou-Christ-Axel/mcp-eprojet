import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { modifierTaches, modifierTachesSchema } from "./lotModif.js";
import type { Deps } from "./service.js";

const activite = readFileSync("src/utils/__fixtures__/activity-min.html", "utf8");
const edition = readFileSync("src/utils/__fixtures__/edit-min.html", "utf8");

function fake() {
  const posts: URLSearchParams[] = [];
  const deps: Deps = {
    api: async (path, init) => {
      if (init?.method === "POST") {
        posts.push(init.body as URLSearchParams);
        return new Response("", { status: 302 });
      }
      if (/^[/]taches[/][0-9]+$/.test(path)) {
        return new Response("{}", { headers: { "content-type": "application/json" } });
      }
      return new Response(path.startsWith("/taches/useform/") ? edition : activite);
    },
    log: () => {},
  };
  return { deps, posts };
}
const lot = (taches: object[], confirmer = false) =>
  modifierTachesSchema.parse({ taches, confirmer });

test("dry_run : changements par tâche, aucun POST", async () => {
  const { deps, posts } = fake();
  const r = await modifierTaches(lot([{ reference: "PRJ-576-0417", libelle: "Nouveau" }]), deps, 0);
  assert.ok(r.mode === "dry_run");
  assert.equal(r.taches[0]!.libelle, "PRJ-576-0417");
  assert.equal(posts.length, 0);
});

test("une modification invalide (référence inconnue, rien à changer) : lot refusé", async () => {
  const { deps, posts } = fake();
  const r = await modifierTaches(
    lot(
      [
        { reference: "PRJ-576-0417", libelle: "Nouveau" },
        { reference: "XXX", libelle: "a" },
        { reference: "PRJ-576-0417", libelle: "Creation d une tache de test" },
      ],
      true,
    ),
    deps,
    0,
  );
  assert.ok(r.mode === "refusé");
  assert.deepEqual(
    r.erreurs.map((e) => e.index),
    [1, 2],
  );
  assert.equal(posts.length, 0);
});

test("confirmer : un POST updateuser par modification", async () => {
  const { deps, posts } = fake();
  const r = await modifierTaches(
    lot([{ reference: "PRJ-576-0417", libelle: "Nouveau" }], true),
    deps,
    0,
  );
  assert.ok(r.mode === "envoyé");
  assert.equal(posts.length, 1);
  assert.equal(posts[0]!.get("libelle"), "Nouveau");
});
