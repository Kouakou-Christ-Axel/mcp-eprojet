# Outil `creer_tache` : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un outil MCP `creer_tache` qui crée une tâche dans E-Projet (`dry_run` par défaut).

**Architecture:** Fonctions pures testées (durée, dates, payload) puis une couche I/O (lecture du formulaire, listes AJAX, POST, journal) injectée dans l'outil. Le POST réel n'est pas vérifiable sans projet : il est isolé et marqué non vérifié.

**Tech Stack:** TypeScript 6, zod 4, cheerio, `node:test` via `tsx`, SDK MCP.

**Spec:** `docs/superpowers/specs/2026-10-19-creer-tache-design.md`

## Global Constraints

- Fichiers de 200 lignes maximum ; SOLID (outil dépend d'un service injecté, pas du client HTTP).
- `pnpm check`, `pnpm lint`, `pnpm format:check` passent avant de conclure.
- stdout = protocole MCP : logs sur stderr, jamais de mot de passe ni de cookie.
- Dates envoyées en `jj/mm/aaaa` ; entrée en ISO `AAAA-MM-JJ`.
- `nbJourPrev` : multiple de 0,25, minimum 0,25 ; `nbHeurePrev` : de 0,25 à 300 par pas de 0,25.
- POST `application/x-www-form-urlencoded` vers `/taches/createuser` après un GET de `/taches/useform` (champs cachés `userId`, `personneId`). Responsable interne = `personneId`.
- Pas de suppression. `dry_run` par défaut ; `confirmer: true` pour envoyer.

## Review Focus

- `duree_heures` = 0,3 ou 301 ou 2,1 (non multiple de 0,25) : refus avec message clair.
- `fin_prev` antérieure à `debut_prev` ; date ISO invalide (`2026-02-30`) : refus.
- Nature `TACHE` avec `gravite`/`composant` fournis : ignorés, absents du payload.
- Nature `ANOMALIE` sans gravité : refus.
- Libellé de statut/type inconnu ou ambigu : erreur listant les valeurs permises.
- Plusieurs responsables externes pour un nom : retour des candidats, aucun choix automatique.
- Session expirée pendant l'opération : géré par `api()` (1 retry).

---

### Task 1: Durée (heures vers jours)

**Files:** Create `src/utils/duree.ts`, `src/utils/duree.test.ts`; Modify `package.json` (script `"test": "tsx --test src/**/*.test.ts"`).
**Interfaces:** Produces `dureeVersJoursHeures(heures: number): { nbHeurePrev: number; nbJourPrev: number }` ; lève `Error` en français si hors règle.

- [ ] Écrire `duree.test.ts` : `0.5 -> {0.5, 0.25}`, `2 -> {2, 0.25}`, `3 -> {3, 0.5}`, `8 -> {8, 1}`, `300 -> {300, 37.5}` ; erreurs pour `0`, `0.3`, `2.1`, `301`.
- [ ] `pnpm test` : échec attendu (module absent).
- [ ] Implémenter : validation (0,25 à 300, multiple de 0,25), jours = `ceil((h/8)*4)/4`, minimum 0,25.
- [ ] `pnpm test` : succès. Commit si git.

### Task 2: Dates

**Files:** Create `src/utils/dates.ts`, `src/utils/dates.test.ts`.
**Interfaces:** Produces `isoVersFr(iso: string): string` (`"2026-03-05" -> "05/03/2026"`) ; `verifierPeriode(debut: string, fin: string): void` (fin ≥ début, même jour permis).

- [ ] Tests : conversion ci-dessus ; `2026-02-30` refusé ; `fin < debut` refusé ; `fin == debut` accepté.
- [ ] Échec, implémenter (validation par aller-retour `Date`, pas de lib), succès.

### Task 3: Lecture du formulaire

**Files:** Create `src/utils/parse.ts`, `src/utils/parse.test.ts`, fixture `src/utils/__fixtures__/useform-min.html` (extrait réel : champs cachés + selects `natureTache`, `statutTacheId`, `typeTacheId`).
**Interfaces:** Produces `lireFormulaire(html: string): { cachés: Record<string,string>; options: Record<string, {valeur:string; libelle:string}[]> }` ; `resoudreOption(options, libelle, champ): string` (insensible à la casse/accents ; erreur listant les valeurs permises si inconnu).

- [ ] Tests sur la fixture : `userId`/`personneId` lus ; `statut "En cours" -> "-3"` ; libellé inconnu lève une erreur contenant les valeurs permises.
- [ ] Échec, implémenter avec cheerio, succès.

### Task 4: Entrée et payload

**Files:** Create `src/services/taches/schema.ts` (zod), `src/services/taches/payload.ts`, `src/services/taches/payload.test.ts`.
**Interfaces:** Consumes Tasks 1-3. Produces `CreerTacheInput` (type zod, champs de la spec) ; `construirePayload(input, formulaire, externeId?: string): URLSearchParams`.

- [ ] Tests : tâche complète -> champs attendus (`libelle`, `natureTache`, `typeTacheId`, `statutTacheId`, `tacheInterne=true`, `dateDebutPrev=05/03/2026`, `nbHeurePrev`, `nbJourPrev`, `userId`, `personneId`, `responsableInterneId=personneId`) ; champs jamais saisis (`pourcentageAvanc`, `jalonId`, `tacheParentId`, `superviseurInterneId`, `superviseurExterneId`) présents mais vides ; `TACHE` sans `gravite`/`composant` ; `ANOMALIE` sans gravité refusée par le schéma.
- [ ] Échec, implémenter, succès. Les noms de champs sont ceux du HTML ; marquer `// non vérifié : POST réel`.

### Task 5: Service, listes AJAX, journal

**Files:** Create `src/services/taches/lookups.ts`, `src/services/taches/service.ts`, `src/services/taches/service.test.ts`, `src/utils/actionsLog.ts`.
**Interfaces:** Produces `creerTache(input, deps: { api: typeof api; log: (e: object) => void }): Promise<Resultat>` avec `Resultat = {mode:"dry_run"|"envoyé"; payload: Record<string,string>} | {candidats: {id:string;nom:string}[]}` ; `chercherExterne(api, projetId, terme)` (`GET /PersonneExterne/search/byProjet/tachesUser/{projetId}/{terme|*}`) ; `chercherComposant(api, projetId, terme)` (`/composantProjet/search/byProjet/{projetId}/{terme|*}`, valeur = `libelle`) ; `logAction(entree)` ajoute une ligne JSON dans `actions.log` sans secrets.

- [ ] Tests avec un `api` factice : `confirmer` absent -> aucun POST, retour `dry_run` ; `confirmer:true` -> un POST vers `/taches/createuser` + une ligne de journal ; deux externes correspondants -> `candidats`, aucun POST.
- [ ] Échec, implémenter, succès. La relecture après envoi est un `TODO` explicite (pas de moyen connu de retrouver la tâche).

### Task 6: Outil MCP et vérification réelle

**Files:** Create `src/tools/creerTache.ts` ; Modify `src/index.ts` (enregistrer l'outil), `docs/ARCHITECTURE.md` (catalogue d'outils).
**Interfaces:** Consumes `creerTache` (Task 5) et `CreerTacheInput` (Task 4). Produces l'outil MCP `creer_tache` avec description précise (quand l'utiliser, formats, valeurs permises).

- [ ] Brancher `api` et `logAction` réels dans l'outil ; supprimer `ping.ts` seulement si `tester_connexion` n'est plus utile (sinon le garder).
- [ ] `pnpm check && pnpm lint && pnpm format:check && pnpm test` : tout vert.
- [ ] Vérification réelle (bloquée tant que pas de projet) : capturer un vrai POST (HAR), comparer les noms de champs, la réponse succès/erreur, l'acceptation de `tacheParentId`/`jalonId` vides, la résolution du nom de projet. Corriger `payload.ts` et lever le marquage "non vérifié".
