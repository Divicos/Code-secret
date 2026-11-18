(function () {
  "use strict";

  const COLORS = ["rouge", "bleu", "vert", "jaune", "orange", "violet"];
  const COLOR_LABELS = {
    rouge: "Rouge", bleu: "Bleu", vert: "Vert", jaune: "Jaune", orange: "Orange", violet: "Violet"
  };
  const app = document.getElementById("app");

  function clone(value) {
    return value === null ? null : JSON.parse(JSON.stringify(value));
  }

  function makeState() {
    return { status: "not-started", attempts: 0, history: [], lastGuess: null, lastResult: null, lastError: null };
  }

  let state = makeState();
  let secret = null;

  function failure(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  function rejectInput(code) {
    const messages = {
      "game-not-started": "Commencez une partie avant de proposer un code.",
      "game-finished": "Cette partie est terminée. Lancez une nouvelle partie pour rejouer.",
      "invalid-type": "La proposition doit contenir uniquement des noms de couleurs.",
      "invalid-length": "La proposition doit contenir exactement quatre couleurs.",
      "invalid-color": "La couleur proposée n’est pas autorisée.",
      "invalid-options": "Les options de partie ne sont pas valides."
    };
    return failure(code, messages[code] || "La saisie n’est pas valide.");
  }

  function getConfig() {
    return {
      apiVersion: "0.2",
      rulesVersion: "code-couleurs-1.0",
      secretLength: 4,
      maxAttempts: 10,
      allowDuplicates: true,
      colors: COLORS.slice()
    };
  }

  function getState() {
    return clone(state);
  }

  function validateCode(code) {
    if (!Array.isArray(code)) {
      throw rejectInput("invalid-type");
    }
    for (let index = 0; index < code.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(code, index) || typeof code[index] !== "string") {
        throw rejectInput("invalid-type");
      }
    }
    if (code.length !== 4) throw rejectInput("invalid-length");
    if (code.some((color) => !COLORS.includes(color))) throw rejectInput("invalid-color");
    return code.slice();
  }

  function randomSecret() {
    return Array.from({ length: 4 }, () => COLORS[Math.floor(Math.random() * COLORS.length)]);
  }

  function startGame(options) {
    return Promise.resolve().then(() => {
      let settings = options;
      if (settings === undefined) settings = {};
      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        throw rejectInput("invalid-options");
      }
      const keys = Object.keys(settings);
      if (keys.some((key) => key !== "secret") || keys.length > 1) throw rejectInput("invalid-options");

      let nextSecret;
      if (Object.prototype.hasOwnProperty.call(settings, "secret")) {
        nextSecret = validateCode(settings.secret);
      } else {
        nextSecret = randomSecret();
      }

      secret = nextSecret;
      state = makeState();
      state.status = "playing";
      render();
      return getState();
    });
  }

  function score(guess) {
    let wellPlaced = 0;
    const remainingSecret = [];
    const remainingGuess = [];
    for (let index = 0; index < 4; index += 1) {
      if (secret[index] === guess[index]) wellPlaced += 1;
      else {
        remainingSecret.push(secret[index]);
        remainingGuess.push(guess[index]);
      }
    }
    const counts = new Map();
    for (const color of remainingSecret) counts.set(color, (counts.get(color) || 0) + 1);
    let misplaced = 0;
    for (const color of remainingGuess) {
      const count = counts.get(color) || 0;
      if (count > 0) {
        misplaced += 1;
        counts.set(color, count - 1);
      }
    }
    return { wellPlaced, misplaced };
  }

  function submitGuess(guess) {
    return Promise.resolve().then(() => {
      if (state.status === "not-started") throw rejectInput("game-not-started");
      if (state.status === "won" || state.status === "lost") throw rejectInput("game-finished");

      const validGuess = validateCode(guess);
      const result = score(validGuess);
      const entry = { guess: validGuess, result };
      state.history.push(entry);
      state.attempts = state.history.length;
      state.lastGuess = validGuess.slice();
      state.lastResult = { ...result };
      state.lastError = null;

      if (result.wellPlaced === 4) state.status = "won";
      else if (state.attempts === 10) state.status = "lost";

      render();
      return getState();
    }).catch((error) => {
      if (error && error.code) {
        state.lastError = { code: error.code, message: error.message };
        render();
      }
      throw error;
    });
  }

  function testApiEnabled() {
    return new URLSearchParams(window.location.search).get("test") === "1";
  }

  if (testApiEnabled()) {
    window.codeSecretTest = Object.freeze({
      version: "0.2",
      getConfig,
      startGame,
      submitGuess,
      getState
    });
  }

  function peg(color, small) {
    return `<span class="peg ${color}${small ? " small" : ""}" role="img" aria-label="${COLOR_LABELS[color]}"></span>`;
  }

  function feedbackDots(result) {
    const dots = [];
    for (let i = 0; i < result.wellPlaced; i += 1) dots.push("well");
    for (let i = 0; i < result.misplaced; i += 1) dots.push("misplaced");
    while (dots.length < 4) dots.push("blank");
    return `<span class="feedback" aria-label="${result.wellPlaced} bien placée, ${result.misplaced} mal placée">${dots.map((kind) => `<i class="peg small ${kind}" aria-hidden="true"></i>`).join("")}</span>`;
  }

  function renderHistory() {
    if (state.history.length === 0) {
      return `<div class="empty-board"><span class="empty-glyph" aria-hidden="true">○ ○ ○ ○</span><span>VOS ESSAIS APPARAÎTRONT ICI</span></div>`;
    }
    return `<div class="board" aria-label="Historique des essais">${state.history.map((entry, index) => `
      <div class="history-row">
        <span class="row-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="guess-pegs" aria-label="Proposition ${entry.guess.map((color) => COLOR_LABELS[color]).join(", ")}">${entry.guess.map((color) => peg(color, false)).join("")}</span>
        ${feedbackDots(entry.result)}
      </div>`).join("")}</div>`;
  }

  function renderMessage() {
    if (state.lastError) return `<p class="game-message error" role="alert">${state.lastError.message}</p>`;
    if (state.status === "won") return `<p class="game-message" role="status">Code trouvé en ${state.attempts} ${state.attempts === 1 ? "essai" : "essais"}. Belle déduction !</p>`;
    if (state.status === "lost") return `<p class="game-message lost" role="status">Les dix essais sont écoulés. Relancez une partie pour retenter votre chance.</p>`;
    return `<p class="game-message" role="status" hidden></p>`;
  }

  function renderComposer() {
    if (state.status === "not-started") {
      return `<div class="composer"><p class="composer-label">Prêt·e à jouer ?</p><div class="action-row"><span class="form-error">Le code secret est choisi au hasard.</span><button class="primary-button" type="button" data-action="start">Commencer une partie <span aria-hidden="true">→</span></button></div></div>`;
    }

    if (state.status === "won" || state.status === "lost") {
      return `<div class="composer"><div class="action-row"><span class="form-error">Partie terminée · ${state.attempts}/10 essais</span><button class="primary-button" type="button" data-action="start">Rejouer <span aria-hidden="true">↻</span></button></div></div>`;
    }

    const disabled = state.attempts >= 10;
    const options = COLORS.map((color) => `<option value="${color}">${COLOR_LABELS[color]}</option>`).join("");
    return `<form class="composer" id="guess-form">
      <label class="composer-label" for="slot-1">Votre proposition <span>Choisissez 4 couleurs</span></label>
      <div class="slots">${[0, 1, 2, 3].map((index) => `<div class="slot"><label class="slot-label" for="slot-${index + 1}">PLACE ${index + 1}</label><select id="slot-${index + 1}" name="color-${index + 1}" aria-label="Couleur en position ${index + 1}" ${disabled ? "disabled" : ""}><option value="">—</option>${options}</select></div>`).join("")}</div>
      <div class="action-row"><span class="form-error" aria-live="polite" data-form-error></span><button class="primary-button" type="submit" ${disabled ? "disabled" : ""}>Valider l’essai <span aria-hidden="true">→</span></button></div>
    </form>`;
  }

  function render() {
    if (!app) return;
    const attemptsLeft = 10 - state.attempts;
    app.innerHTML = `
      <section class="left-column" aria-labelledby="main-title">
        <div class="hero-copy">
          <p class="eyebrow">Un jeu de déduction · 01</p>
          <h1 id="main-title">Le code est<br><span class="accent-word">à vous.</span></h1>
          <p class="intro">Quatre couleurs, dix essais. À chaque proposition, un indice vous rapproche du code secret. Observez, éliminez, déduisez.</p>
        </div>
        <section class="game-card" aria-labelledby="game-title">
          <div class="card-heading"><h2 id="game-title">Votre partie</h2><span class="attempt-badge">ESSAIS RESTANTS <strong>${attemptsLeft}</strong></span></div>
          ${renderMessage()}
          ${renderHistory()}
          ${renderComposer()}
        </section>
      </section>
      <aside class="right-column" aria-labelledby="rules-title">
        <section class="rules-card">
          <p class="eyebrow">À garder en tête</p>
          <h2 id="rules-title">Comment jouer</h2>
          <ol class="rule-list">
            <li><span class="rule-number">01</span><span><strong>Trouvez la combinaison.</strong> Le code secret contient quatre couleurs. Une couleur peut apparaître plusieurs fois.</span></li>
            <li><span class="rule-number">02</span><span><strong>Proposez votre code.</strong> Choisissez une couleur pour chacune des quatre positions, puis validez.</span></li>
            <li><span class="rule-number">03</span><span><strong>Décryptez l’indice.</strong> Les points foncés indiquent une couleur bien placée ; les contours, une couleur présente ailleurs.</span></li>
            <li><span class="rule-number">04</span><span><strong>Vous avez dix essais.</strong> Trouvez les quatre bonnes positions avant la fin pour gagner.</span></li>
          </ol>
          <div class="palette" aria-label="Palette des six couleurs">${COLORS.map((color) => `<span class="palette-item">${peg(color, false)}${COLOR_LABELS[color]}</span>`).join("")}</div>
          <div class="note"><span class="note-mark" aria-hidden="true">i</span><span>Un point n’indique pas quelle couleur ni quelle position est correcte. C’est à vous de faire le lien entre les essais.</span></div>
        </section>
      </aside>`;
  }

  app.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action='start']");
    if (!button) return;
    await startGame();
  });

  app.addEventListener("submit", async (event) => {
    if (event.target.id !== "guess-form") return;
    event.preventDefault();
    const values = Array.from(event.target.querySelectorAll("select"), (select) => select.value || undefined);
    const error = event.target.querySelector("[data-form-error]");
    if (values.some((value) => value === undefined)) {
      error.textContent = "Choisissez une couleur dans chacune des quatre positions.";
      return;
    }
    try {
      await submitGuess(values);
    } catch (_) {
      // The shared engine renders the common, accessible error message.
    }
  });

  render();
})();
