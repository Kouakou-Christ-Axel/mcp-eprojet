// Expirée : 401/403, 302 -> login, ou page de login servie en 200 (endpoints AJAX Spring Security).
export async function estExpiree(res: Response): Promise<boolean> {
  if (res.status === 401 || res.status === 403) return true;
  if (res.status === 302) return /login/i.test(res.headers.get("location") ?? "");
  if (!(res.headers.get("content-type") ?? "").includes("text/html")) return false;
  return (await res.clone().text()).includes("j_spring_security_check");
}
