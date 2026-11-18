# Code secret — le jeu des couleurs

**Version 1.0** · Application solo de déduction inspirée du Mastermind. Le jeu fonctionne dans un navigateur moderne sans compte, serveur applicatif, dépendance externe de code ou service d’IA. La police de caractères peut être chargée depuis Google Fonts ; les polices système prennent le relais hors ligne.

## Jouer

Ouvrez `index.html` dans un navigateur, ou publiez le contenu de ce dossier sur GitHub Pages. Choisissez quatre couleurs parmi rouge, bleu, vert, jaune, orange et violet. Les répétitions sont autorisées. Après chaque essai, les points foncés marquent les couleurs à la bonne position et les points cerclés indiquent les couleurs présentes ailleurs. Vous disposez de dix essais.

## API commune de test 0.2

L’API n’est exposée que lorsque l’URL contient `?test=1`. Elle est disponible sous `window.codeSecretTest` et utilise exactement le même moteur que l’interface.

```js
const api = window.codeSecretTest;
const config = api.getConfig();
await api.startGame({ secret: ["rouge", "rouge", "bleu", "vert"] });
const state = await api.submitGuess(["rouge", "bleu", "rouge", "vert"]);
console.log(state.lastResult); // { wellPlaced: 2, misplaced: 2 }
```

`getConfig()` et `getState()` sont synchrones. `startGame()` et `submitGuess()` renvoient des promesses. Un refus rejette une erreur qui porte un `code` normalisé ; pour une proposition refusée, seul `lastError` change. L’état ne révèle pas le code secret. Les résultats et l’historique sont des copies indépendantes de l’état interne.

## Vérifications

Ouvrez `tests.html` depuis le même dossier ou la même origine pour lancer les cas reproductibles T01–T09 du contrat, les priorités d’erreur et les scénarios de cycle de vie. La page présente chaque résultat. Le paramètre `?test=1` est ajouté uniquement à l’instance isolée utilisée par cette page. Avec Node.js, lancez aussi `node tests.cjs` pour vérifier la logique du moteur en ligne de commande, sans dépendance.

## Publication GitHub Pages

Dans les paramètres du dépôt, activez **Pages** et choisissez la branche et le dossier contenant `index.html` (par exemple `/(root)`). Les liens et ressources du jeu utilisent des chemins relatifs pour fonctionner sous le chemin du dépôt. Aucune étape de compilation n’est nécessaire.

## Vérification et limites

Le code et les cas de vérification sont fournis ; lancez `tests.html` après modification et sur l’adresse publiée. Le comportement en ligne dépend de la configuration GitHub Pages. L’installation PWA, le jeu hors ligne et les mises à jour automatiques sont facultatifs et ne sont pas inclus dans cette version.
