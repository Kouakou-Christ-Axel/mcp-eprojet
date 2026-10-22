import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { creerTaches, creerTachesSchema } from "./lot.js";
import type { Deps } from "./service.js";

const html = readFileSync("src/utils/__fixtures__/useform-min.html", "utf8");

function fake(statutPost: (n: number) => number = () => 302) {
  const posts: URLSearchParams[] = [];
  const deps: Deps = {
    api: async (path, init) => {
      if (init?.method === "POST") {
        posts.push(init.body as URLSearchParams);
        return new Response("", { status: statutPost(posts.length), headers: { location: "/x" } });
      }
      return new Response(path.startsWith("/taches/useform") ? html : "");
    },
    log: () => {},
  };
  return { deps, posts };
}
const t = (libelle: string, o: object = {}) => ({
  projet: "Alpha",
  libelle,
  nature: "TACHE",
  type_tache: "Test",
  statut: "En cours",
  debut_prev: "2026-03-05",
  fin_prev: "2026-03-05",
  duree_heures: 2,
  ...o,
});
const lot = (taches: object[], confirmer = false) => creerTachesSchema.parse({ taches, confirmer });

test("dry_run : un aperçu par tâche, aucun POST", async () => {
  const { deps, posts } = fake();
  const r = await creerTaches(lot([t("A"), t("B")]), deps, 0);
  assert.ok(r.mode === "dry_run");
  assert.deepEqual(
    r.taches.map((x) => x.libelle),
    ["A", "B"],
  );
  assert.equal(posts.length, 0);
});

test("une tâche invalide : tout le lot est refusé, même avec confirmer", async () => {
  const { deps, posts } = fake();
  const r = await creerTaches(lot([t("A"), t("B", { type_tache: "Inconnu" })], true), deps, 0);
  assert.ok(r.mode === "refusé");
  assert.equal(r.erreurs.length, 1);
  assert.equal(r.erreurs[0]!.index, 1);
  assert.match(r.erreurs[0]!.erreur, /Valeurs permises/);
  assert.equal(posts.length, 0);
});

test("confirmer : un POST par tâche, dans l'ordre", async () => {
  const { deps, posts } = fake();
  const r = await creerTaches(lot([t("A"), t("B")], true), deps, 0);
  assert.ok(r.mode === "envoyé");
  assert.deepEqual(
    posts.map((p) => p.get("libelle")),
    ["A", "B"],
  );
});

test("échec en cours de route : arrêt et liste des tâches déjà créées", async () => {
  const { deps, posts } = fake((n) => (n === 2 ? 500 : 302));
  const r = await creerTaches(lot([t("A"), t("B"), t("C")], true), deps, 0);
  assert.ok(r.mode === "partiel");
  assert.deepEqual(r.crees, ["A"]);
  assert.equal(r.echec.libelle, "B");
  assert.equal(posts.length, 2);
});
