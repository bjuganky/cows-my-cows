const CORRECT_PASSWORD = "bkferules";

// Password protection - setup on DOM ready
function initPasswordProtection() {
  const mainApp = document.getElementById("mainApp");
  const publicView = document.getElementById("publicView");
  const passwordModal = document.getElementById("passwordModal");
  const passwordForm = document.getElementById("passwordForm");
  const passwordInput = document.getElementById("passwordInput");
  const settingsBtn2 = document.getElementById("settingsBtn2");

  if (!mainApp || !passwordModal || !passwordForm || !passwordInput) {
    console.error("Password modal elements not found");
    return;
  }

  // Check if user already authenticated in this session
  if (sessionStorage.getItem("gameAuthenticated") === "true") {
    mainApp.style.display = "block";
    publicView.style.display = "none";
    if (settingsBtn2) settingsBtn2.style.display = "block";
    return;
  }

  // Show password modal
  mainApp.style.display = "none";
  publicView.style.display = "block";
  if (settingsBtn2) settingsBtn2.style.display = "none";
  
  // Use setTimeout to ensure modal is ready
  setTimeout(() => {
    passwordModal.showModal();
  }, 100);

  // Setup form submission
  passwordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (passwordInput.value === CORRECT_PASSWORD) {
      sessionStorage.setItem("gameAuthenticated", "true");
      mainApp.style.display = "block";
      publicView.style.display = "none";
      if (settingsBtn2) settingsBtn2.style.display = "block";
      passwordModal.close();
    } else {
      passwordInput.value = "";
      passwordInput.placeholder = "Wrong password, try again";
      passwordInput.focus();
    }
  });
}

// Wait for DOM to be fully loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPasswordProtection);
} else {
  initPasswordProtection();
}

const STORAGE_KEY = "cows-my-cows-v1";
const FIREBASE_DB_URL = "https://cows-my-cows-default-rtdb.firebaseio.com";

let firebaseSyncEnabled = true; // REST API is always available
let isLoadingFromFirebase = false;

// Firebase REST API functions
async function loadStateFromFirebase() {
  try {
    isLoadingFromFirebase = true;
    const response = await fetch(`${FIREBASE_DB_URL}/games/default.json`);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    isLoadingFromFirebase = false;
    return data || null;
  } catch (error) {
    console.error("Firebase load error:", error.message);
    isLoadingFromFirebase = false;
    return null;
  }
}

async function saveStateToFirebase(state) {
  if (!firebaseSyncEnabled) return;
  try {
    const jsonBody = JSON.stringify(state);
    const response = await fetch(`${FIREBASE_DB_URL}/games/default.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: jsonBody
    });
    
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    console.log("✓ Firebase save successful");
  } catch (error) {
    console.error("Firebase save error:", error.message);
    toast("Error saving to cloud: " + error.message);
  }
}

const freshState = () => ({
  drive: 1,
  whataburgerCount: 0,
  players: [],
  rules: [],
  history: []
});

let state = loadState();
let snapshotBeforeAction = null;
let pendingHandler = null;

const $ = (id) => document.getElementById(id);
const modal = $("modal");
const modalForm = $("modalForm");

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.players) && Array.isArray(parsed.rules) && Array.isArray(parsed.history)) {
      return parsed;
    }
  } catch {}
  return freshState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (firebaseSyncEnabled && !isLoadingFromFirebase) {
    saveStateToFirebase(state);
  }
  render();
}

async function enableFirebaseSync() {
  if (!firebaseSyncEnabled) return;
  const fbState = await loadStateFromFirebase();
  if (fbState && typeof fbState === 'object') {
    // Merge Firebase state with current state to preserve all fields
    state = {
      drive: fbState.drive !== undefined ? fbState.drive : state.drive,
      whataburgerCount: fbState.whataburgerCount !== undefined ? fbState.whataburgerCount : state.whataburgerCount,
      players: Array.isArray(fbState.players) ? fbState.players : state.players,
      rules: Array.isArray(fbState.rules) ? fbState.rules : state.rules,
      history: Array.isArray(fbState.history) ? fbState.history : state.history
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    console.log("Loaded state from Firebase:", state);
    render();
  } else {
    console.log("Firebase is empty, using local state");
  }
  
  // Poll Firebase every 5 seconds for updates
  setInterval(async () => {
    if (!isLoadingFromFirebase) {
      const fbState = await loadStateFromFirebase();
      if (fbState && typeof fbState === 'object') {
        // Merge Firebase state with current state
        const mergedState = {
          drive: fbState.drive !== undefined ? fbState.drive : state.drive,
          whataburgerCount: fbState.whataburgerCount !== undefined ? fbState.whataburgerCount : state.whataburgerCount,
          players: Array.isArray(fbState.players) ? fbState.players : state.players,
          rules: Array.isArray(fbState.rules) ? fbState.rules : state.rules,
          history: Array.isArray(fbState.history) ? fbState.history : state.history
        };
        if (JSON.stringify(state) !== JSON.stringify(mergedState)) {
          state = mergedState;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          render();
          toast("Game updated from cloud");
        }
      }
    }
  }, 5000);
}

function snapshot() {
  snapshotBeforeAction = JSON.stringify(state);
}

function addHistory(text) {
  state.history.unshift({
    id: uid(),
    text,
    time: new Date().toLocaleString()
  });
  state.history = state.history.slice(0, 100);
}

function pct(value, percent) {
  return Math.ceil(value * percent / 100);
}

function playerById(id) {
  return state.players.find(p => p.id === id);
}

function activePlayers() {
  return state.players;
}

function options(selected = "") {
  if (!state.players.length) return `<option value="">No players</option>`;
  return state.players.map(p =>
    `<option value="${p.id}" ${p.id === selected ? "selected" : ""}>${escapeHtml(p.name)}</option>`
  ).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[c]);
}

function toast(message) {
  const t = $("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 2200);
}

function openModal(title, body, confirmText, handler) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = body;
  $("modalConfirm").textContent = confirmText || "Confirm";
  pendingHandler = handler;
  modal.showModal();
}

modalForm.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  if (pendingHandler && pendingHandler()) {
    modal.close();
    pendingHandler = null;
  }
});

function render() {
  try {
    // Ensure state has all required properties
    if (!state || typeof state !== 'object') {
      console.warn("State is invalid, resetting to fresh state", state);
      state = freshState();
    }
    if (!state.players || !Array.isArray(state.players)) {
      console.warn("state.players is invalid, resetting");
      state.players = [];
    }
    if (!state.rules || !Array.isArray(state.rules)) {
      console.warn("state.rules is invalid, resetting");
      state.rules = [];
    }
    if (!state.history || !Array.isArray(state.history)) {
      console.warn("state.history is invalid, resetting");
      state.history = [];
    }
    if (typeof state.drive !== 'number') state.drive = 1;
    if (typeof state.whataburgerCount !== 'number') state.whataburgerCount = 0;

    $("driveNumber").textContent = state.drive;
    $("playerCount").textContent = state.players.length;
    $("whataburgerCount").textContent = state.whataburgerCount;

    const sorted = [...state.players].sort((a,b) => b.cows - a.cows || b.bank - a.bank || a.name.localeCompare(b.name));
    $("scoreboard").className = state.players.length ? "scoreboard" : "scoreboard empty-state";
    $("scoreboard").innerHTML = state.players.length ? sorted.map((p, i) => {
    let insuranceText = "not insured";
    if (p.insurance) {
      const now = new Date();
      const daysLeft = Math.ceil((new Date(p.insurance.expiresAt) - now) / (1000 * 60 * 60 * 24));
      insuranceText = daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "expired";
    }
    return `
    <div class="player-row" data-player="${p.id}">
      <div class="rank">${i + 1}</div>
      <div>
        <div class="player-name">${escapeHtml(p.name)} ${p.insurance ? "[INSURED]" : ""}</div>
        <div class="player-meta">Bank: ${p.bank} · ${insuranceText}</div>
      </div>
      <div class="score"><strong>${p.cows}</strong><small>cows</small></div>
    </div>
  `;
  }).join("") : "Add players to begin.";

  // Update scoreboard in mainApp as well
  if ($("scoreboardMain")) {
    $("scoreboardMain").className = state.players.length ? "scoreboard" : "scoreboard empty-state";
    $("scoreboardMain").innerHTML = state.players.length ? sorted.map((p, i) => {
      let insuranceText = "not insured";
      if (p.insurance) {
        const now = new Date();
        const daysLeft = Math.ceil((new Date(p.insurance.expiresAt) - now) / (1000 * 60 * 60 * 24));
        insuranceText = daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "expired";
      }
      return `
      <div class="player-row" data-player="${p.id}">
        <div class="rank">${i + 1}</div>
        <div>
          <div class="player-name">${escapeHtml(p.name)} ${p.insurance ? "[INSURED]" : ""}</div>
          <div class="player-meta">Bank: ${p.bank} · ${insuranceText}</div>
        </div>
        <div class="score"><strong>${p.cows}</strong><small>cows</small></div>
      </div>
    `;
    }).join("") : "Add players to begin.";
  }

  $("claimPlayer").innerHTML = options($("claimPlayer").value);

  $("historyList").className = state.history.length ? "history-list" : "history-list empty-state";
  $("historyList").innerHTML = state.history.length ? state.history.slice(0, 20).map(h => `
    <div class="history-item">
      ${escapeHtml(h.text)}
      <small>${escapeHtml(h.time)}</small>
    </div>
  `).join("") : "No actions yet.";

  // Show/hide next drive buttons based on player count
  if ($("nextDriveBtn")) $("nextDriveBtn").style.display = state.players.length ? "block" : "none";
  if ($("nextDriveBtnMain")) $("nextDriveBtnMain").style.display = state.players.length ? "block" : "none";
  } catch (error) {
    console.error("Render error:", error, "state:", state);
  }
}

function requirePlayers(count = 1) {
  if (state.players.length < count) {
    toast(`Add at least ${count} player${count === 1 ? "" : "s"} first`);
    return false;
  }
  return true;
}

$("addPlayerBtn").addEventListener("click", () => {
  openModal("Add player", `
    <label>Player name<input id="newPlayerName" maxlength="30" autocomplete="off" autofocus></label>
    <label>Starting cows<input id="newPlayerCows" type="number" min="0" value="0" inputmode="numeric"></label>
  `, "Add player", () => {
    const name = $("newPlayerName").value.trim();
    const cows = Math.max(0, Number($("newPlayerCows").value) || 0);
    if (!name) return toast("Enter a name"), false;
    snapshot();
    state.players.push({ id: uid(), name, cows, bank: 0, insurance: null });
    addHistory(`${name} joined with ${cows} cows.`);
    saveState();
    return true;
  });
});

$("addPlayerBtnMain").addEventListener("click", () => {
  openModal("Add player", `
    <label>Player name<input id="newPlayerName" maxlength="30" autocomplete="off" autofocus></label>
    <label>Starting cows<input id="newPlayerCows" type="number" min="0" value="0" inputmode="numeric"></label>
  `, "Add player", () => {
    const name = $("newPlayerName").value.trim();
    const cows = Math.max(0, Number($("newPlayerCows").value) || 0);
    if (!name) return toast("Enter a name"), false;
    snapshot();
    state.players.push({ id: uid(), name, cows, bank: 0, insurance: null });
    addHistory(`${name} joined with ${cows} cows.`);
    saveState();
    return true;
  });
});

$("claimBtn").addEventListener("click", () => {
  if (!requirePlayers()) return;
  const p = playerById($("claimPlayer").value);
  const amount = Math.floor(Number($("claimAmount").value));
  if (!p || !Number.isFinite(amount) || amount < 1) return toast("Enter a valid cow count");
  snapshot();
  p.cows += amount;
  addHistory(`${p.name} called “Cows My Cows” and gained ${amount} cows.`);
  $("claimAmount").value = "";
  saveState();
});

document.querySelectorAll("[data-action]").forEach(btn => {
  btn.addEventListener("click", () => runAction(btn.dataset.action));
});

function runAction(action) {
  if (action !== "carwash" && action !== "rule" && !requirePlayers()) return;

  if (action === "cemetery") {
    openModal("Cemetery", `
      <label>Player<select id="actionPlayer">${options()}</select></label>
      <p class="warning">The player must currently have cows. Insurance protects the cows and is consumed.</p>
    `, "Kill cows", () => {
      const p = playerById($("actionPlayer").value);
      if (!p || p.cows <= 0) return toast("They need cows to kill cows"), false;
      snapshot();
      if (p.insurance) {
        p.insurance = null;
        addHistory(`${p.name}'s insurance blocked a cemetery. The policy was consumed.`);
      } else {
        const lost = p.cows;
        p.cows = 0;
        addHistory(`${p.name} called “Kill your cows” and lost all ${lost} cows.`);
      }
      saveState(); return true;
    });
  }

  if (action === "church") {
    openModal("Church", `<label>Player<select id="actionPlayer">${options()}</select></label>`, "Double cows", () => {
      const p = playerById($("actionPlayer").value); snapshot();
      const gained = p.cows; p.cows *= 2;
      addHistory(`${p.name} married their cows and gained ${gained}, reaching ${p.cows}.`);
      saveState(); return true;
    });
  }

  if (action === "burial") {
    openModal("Dead man's curse", `<label>Player<select id="actionPlayer">${options()}</select></label>`, "Apply curse", () => {
      const p = playerById($("actionPlayer").value); snapshot();
      const loss = Math.min(p.cows, Math.max(5, pct(p.cows, 5)));
      p.cows -= loss;
      addHistory(`${p.name} was cursed and lost ${loss} cows.`);
      saveState(); return true;
    });
  }

  if (action === "bank") {
    openModal("Cow bank", `
      <label>Player<select id="actionPlayer">${options()}</select></label>
      <label>Transaction<select id="bankMode"><option value="deposit">Bank 10 cows</option><option value="withdraw">Withdraw 10 cows</option></select></label>
    `, "Complete", () => {
      const p = playerById($("actionPlayer").value);
      const mode = $("bankMode").value;
      if (mode === "deposit" && p.cows < 10) return toast("Not enough current cows"), false;
      if (mode === "withdraw" && p.bank < 10) return toast("Not enough banked cows"), false;
      snapshot();
      if (mode === "deposit") { p.cows -= 10; p.bank += 10; }
      else { p.bank -= 10; p.cows += 10; }
      addHistory(`${p.name} ${mode === "deposit" ? "banked" : "withdrew"} 10 cows.`);
      saveState(); return true;
    });
  }

  if (action === "rustle") {
    if (!requirePlayers(2)) return;
    openModal("Rustle your cows", `
      <label>Rustler<select id="actor">${options()}</select></label>
      <label>Victim<select id="target">${options(state.players[1]?.id)}</select></label>
      <p class="warning">Steals 20% of the victim's current, unbanked cows. Percentage losses are rounded up.</p>
    `, "Steal cows", () => {
      const actor = playerById($("actor").value), target = playerById($("target").value);
      if (actor.id === target.id) return toast("Choose two different players"), false;
      snapshot();
      const stolen = Math.min(target.cows, pct(target.cows, 20));
      target.cows -= stolen; actor.cows += stolen;
      addHistory(`${actor.name} rustled ${stolen} cows from ${target.name}.`);
      saveState(); return true;
    });
  }

  if (action === "burger") {
    openModal("Whataburger", `
      <label>Caller<select id="actor">${options()}</select></label>
      <p class="warning">The caller gets +1 to the running total and receives that many cows. Current: ${state.whataburgerCount + 1}</p>
    `, "Call Whataburger", () => {
      const actor = playerById($("actor").value);
      snapshot();
      state.whataburgerCount += 1;
      actor.cows += state.whataburgerCount;
      addHistory(`${actor.name} called Whataburger #${state.whataburgerCount} and gained ${state.whataburgerCount} cows.`);
      saveState(); return true;
    });
  }

  if (action === "manualWhataburger") {
    openModal("Set Whataburger Count", `
      <label>Whataburger number<input id="whataburgerNum" type="number" min="0" inputmode="numeric" placeholder="0"></label>
      <p class="warning">Manually set the whataburger counter to any number.</p>
    `, "Set count", () => {
      const num = Number($("whataburgerNum").value);
      if (!Number.isFinite(num) || num < 0) return toast("Enter a valid number"), false;
      snapshot();
      state.whataburgerCount = Math.floor(num);
      addHistory(`Whataburger count manually set to ${state.whataburgerCount}.`);
      saveState(); return true;
    });
  }

  if (action === "insurance") {
    openModal("Insurance", `
      <label>Player<select id="actionPlayer">${options()}</select></label>
      <p class="warning">Costs 20 current cows. Lasts 4 days. Only one policy at a time. Consumed after blocking one cemetery.</p>
    `, "Buy insurance", () => {
      const p = playerById($("actionPlayer").value);
      if (p.insurance) return toast("That player is already insured"), false;
      if (p.cows < 20) return toast("They need at least 20 cows"), false;
      snapshot();
      p.cows -= 20;
      const expiresAt = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
      p.insurance = { purchasedAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() };
      addHistory(`${p.name} spent 20 cows on insurance for 4 days.`);
      saveState(); return true;
    });
  }

  if (action === "removeInsurance") {
    openModal("Remove insurance", `
      <label>Player<select id="actionPlayer">${options()}</select></label>
      <p class="warning">Cancel this player's insurance policy.</p>
    `, "Remove policy", () => {
      const p = playerById($("actionPlayer").value);
      if (!p.insurance) return toast("That player has no insurance"), false;
      snapshot();
      p.insurance = null;
      addHistory(`${p.name}'s insurance was cancelled.`);
      saveState(); return true;
    });
  }

  if (action === "manualEdit") {
    openModal("Manual edit", `
      <label>Player<select id="actionPlayer">${options()}</select></label>
      <label>Amount type<select id="editType"><option value="flat">Flat number</option><option value="percentage">Percentage</option></select></label>
      <label>Amount<input id="editAmount" type="number" inputmode="numeric" placeholder="10"></label>
      <label>Cows to edit<select id="editTarget"><option value="regular">Regular cows</option><option value="bank">Bank cows</option></select></label>
    `, "Apply edit", () => {
      const p = playerById($("actionPlayer").value);
      const type = $("editType").value;
      const amount = Number($("editAmount").value);
      const target = $("editTarget").value;
      
      if (!Number.isFinite(amount)) return toast("Enter a valid amount"), false;
      
      let actualAmount = type === "percentage" ? pct(p[target], amount) : amount;
      const isAdd = amount >= 0;
      const action = isAdd ? "added" : "removed";
      actualAmount = Math.abs(actualAmount);
      
      snapshot();
      if (isAdd) {
        p[target] += actualAmount;
      } else {
        p[target] = Math.max(0, p[target] - actualAmount);
      }
      
      const targetName = target === "bank" ? "banked" : "regular";
      addHistory(`${p.name} ${action} ${actualAmount} ${targetName} cows (manual edit).`);
      saveState(); return true;
    });
  }

  if (action === "casino") {
    const percentages = [5, 10, 20, 25, 50, 75, 100];
    const target = state.players[Math.floor(Math.random() * state.players.length)];
    const percent = percentages[Math.floor(Math.random() * percentages.length)];
    openModal("Casino result", `
      <div class="warning"><strong>${escapeHtml(target.name)}</strong> was selected.<br><strong>${percent}%</strong> of their current cows will be lost.</div>
    `, "Apply result", () => {
      snapshot();
      const loss = Math.min(target.cows, pct(target.cows, percent));
      target.cows -= loss;
      addHistory(`Casino hit ${target.name} for ${percent}%, costing ${loss} cows.`);
      saveState(); return true;
    });
  }

  if (action === "falsecall") {
    openModal("False call", `<label>Player<select id="actionPlayer">${options()}</select></label>`, "Apply penalty", () => {
      const p = playerById($("actionPlayer").value); snapshot();
      const loss = Math.min(p.cows, pct(p.cows, 10));
      p.cows -= loss;
      addHistory(`${p.name} completed a false call and lost ${loss} cows.`);
      saveState(); return true;
    });
  }

  if (action === "moving") {
    if (!requirePlayers(2)) return;
    openModal("Moo-vin out", `
      <label>Caller<select id="actionPlayer">${options()}</select></label>
      <p class="warning">Swaps current cows with the current first-place player. Banked cows and insurance stay with their owners.</p>
    `, "Swap places", () => {
      const p = playerById($("actionPlayer").value);
      const leader = [...state.players].sort((a,b) => b.cows - a.cows)[0];
      if (leader.id === p.id) return toast("That player is already in first"), false;
      snapshot();
      [p.cows, leader.cows] = [leader.cows, p.cows];
      addHistory(`${p.name} moo-ved out and swapped current scores with ${leader.name}.`);
      saveState(); return true;
    });
  }

  if (action === "rule") {
    if (!requirePlayers()) return;
    const activeCount = state.rules.filter(r => r.status === "active").length;
    const pendingCount = state.rules.filter(r => r.status === "pending").length;
    const full = activeCount + pendingCount >= 10;
    openModal(full ? "Replace a bonus rule" : "Propose a bonus rule", `
      <label>Rule maker<select id="actor">${options()}</select></label>
      <label>Rule name<input id="ruleName" maxlength="80" placeholder="New bonus rule"></label>
      ${full ? `<label>Rule to replace<select id="replaceRule">${state.rules.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join("")}</select></label>` : ""}
      <p class="warning">${full ? "Replacing a rule costs 60% of current cows, rounded up." : "A new rule costs 20% of current cows or a minimum of 20, rounded up."} The new rule begins next drive.</p>
    `, full ? "Replace rule" : "Buy rule", () => {
      const actor = playerById($("actor").value);
      const name = $("ruleName").value.trim();
      if (!name) return toast("Enter a rule name"), false;
      const cost = full ? pct(actor.cows, 60) : Math.max(20, pct(actor.cows, 20));
      if (actor.cows < cost) return toast(`They need ${cost} cows`), false;
      snapshot();
      actor.cows -= cost;
      if (full) state.rules = state.rules.filter(r => r.id !== $("replaceRule").value);
      state.rules.push({ id: uid(), name, owner: actor.name, status: "pending", startsDrive: state.drive + 1 });
      addHistory(`${actor.name} spent ${cost} cows to propose “${name},” beginning next drive.`);
      saveState(); return true;
    });
  }
}

$("nextDriveBtn").addEventListener("click", () => {
  snapshot();
  state.drive += 1;
  if (Array.isArray(state.rules)) {
    state.rules.forEach(r => {
      if (r.status === "pending" && r.startsDrive <= state.drive) r.status = "active";
    });
  }
  const now = new Date();
  const expired = [];
  state.players.forEach(p => {
    if (p.insurance && new Date(p.insurance.expiresAt) <= now) {
      expired.push(p.name);
      p.insurance = null;
    }
  });
  addHistory(`Drive ${state.drive} began.${expired.length ? ` Insurance expired for ${expired.join(", ")}.` : ""}`);
  saveState();
  toast(`Drive ${state.drive} started`);
});

$("nextDriveBtnMain").addEventListener("click", () => {
  snapshot();
  state.drive += 1;
  if (Array.isArray(state.rules)) {
    state.rules.forEach(r => {
      if (r.status === "pending" && r.startsDrive <= state.drive) r.status = "active";
    });
  }
  const now = new Date();
  const expired = [];
  state.players.forEach(p => {
    if (p.insurance && new Date(p.insurance.expiresAt) <= now) {
      expired.push(p.name);
      p.insurance = null;
    }
  });
  addHistory(`Drive ${state.drive} began.${expired.length ? ` Insurance expired for ${expired.join(", ")}.` : ""}`);
  saveState();
  toast(`Drive ${state.drive} started`);
});

$("undoBtn").addEventListener("click", () => {
  if (!snapshotBeforeAction) return toast("Nothing to undo");
  state = JSON.parse(snapshotBeforeAction);
  snapshotBeforeAction = null;
  saveState();
  toast("Last action undone");
});

$('settingsBtn2').addEventListener('click', () => $("settingsModal").showModal());

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cows-my-cows-drive-${state.drive}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (!Array.isArray(parsed.players) || !Array.isArray(parsed.rules)) throw new Error();
    snapshot();
    state = parsed;
    saveState();
    $("settingsModal").close();
    toast("Game imported");
  } catch {
    toast("That file is not a valid game backup");
  }
  event.target.value = "";
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Reset every player, score, rule, and history entry?")) return;
  snapshot();
  state = freshState();
  saveState();
  $("settingsModal").close();
});

render();

// Diagnostic function to check Firebase connection
async function checkFirebaseConnection() {
  console.log("Testing Firebase REST API connection...");
  try {
    const testData = { timestamp: new Date().toISOString() };
    const response = await fetch(`${FIREBASE_DB_URL}/test.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testData)
    });
    if (response.ok) {
      console.log("Firebase connection: OK - Write successful");
      // Clean up test data
      fetch(`${FIREBASE_DB_URL}/test.json`, { method: "DELETE" });
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (e) {
    console.error("Firebase connection: FAILED");
    console.error("Error:", e.message);
    console.log("\nFIX: Go to Firebase Console > Realtime Database > Rules and set:");
    console.log(`{
  "rules": {
    ".read": true,
    ".write": true
  }
}`);
  }
}

// Initial render with state
render();

// Enable sync - REST API is immediately available
setTimeout(() => {
  if (firebaseSyncEnabled) enableFirebaseSync();
  checkFirebaseConnection();
}, 500);
