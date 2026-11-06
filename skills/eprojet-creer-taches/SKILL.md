---
name: "eprojet-creer-taches"
description: "Créer des tâches E-Projet via le MCP eprojet (creer_tache/creer_taches) pour Synelia, Orange et OCI : dry-run, commentaire court, confirmation explicite, vérification."
---

# Créer une tâche dans E-Projet

## Règles anti-erreur (apprises)

- **Commentaire : toujours court, ou ajouté après la création.** Un commentaire d'environ 300 caractères a fait échouer la création avec « Erreur lors de la création de TimeSheet Journalier : could not execute statement ... org.hibernate.exception.DataException ». Dans ce cas l'outil renvoie quand même HTTP 200 avec `verifie:false`, sans erreur visible : la tâche n'est PAS créée.
  - Limite exacte inconnue : viser un commentaire très court (une phrase, environ 150 caractères max).
  - Si l'utilisateur fournit un commentaire plus long : créer la tâche SANS commentaire, vérifier qu'elle existe, puis ajouter le commentaire par modification (modifier_tache) ou le donner à l'utilisateur pour qu'il le colle dans E-Projet. Ne jamais abréger ni réécrire son texte sans le dire.
  - Éviter les saisies de très longs textes dans tout champ libre.
- **200 + `verifie:false` n'est pas un succès.** Toujours vérifier avec `lister_taches` (recherche sur un mot du libellé), dans « actives » puis « a_venir ». Si la tâche est absente : ne PAS relancer la création (risque de doublon), rapporter à l'utilisateur la réponse brute d'E-Projet (statut, location, verifie) et proposer les valeurs à saisir à la main.
- **Erreur « responsable interne introuvable / session invalide »** : la session E-Projet a expiré. Lancer `tester_connexion`, demander à l'utilisateur de se reconnecter, puis refaire le dry-run.

## Déroulé

1. Charger les outils eprojet avec ToolSearch (requête « eprojet »).
2. Si le projet n'est pas un id, le trouver avec `lister_projets`.
3. **Dry-run** (sans `confirmer`) : relever le payload et les avertissements. Renseigner `duree_heures` (pas de 0,25) ; `jours_prev` seulement si l'utilisateur donne une valeur différente de heures/8.
4. Résumer le payload à l'utilisateur et demander un accord explicite (ex. « je confirme la création »). Une demande comme « réessaie » après une erreur ne vaut PAS accord de création.
5. **Écriture** : `confirmer=true` une seule fois, avec exactement les valeurs du dry-run validé.
6. **Vérifier** avec `lister_taches` (voir ci-dessus) et conclure en 2 phrases : tâche créée (référence) ou non créée (réponse d'E-Projet).

## Cas particuliers

- Création en lot : `creer_taches`, dry-run d'abord, mêmes règles de commentaire.
- Nature ANOMALIE : `gravite` obligatoire (+ `composant`).
- Ne pas toucher aux projets perso (mémoire, Notion, Eba...).

Réponses en français, concises, en puces.