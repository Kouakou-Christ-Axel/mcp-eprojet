import assert from "node:assert/strict";
import { test } from "node:test";
import { dureeVersJoursHeures } from "./duree.js";

test("convertit les heures en jours, arrondis au quart de jour supérieur", () => {
  assert.deepEqual(dureeVersJoursHeures(0.5), { nbHeurePrev: 0.5, nbJourPrev: 0.25 });
  assert.deepEqual(dureeVersJoursHeures(2), { nbHeurePrev: 2, nbJourPrev: 0.25 });
  assert.deepEqual(dureeVersJoursHeures(3), { nbHeurePrev: 3, nbJourPrev: 0.5 });
  assert.deepEqual(dureeVersJoursHeures(8), { nbHeurePrev: 8, nbJourPrev: 1 });
  assert.deepEqual(dureeVersJoursHeures(300), { nbHeurePrev: 300, nbJourPrev: 37.5 });
});

test("refuse une durée hors règle", () => {
  for (const h of [0, 0.3, 2.1, 301, -1, Number.NaN]) {
    assert.throws(() => dureeVersJoursHeures(h), /durée/i, `h=${h}`);
  }
});

test("Jour prév indépendant : valeur donnée prioritaire, validée par pas de 0,25", () => {
  assert.deepEqual(dureeVersJoursHeures(0.75, 1), { nbHeurePrev: 0.75, nbJourPrev: 1 });
  assert.deepEqual(dureeVersJoursHeures(8, 0.5), { nbHeurePrev: 8, nbJourPrev: 0.5 });
  for (const j of [0, 0.1, 0.3, 301]) {
    assert.throws(() => dureeVersJoursHeures(2, j), /Jour prév/, `j=${j}`);
  }
});
