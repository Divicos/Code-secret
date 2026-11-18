"use strict";

const assert = require("node:assert/strict");

const root = { innerHTML: "", addEventListener() {} };
global.document = { getElementById: (id) => id === "app" ? root : null };
global.window = { location: { search: "?test=1" } };
require("./app.js");

const api = window.codeSecretTest;
const cases = [
  ["T01", ["rouge", "bleu", "vert", "jaune"], ["rouge", "vert", "bleu", "orange"], 1, 2],
  ["T02", ["rouge", "bleu", "vert", "jaune"], ["orange", "violet", "rouge", "bleu"], 0, 2],
  ["T03", ["rouge", "bleu", "vert", "jaune"], ["bleu", "rouge", "jaune", "vert"], 0, 4],
  ["T04", ["rouge", "bleu", "vert", "jaune"], ["rouge", "bleu", "jaune", "vert"], 2, 2],
  ["T05", ["rouge", "bleu", "vert", "jaune"], ["rouge", "bleu", "vert", "jaune"], 4, 0],
  ["T06", ["rouge", "rouge", "bleu", "vert"], ["rouge", "rouge", "rouge", "rouge"], 2, 0],
  ["T07", ["rouge", "rouge", "bleu", "vert"], ["rouge", "bleu", "rouge", "vert"], 2, 2],
  ["T08", ["rouge", "rouge", "bleu", "vert"], ["rouge", "rouge", "bleu", "vert"], 4, 0],
  ["T09", ["rouge", "rouge", "bleu", "vert"], ["rouge", "bleu", "rouge", "rouge"], 1, 2]
];

async function expectCode(action, code) {
  await assert.rejects(action, (error) => error.code === code);
}

(async () => {
  assert.ok(api, "l’API doit être exposée avec ?test=1");
  assert.equal(api.version, "0.2");
  assert.deepEqual(api.getConfig(), {
    apiVersion: "0.2", rulesVersion: "code-couleurs-1.0", secretLength: 4,
    maxAttempts: 10, allowDuplicates: true,
    colors: ["rouge", "bleu", "vert", "jaune", "orange", "violet"]
  });

  for (const [id, secret, guess, wellPlaced, misplaced] of cases) {
    await api.startGame({ secret });
    const state = await api.submitGuess(guess);
    assert.equal(state.lastResult.wellPlaced, wellPlaced, `${id}: bien placées`);
    assert.equal(state.lastResult.misplaced, misplaced, `${id}: mal placées`);
    assert.equal(state.attempts, 1, `${id}: nombre d’essais`);
    assert.equal(state.status, id === "T05" || id === "T08" ? "won" : "playing", `${id}: statut`);
    assert.equal("secret" in state || "solution" in state, false, `${id}: le code reste caché`);
  }

  await api.startGame({ secret: ["rouge", "rouge", "rouge", "rouge"] });
  const beforeRefusal = api.getState();
  await expectCode(() => api.submitGuess(["rouge", null]), "invalid-type");
  assert.equal(api.getState().attempts, beforeRefusal.attempts, "un refus ne consomme aucun essai");
  await expectCode(() => api.submitGuess(["rouge"]), "invalid-length");
  await expectCode(() => api.submitGuess(["Rouge", "bleu", "vert", "jaune"]), "invalid-color");
  await expectCode(() => api.submitGuess(["rouge", , "vert", "jaune"]), "invalid-type");
  assert.equal(api.getState().lastError.code, "invalid-type", "lastError décrit le dernier refus");

  const beforeInvalidStart = api.getState();
  await expectCode(() => api.startGame(null), "invalid-options");
  await expectCode(() => api.startGame({ secret: ["rouge"], extra: true }), "invalid-options");
  await expectCode(() => api.startGame({ secret: ["rouge", null, "bleu", "vert"] }), "invalid-type");
  await expectCode(() => api.startGame({ secret: ["rouge", "bleu", "vert"] }), "invalid-length");
  await expectCode(() => api.startGame({ secret: ["rouge", "bleu", "vert", "Violet"] }), "invalid-color");
  assert.deepEqual(api.getState(), beforeInvalidStart, "un démarrage invalide préserve l’état");

  await api.startGame({ secret: ["bleu", "bleu", "bleu", "bleu"] });
  for (let i = 0; i < 9; i += 1) await api.submitGuess(["rouge", "rouge", "rouge", "rouge"]);
  assert.equal(api.getState().status, "playing", "la partie reste active après neuf essais");
  const win = await api.submitGuess(["bleu", "bleu", "bleu", "bleu"]);
  assert.equal(win.status, "won", "une victoire au dixième essai est valide");
  await expectCode(() => api.submitGuess(null), "game-finished");
  assert.equal(api.getState().attempts, 10, "un refus après la fin ne modifie pas les essais");

  await api.startGame({ secret: ["rouge", "rouge", "rouge", "rouge"] });
  for (let i = 0; i < 10; i += 1) await api.submitGuess(["bleu", "bleu", "bleu", "bleu"]);
  assert.equal(api.getState().status, "lost", "dix erreurs terminent la partie");
  const restarted = await api.startGame({});
  assert.equal(restarted.status, "playing");
  assert.equal(restarted.attempts, 0);
  assert.deepEqual(restarted.history, []);
  assert.equal(restarted.lastError, null);

  console.log("Tous les contrôles passent : configuration, notation T01–T09, refus, fin de partie et redémarrage.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
