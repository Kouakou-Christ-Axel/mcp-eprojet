import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lireFormulaire, resoudreOption } from "./parse.js";

const form = lireFormulaire(readFileSync("src/utils/__fixtures__/useform-min.html", "utf8"));

test("ignore les champs cachés sans name (le navigateur ne les envoie pas)", () => {
  assert.deepEqual(form.caches, {});
});

test("résout un libellé en valeur, sans casse ni accents", () => {
  assert.equal(resoudreOption(form.options, "statutTacheId", "en cours"), "-3");
  assert.equal(resoudreOption(form.options, "statutTacheId", "Pret pour qa"), "1");
  assert.equal(resoudreOption(form.options, "typeTacheId", "Test"), "-5");
});

test("libellé inconnu : erreur listant les valeurs permises", () => {
  assert.throws(
    () => resoudreOption(form.options, "statutTacheId", "Terminé"),
    /A Faire.*En cours.*Prêt pour QA/s,
  );
});

test("resoudreOption : fragment unique accepté, ambigu ou inconnu refusé", () => {
  const options = {
    t: [
      { valeur: "1", libelle: "Support Développement" },
      { valeur: "2", libelle: "Support Client" },
      { valeur: "3", libelle: "Test" },
    ],
  };
  assert.equal(resoudreOption(options, "t", "support dev"), "1");
  assert.equal(resoudreOption(options, "t", "TEST"), "3");
  assert.throws(() => resoudreOption(options, "t", "support"), /Valeurs permises/);
  assert.throws(() => resoudreOption(options, "t", ""), /Valeurs permises/);
});
