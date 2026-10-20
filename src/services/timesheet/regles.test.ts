import assert from "node:assert/strict";
import { test } from "node:test";
import { avertissements, verifierCoherence, type EntreeAvertissement } from "./regles.js";
import { saisirTimesheetSchema } from "./schema.js";

const tache = { reference: "PRJ-1", heures: 1, statut: "En cours", pourcentage: 50 };

test("Terminée <=> 100 %, dans les deux sens", () => {
  assert.doesNotThrow(() => verifierCoherence("Terminée", 100));
  assert.doesNotThrow(() => verifierCoherence("terminee", 100));
  assert.doesNotThrow(() => verifierCoherence("En cours", 99));
  assert.throws(() => verifierCoherence("Terminée", 80), /100/);
  assert.throws(() => verifierCoherence("En cours", 100), /Terminée/);
  assert.throws(() => verifierCoherence("Annulée", 100), /Terminée/);
});

test("le schéma refuse heures, pourcentage, doublons et date invalides", () => {
  const ok = saisirTimesheetSchema.parse({ taches: [tache] });
  assert.equal(ok.confirmer, false);
  for (const t of [
    { heures: 24.5 },
    { heures: 0.3 },
    { heures: -1 },
    { pourcentage: 101 },
    { pourcentage: -1 },
  ]) {
    assert.throws(
      () => saisirTimesheetSchema.parse({ taches: [{ ...tache, ...t }] }),
      /./,
      JSON.stringify(t),
    );
  }
  assert.throws(
    () => saisirTimesheetSchema.parse({ taches: [tache, tache] }),
    /plusieurs fois|doublon/i,
  );
  assert.throws(() => saisirTimesheetSchema.parse({ taches: [] }));
  assert.throws(
    () => saisirTimesheetSchema.parse({ date: "2026-02-30", taches: [tache] }),
    /date/i,
  );
  assert.doesNotThrow(() => saisirTimesheetSchema.parse({ taches: [{ ...tache, heures: 0 }] }));
});

const base: EntreeAvertissement = {
  seuil: 100,
  lignes: [
    { cite: true, statut: "En cours", heures: 1, heuresActuelles: 0, hPrev: 2, hReelle: 0.5 },
  ],
};

test("aucun avertissement dans le cas normal", () => {
  assert.deepEqual(avertissements(base), []);
});

test("Terminée sans heure réelle effective", () => {
  const w = avertissements({
    ...base,
    lignes: [{ ...base.lignes[0]!, statut: "Terminée", heures: 0, hReelle: 0 }],
  });
  assert.equal(w.length > 0, true);
  assert.match(w.join(" "), /Terminée/);
});

test("dépassement strict du prévu, hors statut terminal et si prévu > 0", () => {
  const l = { ...base.lignes[0]!, hPrev: 1, hReelle: 1, heuresActuelles: 0, heures: 1 };
  assert.deepEqual(avertissements({ ...base, lignes: [{ ...l, heures: 1 }] }), []); // 2 = 200 % du prévu, pas strictement au-dessus
  assert.match(avertissements({ ...base, lignes: [{ ...l, heures: 1.25 }] }).join(" "), /dépass/i);
  assert.deepEqual(
    avertissements({ ...base, lignes: [{ ...l, heures: 5, statut: "Terminée" }] }),
    [],
  );
  assert.deepEqual(avertissements({ ...base, lignes: [{ ...l, hPrev: 0, heures: 5 }] }), []);
});

test("journée à 0 h au total, lignes non citées comprises", () => {
  const zero = {
    cite: true,
    statut: "En cours",
    heures: 0,
    heuresActuelles: 0,
    hPrev: 2,
    hReelle: 0,
  };
  assert.match(avertissements({ seuil: 100, lignes: [zero] }).join(" "), /0 h/);
  const autre = {
    cite: false,
    statut: "A Faire",
    heures: 0,
    heuresActuelles: 3,
    hPrev: 2,
    hReelle: 3,
  };
  assert.deepEqual(avertissements({ seuil: 100, lignes: [zero, autre] }), []);
});
