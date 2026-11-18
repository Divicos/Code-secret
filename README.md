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

| Description du test | Résultat attendu | Résultat obtenu |
| --- | --- | --- |
| T01 — code distinct, couleurs permutées et une couleur absente | 1 bien placée, 2 mal placées ; partie en cours | Conforme : 1/2 ; partie en cours |
| T02 — proposition contenant deux couleurs absentes | 0 bien placée, 2 mal placées ; partie en cours | Conforme : 0/2 ; partie en cours |
| T03 — les quatre couleurs présentes, toutes permutées | 0 bien placée, 4 mal placées ; partie en cours | Conforme : 0/4 ; partie en cours |
| T04 — deux positions exactes, deux couleurs permutées | 2 bien placées, 2 mal placées ; partie en cours | Conforme : 2/2 ; partie en cours |
| T05 — proposition identique au code | 4 bien placées, 0 mal placée ; victoire | Conforme : 4/0 ; victoire |
| T06 — code répété `rouge-rouge-bleu-vert`, proposition `rouge-rouge-rouge-rouge` | 2 bien placées, 0 mal placée ; doublons comptés une seule fois | Conforme : 2/0 |
| T07 — code répété avec deux couleurs déplacées | 2 bien placées, 2 mal placées ; partie en cours | Conforme : 2/2 ; partie en cours |
| T08 — proposition identique à un code répété | 4 bien placées, 0 mal placée ; victoire | Conforme : 4/0 ; victoire |
| T09 — couleurs répétées et occurrences excédentaires | 1 bien placée, 2 mal placées ; partie en cours | Conforme : 1/2 ; partie en cours |
| Refus de proposition : type invalide, longueur invalide, puis couleur invalide | Codes `invalid-type`, `invalid-length`, `invalid-color` dans cet ordre ; aucun essai consommé | Conforme ; `lastError` décrit le dernier refus |
| Refus de démarrage : options ou code secret mal formés | Rejet avec le code d’erreur approprié ; état précédent inchangé | Conforme pour options, type, longueur et couleur |
| Cycle de vie : victoire au 10e essai, défaite au 10e, appel après la fin, redémarrage | Statuts `won`/`lost`, refus `game-finished`, puis nouvel état `playing` vide | Conforme ; essais et historique vérifiés |
| Séparation `?test=1` et `?debug=1` | API commune exposée uniquement par `?test=1` ; banc d’essai masqué en mode commun | Conforme ; l’état API ne contient pas le secret |

**Vérification obtenue :** toutes ces assertions passent avec `node tests.cjs`. `tests.html` fournit aussi une page navigateur ; son rendu et ses interactions n’ont pas été validés ici.

## Limites

La publication fonctionne comme site statique : aucun service hors ligne, installation PWA ou mise à jour automatique n’est inclus. Le test navigateur et le rendu mobile doivent être vérifiés sur le site publié. Les polices Google Fonts nécessitent une connexion, mais le jeu reste utilisable sans elles.

## Lancer et publier

Ouvrir `index.html` pour jouer, `index.html?debug=1` pour les parties tests, ou `tests.html` pour la suite navigateur. Pour publier, activer GitHub Pages sur la branche `main` et le dossier racine du dépôt. Lancer les tests locaux avec `node tests.cjs`.

## Appareils testés

Le jeu est testé sur Windows.

### Tests sur téléphones

Le jeu a été testé sur Iphone X. Le jeu est fonctionnel

## Certification d'un camarade

Le jeu et l'API ont été testés par un camarade. Aucun bug n'a été constaté.
