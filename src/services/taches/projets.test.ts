import assert from "node:assert/strict";
import { test } from "node:test";
import { listerProjets, listerProjetsSchema } from "./projets.js";

const page = `<select name="projetId"><option value=""></option>
<option value="576">Acme | Actions interne Back end</option>
<option value="689">ClientB | PROJET TEST</option>
<option value="630">ClientB | Projet Fiabilisation - ClientB</option></select>`;
const appels: string[] = [];
const deps = {
  api: async (path: string) => {
    appels.push(path);
    return path.startsWith("/PersonneExterne/")
      ? new Response(
          JSON.stringify([
            { id: 7, nom: "DUPONT", prenoms: "Alice" },
            { id: 8, nom: "MARTIN", prenoms: "Bob" },
          ]),
          {
            headers: { "content-type": "application/json" },
          },
        )
      : new Response(page);
  },
};
const parse = (o: object) => listerProjetsSchema.parse(o);

test("sans argument : projets (id, client, libellé)", async () => {
  const r = await listerProjets(parse({}), deps);
  assert.deepEqual("projets" in r && r.projets[1], {
    id: "689",
    client: "ClientB",
    libelle: "PROJET TEST",
  });
  assert.equal("projets" in r && r.projets.length, 3);
});

test("avec projet : externes du projet, limités, projet reconnu par libellé partiel", async () => {
  appels.length = 0;
  const r = await listerProjets(parse({ projet: "fiabilisation", limite: 1 }), deps);
  assert.ok("externes" in r);
  assert.equal(r.projet.id, "630");
  assert.equal(r.total, 2);
  assert.deepEqual(r.externes, [{ id: "7", nom: "DUPONT Alice" }]);
  assert.equal(appels.at(-1), "/PersonneExterne/search/byProjet/tachesUser/630/*");
});

test("projet inconnu ou ambigu : erreur avec les choix", async () => {
  await assert.rejects(listerProjets(parse({ projet: "zzz" }), deps), /inconnu.*576/);
  await assert.rejects(listerProjets(parse({ projet: "ClientB" }), deps), /Plusieurs/);
});
