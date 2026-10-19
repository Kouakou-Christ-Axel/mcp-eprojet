import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lireFormulaire, resoudreOption } from "./parse.js";

const form = lireFormulaire(readFileSync("src/utils/__fixtures__/useform-min.html", "utf8"));

test("lit les champs cachés", () => {
  assert.deepEqual(form.caches, { userId: "11", personneId: "22" });
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
