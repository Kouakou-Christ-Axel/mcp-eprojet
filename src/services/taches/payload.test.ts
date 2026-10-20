import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lireFormulaire } from "../../utils/parse.js";
import { construirePayload } from "./payload.js";
import { creerTacheSchema } from "./schema.js";

const form = lireFormulaire(readFileSync("src/utils/__fixtures__/useform-min.html", "utf8"));
const base = {
  projet: "Alpha",
  libelle: "Corriger le bug",
  nature: "TACHE",
  type_tache: "Test",
  statut: "En cours",
  debut_prev: "2026-03-05",
  fin_prev: "2026-03-06",
  duree_heures: 3,
};

test("payload complet pour une tâche", () => {
  const p = construirePayload(creerTacheSchema.parse(base), form, "7", "9");
  const o = Object.fromEntries(p);
  assert.equal(o.projetId, "9");
  assert.equal(o.libelle, "Corriger le bug");
  assert.equal(o.natureTache, "TACHE");
  assert.equal(o.typeTacheId, "-5");
  assert.equal(o.statutTacheId, "-3");
  assert.equal(o.tacheInterne, "true");
  assert.equal(o.dateDebutPrev, "05/03/2026");
  assert.equal(o.dateFinPrev, "06/03/2026");
  assert.equal(o.nbHeurePrev, "3");
  assert.equal(o.nbJourPrev, "0.5");
  assert.equal(o.responsableInterneId, "22");
  assert.equal(o.responsableExterneId, "7");
});

test("champs jamais saisis envoyés vides ; gravité/composant absents hors anomalie", () => {
  const p = construirePayload(
    creerTacheSchema.parse({ ...base, gravite: "MAJEURE", composant: "X" }),
    form,
    undefined,
    "9",
  );
  for (const k of [
    "pourcentageAvanc",
    "jalonId",
    "tacheParentId",
    "superviseurInterneId",
    "superviseurExterneId",
    "ordre",
    "reference",
  ]) {
    assert.equal(p.get(k), "", k);
  }
  assert.equal(p.has("gravite"), false);
  assert.equal(p.has("composant"), false);
  assert.equal(p.get("responsableExterneId"), "");
});

test("anomalie : gravité et composant envoyés", () => {
  const p = construirePayload(
    creerTacheSchema.parse({ ...base, nature: "ANOMALIE", gravite: "MAJEURE", composant: "API" }),
    form,
    undefined,
    "9",
  );
  assert.equal(p.get("gravite"), "MAJEURE");
  assert.equal(p.get("composant"), "API");
});

test("le schéma refuse une anomalie sans gravité et une fin avant le début", () => {
  assert.throws(() => creerTacheSchema.parse({ ...base, nature: "ANOMALIE" }), /gravit/i);
  assert.throws(() => creerTacheSchema.parse({ ...base, fin_prev: "2026-03-01" }), /fin/i);
  assert.throws(() => creerTacheSchema.parse({ ...base, duree_heures: 2.1 }), /durée/i);
});
