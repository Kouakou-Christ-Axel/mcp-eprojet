# mcp-eprojet

MCP perso et local (stdio) pour piloter E-Projet. Architecture : `docs/ARCHITECTURE.md`.

## Règles de code

- **Aucun fichier ne dépasse 200 lignes**, sauf cas de force justifié (à signaler à l'utilisateur). Si un fichier grossit, le découper par responsabilité.
- **Appliquer les principes SOLID** :
  - S : un fichier/module = une responsabilité (client HTTP, session, parsing, service métier, outil MCP restent séparés).
  - O : ajouter un outil ou un domaine = ajouter un fichier, sans modifier le code existant.
  - L : les implémentations substituables respectent le contrat de leur type.
  - I : interfaces/types petits et ciblés, pas de gros objets fourre-tout.
  - D : les outils dépendent d'abstractions (services injectés), pas du client HTTP concret.
- Pas d'abstraction spéculative : SOLID sert à garder le code découplé, pas à multiplier les couches.

## Outillage

- `pnpm check` (tsc), `pnpm lint` (eslint), `pnpm format` (prettier) : tout doit passer avant de conclure.
- stdout = protocole MCP : logs uniquement sur stderr, jamais de mot de passe ni de cookie.
