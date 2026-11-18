# Code secret — le jeu des couleurs

**Version 1.0** · Jeu de déduction solo inspiré du Mastermind, jouable dans un navigateur moderne.

## Règles du jeu

Le code secret comporte quatre couleurs choisies parmi rouge, bleu, vert, jaune, orange et violet. Les répétitions sont autorisées. La personne qui joue dispose de dix essais. Après chaque proposition, les points foncés indiquent les couleurs à la bonne position ; les points cerclés indiquent les couleurs présentes ailleurs. Chaque occurrence n’est comptée qu’une fois. Quatre couleurs bien placées font gagner ; dix essais sans trouver le code font perdre.

## Choix faits avec Codex

- JavaScript, HTML et CSS sans dépendance de code ni étape de compilation ; mise en page adaptée au téléphone et au clavier.
- L’interface et l’API utilisent le même moteur. Le code secret reste privé et n’apparaît jamais dans l’état de l’API.
- `?test=1` expose l’API commune 0.2. `?debug=1` affiche un banc d’essai distinct : choisir un code fixe, rejouer le scénario, puis révéler ou masquer le code.
- Pas de compte, serveur, paiement, données personnelles ni service d’IA. Les polices Google Fonts sont facultatives ; des polices système sont utilisées si elles ne sont pas disponibles.

## Vérifications API

`window.codeSecretTest` fournit `getConfig()`, `startGame(options)`, `submitGuess(guess)` et `getState()`. La configuration annonce quatre positions, six couleurs, les doublons autorisés et dix essais. Les changements d’état sont asynchrones ; les lectures sont synchrones. Les refus de proposition suivent cet ordre : partie non démarrée, partie terminée, type, longueur, couleur. Ils ne consomment pas d’essai ; seul `lastError` change. Un code imposé à `startGame({ secret })` sert aux tests, sans être ajouté à l’état.

## Tests attendus / obtenus

Les cas T01–T09 du contrat attendent, dans l’ordre, **bien placées / mal placées** : `1/2`, `0/2`, `0/4`, `2/2`, `4/0`, `2/0`, `2/2`, `4/0`, `1/2`. Un essai exact doit gagner ; les autres cas restent en cours.

**Obtenu :** `node tests.cjs` passe. Le script vérifie les neuf cas, les priorités d’erreur, l’absence de fuite du secret dans l’état, la victoire au dixième essai, la défaite, le redémarrage et la séparation des paramètres `?test=1` et `?debug=1`. `tests.html` fournit aussi une page de vérification dans un navigateur ; son rendu et ses interactions ne sont pas validés ici.

## Limites

La publication fonctionne comme site statique : aucun service hors ligne, installation PWA ou mise à jour automatique n’est inclus. Le test navigateur et le rendu mobile doivent être vérifiés sur le site publié. Les polices Google Fonts nécessitent une connexion, mais le jeu reste utilisable sans elles.

## Lancer et publier

Ouvrir `index.html` pour jouer, `index.html?debug=1` pour les parties tests, ou `tests.html` pour la suite navigateur. Pour publier, activer GitHub Pages sur la branche `main` et le dossier racine du dépôt. Lancer les tests locaux avec `node tests.cjs`.
