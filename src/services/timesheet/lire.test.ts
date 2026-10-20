import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { lireTimesheet } from "./lire.js";
import type { DepsTs } from "./service.js";

const html = readFileSync("src/utils/__fixtures__/timesheet-jour.html", "utf8");
const appels: string[] = [];
const deps: Pick<DepsTs, "api" | "aujourdhui"> = {
  api: async (path, init) => {
    appels.push(`${init?.method ?? "GET"} ${path}`);
    return new Response(html);
  },
  aujourdhui: () => "2026-10-20",
};

test("un jour par défaut : tâches avec heures seulement, total, statut et % lus", async () => {
  appels.length = 0;
  const r = await lireTimesheet({}, deps);
  assert.equal(r.jours.length, 1);
  assert.equal(r.jours[0]!.date, "2026-10-20");
  assert.deepEqual(r.jours[0]!.taches, [
    {
      reference: "PRJ-576-0420",
      heures: 1.5,
      statut: r.jours[0]!.taches[0]!.statut,
      pourcentage: r.jours[0]!.taches[0]!.pourcentage,
      commentaire: "",
    },
  ]);
  assert.equal(r.total, 1.5);
  assert.ok(r.jours[0]!.taches[0]!.statut.length > 0);
  assert.deepEqual(appels, [
    "GET /timeSheetTacheParJour/activity",
    "GET /timeSheetTacheParJour/activityByDay/399",
  ]);
});

test("période : jours triés, lecture seule (aucun POST)", async () => {
  appels.length = 0;
  const r = await lireTimesheet({ du: "2026-10-19", au: "2026-10-20" }, deps);
  assert.deepEqual(
    r.jours.map((j) => j.date),
    ["2026-10-19", "2026-10-20"],
  );
  assert.equal(
    appels.some((a) => a.startsWith("POST")),
    false,
  );
});

test("aucun jour proposé dans la période : erreur claire", async () => {
  await assert.rejects(lireTimesheet({ au: "2026-01-05" }, deps), /Aucun jour/);
  await assert.rejects(lireTimesheet({ du: "2026-10-21", au: "2026-10-20" }, deps), /précède/);
});
