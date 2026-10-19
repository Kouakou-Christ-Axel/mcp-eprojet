import { config } from "../config.js";
import { log } from "../utils/logger.js";

let cookie: string | undefined;
let pending: Promise<void> | undefined;

async function doLogin(): Promise<void> {
  const res = await fetch(`${config.EPROJET_BASE_URL}/j_spring_security_check`, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: config.EPROJET_USER, password: config.EPROJET_PASS }),
  });
  const location = res.headers.get("location") ?? "";
  if (/error/i.test(location)) throw new Error("Échec de login E-Projet : identifiants refusés");
  const jsession = res.headers.getSetCookie().find((c) => c.startsWith("JSESSIONID="));
  if (!jsession) throw new Error(`Login E-Projet : pas de JSESSIONID (HTTP ${res.status})`);
  cookie = jsession.split(";")[0];
  log("login ok");
}

// Mutex : les appels parallèles partagent le même login en cours.
export async function ensureSession(force = false): Promise<string> {
  if (force) cookie = undefined;
  if (!cookie) {
    pending ??= doLogin().finally(() => (pending = undefined));
    await pending;
  }
  return cookie!;
}
