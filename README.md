# mcp-eprojet

Serveur MCP **local (stdio)** qui pilote E-Projet, une application web interne de gestion de tâches et de
timesheet, à la place d'une saisie manuelle fastidieuse. Projet personnel, non officiel : il se connecte avec
votre propre compte, par la session web (form login Spring Security).

> Il s'adresse à une instance précise d'E-Projet. Vérifiez que l'automatisation de votre saisie est
> autorisée dans votre organisation avant de l'utiliser.

## Outils

| Outil                                 | Rôle                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| `tester_connexion`                    | vérifie le login                                        |
| `lister_projets`                      | projets, types de tâche, statuts, responsables externes |
| `lister_taches`, `lire_tache`         | lecture des tâches                                      |
| `creer_tache(s)`, `modifier_tache(s)` | écriture, unitaire ou en lot                            |
| `supprimer_tache`                     | suppression (irréversible)                              |
| `lire_timesheet`, `saisir_timesheet`  | heures par jour                                         |

Les écritures sont en **`dry_run` par défaut** ; `confirmer: true` envoie vraiment. Chaque écriture est
relue pour vérification et journalisée dans `actions.log` (sans mot de passe ni cookie). Détails :
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Installation

```
pnpm install
cp .env.example .env   # renseigner EPROJET_BASE_URL, EPROJET_USER, EPROJET_PASS
pnpm build
claude mcp add eprojet --scope user -- node --env-file=/chemin/vers/.env /chemin/vers/dist/index.js
```

Les identifiants restent dans `.env` (ignoré par git). Développement : `pnpm check`, `pnpm lint`,
`pnpm format:check`, `pnpm test`.
