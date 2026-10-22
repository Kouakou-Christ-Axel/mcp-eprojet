import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { modifierTache } from "./modifier.js";
import { modifierTacheSchema } from "./modifierSchema.js";
import type { Deps } from "./service.js";

const activite = readFileSync("src/utils/__fixtures__/activity-min.html", "utf8");
const edition = readFileSync("src/utils/__fixtures__/edit-min.html", "utf8");

const detail = { responsableExterneId: null, composant: null } as Record<string, unknown>;

function fake(apresPost: (h: string) => string = (h) => h) {
  const appels: { path: string; method: string; body?: URLSearchParams | undefined }[] = [];
  const journal: object[] = [];
  let posts = 0;
  const deps: Deps = {
    api: async (path, init) => {
      const method = init?.method ?? "GET";
      appels.push({ path, method, body: init?.body as URLSearchParams | undefined });
      if (method === "POST") {
        posts++;
        return new Response("", { status: 302 });
      }
      if (/^[/]taches[/][0-9]+$/.test(path)) {
        return new Response(JSON.stringify(detail), {
          headers: { "content-type": "application/json" },
        });
      }
      if (path.startsWith("/taches/useform/")) {
        return new Response(posts > 0 ? apresPost(edition) : edition);
      }
      return new Response(activite);
    },
    log: (e) => journal.push(e),
  };
  return { deps, appels, journal };
}
const parse = (o: object) => modifierTacheSchema.parse({ reference: "PRJ-576-0417", ...o });
const posts = <T extends { method: string }>(a: T[]) => a.filter((c) => c.method === "POST");

test("le schéma exige au moins un champ à modifier", () => {
  assert.throws(() => modifierTacheSchema.parse({ reference: "PRJ-1" }), /Aucune modification/);
  assert.doesNotThrow(() => modifierTacheSchema.parse({ reference: "PRJ-1", libelle: "x" }));
});

test("dry_run : changements avant/après, aucun POST", async () => {
  const { deps, appels, journal } = fake();
  const r = await modifierTache(parse({ libelle: "Nouveau", commentaire: "ok" }), deps);
  assert.ok("mode" in r && r.mode === "dry_run");
  assert.deepEqual(r.changements, {
    libelle: { avant: "Creation d une tache de test", apres: "Nouveau" },
    commentaire: { avant: "ancien", apres: "ok" },
  });
  assert.equal(posts(appels).length, 0);
  assert.equal(journal.length, 0);
  assert.ok(appels.some((a) => a.path === "/taches/useform/7811"));
});

test("confirmer : POST updateuser avec les champs préremplis conservés, sans champs désactivés", async () => {
  const { deps, appels, journal } = fake((h) =>
    h.replace('value="Creation d une tache de test"', 'value="Nouveau"'),
  );
  const r = await modifierTache(parse({ libelle: "Nouveau", confirmer: true }), deps);
  const [p] = posts(appels);
  assert.equal(p!.path, "/taches/updateuser");
  assert.equal(p!.body!.get("id"), "7811");
  assert.equal(p!.body!.getAll("id").length, 1);
  assert.equal(p!.body!.get("ordre"), "25919");
  assert.equal(p!.body!.get("reference"), "PRJ-576-0417");
  assert.equal(p!.body!.get("pourcentageAvanc"), "40");
  assert.equal(p!.body!.get("tacheInterne"), "true");
  assert.equal(p!.body!.get("libelle"), "Nouveau");
  assert.equal(p!.body!.has("jalonId"), false);
  assert.equal(p!.body!.has("superviseurInterneId"), false);
  assert.ok("mode" in r && r.mode === "envoyé" && r.verifie === true);
  assert.equal(journal.length, 1);
});

test("relecture divergente : verifie false avec les écarts", async () => {
  const { deps } = fake();
  const r = await modifierTache(parse({ libelle: "Nouveau", confirmer: true }), deps);
  assert.ok("mode" in r && r.mode === "envoyé" && r.verifie === false);
  assert.match(r.ecarts.join(" "), /libelle/);
});

test("durée et dates : jours/heures recalculés, période contrôlée", async () => {
  const { deps } = fake();
  const r = await modifierTache(parse({ duree_heures: 4, fin_prev: "2026-10-22" }), deps);
  assert.ok("mode" in r && r.mode === "dry_run");
  assert.deepEqual(r.changements, {
    dateFinPrev: { avant: "20/10/2026", apres: "22/10/2026" },
    nbJourPrev: { avant: "0.25", apres: "0.5" },
    nbHeurePrev: { avant: "2.0", apres: "4" },
  });
  await assert.rejects(modifierTache(parse({ fin_prev: "2026-10-19" }), deps), /précède/);
});

test("libellés résolus ; statut inconnu ou tâche à 100 % refusés ; rien à changer refusé", async () => {
  const { deps } = fake();
  const r = await modifierTache(parse({ type_tache: "test", statut: "A Faire" }), deps);
  assert.ok("mode" in r);
  assert.deepEqual(Object.keys(r.changements).sort(), ["statutTacheId", "typeTacheId"]);
  await assert.rejects(modifierTache(parse({ statut: "Fini" }), deps), /En cours/);
  await assert.rejects(
    modifierTache(parse({ libelle: "Creation d une tache de test" }), deps),
    /Rien à modifier/,
  );
  await assert.rejects(modifierTache(parse({ reference: "XXX", libelle: "a" }), deps), /XXX/);
  const centPourcent = fake();
  const sur100 = centPourcent.deps.api;
  centPourcent.deps.api = async (p, i) => {
    const res = await sur100(p, i);
    return p.startsWith("/taches/useform/")
      ? new Response((await res.text()).replace('value="40"', 'value="100.00"'))
      : res;
  };
  await assert.rejects(modifierTache(parse({ statut: "En cours" }), centPourcent.deps), /100 %/);
});

test("responsable externe et composant actuels relus et renvoyés (jamais effacés)", async () => {
  Object.assign(detail, { responsableExterneId: 12, composant: "Front" });
  try {
    const { deps, appels } = fake();
    const r = await modifierTache(parse({ libelle: "Nouveau", confirmer: true }), deps);
    const body = posts(appels)[0]!.body!;
    assert.equal(body.get("responsableExterneId"), "12");
    assert.equal(body.get("composant"), "Front");
    assert.ok("mode" in r && r.changements.responsableExterneId === undefined);
  } finally {
    Object.assign(detail, { responsableExterneId: null, composant: null });
  }
});

test("jours_prev seul : seul nbJourPrev change ; avec duree_heures : valeurs indépendantes", async () => {
  const { deps } = fake();
  const seul = await modifierTache(parse({ jours_prev: 1 }), deps);
  assert.ok("mode" in seul);
  assert.deepEqual(Object.keys(seul.changements), ["nbJourPrev"]);
  const deux = await modifierTache(parse({ duree_heures: 0.75, jours_prev: 1 }), deps);
  assert.ok("mode" in deux);
  assert.equal(deux.changements.nbJourPrev?.apres, "1");
  assert.equal(deux.changements.nbHeurePrev?.apres, "0.75");
});
