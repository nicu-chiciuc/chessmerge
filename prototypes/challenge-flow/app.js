(() => {
  "use strict";

  const root = document.querySelector("#screen-root");
  const toast = document.querySelector("#toast");
  const switcher = document.querySelector(".prototype-switcher");
  const currentViewLabel = document.querySelector("#prototype-current");

  const VIEWS = ["create", "waiting", "join", "joined", "unavailable"];
  const VIEW_LABELS = {
    create: "Create",
    waiting: "Waiting",
    join: "Join",
    joined: "Joined",
    unavailable: "Unavailable",
  };
  const FOCUS_TARGETS = {
    create: "[data-primary]",
    waiting: "[data-primary]",
    join: "[data-primary]",
    joined: "#joined-title",
    unavailable: "[data-primary]",
  };

  const CHALLENGE_URL = "https://chessmerge.com/c/amber-rook";
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const SYMBOLS = {
    black: { r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", p: "♟" },
    white: { r: "♖", n: "♘", b: "♗", q: "♕", k: "♔", p: "♙" },
  };

  function makeBoard() {
    const board = {};
    const backRank = ["r", "n", "b", "q", "k", "b", "n", "r"];

    FILES.forEach((file, index) => {
      board[`${file}8`] = [{ color: "black", type: backRank[index] }];
      board[`${file}7`] = [{ color: "black", type: "p" }];
      board[`${file}2`] = [{ color: "white", type: "p" }];
      board[`${file}1`] = [{ color: "white", type: backRank[index] }];
    });

    delete board.b8;
    delete board.d7;
    delete board.c1;
    delete board.b1;
    delete board.e2;
    board.d5 = [{ color: "black", type: "p" }];
    board.e4 = [{ color: "white", type: "p" }];
    board.c3 = [
      { color: "white", type: "n" },
      { color: "white", type: "b" },
    ];

    return board;
  }

  const BOARD = makeBoard();
  const params = new URLSearchParams(globalThis.location.search);
  const requestedView = params.get("view");
  const state = {
    view: VIEWS.includes(requestedView) ? requestedView : "create",
    confirmCancel: false,
  };

  let toastTimer;

  function pieceMarkup(pieces = []) {
    if (!pieces.length) return "";
    const symbols = pieces
      .map(
        (piece) =>
          `<span class="piece ${piece.color}">${
            SYMBOLS[piece.color][piece.type]
          }</span>`,
      )
      .join("");

    return pieces.length > 1
      ? `<span class="piece-stack">${symbols}<small>+</small></span>`
      : symbols;
  }

  function boardMarkup() {
    const squares = [];

    for (let rank = 8; rank >= 1; rank -= 1) {
      FILES.forEach((file, index) => {
        const square = `${file}${rank}`;
        const tone = (index + rank) % 2 === 0 ? "light" : "dark";
        squares.push(`
          <span class="board-square ${tone}" data-square="${square}" aria-hidden="true">
            <small>${square}</small>
            ${pieceMarkup(BOARD[square])}
          </span>
        `);
      });
    }

    return `
      <div class="board-frame">
        <div
          class="board-grid"
          role="img"
          aria-label="Static ChessMerge board preview with a merged white knight and bishop on c3"
        >${squares.join("")}</div>
      </div>
    `;
  }

  function boardPanel({ joined = false } = {}) {
    return `
      <section class="board-panel" aria-label="ChessMerge board preview">
        ${
          joined
            ? `<div class="player-strip"><strong>Host</strong><span>Opponent</span></div>`
            : `<div class="board-label"><strong>ChessMerge board</strong><span>Static preview</span></div>`
        }
        ${boardMarkup()}
        ${
          joined
            ? `<div class="player-strip"><strong>You</strong><span>Guest</span></div>`
            : `<p class="board-key"><span>+</span> Merged knight and bishop on c3</p>`
        }
      </section>
    `;
  }

  function playerSlot({ symbol, name, detail, empty = false }) {
    return `
      <div class="player-slot">
        <span class="avatar${
          empty ? " empty" : ""
        }" aria-hidden="true">${symbol}</span>
        <span><strong>${name}</strong><small>${detail}</small></span>
      </div>
    `;
  }

  function renderCreate() {
    return `
      <div class="screen-shell two-column">
        ${boardPanel()}
        <article class="ticket" aria-labelledby="create-title">
          <div class="ticket-body">
            <h1 id="create-title" tabindex="-1">Challenge a friend</h1>
            <p class="lede">Create an untimed game and send one link.</p>
            <div class="game-format"><span>Casual</span><span>Untimed</span></div>
            <button class="button primary" type="button" data-action="create" data-primary>
              Create challenge
            </button>
          </div>
        </article>
      </div>
    `;
  }

  function renderWaiting() {
    return `
      <div class="screen-shell two-column">
        ${boardPanel()}
        <article class="ticket" aria-labelledby="waiting-title">
          <div class="ticket-body">
            <h1 id="waiting-title" tabindex="-1">Waiting for an opponent</h1>
            <p class="waiting-state"><span aria-hidden="true"></span>No one has joined yet.</p>

            <div class="player-list" aria-label="Challenge seats">
              ${playerSlot({ symbol: "H", name: "Host", detail: "You" })}
              ${playerSlot({
                symbol: "?",
                name: "Opponent",
                detail: "Open seat",
                empty: true,
              })}
            </div>

            <label class="field-label" for="challenge-link">Challenge link</label>
            <div class="share-field">
              <input id="challenge-link" value="${CHALLENGE_URL}" readonly />
              <button type="button" data-action="copy" data-primary>Copy link</button>
            </div>

            <div class="button-row">
              <button class="button secondary" type="button" data-action="share">Share</button>
              <button class="button quiet danger" type="button" data-action="show-cancel">
                Cancel challenge
              </button>
            </div>

            <div class="cancel-box" ${state.confirmCancel ? "" : "hidden"}>
              <p>Cancel this challenge? The link will stop working.</p>
              <div class="button-row">
                <button class="button secondary" type="button" data-action="keep-waiting">
                  Keep waiting
                </button>
                <button class="button secondary danger" type="button" data-action="confirm-cancel">
                  Cancel challenge
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
    `;
  }

  function renderJoin() {
    return `
      <div class="screen-shell two-column">
        ${boardPanel()}
        <article class="ticket" aria-labelledby="join-title">
          <div class="ticket-body">
            <h1 id="join-title" tabindex="-1">Join this challenge</h1>
            <div class="game-format"><span>Casual</span><span>Untimed</span></div>
            <div class="player-list" aria-label="Challenge seats">
              ${playerSlot({
                symbol: "H",
                name: "Host",
                detail: "Challenge creator",
              })}
              ${playerSlot({
                symbol: "G",
                name: "You",
                detail: "Open guest seat",
                empty: true,
              })}
            </div>
            <button class="button primary" type="button" data-action="join" data-primary>
              Join as guest
            </button>
          </div>
        </article>
      </div>
    `;
  }

  function renderJoined() {
    return `
      <div class="screen-shell two-column joined-layout">
        ${boardPanel({ joined: true })}
        <article class="ticket" aria-labelledby="joined-title">
          <div class="ticket-body">
            <h1 id="joined-title" tabindex="-1">Game joined</h1>
            <p class="lede">You joined the untimed challenge.</p>
            <p class="prototype-boundary">
              Prototype boundary. The production game screen starts here.
            </p>
          </div>
        </article>
      </div>
    `;
  }

  function renderUnavailable() {
    return `
      <div class="screen-shell unavailable-shell">
        <article class="unavailable-card" aria-labelledby="unavailable-title">
          <div class="checker-band" aria-hidden="true"><span>×</span></div>
          <div class="ticket-body">
            <h1 id="unavailable-title" tabindex="-1">Challenge unavailable</h1>
            <p class="lede">
              This link can't be used. It may have expired, been canceled, or already have an opponent.
            </p>
            <button class="button primary" type="button" data-view-target="create" data-primary>
              Create a challenge
            </button>
          </div>
        </article>
      </div>
    `;
  }

  const renderers = {
    create: renderCreate,
    waiting: renderWaiting,
    join: renderJoin,
    joined: renderJoined,
    unavailable: renderUnavailable,
  };

  function updateUrl() {
    const url = new URL(globalThis.location.href);
    url.searchParams.set("view", state.view);
    globalThis.history.replaceState({}, "", url);
  }

  function updateSwitcher() {
    currentViewLabel.textContent = VIEW_LABELS[state.view];
    document
      .querySelectorAll(".prototype-menu [data-view-target]")
      .forEach((button) => {
        if (button.dataset.viewTarget === state.view) {
          button.setAttribute("aria-current", "page");
        } else {
          button.removeAttribute("aria-current");
        }
      });
  }

  function render({ focusSelector } = {}) {
    root.innerHTML = renderers[state.view]();
    updateSwitcher();
    document.title = `${
      VIEW_LABELS[state.view]
    } · ChessMerge challenge prototype`;

    if (focusSelector) {
      globalThis.requestAnimationFrame(() => {
        root.querySelector(focusSelector)?.focus();
      });
    }
  }

  function setView(view, { focus = true } = {}) {
    if (!VIEWS.includes(view)) return;
    state.view = view;
    state.confirmCancel = false;
    updateUrl();
    render({ focusSelector: focus ? FOCUS_TARGETS[view] : undefined });
    switcher.removeAttribute("open");
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showToast(message) {
    globalThis.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = globalThis.setTimeout(
      () => toast.classList.remove("visible"),
      1800,
    );
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const field = document.createElement("textarea");
    field.value = text;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }

  async function shareChallenge() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "ChessMerge challenge",
          text: "Join my untimed ChessMerge challenge.",
          url: CHALLENGE_URL,
        });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    await copyText(CHALLENGE_URL);
    showToast("Challenge link copied");
  }

  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view-target]");
    if (viewButton) {
      setView(viewButton.dataset.viewTarget);
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const action = actionButton.dataset.action;

    if (action === "create") {
      setView("waiting");
    } else if (action === "copy") {
      void copyText(CHALLENGE_URL)
        .then(() => {
          actionButton.textContent = "Copied";
          showToast("Challenge link copied");
          globalThis.setTimeout(() => {
            if (actionButton.isConnected) {
              actionButton.textContent = "Copy link";
            }
          }, 1200);
        })
        .catch(() => showToast("Select the link to copy it."));
    } else if (action === "share") {
      void shareChallenge();
    } else if (action === "show-cancel") {
      state.confirmCancel = true;
      render({ focusSelector: '[data-action="keep-waiting"]' });
    } else if (action === "keep-waiting") {
      state.confirmCancel = false;
      render({ focusSelector: '[data-action="show-cancel"]' });
    } else if (action === "confirm-cancel") {
      setView("unavailable");
      showToast("Challenge canceled");
    } else if (action === "join") {
      setView("joined");
    }
  });

  globalThis.addEventListener("popstate", () => {
    const view = new URLSearchParams(globalThis.location.search).get("view");
    if (!VIEWS.includes(view)) return;
    state.view = view;
    state.confirmCancel = false;
    render({ focusSelector: `#${view}-title` });
  });

  updateUrl();
  render();
})();
