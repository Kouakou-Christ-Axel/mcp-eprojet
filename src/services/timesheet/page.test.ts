import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lirePageTimesheet } from "./page.js";

const page = lirePageTimesheet(readFileSync("src/utils/__fixtures__/timesheet-jour.html", "utf8"));

test("jours proposés : libellé normalisé et chemin sans préfixe d'application", () => {
  assert.deepEqual(page.jours, [
    { libelle: "Mardi 20-10-2026", chemin: "/timeSheetTacheParJour/activityByDay/399" },
    { libelle: "Lundi 19-10-2026", chemin: "/timeSheetTacheParJour/activityByDay/398" },
  ]);
});

test("seuil de dépassement lu dans le script de la page", () => {
  assert.equal(page.seuil, 50);
});

test("deux formulaires, lignes lues avec leurs heures et statuts", () => {
  assert.deepEqual(
    page.formulaires.map((f) => [f.tableId, f.lignes.length]),
    [
      ["tabActivityStarted", 2],
      ["tabActivityAvenir", 1],
    ],
  );
  const f = page.formulaires[0]!;
  assert.equal(f.action, "/timeSheetTacheParJour/TimeSheetTacheActivitySaveUpdate");
  assert.deepEqual(f.lignes[1], {
    index: 1,
    reference: "PRJ-576-0420",
    statuts: f.lignes[1]!.statuts,
    hPrev: 2,
    hReelle: 3,
    heuresActuelles: 1.5,
  });
  assert.deepEqual(f.lignes[1]!.statuts.map((s) => s.libelle).slice(0, 2), ["A Faire", "En cours"]);
});

test("sérialisation fidèle au navigateur : champs nommés, statut sélectionné, sans select de jour", () => {
  const champs = Object.fromEntries(page.formulaires[0]!.champs);
  assert.equal(champs["listTaches[0].statutTacheId"], "-3");
  assert.equal(champs["listTaches[0].pourcentageAvanc"], "40");
  assert.equal(champs["listTaches[0].nbHeureTravaille"], "");
  assert.equal(champs["listTaches[1].nbHeureTravaille"], "1.5");
  assert.equal(champs["listTaches[0].timeSheetJourId"], "399");
  assert.equal(champs["listTaches[0].commentaire"], "");
  assert.equal(
    Object.keys(champs).some((k) => !k.startsWith("listTaches[")),
    false,
  );
});
