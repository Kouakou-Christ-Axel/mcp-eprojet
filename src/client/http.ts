import { config } from "../config.js";
import { ensureSession } from "./session.js";

const expired = (res: Response) =>
  res.status === 302 && /login/i.test(res.headers.get("location") ?? "");

// Requête authentifiée ; session expirée (302 -> login) => relogin puis 1 seul retry.
export async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const call = async (force: boolean) =>
    fetch(`${config.EPROJET_BASE_URL}${path}`, {
      ...init,
      redirect: "manual",
      headers: { ...init.headers, Cookie: await ensureSession(force) },
    });
  const res = await call(false);
  if (!expired(res)) return res;
  const retry = await call(true);
  if (expired(retry)) throw new Error("Session E-Projet expirée et relogin sans effet");
  return retry;
}
