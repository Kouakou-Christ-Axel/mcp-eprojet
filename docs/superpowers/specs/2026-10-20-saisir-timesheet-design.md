# Outil MCP `saisir_timesheet` : conception

## Intention

Saisir ses heures par tâche et par jour est une corvée quotidienne. `saisir_timesheet` remplit le tableau de la page `/timeSheetTacheParJour/activity` à la place de l'utilisateur. Contexte : `docs/ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-19-creer-tache-design.md`.

## Objectifs

- Saisir heures, statut, % d'avancement (et commentaire facultatif) pour une ou plusieurs tâches d'une journée.
- Refuser toute saisie incohérente avant l'envoi ; remonter les avertissements que la page affiche sans bloquer.
- Écriture sûre : `dry_run` par défaut, relecture après envoi.

## Non-objectifs

- Pas de total d'heures par jour à vérifier ou plafonner (confirmé par l'utilisateur).
- Pas de modification des tâches (libellé, dates) ni de suppression.
- Onglet "Terminées en rattrapage" ajouté le 2026-10-20 : même format que les deux autres tableaux (`tabActivityTermineeRattrapage`, formulaire `timeSheetTacheTermineeRattrapageUserByProjet`, même POST). Lecture vérifiée en réel ; écriture non essayée.

## Anti-objectifs

- Un POST sans `confirmer: true`.
- Écraser les heures/statuts des tâches non citées (elles doivent repartir à l'identique).
- Écrire sur le mauvais jour.

## Contraintes

- `POST /EProjet-1/timeSheetTacheParJour/TimeSheetTacheActivitySaveUpdate`, form-urlencoded. Deux formulaires (Actives : `#timeSheetTacheParJourActivityUserByProjet`, À venir : `#timeSheetTacheAvenirUserByProjet`) ; le navigateur envoie **toutes les lignes** du formulaire concerné (`$form.serialize()`), aucun champ caché hors lignes, pas de token.
- Champs par ligne (constatés) : `listTaches[i].{reference,projetId,projetLibelle,id,libelle,typeTacheLibelle,statutTacheId,pourcentageAvanc,timeSheetJourId,nbHeureTravaille,commentaire}`.
- Jour : le select `timeSheetTachePar_timeSheetJourId_*` liste les 8 derniers jours (week-end compris), chaque option = `/EProjet-1/timeSheetTacheParJour/activityByDay/{jourId}`, libellé `Lundi 19-10-2026`. Charger ce GET donne les lignes avec le bon `timeSheetJourId`.
- Fichiers <= 200 lignes, SOLID (`CLAUDE.md`). Client : `api()` existant ; parsing HTML isolé.

## Paramètres

| Paramètre   | Règle                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `date`      | Facultatif, ISO `AAAA-MM-JJ`, aujourd'hui par défaut. Convertie en `jj-mm-aaaa` pour retrouver l'option du select ; hors des 8 jours proposés : erreur listant les dates disponibles.                             |
| `taches[]`  | Au moins une. Chaque élément : `reference` (ex. `PRJ-576-0417`, trouvée dans Actives ou À venir), `heures` (0 à 24, pas 0,25), `statut` (libellé du select), `pourcentage` (0 à 100), `commentaire` (facultatif). |
| `confirmer` | `false` par défaut = `dry_run`.                                                                                                                                                                                   |

Heures, statut et pourcentage sont **obligatoires** pour chaque tâche citée.

## Règles de cohérence (refus)

- Statut **Terminée** <=> pourcentage **100** : Terminée avec < 100 refusé ; 100 sans Terminée refusé.
- Repasser de Terminée à En cours est permis ; le pourcentage doit alors être < 100 (conséquence de la règle ci-dessus, l'outil ne baisse rien à la place de l'utilisateur).
- Référence inconnue, statut hors liste, heures hors bornes ou hors pas : refus avec message listant les valeurs permises.

## Avertissements (réponse, sans refuser) — reprennent ceux de la page

- Tâche Terminée sans heure réelle effective (heures réelles affichées - heures déjà saisies ce jour + heures saisies <= 0).
- Tâche non terminale dont les heures réelles effectives dépassent les heures prévues de plus du seuil de dépassement (valeur lue dans le script de la page `tsSeuilDepassementBudgetPourcentage`, repli 100 %).
- Total de la journée à 0 h.

## Écriture : garde-fous

- Les tâches non citées, et les champs non saisis des tâches citées, repartent avec la valeur actuelle de la page. Saisir à nouveau une tâche remplace ses heures du jour (pas d'addition).
- Un POST par formulaire contenant au moins une tâche citée (Actives, À venir).
- Une ligne dans `actions.log` avant la gestion d'erreur ; une panne du journal ne masque pas un envoi réussi.
- Après envoi : relire le jour (`activityByDay/{jourId}`) et comparer heures/statut/pourcentage aux valeurs envoyées ; la réponse indique `verifie: true|false` et les écarts.

## À vérifier avec une vraie écriture

- Réponse du POST (redirection, erreurs de validation renvoyées en HTML ?).
- Le serveur accepte-t-il les lignes inchangées sans heures ?
- Valeur envoyée pour les cases vides (`""`).
- Verifier sur la tâche de test `PRJ-576-0417` et un jour de test, avec l'accord de l'utilisateur au moment de l'essai.

## Laissé au concepteur

- Découpage en fichiers, messages d'erreur, forme exacte de la réponse du `dry_run`.

## Précisions après relecture

- **Sources des heures** : heures prévues = cellule `td.ts-cell-hprev`, heures réelles affichées = `td.ts-cell-hreelle` (par tâche, nombres à point décimal, ex. `0.25`, vide possible). Fixture : `src/utils/__fixtures__/activity-min.html` (structure réelle, Actives et À venir). Statut **terminal** = libellés Terminée ou Annulée (comparaison normalisée, comme le fait le script de la page). Seuil : dépassement strict, `heuresEffectives > prévu * (1 + seuil/100)`.
- **Statuts** : le select est dans chaque ligne ; la résolution et la règle Terminée <=> 100 se font **par ligne**, sur le libellé normalisé (casse/accents ignorés, `normaliser` de `src/utils/parse.ts`), puis l'id (`-4` pour Terminée constaté) est envoyé.
- **Formats sur le fil** : point décimal (`type=number`, `step=0.25`) ; `pourcentageAvanc` accepte tout nombre (`step=any`), envoyé sans `%`. Heures et pourcentage sont envoyés tels quels, sans arrondi.
- **Échec partiel (deux POST)** : Actives puis À venir ; au premier échec, arrêt, pas de retry ni de retour arrière ; la réponse et `actions.log` disent quels formulaires ont été enregistrés (choix du concepteur).
- **Doublons et inconnues** : référence citée deux fois, ou présente dans les deux tableaux : refus. Référence absente des deux tableaux : refus (une tâche terminée ou en rattrapage n'est pas modifiable ici, hors périmètre).
- **Plan en deux phases** : tout ce qui est testable hors écriture réelle d'abord ; puis un point de contrôle avec une écriture réelle autorisée par l'utilisateur. Si le serveur refuse le formulaire complet, repli : n'envoyer que les lignes citées (choix du concepteur, à valider alors).

## Résultat de l'essai réel (2026-10-20)

Un envoi réel (0,25 h, En cours, 10 % sur PRJ-576-0417, jour du 20/10/2026) a été accepté :

- `POST` du tableau Actives complet : HTTP 302 (redirection), sans erreur.
- Les lignes inchangées sont acceptées ; une case vide est envoyée vide (`""`).
- La relecture du jour confirme heures, statut et pourcentage (`verifie: true`) ; `lister_taches` renvoie ensuite `hReelle: "0.25"` et `pourcentageAvanc: "10.00"` (le serveur renvoie le pourcentage avec deux décimales).
- Non couvert par l'essai : formulaire À venir, erreur de validation renvoyée par le serveur, réécriture sur un jour passé.
