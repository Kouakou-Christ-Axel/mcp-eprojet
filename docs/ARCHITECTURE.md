# MCP E-Projet : architecture v1

## Objectif

Un MCP **perso et local** qui remplit E-Projet à ma place (saisie manuelle = corvée), en passant par la session web (Spring Security + cookie `JSESSIONID`).

## Décisions

- **Transport** : stdio (le MCP est lancé localement par Claude)
- **Usage** : perso (un seul utilisateur, mes propres identifiants)
- **Portée v1** : lecture **et** écriture dès le début
- **Auth** : form login Spring Security
  - `POST /EProjet-1/j_spring_security_check`
  - Body `application/x-www-form-urlencoded` : `username`, `password`
  - Session = cookie `JSESSIONID`

## Structure du projet

```
mcp-eprojet/
├── src/
│   ├── index.ts          # démarre le serveur MCP (stdio)
│   ├── config.ts         # variables d'env validées (zod)
│   ├── client/
│   │   ├── session.ts    # login, cookie, mutex, relogin auto
│   │   └── http.ts       # api(): cookie + détection 302 -> /login + 1 retry
│   ├── services/         # logique métier, 1 fichier par domaine
│   │   └── ...           # à définir selon les écrans à remplir
│   ├── tools/            # outils exposés à Claude (nom, description, schéma zod)
│   │   └── ...
│   └── utils/
│       ├── logger.ts     # logs sur stderr uniquement (stdout = protocole MCP)
│       └── parse.ts      # parsing HTML (cheerio) si pas de JSON
├── .env.example          # EPROJET_BASE_URL, EPROJET_USER, EPROJET_PASS
├── package.json
└── README.md
```

## Gestion de session

- Login **paresseux** (au premier appel)
- **Mutex** : un seul login à la fois, même si plusieurs outils tournent en parallèle
- Expiration = réponse `302` avec `Location` contenant `login` -> relogin -> **1 seul retry**
- Échec de login (`login?error`) = erreur claire, **pas de boucle** (évite de bloquer le compte)
- Ne jamais logger le mot de passe ni le cookie

## Écriture : règles de sécurité

Comme les actions sont actives dès la v1, on se protège des erreurs :

- **`dry_run` par défaut** sur chaque outil d'écriture : retourne ce qui serait envoyé, sans envoyer
- Paramètre explicite `confirmer: true` pour exécuter vraiment
- **Suppression** : uniquement via l'outil séparé `supprimer_tache` (`GET /taches/delete/{id}`, comme le bouton « Oui » de la page), `dry_run` par défaut, `confirmer: true` seulement après accord explicite de l'utilisateur sur la tâche citée
- **Journal local** des écritures (`actions.log` : date, outil, payload sans secrets)
- Après chaque écriture : **relire** la donnée pour confirmer à Claude que c'est bien enregistré
- Les formulaires web classiques peuvent exiger des champs cachés (CSRF, token de formulaire) : toujours faire un **GET du formulaire avant le POST** et reprendre ces champs

## Design des outils

- Nommés par **intention** (`saisir_...`, `lister_...`), pas par endpoint
- 5 à 10 outils maximum, descriptions précises (quand l'utiliser, format des dates, valeurs autorisées)
- Lecture : réponses **allégées** + limite par défaut (ex. 20)
- Ecriture : validation zod stricte (dates, montants, énumérations) avant tout envoi
- Erreurs lisibles : "session expirée", "champ X invalide", "accès refusé"

### Catalogue d'outils (à compléter)

| Outil              | Type                   | Endpoint                                                                                                                         | Entrées                                                                                         | Sortie                                                                                                                                                                                  |
| ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tester_connexion` | lecture                | `GET {chemin}`                                                                                                                   | `chemin`                                                                                        | statut + titre                                                                                                                                                                          |
| `creer_tache`      | écriture               | `GET /taches/useform` puis `POST /taches/createuser`                                                                             | voir `docs/superpowers/specs/2026-10-19-creer-tache-design.md`                                  | `dry_run` par défaut : payload ou candidats                                                                                                                                             |
| `modifier_tache`   | écriture               | `GET /taches/useform/{id}` puis `POST /taches/updateuser` (champs préremplis repris tels quels, seuls les champs cités changent) | `reference` + champs à changer                                                                  | `dry_run` par défaut : changements avant/après. Externe et composant non rechargés par E-Projet : repréciser sinon effacés. Statut d'une tâche à 100 % refusé (voir `saisir_timesheet`) |
| `supprimer_tache`  | écriture (destructive) | `GET /taches/delete/{id}`                                                                                                        | `reference`                                                                                     | `dry_run` par défaut : tâche concernée + avertissements (heures réelles perdues). Disparition vérifiée après coup                                                                       |
| `lister_taches`    | lecture                | `GET /timeSheetTacheParJour/activity` (actives, à venir, rattrapage) ou `GET .../tachesTermineesHistorique` (JSON DataTables)    | `categorie`, `recherche`, `limite`, `debut`                                                     | total + liste allégée                                                                                                                                                                   |
| `lire_timesheet`   | lecture                | `GET .../activity` puis `GET .../activityByDay/{jourId}` par jour                                                                | `du`, `au`                                                                                      | total d'heures par jour + tâches avec heures, statut, %, commentaire                                                                                                                    |
| `saisir_timesheet` | écriture               | `GET .../activity` + `activityByDay/{jourId}` puis `POST .../TimeSheetTacheActivitySaveUpdate`                                   | `date`, `taches[]` (`reference`, `heures`, `statut`, `pourcentage`, `commentaire`), `confirmer` | `dry_run` par défaut : modifications + avertissements ; après envoi : relecture                                                                                                         |

## Si le site ne renvoie que du HTML

- Couche `parse.ts` avec cheerio, sélecteurs isolés au même endroit
- Quelques tests sur des pages réelles sauvegardées (si le HTML change, on le voit vite)
- Pour les écritures : reproduire exactement le POST du formulaire (champs cachés compris), repéré dans l'onglet Network

## Configuration côté Claude (stdio)

Les identifiants restent dans `.env` (ignoré par git) et ne sont pas copiés dans la config de Claude : Node les charge avec `--env-file`.

1. Compiler : `pnpm build` (produit `dist/`, sans les tests).
2. Claude Code (à lancer une fois) :

```
claude mcp add eprojet --scope user -- node --env-file=E:/projects/mcp-eprojet/.env E:/projects/mcp-eprojet/dist/index.js
```

3. Claude Desktop (`claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "eprojet": {
      "command": "node",
      "args": ["--env-file=E:/projects/mcp-eprojet/.env", "E:/projects/mcp-eprojet/dist/index.js"]
    }
  }
}
```

Après chaque modification du code : `pnpm build`, puis relancer Claude. `actions.log` est écrit à la racine du projet, quel que soit le dossier de lancement.

## Points d'attention

- **Autorisation** : c'est un outil de l'entreprise, prévenir l'IT / le responsable que tu automatises ta propre saisie avec ton compte (et demander s'il existe une API officielle)
- **Rythme** : pas de rafale de requêtes, petite pause entre les écritures
- **Validation humaine** : garder `dry_run` actif tant que les outils ne sont pas rodés

## Plan de construction

1. Client HTTP + session (login, cookie, relogin) testé sur une page protégée
2. 1 outil de **lecture** (valider le parsing)
3. 1 outil d'**écriture** en `dry_run`, puis en réel sur une donnée de test
4. Ajouter les autres outils un par un
5. README + journal des actions

## Questions ouvertes

- Quels écrans / formulaires remplis-tu le plus souvent ?
- Les pages renvoient-elles du JSON (XHR) ou du HTML ?
- Y a-t-il des champs cachés ou un token à reprendre dans les formulaires ?
