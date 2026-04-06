const CRYSTALS = [
  { id: "quartzo", name: "Quartzo", value: 1 },
  { id: "rubelita", name: "Rubelita", value: 2 },
  { id: "esmeralda", name: "Esmeralda", value: 3 },
  { id: "safira", name: "Safira", value: 4 },
  { id: "rubi", name: "Rubi", value: 6 },
  { id: "ambar", name: "Âmbar", value: 8 }
];

const STORAGE_KEY = "quartz-calculator-v1";

const state = loadState();
const inputMap = new Map();
let deferredInstallPrompt = null;
  const elements = {
  list: document.getElementById("crystal-list"),
  bestCombo: document.getElementById("best-combo"),
  comboSelect: document.getElementById("combo-select"),
  comboNote: document.getElementById("combo-note"),
  baseTotal: document.getElementById("base-total"),
  comboTotal: document.getElementById("combo-total"),
  detailBody: document.getElementById("detail-body"),
  comboDetail: document.getElementById("combo-detail"),
  autunitaNote: document.getElementById("autunita-note"),
  resetBtn: document.getElementById("reset-btn"),
  saveDayBtn: document.getElementById("save-day-btn"),
  dailyList: document.getElementById("daily-list"),
  summaryBox: document.getElementById("summary-box"),
  summaryBody: document.getElementById("summary-body"),
  summaryBaseTotal: document.getElementById("summary-base-total"),
  summaryComboTotal: document.getElementById("summary-combo-total"),
  summaryDaysCount: document.getElementById("summary-days-count"),
  dayBonusInput: document.getElementById("day-bonus-input"),
  dayBonusMinus: document.getElementById("day-bonus-minus"),
  dayBonusPlus: document.getElementById("day-bonus-plus"),
  cardsTotalInput: document.getElementById("cards-total-input"),
  cardsTotalMinus: document.getElementById("cards-total-minus"),
  cardsTotalPlus: document.getElementById("cards-total-plus"),
  installBtns: Array.from(document.querySelectorAll(".install-btn")),
  mobileResetBtn: document.getElementById("mobile-reset-btn"),
  mobileSaveDayBtn: document.getElementById("mobile-save-day-btn"),
  sectionButtons: Array.from(document.querySelectorAll("[data-section-target]"))
};

init();

function init() {
  renderInputs();
  bindActions();
  registerPwa();
  bindSectionNav();
  updateUI();
}

function renderInputs() {
  elements.list.innerHTML = "";
  CRYSTALS.forEach((crystal) => {
    const row = createCrystalRow(crystal, false);
    elements.list.appendChild(row);
  });
  setAutunita(0);
}

function bindActions() {
  const handleReset = () => {
    CRYSTALS.forEach((crystal) => setQuantity(crystal.id, 0));
    setAutunita(0);
    setDayBonus(0);
    state.selectedComboId = "AUTO";
    updateUI();
  };

  elements.resetBtn.addEventListener("click", handleReset);
  elements.mobileResetBtn.addEventListener("click", handleReset);

  elements.comboSelect.addEventListener("change", (event) => {
    state.selectedComboId = event.target.value;
    persistState();
    updateUI();
  });

  elements.dailyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-daily-delete]");
    if (!button) return;
    const index = Number(button.dataset.dailyDelete);
    if (!Number.isFinite(index)) return;
    state.dailyEarnings.splice(index, 1);
    persistState();
    updateUI();
  });

  const handleSaveDay = () => {
    if (state.dailyEarnings.length >= 5) return;
    const totals = computeTotals();
    const combos = computeCombos(totals);
    const bestCombo = pickBestCombo(combos);
    const applied = resolveSelectedCombo(combos, bestCombo);
    const day = state.dailyEarnings.length + 1;
    const quantities = getQuantityMap();
    state.dailyEarnings.push({
      day,
      total: applied.finalTotal + state.dayBonus,
      gemsTotal: applied.finalTotal,
      dayBonus: state.dayBonus,
      quantities
    });
    CRYSTALS.forEach((crystal) => setQuantity(crystal.id, 0));
    setDayBonus(0);
    state.selectedComboId = "AUTO";
    persistState();
    updateUI();
  };

  if (elements.saveDayBtn) {
    elements.saveDayBtn.addEventListener("click", handleSaveDay);
  }
  elements.mobileSaveDayBtn.addEventListener("click", handleSaveDay);

  elements.cardsTotalInput.addEventListener("input", () => {
    setCardsTotal(parseQuantity(elements.cardsTotalInput.value));
    updateUI();
  });

  elements.cardsTotalMinus.addEventListener("click", () => {
    setCardsTotal(state.cardsTotal - 1);
    updateUI();
  });

  elements.cardsTotalPlus.addEventListener("click", () => {
    setCardsTotal(state.cardsTotal + 1);
    updateUI();
  });

  elements.dayBonusInput.addEventListener("input", () => {
    setDayBonus(parseQuantity(elements.dayBonusInput.value));
    updateUI();
  });

  elements.dayBonusMinus.addEventListener("click", () => {
    setDayBonus(state.dayBonus - 1);
    updateUI();
  });

  elements.dayBonusPlus.addEventListener("click", () => {
    setDayBonus(state.dayBonus + 1);
    updateUI();
  });
}

function createCrystalRow(crystal, isAutunita) {
  const row = document.createElement("div");
  row.className = `crystal-row${isAutunita ? " autunita" : ""}`;

  const info = document.createElement("div");
  const name = document.createElement("div");
  name.className = "crystal-name";
  name.textContent = crystal.name;
  const meta = document.createElement("div");
  meta.className = "crystal-meta";
  meta.textContent = isAutunita
    ? "Não vendível (valor 0)"
    : `Valor: ${formatMoney(crystal.value)}`;
  info.appendChild(name);
  info.appendChild(meta);

  const stepper = document.createElement("div");
  stepper.className = "stepper";

  const minus = document.createElement("button");
  minus.className = "step-btn";
  minus.type = "button";
  minus.textContent = "-";
  const plus = document.createElement("button");
  plus.className = "step-btn";
  plus.type = "button";
  plus.textContent = "+";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "1";
  input.inputMode = "numeric";
  input.value = isAutunita ? state.autunita : getQuantity(crystal.id);

  const update = (delta) => {
    const current = parseQuantity(input.value);
    const next = clampQuantity(current + delta);
    input.value = next;
    if (isAutunita) {
      setAutunita(next);
    } else {
      setQuantity(crystal.id, next);
    }
    updateUI();
  };

  minus.addEventListener("click", () => update(-1));
  plus.addEventListener("click", () => update(1));
  input.addEventListener("input", () => {
    const next = clampQuantity(parseQuantity(input.value));
    input.value = next;
    if (isAutunita) {
      setAutunita(next);
    } else {
      setQuantity(crystal.id, next);
    }
    updateUI();
  });

  stepper.appendChild(minus);
  stepper.appendChild(input);
  stepper.appendChild(plus);
  row.appendChild(info);
  row.appendChild(stepper);

  if (!isAutunita) {
    inputMap.set(crystal.id, input);
  } else {
    inputMap.set("autunita", input);
  }

  return row;
}

function updateUI() {
  const totals = computeTotals();
  const combos = computeCombos(totals);
  const bestCombo = pickBestCombo(combos);

  const selectedCombo = resolveSelectedCombo(combos, bestCombo);

  elements.bestCombo.textContent = `${bestCombo.description} (${formatMoney(bestCombo.finalTotal)})`;
  elements.baseTotal.textContent = formatMoney(totals.baseTotal);
  elements.comboTotal.textContent = formatMoney(selectedCombo.finalTotal);
  elements.summaryBaseTotal.textContent = formatMoney(totals.baseTotal);
  elements.summaryComboTotal.textContent = formatMoney(selectedCombo.finalTotal);
  elements.summaryDaysCount.textContent = `${state.dailyEarnings.length}/5`;
  elements.dayBonusInput.value = state.dayBonus;
  if (elements.saveDayBtn) {
    elements.saveDayBtn.disabled = state.dailyEarnings.length >= 5;
  }
  elements.mobileSaveDayBtn.disabled = state.dailyEarnings.length >= 5;

  renderComboSelect(combos, bestCombo);
  renderDetails(totals, selectedCombo);
  renderDailyEarnings();

  if (state.autunita > 0) {
    elements.autunitaNote.textContent = "Autunita não é vendível. Valor ignorado.";
  } else {
    elements.autunitaNote.textContent = "";
  }

  persistState();
}

function renderComboSelect(combos, bestCombo) {
  const comboSelect = elements.comboSelect;
  comboSelect.innerHTML = "";

  const autoOption = document.createElement("option");
  autoOption.value = "AUTO";
  autoOption.textContent = `Auto (melhor): ${bestCombo.description}`;
  comboSelect.appendChild(autoOption);

  const priority = comboDisplayOrder();
  const sorted = combos.slice().sort((a, b) => {
    const order = (priority[a.type] || 99) - (priority[b.type] || 99);
    if (order !== 0) return order;
    return a.description.localeCompare(b.description);
  });

  sorted.forEach((combo) => {
    const option = document.createElement("option");
    option.value = combo.id;
    option.textContent = combo.description;
    comboSelect.appendChild(option);
  });

  const currentValue = state.selectedComboId;
  const hasValue = Array.from(comboSelect.options).some((opt) => opt.value === currentValue);
  comboSelect.value = hasValue ? currentValue : "AUTO";
  if (!hasValue) {
    state.selectedComboId = "AUTO";
  }

  const availableCombos = combos.filter((combo) => combo.type !== "NONE");
  elements.comboNote.textContent = availableCombos.length
    ? `${availableCombos.length} combo(s) disponível(is).`
    : "Nenhum combo disponível com estas quantidades.";
}

function renderDetails(totals, combo) {
  const rows = CRYSTALS.map((crystal) => {
    const qty = getQuantity(crystal.id);
    const subtotal = qty * crystal.value;
    return `
      <tr>
        <td>${crystal.name}</td>
        <td>${qty}</td>
        <td>${formatMoney(crystal.value)}</td>
        <td>${formatMoney(subtotal)}</td>
      </tr>
    `;
  }).join("");

  elements.detailBody.innerHTML = rows;

  const bonusLines = combo.bonusLines.length
    ? combo.bonusLines.map((line) => `<div>${line.label}: +${formatMoney(line.value)}</div>`).join("")
    : "<div>Sem bônus aplicado.</div>";

  elements.comboDetail.innerHTML = `
    <strong>Combo aplicado:</strong>
    <div>${combo.description}</div>
    ${bonusLines}
    <div><strong>Total final:</strong> ${formatMoney(combo.finalTotal)}</div>
  `;
}

function renderDailyEarnings() {
  const list = elements.dailyList;
  list.innerHTML = "";

  if (!state.dailyEarnings.length) {
    list.innerHTML = "<div class=\"hint\">Sem faturamento salvo.</div>";
  } else {
    const items = state.dailyEarnings
      .map((entry, index) => `
        <div class="daily-item">
          <div class="daily-main">
            <span>Dia ${entry.day}</span>
            <span>${formatMoney(entry.total)}</span>
          </div>
          <details class="daily-breakdown">
            <summary aria-label="Ver gemas vendidas"></summary>
            <div class="daily-breakdown-body">${renderDailyBreakdown(entry)}</div>
          </details>
          ${index === state.dailyEarnings.length - 1
            ? `<button class="daily-delete" type="button" data-daily-delete="${index}">Excluir</button>`
            : ""}
        </div>
      `)
      .join("");
    list.innerHTML = items;
  }

  if (state.dailyEarnings.length >= 5) {
    const earningsTotal = state.dailyEarnings.reduce((sum, entry) => sum + entry.total, 0);
    const finalScore = earningsTotal + state.cardsTotal;
    const lines = state.dailyEarnings
      .map((entry) => `<div>Dia ${entry.day}: ${formatMoney(entry.total)}</div>`)
      .join("");
    elements.cardsTotalInput.value = state.cardsTotal;
    elements.summaryBody.innerHTML = `
      <div>${lines}</div>
      <div><strong>Total dos 5 dias:</strong> ${formatMoney(earningsTotal)}</div>
      <div><strong>Soma das cartas:</strong> ${formatMoney(state.cardsTotal)}</div>
      <div><strong>Pontuação final:</strong> ${formatMoney(finalScore)}</div>
    `;
    elements.summaryBox.classList.remove("is-hidden");
  } else {
    elements.cardsTotalInput.value = state.cardsTotal;
    elements.summaryBody.innerHTML = "";
    elements.summaryBox.classList.add("is-hidden");
  }
}

function computeTotals() {
  const subtotals = {};
  let baseTotal = 0;
  CRYSTALS.forEach((crystal) => {
    const qty = getQuantity(crystal.id);
    const subtotal = qty * crystal.value;
    subtotals[crystal.id] = subtotal;
    baseTotal += subtotal;
  });
  return { baseTotal, subtotals };
}

function renderDailyBreakdown(entry) {
  const quantities = entry.quantities || {};
  const sold = CRYSTALS
    .map((crystal) => ({ name: crystal.name, quantity: quantities[crystal.id] || 0 }))
    .filter((item) => item.quantity > 0);
  const bonus = Number(entry.dayBonus) || 0;
  const gemsTotal = Number(entry.gemsTotal ?? entry.total) || 0;

  const soldLines = sold.length
    ? sold
    .map((item) => `<div class="daily-breakdown-row"><span>${item.name}</span><strong>${item.quantity}</strong></div>`)
    .join("")
    : "<div class=\"hint\">Nenhuma gema registrada.</div>";

  return `
    ${soldLines}
    <div class="daily-breakdown-row total"><span>Total em gemas</span><strong>${formatMoney(gemsTotal)}</strong></div>
    <div class="daily-breakdown-row total"><span>Bônus fim do dia</span><strong>${formatMoney(bonus)}</strong></div>
  `;
}

function computeCombos(totals) {
  const combos = [];
  combos.push({
    id: "NONE",
    type: "NONE",
    description: "Nenhum combo",
    finalTotal: totals.baseTotal,
    bonusLines: []
  });

  const qtyMap = getQuantityMap();
  const available = CRYSTALS.filter((crystal) => qtyMap[crystal.id] > 0);

  CRYSTALS.filter((crystal) => qtyMap[crystal.id] >= 3).forEach((base) => {
    const others = CRYSTALS.filter((other) => other.id !== base.id && qtyMap[other.id] > 0);
    others.forEach((target) => {
      const bonus = totals.subtotals[target.id];
      combos.push({
        id: `SET3:${base.id}:${target.id}`,
        type: "SET3",
        description: `3 iguais (${base.name}) + dobrar ${target.name}`,
        finalTotal: totals.baseTotal + bonus,
        bonusLines: [{ label: `Dobro em ${target.name}`, value: bonus }]
      });
    });
  });

  CRYSTALS.filter((crystal) => qtyMap[crystal.id] >= 4).forEach((base) => {
    const others = CRYSTALS.filter((other) => other.id !== base.id && qtyMap[other.id] > 0);
    for (let i = 0; i < others.length; i += 1) {
      for (let j = i + 1; j < others.length; j += 1) {
        const first = others[i];
        const second = others[j];
        const bonus = totals.subtotals[first.id] + totals.subtotals[second.id];
        combos.push({
          id: `SET4:${base.id}:${first.id}:${second.id}`,
          type: "SET4",
          description: `4 iguais (${base.name}) + dobrar ${first.name} e ${second.name}`,
          finalTotal: totals.baseTotal + bonus,
          bonusLines: [
            { label: `Dobro em ${first.name}`, value: totals.subtotals[first.id] },
            { label: `Dobro em ${second.name}`, value: totals.subtotals[second.id] }
          ]
        });
      }
    }
  });

  if (available.length >= 5) {
    combos.push({
      id: "DIFF5",
      type: "DIFF5",
      description: "5 diferentes (+8)",
      finalTotal: totals.baseTotal + 8,
      bonusLines: [{ label: "Bônus fixo", value: 8 }]
    });
  }

  if (available.length >= 6) {
    combos.push({
      id: "DIFF6",
      type: "DIFF6",
      description: "6 diferentes (+12)",
      finalTotal: totals.baseTotal + 12,
      bonusLines: [{ label: "Bônus fixo", value: 12 }]
    });
  }

  return combos;
}

function pickBestCombo(combos) {
  const maxTotal = Math.max(...combos.map((combo) => combo.finalTotal));
  const candidates = combos.filter((combo) => combo.finalTotal === maxTotal);
  const priority = comboPriority();
  candidates.sort((a, b) => {
    const order = (priority[a.type] || 99) - (priority[b.type] || 99);
    if (order !== 0) return order;
    return a.description.localeCompare(b.description);
  });
  return candidates[0];
}

function resolveSelectedCombo(combos, bestCombo) {
  if (state.selectedComboId === "AUTO") {
    return bestCombo;
  }
  const found = combos.find((combo) => combo.id === state.selectedComboId);
  if (!found) {
    state.selectedComboId = "AUTO";
    return bestCombo;
  }
  return found;
}

function getQuantityMap() {
  const map = {};
  CRYSTALS.forEach((crystal) => {
    map[crystal.id] = getQuantity(crystal.id);
  });
  return map;
}

function getQuantity(id) {
  return state.quantities[id] || 0;
}

function setQuantity(id, value) {
  state.quantities[id] = clampQuantity(value);
  const input = inputMap.get(id);
  if (input && Number(input.value) !== state.quantities[id]) {
    input.value = state.quantities[id];
  }
}

function setAutunita(value) {
  state.autunita = clampQuantity(value);
  const input = inputMap.get("autunita");
  if (input && Number(input.value) !== state.autunita) {
    input.value = state.autunita;
  }
}

function setCardsTotal(value) {
  state.cardsTotal = clampQuantity(value);
  if (Number(elements.cardsTotalInput.value) !== state.cardsTotal) {
    elements.cardsTotalInput.value = state.cardsTotal;
  }
}

function setDayBonus(value) {
  state.dayBonus = clampDayBonus(value);
  if (Number(elements.dayBonusInput.value) !== state.dayBonus) {
    elements.dayBonusInput.value = state.dayBonus;
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("pt-BR");
}

function clampQuantity(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function clampDayBonus(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(4, Math.max(0, Math.floor(value)));
}

function parseQuantity(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function comboPriority() {
  return {
    DIFF6: 0,
    DIFF5: 1,
    SET4: 2,
    SET3: 3,
    NONE: 4
  };
}

function comboDisplayOrder() {
  return {
    NONE: 0,
    DIFF6: 1,
    DIFF5: 2,
    SET4: 3,
    SET3: 4
  };
}

function loadState() {
  const defaultState = {
    quantities: {},
    autunita: 0,
    selectedComboId: "AUTO",
    dailyEarnings: [],
    dayBonus: 0,
    cardsTotal: 0
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    return {
      quantities: parsed.quantities || {},
      autunita: Number(parsed.autunita) || 0,
      selectedComboId: parsed.selectedComboId || "AUTO",
      dailyEarnings: Array.isArray(parsed.dailyEarnings)
        ? parsed.dailyEarnings.map((entry) => ({
          day: Number(entry.day) || 0,
          total: Number(entry.total) || 0,
          gemsTotal: Number(entry.gemsTotal ?? entry.total) || 0,
          dayBonus: clampDayBonus(Number(entry.dayBonus) || 0),
          quantities: entry.quantities || {}
        }))
        : [],
      dayBonus: clampDayBonus(Number(parsed.dayBonus) || 0),
      cardsTotal: Number(parsed.cardsTotal) || 0
    };
  } catch (error) {
    return defaultState;
  }
}

function persistState() {
  const payload = {
    quantities: state.quantities,
    autunita: state.autunita,
    selectedComboId: state.selectedComboId,
    dailyEarnings: state.dailyEarnings,
    dayBonus: state.dayBonus,
    cardsTotal: state.cardsTotal
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function registerPwa() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    toggleInstallButtons(true);
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    toggleInstallButtons(false);
  });

  elements.installBtns.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      toggleInstallButtons(false);
    });
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
}

function toggleInstallButtons(visible) {
  elements.installBtns.forEach((button) => {
    button.classList.toggle("is-hidden", !visible);
  });
}

function bindSectionNav() {
  elements.sectionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const sectionId = button.dataset.sectionTarget;
      const section = document.getElementById(sectionId);
      if (!section) return;
      section.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(sectionId);
    });
  });

  const sections = ["quantidades", "combos", "resultado", "detalhes"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      const visibleEntry = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

      if (visibleEntry?.target?.id) {
        setActiveSection(visibleEntry.target.id);
      }
    },
    {
      rootMargin: "-18% 0px -48% 0px",
      threshold: [0.2, 0.35, 0.6]
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function setActiveSection(sectionId) {
  elements.sectionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sectionTarget === sectionId);
  });
}
