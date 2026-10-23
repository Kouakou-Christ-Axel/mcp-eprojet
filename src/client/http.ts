import { config } from "../config.js";
import { estExpiree } from "./expiree.js";
import { ensureSession } from "./session.js";

// Requête authentifiée ; session expirée => relogin puis 1 seul retry.
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const call = async (perime?: string) => {
    const cookie = await ensureSession(perime);
    const res = await fetch(`${config.EPROJET_BASE_URL}${path}`, {
      ...init,
      redirect: "manual",
      headers: { ...init.headers, Cookie: cookie },
    });
    return { res, cookie };
  };
  const first = await call();
  if (!(await estExpiree(first.res))) return first.res;
  const retry = await call(first.cookie);
  if (await estExpiree(retry.res))
    throw new Error("Session E-Projet expirée et relogin sans effet");
  return retry.res;
}
