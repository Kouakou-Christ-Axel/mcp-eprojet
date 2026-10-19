import assert from "node:assert/strict";
import { test } from "node:test";
import { isoVersFr, verifierPeriode } from "./dates.js";

test("convertit ISO en jj/mm/aaaa", () => {
  assert.equal(isoVersFr("2026-03-05"), "05/03/2026");
});

test("refuse une date inexistante ou mal formée", () => {
  assert.throws(() => isoVersFr("2026-02-30"), /date/i);
  assert.throws(() => isoVersFr("05/03/2026"), /date/i);
});

test("la fin peut être le même jour, pas avant le début", () => {
  assert.doesNotThrow(() => verifierPeriode("2026-03-05", "2026-03-05"));
  assert.doesNotThrow(() => verifierPeriode("2026-03-05", "2026-03-06"));
  assert.throws(() => verifierPeriode("2026-03-06", "2026-03-05"), /fin/i);
});
