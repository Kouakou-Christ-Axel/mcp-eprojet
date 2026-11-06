---
name: "eprojet-completer-taches"
description: Saisir les heures réelles (timesheet) sur des tâches E-Projet via le MCP eprojet, pour les projets Synelia, Orange et OCI (Orange Côte d'Ivoire). À utiliser dès que l'utilisateur veut saisir, remplir, corriger ou vérifier son timesheet ou ses heures réelles, terminer ou avancer une tâche E-Projet, ou mentionne E-Projet, Synelia, Orange ou OCI avec des heures, un pourcentage d'avancement ou un statut Terminée/En cours, même sans dire « skill ». Sert aussi à la tâche quotidienne de préparation du timesheet (lundi-vendredi). Ne sert pas à créer des tâches (voir eprojet-creer-taches) ni aux projets perso.
---

# Saisir les heures réelles dans E-Projet

Les heures réelles servent à la facturation et au suivi : une valeur devinée est pire qu'une valeur absente. Les heures viennent de l'utilisateur ou se déduisent clairement de sa demande ; en cas de doute, proposer une valeur par défaut chiffrée et la faire valider.

## Outils et pièges connus

- Les outils s'appellent `eprojet__*` (selon l'environnement : `mcp__remote-devices__eprojet__*`). Les charger d'un seul coup avec ToolSearch (requête « eprojet »), ainsi que SendUserMessage si le mode est planifié.
- Il n'existe pas d'outil `current_time` : obtenir la date avec `date +%Y-%m-%d\ %A` (Bash). Samedi/dimanche : ne rien faire.
- Vocabulaire : l'utilisateur dit parfois « projets » pour « tâches ». Ne pas corriger sur le ton ; compter les **tâches** de `lister_taches`, c'est la seule liste qui compte. Ne jamais inventer une référence.
- Les outils avec `confirmer=true` écrivent pour de vrai. Sans `confirmer`, c'est un dry-run.
- `lire_timesheet` n'affiche PAS les heures du jour des tâches Terminées. Après une saisie « Terminée », `verifie:false` et `ecarts` « heures relues "" » sont donc **normaux** : ne pas réessayer la saisie, vérifier avec `lire_tache` (champs `statut`, `pourcentage`, `heures_reelles`) sur 1-2 tâches par jour et le dire.
- Une tâche Terminée sort des « actives » et passe en « rattrapage » (modifiable 8 jours).
- Les dates prévues des tâches sont indicatives : une tâche peut être saisie la veille (dans les 8 derniers jours) sans avertissement.

## Déroulé

1. **Date et périmètre.** Date du jour, jours visés (AAAA-MM-JJ, 8 derniers jours max ; au-delà, E-Projet refuse : le dire).
2. **Repérer les tâches, en un seul tour d'appels parallèles** : `lister_taches` (actives, a_venir, rattrapage, limite 100) et `lire_timesheet` pour chaque jour visé. Noter les H. prév de chaque tâche. Au besoin `lire_tache`.
3. **S'il n'y a aucune tâche active** : le dire (« Aucune tâche E-Projet active, rien n'a été préparé ») et s'arrêter. Ne jamais créer de tâche ici.
4. **Fixer les valeurs.** Par tâche et par jour : heures (pas de 0,25), statut, %. Règles : **Terminée ⇔ 100 %** ; « En cours » entre 0 et 99, jamais 100 sans accord de l'utilisateur ; une tâche en cours garde « En cours ». Objectif habituel : au moins 8 h par jour, au moins une tâche, en tenant compte des heures déjà saisies. Défaut raisonnable : caler les heures sur les H. prév (souvent 2 h par tâche) plutôt que diviser 8 h également.
5. **Demandes multi-jours** (« termine 4 pour hier et 4 pour aujourd'hui », « 2 h chacune ») : lever l'ambiguïté en une seule fois dans le récapitulatif. Interprétation par défaut à annoncer explicitement : N tâches par jour, chacune à 2 h (= 8 h/jour pour 4 tâches), chaque tâche n'apparaissant qu'un seul jour ; quelles tâches quel jour = ordre de la liste. Une tâche que l'on termine un jour donné ne doit pas être re-saisie un autre jour.
6. **Dry-run** : un appel `saisir_timesheet` par jour, en parallèle, sans `confirmer`. Relever les avertissements.
7. **Récapitulatif unique à l'utilisateur** (tableau par jour : référence, libellé court, heures, statut, %, total du jour ; écart à 8 h ; précisions sur ce qui est supposé). Terminer par la phrase à répondre : « Réponds par un accord explicite (ex. « je confirme la saisie du <date>, ... ») ». Ne pas multiplier les allers-retours : un dry-run par variante demandée suffit, ne pas relire le timesheet à vide à chaque message.
8. **Écriture.** Seulement après un accord de l'utilisateur sur un récapitulatif précis (une réponse courte comme « ok enregistre » juste après un récap détaillé suffit ; un « vas-y » sans récap préalable ne suffit pas). Si le mode est « jamais écrire » (tâche planifiée / MODE A), ne jamais appeler `confirmer=true` sans cet accord. Écrire un jour à la fois, en parallèle possible si les dry-runs étaient propres.
9. **Vérifier et conclure** : appliquer le piège « Terminée » ci-dessus (`lire_tache`), puis 2 phrases : ce qui est enregistré par jour, total, et l'éventuel faux écart de relecture expliqué.

## Cas particuliers

- Tâches non citées dans l'appel : inchangées.
- `modifier_tache` ne change pas le statut d'une tâche à 100 % : passer par `saisir_timesheet`.
- Corriger H. prév / Jour prév = `modifier_tache(s)` (champs indépendants, ne changer que celui cité), dry-run puis accord explicite.
- Erreur ou avertissement d'outil : l'expliquer brièvement et s'arrêter, sans réessayer au hasard.
- Ne pas toucher aux projets perso (mémoire, Notion, Eba…).

Réponses en français, concises, en puces.
