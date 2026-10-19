import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { creerTache, type Deps } from "./service.js";
import { creerTacheSchema } from "./schema.js";

const html = readFileSync("src/utils/__fixtures__/useform-min.html", "utf8");
const json = (o: unknown) =>
  new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });

function fake(externes: object[] = [], composants: object[] = []) {
  const appels: { path: string; method: string }[] = [];
  const journal: object[] = [];
  const deps: Deps = {
    api: async (path, init) => {
      appels.push({ path, method: init?.method ?? "GET" });
      if (path.startsWith("/taches/useform")) return new Response(html);
      if (path.startsWith("/PersonneExterne/")) return json(externes);
      if (path.startsWith("/composantProjet/")) return json(composants);
      return new Response("", { status: 302, headers: { location: "/EProjet-1/taches" } });
    },
    log: (e) => journal.push(e),
  };
  return { deps, appels, journal };
}

const base = {
  projet: "Alpha",
  libelle: "T",
  nature: "TACHE",
  type_tache: "Test",
  statut: "En cours",
  debut_prev: "2026-03-05",
  fin_prev: "2026-03-05",
  duree_heures: 2,
};
const post = (a: { path: string; method: string }[]) => a.filter((c) => c.method === "POST");

test("sans confirmer : dry_run, aucun POST ni journal", async () => {
  const { deps, appels, journal } = fake();
  const r = await creerTache(creerTacheSchema.parse(base), deps);
  assert.equal("mode" in r && r.mode, "dry_run");
  assert.equal(post(appels).length, 0);
  assert.equal(journal.length, 0);
});

test("confirmer : un POST vers /taches/createuser et une ligne de journal", async () => {
  const { deps, appels, journal } = fake();
  const r = await creerTache(creerTacheSchema.parse({ ...base, confirmer: true }), deps);
  assert.equal("mode" in r && r.mode, "envoyé");
  assert.deepEqual(
    post(appels).map((c) => c.path),
    ["/taches/createuser"],
  );
  assert.equal(journal.length, 1);
});

test("plusieurs externes correspondants : candidats, aucun POST", async () => {
  const externes = [
    { id: 1, nom: "DUPONT", prenoms: "Alice" },
    { id: 2, nom: "DUPONT", prenoms: "Paul" },
  ];
  const { deps, appels } = fake(externes);
  const r = await creerTache(
    creerTacheSchema.parse({ ...base, responsable_externe: "DUPONT", confirmer: true }),
    deps,
  );
  assert.equal("candidats" in r && r.candidats.length, 2);
  assert.equal(post(appels).length, 0);
});

test("un seul externe : son id est envoyé", async () => {
  const { deps } = fake([{ id: 5, nom: "FOY", prenoms: "Giresse" }]);
  const r = await creerTache(creerTacheSchema.parse({ ...base, responsable_externe: "FOY" }), deps);
  assert.equal("payload" in r && r.payload.responsableExterneId, "5");
});

test("projet inconnu : erreur listant les projets", async () => {
  const { deps } = fake();
  await assert.rejects(
    creerTache(creerTacheSchema.parse({ ...base, projet: "Zéta" }), deps),
    /Alpha/,
  );
});

const anomalie = { ...base, nature: "ANOMALIE", gravite: "MAJEURE" };

test("composant : le libellé du serveur est envoyé, pas la saisie", async () => {
  const { deps } = fake([], [{ libelle: "API" }]);
  const r = await creerTache(creerTacheSchema.parse({ ...anomalie, composant: "api" }), deps);
  assert.equal("payload" in r && r.payload.composant, "API");
});

test("externe : le nom exact départage plusieurs résultats et le nom retenu est renvoyé", async () => {
  const externes = [
    { id: 1, nom: "DUPONT", prenoms: "Alice" },
    { id: 2, nom: "DUPONT", prenoms: "Paul" },
  ];
  const { deps } = fake(externes);
  const r = await creerTache(
    creerTacheSchema.parse({ ...base, responsable_externe: "dupont alice" }),
    deps,
  );
  assert.ok("payload" in r);
  assert.equal(r.payload.responsableExterneId, "1");
  assert.equal(r.externe, "DUPONT Alice");
});

test("envoi : indique que la création n'est pas confirmée et journalise la redirection", async () => {
  const { deps, journal } = fake();
  const r = await creerTache(creerTacheSchema.parse({ ...base, confirmer: true }), deps);
  assert.ok("mode" in r && r.mode === "envoyé");
  assert.equal(r.verifie, false);
  assert.equal(r.location, "/EProjet-1/taches");
  assert.equal(journal.length, 1);
});

test("envoi refusé : journalisé puis erreur", async () => {
  const { deps, journal } = fake();
  const api = deps.api;
  deps.api = async (p, i) => (i?.method === "POST" ? new Response("", { status: 500 }) : api(p, i));
  await assert.rejects(
    creerTache(creerTacheSchema.parse({ ...base, confirmer: true }), deps),
    /500/,
  );
  assert.equal(journal.length, 1);
});

test("un journal en panne ne masque pas un envoi réussi", async () => {
  const { deps } = fake();
  deps.log = () => {
    throw new Error("disque plein");
  };
  const r = await creerTache(creerTacheSchema.parse({ ...base, confirmer: true }), deps);
  assert.ok("mode" in r && r.mode === "envoyé");
});

test("réponse HTML à la place du JSON : erreur lisible", async () => {
  const { deps } = fake();
  const api = deps.api;
  deps.api = async (p, i) =>
    p.startsWith("/PersonneExterne/") ? new Response("<html>", { status: 500 }) : api(p, i);
  await assert.rejects(
    creerTache(creerTacheSchema.parse({ ...base, responsable_externe: "X" }), deps),
    /réponse inattendue/i,
  );
});

test("formulaire sans personneId (page inattendue) : erreur explicite", async () => {
  const { deps } = fake();
  deps.api = async () => new Response("<html><body>Accès refusé</body></html>");
  await assert.rejects(creerTache(creerTacheSchema.parse(base), deps), /personneId|formulaire/i);
});
