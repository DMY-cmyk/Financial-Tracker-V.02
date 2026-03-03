const state = {
  meta: {
    month: "",
    year: "",
    snapshot: "",
  },
  incomeCategories: [],
  expenseCategories: [],
  methods: [],
  incomeTransactions: [],
  expenseTransactions: [],
  bills: [],
};

const el = {
  dashboardTitle: document.getElementById("dashboardTitle"),
  snapshotInfo: document.getElementById("snapshotInfo"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  totalAssets: document.getElementById("totalAssets"),
  incomeCategorySelect: document.getElementById("incomeCategorySelect"),
  incomeMethodSelect: document.getElementById("incomeMethodSelect"),
  expenseCategorySelect: document.getElementById("expenseCategorySelect"),
  expenseAccountSelect: document.getElementById("expenseAccountSelect"),
  incomeBody: document.getElementById("incomeBody"),
  expenseBody: document.getElementById("expenseBody"),
  methodBody: document.getElementById("methodBody"),
  expenseRecapBody: document.getElementById("expenseRecapBody"),
  billBody: document.getElementById("billBody"),
  incomeForm: document.getElementById("incomeForm"),
  expenseForm: document.getElementById("expenseForm"),
  searchInput: document.getElementById("searchInput"),
  toast: document.getElementById("toast"),
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function parseRupiah(raw) {
  const clean = String(raw || "").replace(/[^\d-]/g, "");
  const num = Number.parseInt(clean, 10);
  return Number.isNaN(num) ? 0 : num;
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function showToast(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 1900);
}

function fillSelect(select, list) {
  select.innerHTML = "";
  list.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

function normalizeRows(rows) {
  const incomeCategories = [];
  const expenseCategories = [];
  const methods = [];
  const income = [];
  const expense = [];
  const bills = [];

  let categoryMode = false;
  let methodMode = false;

  rows.forEach((source) => {
    const c = Array.from({ length: 20 }, (_, idx) => (source[idx] || "").trim());

    if (c[1] && c[3] && !Number.isNaN(Number.parseInt(c[3], 10)) && c[1] !== "B U L A N") {
      state.meta.month = c[1];
      state.meta.year = c[3];
    }
    if (c[1] && c[1].includes(",") && /\d{4}/.test(c[1])) {
      state.meta.snapshot = c[1];
    }

    if (c[1] === "Pemasukan" && c[3] === "Pengeluaran") {
      categoryMode = true;
      methodMode = false;
      return;
    }
    if (c[1] === "Payment Method") {
      methodMode = true;
      categoryMode = false;
      return;
    }
    if (c[1] && c[1].includes("C A T A T A N")) {
      categoryMode = false;
      methodMode = false;
    }

    if (categoryMode && c[1] && c[3]) {
      incomeCategories.push(c[1]);
      expenseCategories.push(c[3]);
    }
    if (methodMode && c[1] && c[3].startsWith("Rp")) {
      methods.push(c[1]);
    }

    const incomeNo = Number.parseInt(c[5], 10);
    if (!Number.isNaN(incomeNo)) {
      income.push({
        no: incomeNo,
        date: c[6],
        amount: parseRupiah(c[7]),
        category: c[8],
        method: c[9],
      });
    }

    const expenseNo = Number.parseInt(c[11], 10);
    if (!Number.isNaN(expenseNo)) {
      expense.push({
        no: expenseNo,
        date: c[12],
        amount: parseRupiah(c[13]),
        category: c[14],
        account: c[15],
        notes: c[16],
      });
    }

    if ((c[1] === "TRUE" || c[1] === "FALSE") && c[2]) {
      bills.push({
        status: c[1],
        name: c[2],
        amount: parseRupiah(c[3]),
      });
    }
  });

  state.incomeCategories = [...new Set(incomeCategories)];
  state.expenseCategories = [...new Set(expenseCategories)];
  state.methods = [...new Set(methods)];
  state.incomeTransactions = income.sort((a, b) => a.no - b.no);
  state.expenseTransactions = expense.sort((a, b) => a.no - b.no);
  state.bills = bills;

  if (state.methods.length === 0) {
    state.methods = [...new Set([
      ...state.incomeTransactions.map((item) => item.method),
      ...state.expenseTransactions.map((item) => item.account),
    ])];
  }
}

function calculate() {
  const totalIncome = state.incomeTransactions.reduce((sum, row) => sum + row.amount, 0);
  const totalExpense = state.expenseTransactions.reduce((sum, row) => sum + row.amount, 0);
  const totalAssets = totalIncome - totalExpense;

  const methodBalances = {};
  state.methods.forEach((method) => {
    methodBalances[method] = 0;
  });
  state.incomeTransactions.forEach((row) => {
    if (methodBalances[row.method] === undefined) methodBalances[row.method] = 0;
    methodBalances[row.method] += row.amount;
  });
  state.expenseTransactions.forEach((row) => {
    if (methodBalances[row.account] === undefined) methodBalances[row.account] = 0;
    methodBalances[row.account] -= row.amount;
  });

  const expenseByCategory = {};
  state.expenseCategories.forEach((cat) => {
    expenseByCategory[cat] = 0;
  });
  state.expenseTransactions.forEach((row) => {
    if (expenseByCategory[row.category] === undefined) expenseByCategory[row.category] = 0;
    expenseByCategory[row.category] += row.amount;
  });

  return { totalIncome, totalExpense, totalAssets, methodBalances, expenseByCategory };
}

function getFilterText() {
  return (el.searchInput?.value || "").trim().toLowerCase();
}

function renderRows(body, rows, columns) {
  const filterText = getFilterText();
  body.innerHTML = "";
  rows.forEach((row) => {
    if (filterText) {
      const searchable = columns.map((col) => String(row[col] || "")).join(" ").toLowerCase();
      if (!searchable.includes(filterText)) return;
    }
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = col === "amount" ? formatRupiah(row[col]) : (row[col] || "-");
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
}

function render() {
  const metrics = calculate();

  el.dashboardTitle.textContent = `Budget Tracker ${state.meta.month} ${state.meta.year}`.trim();
  el.snapshotInfo.textContent = state.meta.snapshot || "Snapshot loaded";

  el.totalIncome.textContent = formatRupiah(metrics.totalIncome);
  el.totalExpense.textContent = formatRupiah(metrics.totalExpense);
  el.totalAssets.textContent = formatRupiah(metrics.totalAssets);
  el.totalAssets.className = metrics.totalAssets >= 0 ? "amount-positive" : "amount-negative";

  fillSelect(el.incomeCategorySelect, state.incomeCategories);
  fillSelect(el.incomeMethodSelect, state.methods);
  fillSelect(el.expenseCategorySelect, state.expenseCategories);
  fillSelect(el.expenseAccountSelect, state.methods);

  renderRows(el.incomeBody, state.incomeTransactions, ["no", "date", "amount", "category", "method"]);
  renderRows(el.expenseBody, state.expenseTransactions, ["no", "date", "amount", "category", "account", "notes"]);

  el.methodBody.innerHTML = "";
  Object.entries(metrics.methodBalances).forEach(([key, value]) => {
    const tr = document.createElement("tr");
    const amountClass = value >= 0 ? "amount-positive" : "amount-negative";
    tr.innerHTML = `<td>${key}</td><td class="${amountClass}">${formatRupiah(value)}</td>`;
    el.methodBody.appendChild(tr);
  });

  el.expenseRecapBody.innerHTML = "";
  Object.entries(metrics.expenseByCategory).forEach(([key, value]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${key}</td><td>${formatRupiah(value)}</td>`;
    el.expenseRecapBody.appendChild(tr);
  });

  el.billBody.innerHTML = "";
  state.bills.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${item.status}</td><td>${item.name}</td><td>${formatRupiah(item.amount)}</td>`;
    el.billBody.appendChild(tr);
  });
}

function onIncomeSubmit(evt) {
  evt.preventDefault();
  const form = new FormData(el.incomeForm);
  const amount = parseRupiah(form.get("amount"));
  if (amount <= 0) {
    showToast("Income amount must be greater than zero.");
    return;
  }
  state.incomeTransactions.push({
    no: state.incomeTransactions.length + 1,
    date: String(form.get("date") || ""),
    amount,
    category: String(form.get("category") || ""),
    method: String(form.get("method") || ""),
  });
  render();
  el.incomeForm.reset();
  showToast("Income entry added.");
}

function onExpenseSubmit(evt) {
  evt.preventDefault();
  const form = new FormData(el.expenseForm);
  const amount = parseRupiah(form.get("amount"));
  if (amount <= 0) {
    showToast("Expense amount must be greater than zero.");
    return;
  }
  state.expenseTransactions.push({
    no: state.expenseTransactions.length + 1,
    date: String(form.get("date") || ""),
    amount,
    category: String(form.get("category") || ""),
    account: String(form.get("account") || ""),
    notes: String(form.get("notes") || ""),
  });
  render();
  el.expenseForm.reset();
  showToast("Expense entry added.");
}

async function init() {
  const response = await fetch("./data/source.csv");
  if (!response.ok) throw new Error(`Failed to load CSV: ${response.status}`);
  const csvText = await response.text();
  const rows = parseCsv(csvText);
  normalizeRows(rows);
  render();

  el.incomeForm.addEventListener("submit", onIncomeSubmit);
  el.expenseForm.addEventListener("submit", onExpenseSubmit);
  el.searchInput?.addEventListener("input", render);
}

init().catch((error) => {
  el.snapshotInfo.textContent = "Failed to load snapshot data.";
  console.error(error);
});
