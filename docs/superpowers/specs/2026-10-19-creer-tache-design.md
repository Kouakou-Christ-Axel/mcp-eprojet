# Outil MCP `creer_tache` : conception

## Intention

Saisir une tâche dans E-Projet est une corvée. L'outil `creer_tache` remplit à la place de l'utilisateur le formulaire `/EProjet-1/taches/useform`, avec les seuls champs qu'il renseigne vraiment. Contexte général : `docs/ARCHITECTURE.md`.

## Objectifs

- Créer une tâche à partir de peu de paramètres, en langage naturel (libellés, pas d'ids).
- Ne jamais envoyer une valeur que le formulaire refuserait (règles ci-dessous).
- Écriture sûre : `dry_run` par défaut.

## Non-objectifs

- Modifier ou supprimer une tâche. Pas de suppression en v1.
- Tâche parent, jalon, superviseurs (interne et externe), % avancement, ordre, référence : jamais saisis par l'utilisateur, envoyés vides.
- Lister les projets (hors besoin de résolution du nom).

## Anti-objectifs (échec même si "ça marche")

- Un POST envoyé par erreur (pas de `confirmer: true`).
- Des dates inversées jour/mois (format `jj/mm/aaaa`).
- Un Jour prév hors règle (multiple de 0,25, minimum 0,25).

## Contraintes

- Formulaire : POST `application/x-www-form-urlencoded` vers `/EProjet-1/taches/createuser`.
- Toujours un GET de `/taches/useform` avant le POST (listes de valeurs). Correction du 2026-10-20 : `userId` et `personneId` n'ont **pas de `name`**, le navigateur ne les envoie pas ; le responsable interne est l'unique option du select `responsableInterneId` (l'utilisateur connecté).
- Session, relogin et client HTTP : `src/client/` existant (`api()`). Parsing HTML : cheerio, isolé dans `src/utils/parse.ts`.
- Fichiers de 200 lignes maximum, SOLID (voir `CLAUDE.md`).

## Paramètres de l'outil

| Paramètre                | Règle                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `projet`                 | Obligatoire. Nom du projet, résolu en id (voir "À vérifier").                                                                         |
| `libelle`                | Obligatoire, 255 caractères max.                                                                                                      |
| `nature`                 | Obligatoire : `TACHE`, `ANOMALIE`, `EVOLUTION`.                                                                                       |
| `gravite`                | Obligatoire si `ANOMALIE` (hypothèse de l'utilisateur, à confirmer) : `BLOQUANTE`, `MAJEURE`, `MINEURE`, `COSMETIQUE`. Ignorée sinon. |
| `composant`              | Facultatif, seulement si `ANOMALIE`. Libellé cherché dans la liste du projet ; la valeur envoyée est le libellé (String), pas un id.  |
| `type_tache`             | Obligatoire, par libellé parmi les options lues dans le formulaire (12 options).                                                      |
| `statut`                 | Obligatoire, par libellé parmi les options du formulaire (5 options). Varie selon la tâche, pas de défaut.                            |
| `tache_interne`          | Booléen, `true` par défaut.                                                                                                           |
| `responsable_externe`    | Facultatif. Nom cherché dans la liste du projet. Plusieurs correspondances : l'outil les renvoie à l'utilisateur sans choisir.        |
| `debut_prev`, `fin_prev` | Obligatoires, ISO `AAAA-MM-JJ`, convertis en `jj/mm/aaaa`. `fin_prev >= debut_prev` (même jour permis).                               |
| `duree_heures`           | Obligatoire, de 0,25 à 300, multiple de 0,25.                                                                                         |
| `commentaire`            | Facultatif.                                                                                                                           |
| `confirmer`              | `false` par défaut = `dry_run` (renvoie le payload sans envoyer). `true` = envoie.                                                    |

## Règle durée

- `nbHeurePrev` = `duree_heures` (heures décimales : 1,5 = 1 h 30).
- `nbJourPrev` = `duree_heures / 8`, arrondi au multiple de 0,25 **supérieur**, minimum 0,25 (choix du concepteur, validable par l'utilisateur). Exemples : 0,5 h -> 0,25 j ; 2 h -> 0,25 j ; 3 h -> 0,5 j ; 8 h -> 1 j.
- Les deux champs sont obligatoires côté formulaire.

## Sources des listes (constaté sur le formulaire)

- Dans le HTML : `natureTache`, `gravite`, `typeTacheId`, `statutTacheId` (ids négatifs pour les types/statuts système, ex. statut -1 "A Faire"). Relire à chaque appel plutôt que figer en dur.
- AJAX JSON, dépendant du projet, sans requête tant qu'aucun projet n'est choisi :
  - Composants : `GET /EProjet-1/composantProjet/search/byProjet/{projetId}/{terme|*}`, objets avec `libelle`.
  - Responsable externe : `GET /EProjet-1/PersonneExterne/search/byProjet/tachesUser/{projetId}/{terme|*}`, objets avec `id`, `nom`, `prenoms`.
- Le terme est encodé en URL ; `*` signifie "tout".

## Écriture : garde-fous

- Validation zod stricte avant tout envoi.
- `dry_run` par défaut ; `confirmer: true` pour envoyer.
- Une ligne dans `actions.log` par envoi (date, outil, payload sans secrets).
- Après envoi : relire pour confirmer l'enregistrement si E-Projet permet de retrouver la tâche ; sinon le dire explicitement.
- Erreurs lisibles ("session expirée", "champ X invalide", "plusieurs responsables externes possibles").

## À vérifier (bloqué : l'utilisateur n'a pas encore de projet)

- Comment la liste des projets est alimentée (le select `projetId` est vide sans projet associé) et comment résoudre un nom de projet en id.
- Si `gravite` est réellement obligatoire pour une anomalie.
- Le POST réel : noms de champs exacts, réponse en cas de succès et d'erreur (redirection, JSON, HTML), moyen de retrouver la tâche créée.
- Effet du choix du projet sur `tacheParentId` et `jalonId` (désactivés tant qu'aucun projet), et si leur envoi vide est accepté.
- Format réel d'envoi des dates (confirmé à l'écran : `05/03/2026`).

## Laissé au concepteur

- Découpage des fichiers (service `taches`, outil `creer_tache`, résolveurs de listes, parsing), dans la limite de 200 lignes.
- Messages d'erreur exacts, format de la réponse du `dry_run`.

## Précisions après relecture (choix du concepteur)

- Réutilisation : `api()` (`src/client/http.ts`) accepte déjà un `RequestInit`, donc un POST form-encoded avec cookie, relogin et un seul retry fonctionne tel quel. `actions.log` n'a pas encore d'écrivain : à créer (`src/utils/`).
- Pour une nature autre qu'`ANOMALIE`, `gravite` et `composant` sont **omis** du payload (pas envoyés vides). Hypothèse à confirmer au premier POST réel.
- Le schéma zod de `gravite` doit rester facile à changer (obligation non confirmée).
- Arrondi des jours : implémenté dans une fonction isolée et testée, facile à changer.
- Points bloqués par l'absence de projet (résolution du nom de projet, noms exacts des champs du POST, réponse succès/erreur, `tacheParentId`/`jalonId` vides) : jalons de vérification dans le plan, pas des suppositions figées.

## Correction du 2026-10-20

Un dry_run sur le vrai formulaire a montré que les champs cachés `userId`/`personneId` n'ont pas de `name` (donc jamais envoyés). Le code lit le responsable interne dans le select `responsableInterneId`. Le garde-fou (erreur claire si ce select est vide) a évité tout envoi erroné. Le POST réel de `creer_tache` reste à vérifier.

## Résultat de l'essai réel (2026-10-20)

Une création réelle (TACHE, Formation, En cours, 2 h, 20/10/2026, projet 576) a été acceptée :

- `POST /taches/createuser` : HTTP 302 vers `/EProjet-1/timeSheetTacheParJour/activity`, sans erreur.
- La tâche apparaît dans l'onglet Actives avec la référence générée par le serveur (`PRJ-576-0418`, id 7858) ; ordre et référence vides à l'envoi sont bien générés par le serveur. Tâche parent, jalon et superviseurs envoyés vides : acceptés.
- Relecture implémentée : après l'envoi, la tâche la plus récente du même libellé est cherchée dans Actives/À venir ; la réponse contient `tache` (dont la référence) et `verifie`.
- Non couvert : nature ANOMALIE (gravité, composant), responsable externe, statut qui place la tâche hors Actives/À venir (relecture alors à `verifie: false`).
