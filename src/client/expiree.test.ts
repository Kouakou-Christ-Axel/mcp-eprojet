import assert from "node:assert/strict";
import { test } from "node:test";
import { estExpiree } from "./expiree.js";

const html = (body: string) => new Response(body, { headers: { "content-type": "text/html" } });

test("estExpiree", async () => {
  assert.equal(await estExpiree(new Response("", { status: 401 })), true);
  assert.equal(await estExpiree(new Response("", { status: 403 })), true);
  assert.equal(
    await estExpiree(new Response(null, { status: 302, headers: { location: "/x/login" } })),
    true,
  );
  assert.equal(
    await estExpiree(new Response(null, { status: 302, headers: { location: "/x/taches" } })),
    false,
  );
  assert.equal(await estExpiree(html('<form action="j_spring_security_check">')), true);
  assert.equal(await estExpiree(html("<h1>Tâches</h1>")), false);
  assert.equal(
    await estExpiree(new Response("{}", { headers: { "content-type": "application/json" } })),
    false,
  );
});
