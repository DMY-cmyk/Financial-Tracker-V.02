const state = {
  meta: {
    month: "",
    year: "",
    snapshotDate: "",
  },
  incomeCategories: [],
  expenseCategories: [],
  methods: [],
  incomeTransactions: [],
  expenseTransactions: [],
  bills: [],
};

const ids = {
  heroTitle: document.getElementById("heroTitle"),
  heroDate: document.getElementById("heroDate"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  totalAssets: document.getElementById("totalAssets"),
  incomeBody: document.getElementById("incomeBody"),
  expenseBody: document.getElementById("expenseBody"),
  methodBody: document.getElementById("methodBody"),
  expenseRecapBody: document.getElementById("expenseRecapBody"),
  billBody: document.getElementById("billBody"),
  incomeCategorySelect: document.getElementById("incomeCategorySelect"),
  expenseCategorySelect: document.getElementById("expenseCategorySelect"),
  incomeMethodSelect: document.getElementById("incomeMethodSelect"),
  expenseAccountSelect: document.getElementById("expenseAccountSelect"),
  incomeForm: document.getElementById("incomeForm"),
  expenseForm: document.getElementById("expenseForm"),
};

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }
  return rows;
}

function parseRupiah(value) {
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[^\d-]/g, "");
  if (!cleaned) return 0;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function parseRows(rows) {
  const incomeCategories = [];
  const expenseCategories = [];
  const methods = [];
  const incomeTransactions = [];
  const expenseTransactions = [];
  const bills = [];
  let categoryMode = false;
  let methodMode = false;

  rows.forEach((cells) => {
    const c = Array.from({ length: 20 }, (_, idx) => (cells[idx] || "").trim());

    if (c[1] === "B U L A N" && c[3] === "T A H U N") {
      return;
    }
    if (c[1] && c[3] && !Number.isNaN(Number.parseInt(c[3], 10)) && c[1] !== "B U L A N") {
      state.meta.month = c[1];
      state.meta.year = c[3];
    }
    if (c[1] && /\d{4}/.test(c[1]) && c[1].includes(",")) {
      state.meta.snapshotDate = c[1];
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
      incomeTransactions.push({
        no: incomeNo,
        date: c[6],
        amount: parseRupiah(c[7]),
        category: c[8],
        method: c[9],
      });
    }

    const expenseNo = Number.parseInt(c[11], 10);
    if (!Number.isNaN(expenseNo)) {
      expenseTransactions.push({
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

  state.incomeCategories = uniqueNonEmpty(incomeCategories);
  state.expenseCategories = uniqueNonEmpty(expenseCategories);
  state.methods = uniqueNonEmpty(methods);
  state.incomeTransactions = incomeTransactions.sort((a, b) => a.no - b.no);
  state.expenseTransactions = expenseTransactions.sort((a, b) => a.no - b.no);
  state.bills = bills;

  if (state.methods.length === 0) {
    state.methods = uniqueNonEmpty([
      ...state.incomeTransactions.map((tx) => tx.method),
      ...state.expenseTransactions.map((tx) => tx.account),
    ]);
  }
}

function computeMetrics() {
  const totalIncome = state.incomeTransactions.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = state.expenseTransactions.reduce((sum, item) => sum + item.amount, 0);
  const totalAssets = totalIncome - totalExpense;

  const methodBalances = {};
  state.methods.forEach((method) => {
    methodBalances[method] = 0;
  });

  state.incomeTransactions.forEach((item) => {
    if (!methodBalances[item.method] && methodBalances[item.method] !== 0) {
      methodBalances[item.method] = 0;
    }
    methodBalances[item.method] += item.amount;
  });

  state.expenseTransactions.forEach((item) => {
    if (!methodBalances[item.account] && methodBalances[item.account] !== 0) {
      methodBalances[item.account] = 0;
    }
    methodBalances[item.account] -= item.amount;
  });

  const expenseRecap = {};
  state.expenseCategories.forEach((category) => {
    expenseRecap[category] = 0;
  });
  state.expenseTransactions.forEach((item) => {
    if (!expenseRecap[item.category] && expenseRecap[item.category] !== 0) {
      expenseRecap[item.category] = 0;
    }
    expenseRecap[item.category] += item.amount;
  });

  return { totalIncome, totalExpense, totalAssets, methodBalances, expenseRecap };
}

function renderOptions(select, values) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function renderTableBody(tbody, rows, cells) {
  tbody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    cells.forEach((key) => {
      const td = document.createElement("td");
      const value = row[key];
      td.textContent = key === "amount" ? formatRupiah(value) : (value || "-");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function render() {
  const metrics = computeMetrics();

  ids.heroTitle.textContent = `Budgeting Dashboard ${state.meta.month || ""} ${state.meta.year || ""}`.trim();
  ids.heroDate.textContent = state.meta.snapshotDate || "Snapshot loaded";

  ids.totalIncome.textContent = formatRupiah(metrics.totalIncome);
  ids.totalExpense.textContent = formatRupiah(metrics.totalExpense);
  ids.totalAssets.textContent = formatRupiah(metrics.totalAssets);

  renderOptions(ids.incomeCategorySelect, state.incomeCategories);
  renderOptions(ids.expenseCategorySelect, state.expenseCategories);
  renderOptions(ids.incomeMethodSelect, state.methods);
  renderOptions(ids.expenseAccountSelect, state.methods);

  renderTableBody(ids.incomeBody, state.incomeTransactions, ["no", "date", "amount", "category", "method"]);
  renderTableBody(ids.expenseBody, state.expenseTransactions, ["no", "date", "amount", "category", "account", "notes"]);

  ids.methodBody.innerHTML = "";
  Object.entries(metrics.methodBalances).forEach(([method, amount]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${method}</td><td>${formatRupiah(amount)}</td>`;
    ids.methodBody.appendChild(tr);
  });

  ids.expenseRecapBody.innerHTML = "";
  Object.entries(metrics.expenseRecap).forEach(([category, amount]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${category}</td><td>${formatRupiah(amount)}</td>`;
    ids.expenseRecapBody.appendChild(tr);
  });

  ids.billBody.innerHTML = "";
  state.bills.forEach((bill) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${bill.status}</td><td>${bill.name}</td><td>${formatRupiah(bill.amount)}</td>`;
    ids.billBody.appendChild(tr);
  });
}

function handleIncomeSubmit(event) {
  event.preventDefault();
  const formData = new FormData(ids.incomeForm);
  const amount = parseRupiah(formData.get("amount"));
  if (amount <= 0) return;
  state.incomeTransactions.push({
    no: state.incomeTransactions.length + 1,
    date: String(formData.get("date") || ""),
    amount,
    category: String(formData.get("category") || ""),
    method: String(formData.get("method") || ""),
  });
  render();
  ids.incomeForm.reset();
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const formData = new FormData(ids.expenseForm);
  const amount = parseRupiah(formData.get("amount"));
  if (amount <= 0) return;
  state.expenseTransactions.push({
    no: state.expenseTransactions.length + 1,
    date: String(formData.get("date") || ""),
    amount,
    category: String(formData.get("category") || ""),
    account: String(formData.get("account") || ""),
    notes: String(formData.get("notes") || ""),
  });
  render();
  ids.expenseForm.reset();
}

async function init() {
  const response = await fetch("./data/source.csv");
  const csv = await response.text();
  const rows = parseCsv(csv);
  parseRows(rows);
  render();

  ids.incomeForm.addEventListener("submit", handleIncomeSubmit);
  ids.expenseForm.addEventListener("submit", handleExpenseSubmit);
}

init().catch((error) => {
  // This keeps failure mode visible without breaking the page shell.
  ids.heroDate.textContent = "Failed to load data.";
  console.error(error);
});
