# mcp-eprojet

Serveur [MCP](https://modelcontextprotocol.io) **local (stdio)** qui permet à un assistant IA (Claude Code,
Claude Desktop…) de piloter **E-Projet**, une application web interne de gestion de tâches et de timesheet.
Objectif : automatiser une saisie manuelle fastidieuse (créer des tâches, saisir ses heures, corriger des
champs) en parlant à l'assistant.

Projet personnel et non officiel. Il se connecte avec **votre propre compte**, par la session web
(form login Spring Security, cookie `JSESSIONID`) : E-Projet n'a pas d'API publique, les pages HTML et les
endpoints internes sont donc lus et soumis comme le ferait un navigateur.

> Il vise une instance précise d'E-Projet. Avant de l'utiliser, vérifiez que l'automatisation de votre saisie
> est autorisée dans votre organisation (et s'il existe une API officielle).

## Principes

- **Lecture et écriture, avec garde-fous** : toute écriture est en **`dry_run` par défaut** (montre ce qui
  serait envoyé). Rien n'est envoyé sans `confirmer: true`, à ne passer qu'après accord explicite de
  l'utilisateur.
- **Vérification** : après chaque écriture, la donnée est relue (`verifie`, `ecarts`).
- **Journal local** : `actions.log` (date, outil, données), jamais de mot de passe ni de cookie.
- **Session** : login à la première requête, un seul login à la fois, reconnexion automatique avec un seul
  nouvel essai (pas de boucle qui bloquerait le compte).
- **Rythme calme** : pas de rafale ; les lots attendent 0,5 s entre deux envois.

## Prérequis

- Node.js 24 ou plus récent (`--env-file`, `fetch`), [pnpm](https://pnpm.io)
- Un compte E-Projet et l'URL de l'instance (ex. `https://e-projet.example.com/EProjet-1`)

## Installation

```
pnpm install
cp .env.example .env      # puis renseigner les trois variables ci-dessous
pnpm build                # produit dist/
```

| Variable           | Rôle                                                           |
| ------------------ | -------------------------------------------------------------- |
| `EPROJET_BASE_URL` | URL de l'application, contexte compris (`…/EProjet-1`)         |
| `EPROJET_USER`     | identifiant                                                    |
| `EPROJET_PASS`     | mot de passe (reste dans `.env`, ignoré par git, jamais loggé) |

### Brancher dans Claude Code

```
claude mcp add eprojet --scope user -- node --env-file=/chemin/vers/.env /chemin/vers/dist/index.js
```

### Brancher dans Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "eprojet": {
      "command": "node",
      "args": ["--env-file=/chemin/vers/.env", "/chemin/vers/dist/index.js"]
    }
  }
}
```

Les identifiants restent dans `.env` : Node les charge avec `--env-file`, ils ne sont jamais copiés dans la
configuration de Claude. Après chaque modification du code : `pnpm build` puis relancer le client.

## Utilisation

Demandez en langage naturel ; l'assistant choisit les outils. Exemples :

- « Montre-moi mes tâches actives. » → `lister_taches`
- « Crée une tâche de formation de 1 h 30 demain sur le projet X. » → `creer_tache` (dry-run, puis
  confirmation de votre part)
- « J'ai passé 3 h sur PRJ-576-0417 aujourd'hui, 60 %. » → `saisir_timesheet`
- « Combien d'heures ai-je saisies cette semaine ? » → `lire_timesheet`
- « Corrige la durée prévue de ces cinq tâches. » → `modifier_taches` (un dry-run pour le lot)

Le cycle normal d'une écriture : **dry-run → vous relisez → `confirmer: true` → relecture `verifie`**.

## Outils

Les dates sont au format `AAAA-MM-JJ`. Les listes sont limitées (20 par défaut, 100 au maximum).

### Lecture

| Outil              | Paramètres                                                                                       | Résultat                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `tester_connexion` | `chemin` (défaut `/`)                                                                            | statut et titre d'une page protégée                                                                                       |
| `lister_projets`   | `projet`, `recherche`, `limite`                                                                  | sans `projet` : projets (id, client, libellé), types de tâche, statuts. Avec `projet` : responsables externes du client   |
| `lister_taches`    | `categorie` (`actives` / `a_venir` / `rattrapage` / `terminees`), `recherche`, `limite`, `debut` | tâches allégées (heures en décimal)                                                                                       |
| `lire_tache`       | `reference`                                                                                      | détail : nature, gravité, statut, %, dates, `jours_prev`, `heures_prev`, `heures_reelles`, responsable externe, composant |
| `lire_timesheet`   | `du`, `au` (aujourd'hui par défaut)                                                              | par jour : total d'heures, tâches avec heures, statut, %, commentaire                                                     |

### Écriture (dry-run par défaut)

| Outil              | Paramètres principaux                                                                                                                                                                                                                            | Remarques                                                                                                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `creer_tache`      | `projet`, `libelle`, `nature` (`TACHE` / `ANOMALIE` / `EVOLUTION`), `type_tache`, `statut`, `debut_prev`, `fin_prev`, `duree_heures`, `jours_prev`, `gravite`\*, `composant`, `responsable_externe`, `tache_interne`, `commentaire`, `confirmer` | \* `gravite` obligatoire pour une anomalie. `projet` : id, libellé ou « Client \| Projet ». Le responsable interne est l'utilisateur connecté      |
| `creer_taches`     | `taches[]` (max 20, mêmes champs), `confirmer`                                                                                                                                                                                                   | un dry-run et une confirmation pour tout le lot ; refusé en bloc si une tâche est invalide ; arrêt à la première erreur                            |
| `modifier_tache`   | `reference` + champs à changer (`libelle`, `nature`, `gravite`, `composant`, `type_tache`, `statut`, `tache_interne`, `responsable_externe`, `debut_prev`, `fin_prev`, `duree_heures`, `jours_prev`, `commentaire`), `confirmer`                 | seuls les champs cités changent ; responsable externe et composant actuels conservés ; statut d'une tâche à 100 % refusé (voir `saisir_timesheet`) |
| `modifier_taches`  | `taches[]` (max 20), `confirmer`                                                                                                                                                                                                                 | même logique de lot                                                                                                                                |
| `saisir_timesheet` | `date` (aujourd'hui par défaut, 8 derniers jours), `taches[]` (`reference`, `heures` 0–24 par pas de 0,25, `statut`, `pourcentage`, `commentaire`), `confirmer`                                                                                  | avertissements non bloquants (dépassement du budget…) ; les tâches non citées sont inchangées                                                      |
| `supprimer_tache`  | `reference`, `confirmer`                                                                                                                                                                                                                         | **irréversible**, pas de lot ; avertit si des heures réelles existent ; disparition vérifiée                                                       |

### Règles métier à connaître

- **H. prév et Jour prév sont deux champs indépendants** dans E-Projet (aucun lien imposé) :
  - `duree_heures` = H. prév, en heures décimales (0,5 = 30 min, 1,5 = 1 h 30), pas de 0,25, de 0,25 à 300 ;
  - `jours_prev` = Jour prév, en jours, pas de 0,25, minimum 0,25 (0,5 = demi-journée). Facultatif : par
    défaut, heures ÷ 8 arrondi au quart de jour supérieur, 0,25 minimum **même sous 2 h**.
- **Statut Terminée ⇔ 100 %**. Une tâche à 100 % est terminée ; pour la rouvrir, `saisir_timesheet` baisse
  le pourcentage. `modifier_tache` ne change pas le statut d'une tâche à 100 %.
- **Rattrapage** : une tâche terminée reste saisissable dans le timesheet pendant quelques jours
  (catégorie `rattrapage`).
- **Libellés** (type, statut, projet) : insensibles à la casse et aux accents ; un fragment unique est
  accepté. Un libellé inconnu ou ambigu renvoie la liste des valeurs permises.

### Limites connues

- `lire_timesheet` ne voit pas les heures du jour des tâches terminées (rattrapage) : E-Projet ne les affiche pas.
- La suppression passe par un `GET`, comme le bouton de l'interface ; il n'existe aucun moyen de l'annuler.
- Le HTML d'E-Projet peut changer : les sélecteurs sont isolés (`src/utils/parse.ts`, `activite.ts`,
  `timesheet/page.ts`) pour qu'un changement ne demande qu'une adaptation locale.

## Contribuer

Les contributions sont bienvenues (issue ou pull request).

1. `pnpm install`, puis un `.env` seulement si vous voulez tester contre une vraie instance.
2. Travaillez en **TDD** : un test d'abord, sur des **fixtures HTML anonymisées** (`src/utils/__fixtures__/`)
   et un faux `api` injecté (les tests ne touchent jamais le réseau).
3. Avant d'ouvrir une PR, tout doit passer :
   ```
   pnpm check          # tsc
   pnpm lint           # eslint
   pnpm format:check   # prettier (pnpm format pour corriger)
   pnpm test
   ```
4. **Règles de code** (`CLAUDE.md`) :
   - aucun fichier ne dépasse **200 lignes**, sauf cas justifié : découpez par responsabilité ;
   - **SOLID** : un module = une responsabilité (client HTTP, session, parsing, service métier, outil MCP) ;
     ajouter un outil = ajouter des fichiers, sans modifier le code existant ; les outils reçoivent leurs
     dépendances (`api`, `log`) par injection ;
   - pas d'abstraction spéculative.
5. **Sécurité** :
   - `stdout` est réservé au protocole MCP : logs sur `stderr` uniquement ;
   - ne jamais committer de mot de passe, cookie, URL interne ni donnée réelle (noms, identifiants, projets) ;
     anonymisez les fixtures et les tests ;
   - toute nouvelle écriture doit être en `dry_run` par défaut, journalisée et relue après envoi.
6. **Commits atomiques**, un sujet par commit (`feat(taches): …`, `fix(…)`, `docs: …`).

Ajouter un outil : un service dans `src/services/<domaine>/` (logique + schéma zod), un handler dans
`src/tools/`, l'enregistrement dans `src/index.ts`, une ligne dans `docs/ARCHITECTURE.md` et le tableau
ci-dessus.

## Structure

```
src/
  index.ts          démarre le serveur et enregistre les outils
  config.ts         variables d'environnement (zod)
  client/           session.ts (login, cookie, mutex) · http.ts (api(): relogin + 1 retry)
  services/         logique métier par domaine : taches/, timesheet/
  tools/            outils MCP : nom, description, validation, gestion d'erreur
  utils/            parse (HTML), dates, durées, lots, journal, logger
docs/               ARCHITECTURE.md et documents de conception
```

Architecture détaillée et décisions : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Licence

[MIT](LICENSE)
