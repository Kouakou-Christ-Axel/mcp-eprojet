const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

function lire(iso: string): { a: string; m: string; j: string } {
  const [, a, m, j] = ISO.exec(iso) ?? [];
  // Aller-retour par Date : rejette 2026-02-30.
  const ok = a && m && j && new Date(`${iso}T00:00:00Z`).toISOString().startsWith(iso);
  if (!ok) throw new Error(`Date invalide (${iso}) : format AAAA-MM-JJ attendu`);
  return { a, m, j } as { a: string; m: string; j: string };
}

export function isoVersFr(iso: string): string {
  const { a, m, j } = lire(iso);
  return `${j}/${m}/${a}`;
}

// ISO triable lexicalement ; même jour autorisé.
export function verifierPeriode(debut: string, fin: string): void {
  lire(debut);
  lire(fin);
  if (fin < debut) throw new Error(`La date de fin (${fin}) précède le début (${debut})`);
}
