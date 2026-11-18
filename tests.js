(function () {
  "use strict";

  const summary = document.getElementById("summary");
  const list = document.getElementById("results");
  const frame = document.getElementById("fixture");
  const cases = [
    { id: "T01", secret: ["rouge", "bleu", "vert", "jaune"], guess: ["rouge", "vert", "bleu", "orange"], well: 1, misplaced: 2 },
    { id: "T02", secret: ["rouge", "bleu", "vert", "jaune"], guess: ["orange", "violet", "rouge", "bleu"], well: 0, misplaced: 2 },
    { id: "T03", secret: ["rouge", "bleu", "vert", "jaune"], guess: ["bleu", "rouge", "jaune", "vert"], well: 0, misplaced: 4 },
    { id: "T04", secret: ["rouge", "bleu", "vert", "jaune"], guess: ["rouge", "bleu", "jaune", "vert"], well: 2, misplaced: 2 },
    { id: "T05", secret: ["rouge", "bleu", "vert", "jaune"], guess: ["rouge", "bleu", "vert", "jaune"], well: 4, misplaced: 0, status: "won" },
    { id: "T06", secret: ["rouge", "rouge", "bleu", "vert"], guess: ["rouge", "rouge", "rouge", "rouge"], well: 2, misplaced: 0 },
    { id: "T07", secret: ["rouge", "rouge", "bleu", "vert"], guess: ["rouge", "bleu", "rouge", "vert"], well: 2, misplaced: 2 },
    { id: "T08", secret: ["rouge", "rouge", "bleu", "vert"], guess: ["rouge", "rouge", "bleu", "vert"], well: 4, misplaced: 0, status: "won" },
    { id: "T09", secret: ["rouge", "rouge", "bleu", "vert"], guess: ["rouge", "bleu", "rouge", "rouge"], well: 1, misplaced: 2 }
  ];

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function expectCode(action, expected) {
    try {
      await action();
    } catch (error) {
      check(error && error.code === expected, `code attendu ${expected}, reçu ${error && error.code}`);
      return;
    }
    throw new Error(`le refus ${expected} était attendu`);
  }

  async function run() {
    await new Promise((resolve, reject) => {
      if (frame.contentWindow && frame.contentWindow.codeSecretTest) return resolve();
      frame.addEventListener("load", () => {
        if (frame.contentWindow && frame.contentWindow.codeSecretTest) resolve();
        else reject(new Error("L’API de test n’est pas exposée dans l’instance ?test=1."));
      }, { once: true });
      window.setTimeout(() => reject(new Error("L’instance de jeu ne répond pas.")), 6000);
    });

    const api = frame.contentWindow.codeSecretTest;
    const passed = [];
    const test = async (label, action) => {
      try {
        await action();
        passed.push({ label, ok: true });
      } catch (error) {
        passed.push({ label: `${label} — ${error.message}`, ok: false });
      }
    };

    await test("Configuration 0.2 et palette commune", async () => {
      const config = api.getConfig();
      check(api.version === "0.2" && config.apiVersion === "0.2", "version 0.2 attendue");
      check(config.rulesVersion === "code-couleurs-1.0", "version de règles incorrecte");
      check(config.secretLength === 4 && config.maxAttempts === 10 && config.allowDuplicates === true, "paramètres de partie incorrects");
      check(config.colors.join(",") === "rouge,bleu,vert,jaune,orange,violet", "palette incorrecte");
      config.colors[0] = "modifie";
      check(api.getConfig().colors[0] === "rouge", "la palette exposée doit être une copie");
    });

    for (const item of cases) {
      await test(`${item.id} · indices ${item.well} bien, ${item.misplaced} mal`, async () => {
        await api.startGame({ secret: item.secret });
        const state = await api.submitGuess(item.guess);
        check(state.attempts === 1 && state.history.length === 1, "un essai valide doit être enregistré");
        check(state.lastResult.wellPlaced === item.well, "nombre de couleurs bien placées incorrect");
        check(state.lastResult.misplaced === item.misplaced, "nombre de couleurs mal placées incorrect");
        check(state.history[0].result.wellPlaced === item.well, "l’historique doit refléter le résultat");
        check(state.status === (item.status || "playing"), `statut ${item.status || "playing"} attendu`);
        check(!("secret" in state) && !("solution" in state), "le code secret ne doit pas apparaître dans l’état");
      });
    }

    await test("Priorité des refus et état préservé", async () => {
      await api.startGame({ secret: ["rouge", "rouge", "rouge", "rouge"] });
      const before = api.getState();
      await expectCode(() => api.submitGuess(["rouge", null]), "invalid-type");
      check(api.getState().attempts === before.attempts && api.getState().history.length === before.history.length, "un refus ne doit pas consommer d’essai");
      await expectCode(() => api.submitGuess(["rouge"]), "invalid-length");
      await expectCode(() => api.submitGuess(["rouge", "bleu", "vert", "Violet"]), "invalid-color");
      check(api.getState().lastError.code === "invalid-color", "lastError doit décrire le dernier refus");
    });

    await test("Priorité game-finished et redémarrage", async () => {
      await api.startGame({ secret: ["jaune", "orange", "violet", "bleu"] });
      await api.submitGuess(["jaune", "orange", "violet", "bleu"]);
      await expectCode(() => api.submitGuess(null), "game-finished");
      const state = await api.startGame({});
      check(state.status === "playing" && state.attempts === 0 && state.history.length === 0, "un redémarrage doit vider la partie");
      check(state.lastGuess === null && state.lastResult === null && state.lastError === null, "le redémarrage doit réinitialiser les champs last");
    });

    await test("Priorité des options et secret invalide", async () => {
      const before = api.getState();
      await expectCode(() => api.startGame(null), "invalid-options");
      await expectCode(() => api.startGame({ secret: ["rouge"], extra: true }), "invalid-options");
      await expectCode(() => api.startGame({ secret: ["rouge", null, "bleu", "vert"] }), "invalid-type");
      await expectCode(() => api.startGame({ secret: ["rouge", "bleu", "vert"] }), "invalid-length");
      await expectCode(() => api.startGame({ secret: ["rouge", "bleu", "vert", "Violet"] }), "invalid-color");
      check(JSON.stringify(api.getState()) === JSON.stringify(before), "un démarrage invalide ne doit modifier aucun état");
    });

    await test("Victoire au dixième essai et défaite", async () => {
      await api.startGame({ secret: ["rouge", "rouge", "rouge", "rouge"] });
      for (let index = 0; index < 9; index += 1) await api.submitGuess(["bleu", "bleu", "bleu", "bleu"]);
      check(api.getState().attempts === 9 && api.getState().status === "playing", "la partie doit rester active après neuf essais");
      const won = await api.submitGuess(["rouge", "rouge", "rouge", "rouge"]);
      check(won.status === "won" && won.attempts === 10, "la victoire au dixième essai doit être reconnue");

      await api.startGame({ secret: ["rouge", "rouge", "rouge", "rouge"] });
      for (let index = 0; index < 10; index += 1) await api.submitGuess(["bleu", "bleu", "bleu", "bleu"]);
      const lost = api.getState();
      check(lost.status === "lost" && lost.attempts === 10, "la partie doit se terminer après dix essais manqués");
      await expectCode(() => api.submitGuess(["rouge", "rouge", "rouge", "rouge"]), "game-finished");
      check(api.getState().attempts === 10 && api.getState().history.length === 10, "un refus après la fin ne modifie pas l’historique");
    });

    list.innerHTML = passed.map((result) => `<li class="test-item${result.ok ? "" : " fail"}"><span>${result.label}</span><strong>${result.ok ? "RÉUSSI" : "ÉCHEC"}</strong></li>`).join("");
    const failures = passed.filter((result) => !result.ok).length;
    summary.textContent = `${passed.length - failures}/${passed.length} vérifications réussies${failures ? ` · ${failures} échec${failures > 1 ? "s" : ""}` : " · tout est conforme"}.`;
    summary.style.color = failures ? "#994d40" : "var(--green)";
  }

  frame.addEventListener("load", () => {
    run().catch((error) => {
      summary.textContent = `Vérification interrompue : ${error.message}`;
      summary.style.color = "#994d40";
    });
  }, { once: true });
})();
