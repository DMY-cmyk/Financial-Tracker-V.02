const MIN_COL_WIDTH = 72;
const MIN_ROW_HEIGHT = 24;

const elements = {
  grid: document.getElementById("grid"),
  columnHeader: document.getElementById("column-header"),
  rowHeader: document.getElementById("row-header"),
  tabs: document.getElementById("tabs"),
  formulaInput: document.getElementById("formula-input"),
  nameBox: document.getElementById("name-box"),
  selectionLabel: document.getElementById("selection-label"),
  filterInput: document.getElementById("filter-input"),
  freezeRowToggle: document.getElementById("freeze-row-toggle"),
  freezeColToggle: document.getElementById("freeze-col-toggle"),
  sortAsc: document.getElementById("sort-asc"),
  sortDesc: document.getElementById("sort-desc"),
  clearFilter: document.getElementById("clear-filter"),
  csvFile: document.getElementById("csv-file"),
  exportCsv: document.getElementById("export-csv"),
  themeSelect: document.getElementById("theme-select"),
  shareModal: document.getElementById("share-modal"),
  historyModal: document.getElementById("history-modal"),
  openShare: document.getElementById("open-share"),
  openHistory: document.getElementById("open-history")
};

let notePopover = null;
let editing = null;

const state = {
  workbook: { sheets: [] },
  activeSheetId: "",
  activeCell: { row: 0, col: 0 },
  anchorCell: { row: 0, col: 0 },
  selection: { startRow: 0, endRow: 0, startCol: 0, endCol: 0 },
  freezeRow: false,
  freezeCol: false,
  isDragging: false,
  dragMode: null,
  resizeState: null,
  filterText: "",
  lastSortedCol: null,
  isDescSort: false
};

function buildWorkbookFromPayload(payload) {
  return {
    sheets: (payload.sheets || []).map((sheet, index) => {
      const declaredRowCount = Math.max(1, Number(sheet.rowCount) || 1);
      const declaredColCount = Math.max(1, Number(sheet.colCount) || 1);
      const cells = {};
      const sourceCells = sheet.cells || {};
      let maxPopRow = 0;
      let maxPopCol = 0;
      for (const [key, value] of Object.entries(sourceCells)) {
        cells[key] = {
          raw: String(value.raw ?? ""),
          display: String(value.raw ?? ""),
          formula: String(value.formula ?? (String(value.raw ?? "").startsWith("=") ? String(value.raw ?? "") : "")),
          comment: ""
        };
        const [r, c] = key.split(":").map(Number);
        if (r > maxPopRow) maxPopRow = r;
        if (c > maxPopCol) maxPopCol = c;
      }

      const rowCount = Math.min(declaredRowCount, maxPopRow + 20);
      const colCount = Math.min(declaredColCount, maxPopCol + 2);

      return {
        id: sheet.id || `sheet-${index + 1}`,
        name: sheet.name || `Sheet ${index + 1}`,
        rowCount,
        colCount,
        cells,
        rowHeights: Array.from({ length: rowCount }, () => MIN_ROW_HEIGHT),
        colWidths: Array.from({ length: colCount }, () => 110),
        visibleRows: Array.from({ length: rowCount }, (_, i) => i)
      };
    })
  };
}

function buildFallbackWorkbook() {
  return {
    sheets: [
      {
        id: "sheet-1",
        name: "JAN",
        rowCount: 40,
        colCount: 12,
        cells: {
          "2:7": { raw: "Unable to load data/workbook.json", display: "Unable to load data/workbook.json", formula: "", comment: "" },
          "3:7": { raw: "Run scripts/extract_xlsx.py first", display: "Run scripts/extract_xlsx.py first", formula: "", comment: "" }
        },
        rowHeights: Array.from({ length: 40 }, () => MIN_ROW_HEIGHT),
        colWidths: Array.from({ length: 12 }, () => 110),
        visibleRows: Array.from({ length: 40 }, (_, i) => i)
      }
    ]
  };
}

function currentSheet() {
  return state.workbook.sheets.find((s) => s.id === state.activeSheetId) || state.workbook.sheets[0];
}

function sheetRowCount(sheet) {
  return sheet?.rowCount || 1;
}

function sheetColCount(sheet) {
  return sheet?.colCount || 1;
}

function getCell(sheet, row, col) {
  const key = cellKey(row, col);
  if (!sheet.cells[key]) {
    sheet.cells[key] = { raw: "", display: "", formula: "", comment: "" };
  }
  return sheet.cells[key];
}

function render() {
  const sheet = currentSheet();
  if (!sheet) return;
  computeDisplays(sheet);
  renderTabs();
  renderHeaders();
  renderGrid();
  syncFormulaBar();
  syncControls();
}

function renderTabs() {
  const sheet = currentSheet();
  elements.tabs.innerHTML = "";
  for (const s of state.workbook.sheets) {
    const btn = document.createElement("button");
    btn.className = `tab${s.id === state.activeSheetId ? " active" : ""}`;
    btn.textContent = s.name;
    btn.type = "button";
    btn.addEventListener("click", () => {
      state.activeSheetId = s.id;
      state.activeCell = { row: 0, col: 0 };
      state.anchorCell = { row: 0, col: 0 };
      setSelection(0, 0, 0, 0);
      render();
    });
    elements.tabs.appendChild(btn);
  }
  elements.selectionLabel.textContent = `${sheet.name} - ${rangeLabel(state.selection)}`;
}

function renderHeaders() {
  const sheet = currentSheet();
  elements.columnHeader.innerHTML = "";
  elements.rowHeader.innerHTML = "";

  for (let c = 0; c < sheetColCount(sheet); c++) {
    const col = document.createElement("div");
    col.className = "col-head";
    col.style.width = `${sheet.colWidths[c]}px`;
    col.textContent = columnName(c);
    if (c >= state.selection.startCol && c <= state.selection.endCol) {
      col.classList.add("active");
    }
    const handle = document.createElement("div");
    handle.className = "resize-handle";
    handle.addEventListener("mousedown", (event) => startResize(event, "col", c));
    col.appendChild(handle);
    elements.columnHeader.appendChild(col);
  }

  const visibleRows = getVisibleRows(sheet);
  for (const realRow of visibleRows) {
    const rowHead = document.createElement("div");
    rowHead.className = "row-head";
    rowHead.style.height = `${sheet.rowHeights[realRow]}px`;
    rowHead.textContent = String(realRow + 1);
    if (realRow >= state.selection.startRow && realRow <= state.selection.endRow) {
      rowHead.classList.add("active");
    }

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    handle.addEventListener("mousedown", (event) => startResize(event, "row", realRow));
    rowHead.appendChild(handle);
    elements.rowHeader.appendChild(rowHead);
  }
}

function detectHeaderRows(sheet) {
  const headers = new Set();
  for (let r = 0; r < sheetRowCount(sheet); r++) {
    for (let c = 0; c < Math.min(sheetColCount(sheet), 8); c++) {
      const val = getCell(sheet, r, c).display.trim();
      if (val && val.length > 3 && val === val.toUpperCase() && !/^\d/.test(val) && !/^#/.test(val) && !/^TRUE$|^FALSE$/i.test(val)) {
        headers.add(r);
        if (r + 1 < sheetRowCount(sheet)) headers.add(r + 1);
        break;
      }
    }
  }
  return headers;
}

function renderGrid() {
  const sheet = currentSheet();
  const visibleRows = getVisibleRows(sheet);
  const totalWidth = sheet.colWidths.reduce((a, b) => a + b, 0);
  const totalHeight = visibleRows.reduce((sum, row) => sum + sheet.rowHeights[row], 0);

  elements.grid.innerHTML = "";
  const inner = document.createElement("div");
  inner.className = "grid-inner";
  inner.style.gridTemplateColumns = sheet.colWidths.map((w) => `${w}px`).join(" ");
  inner.style.gridTemplateRows = visibleRows.map((row) => `${sheet.rowHeights[row]}px`).join(" ");
  inner.style.width = `${totalWidth}px`;
  inner.style.height = `${totalHeight}px`;

  const headerRows = detectHeaderRows(sheet);

  for (const realRow of visibleRows) {
    for (let c = 0; c < sheetColCount(sheet); c++) {
      const cell = getCell(sheet, realRow, c);
      const cellEl = document.createElement("div");
      cellEl.className = "cell";
      cellEl.dataset.row = String(realRow);
      cellEl.dataset.col = String(c);

      const display = cell.display;

      if (display === "TRUE" || display === "FALSE") {
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = display === "TRUE";
        cb.addEventListener("change", () => {
          cell.raw = cb.checked ? "TRUE" : "FALSE";
          render();
        });
        cellEl.classList.add("checkbox-cell");
        cellEl.appendChild(cb);
      } else {
        const num = Number(display);
        if (display !== "" && Number.isFinite(num) && !Number.isInteger(num)) {
          cellEl.textContent = num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          cellEl.classList.add("number");
        } else if (display !== "" && Number.isFinite(num) && Number.isInteger(num) && num !== 0) {
          cellEl.textContent = num.toLocaleString("id-ID");
          cellEl.classList.add("number");
        } else {
          cellEl.textContent = display;
        }
      }

      if (headerRows.has(realRow)) {
        cellEl.classList.add("header");
      }

      if (inSelection(realRow, c)) {
        cellEl.classList.add("selected");
      }
      if (realRow === state.activeCell.row && c === state.activeCell.col) {
        cellEl.classList.add("active");
      }
      if (cell.comment) {
        cellEl.classList.add("comment");
      }

      if (state.freezeRow && realRow === 0) {
        cellEl.style.position = "sticky";
        cellEl.style.top = "0";
        cellEl.style.zIndex = "4";
        cellEl.style.background = "var(--row-col-bg)";
      }
      if (state.freezeCol && c === 0) {
        cellEl.style.position = "sticky";
        cellEl.style.left = "0";
        cellEl.style.zIndex = realRow === 0 && state.freezeRow ? "6" : "5";
        cellEl.style.background = "var(--row-col-bg)";
      }

      cellEl.addEventListener("mousedown", onCellMouseDown);
      cellEl.addEventListener("mouseenter", onCellMouseEnter);
      cellEl.addEventListener("dblclick", () => startEditing(realRow, c));
      cellEl.addEventListener("mouseenter", () => showComment(realRow, c, cellEl));
      cellEl.addEventListener("mouseleave", hideComment);
      inner.appendChild(cellEl);
    }
  }

  elements.grid.appendChild(inner);
}

function computeDisplays(sheet) {
  const cache = new Map();
  const visiting = new Set();

  function evaluateAt(row, col) {
    const key = cellKey(row, col);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const cell = getCell(sheet, row, col);
    const raw = String(cell.raw ?? "");

    if (!raw.startsWith("=")) {
      const plain = formatValue(raw);
      cache.set(key, plain);
      return plain;
    }

    if (visiting.has(key)) {
      cache.set(key, "#CYCLE!");
      return "#CYCLE!";
    }

    visiting.add(key);
    const result = evaluateFormula(raw, sheet, evaluateAt);
    visiting.delete(key);
    cache.set(key, result);
    return result;
  }

  for (let r = 0; r < sheetRowCount(sheet); r++) {
    for (let c = 0; c < sheetColCount(sheet); c++) {
      const cell = getCell(sheet, r, c);
      const display = evaluateAt(r, c);
      cell.display = String(display);
      cell.formula = String(cell.raw).startsWith("=") ? String(cell.raw) : "";
    }
  }
}

function stripDollar(s) {
  return s.replace(/\$/g, "");
}

function evaluateFormula(rawFormula, sheet, getValueAt) {
  const formula = stripDollar(rawFormula.slice(1).trim());

  if (formula === "") return "";

  if (/^IFERROR\(/i.test(formula)) {
    const inner = extractParen(formula);
    const args = splitArgsTopLevel(inner);
    if (args.length < 2) return "#ARG!";
    try {
      const result = evaluateFormula("=" + args[0], sheet, getValueAt);
      if (typeof result === "string" && result.startsWith("#")) {
        return evaluateExpr(args[1], sheet, getValueAt);
      }
      return result;
    } catch {
      return evaluateExpr(args[1], sheet, getValueAt);
    }
  }

  if (/^__xludf\.DUMMYFUNCTION\(/i.test(formula)) {
    return "#DUMMY!";
  }

  if (/^NOW\(\)/i.test(formula)) {
    const d = new Date();
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }

  if (/^SUM\(/i.test(formula)) {
    const range = extractParen(formula);
    const values = rangeValues(range, sheet, getValueAt);
    return values.reduce((sum, val) => sum + asNumber(val), 0);
  }

  if (/^AVERAGE\(/i.test(formula)) {
    const range = extractParen(formula);
    const values = rangeValues(range, sheet, getValueAt);
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + asNumber(val), 0) / values.length;
  }

  if (/^SUMIF\(/i.test(formula)) {
    const args = splitArgsTopLevel(extractParen(formula));
    if (args.length < 3) return "#ARG!";
    const criteriaRange = args[0].trim();
    const criteria = evaluateExpr(args[1], sheet, getValueAt);
    const sumRange = args[2].trim();
    return computeSumif(criteriaRange, criteria, sumRange, sheet, getValueAt);
  }

  if (/^COUNTIF\(/i.test(formula)) {
    const args = splitArgsTopLevel(extractParen(formula));
    if (args.length < 2) return "#ARG!";
    const rangeStr = args[0].trim();
    const criteria = evaluateExpr(args[1], sheet, getValueAt);
    return computeCountif(rangeStr, criteria, sheet, getValueAt);
  }

  if (/^IF\(/i.test(formula)) {
    const args = splitArgsTopLevel(extractParen(formula));
    if (args.length < 3) return "#ARG!";
    const condition = evaluateCondition(args[0], sheet, getValueAt);
    return condition ? evaluateExpr(args[1], sheet, getValueAt) : evaluateExpr(args[2], sheet, getValueAt);
  }

  if (/^[A-Z]+\d+\s*[-+/*]\s*[A-Z]+\d+$/i.test(formula)) {
    const parts = formula.split(/([-+/*])/).map((s) => s.trim());
    const left = asNumber(evalCellRef(parts[0], sheet, getValueAt));
    const op = parts[1];
    const right = asNumber(evalCellRef(parts[2], sheet, getValueAt));
    return applyOperator(left, right, op);
  }

  if (/^[A-Z]+\d+$/i.test(formula)) {
    return evalCellRef(formula, sheet, getValueAt);
  }

  if (/^[-+]?\d+(\.\d+)?$/.test(formula)) {
    return Number(formula);
  }

  return "#N/A";
}

function splitArgsTopLevel(text) {
  const result = [];
  let current = "";
  let depth = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inString = !inString; current += ch; continue; }
    if (!inString) {
      if (ch === "(") { depth++; current += ch; continue; }
      if (ch === ")") { depth--; current += ch; continue; }
      if (ch === "," && depth === 0) { result.push(current); current = ""; continue; }
    }
    current += ch;
  }
  if (current) result.push(current);
  return result;
}

function computeSumif(criteriaRange, criteria, sumRange, sheet, getValueAt) {
  const cCells = rangeCells(criteriaRange, sheet);
  const sCells = rangeCells(sumRange, sheet);
  let total = 0;
  const critStr = String(criteria);
  for (let i = 0; i < cCells.length && i < sCells.length; i++) {
    const cv = String(getValueAt(cCells[i].row, cCells[i].col));
    if (cv === critStr) {
      total += asNumber(getValueAt(sCells[i].row, sCells[i].col));
    }
  }
  return total;
}

function computeCountif(rangeStr, criteria, sheet, getValueAt) {
  const cells = rangeCells(rangeStr, sheet);
  const critStr = String(criteria);
  let count = 0;
  for (const { row, col } of cells) {
    if (String(getValueAt(row, col)) === critStr) count++;
  }
  return count;
}

function rangeCells(rangeLabel, sheet) {
  const parts = stripDollar(rangeLabel).split(":");
  const a = parseRef(parts[0].trim(), sheet);
  const b = parts[1] ? parseRef(parts[1].trim(), sheet) : a;
  if (!a || !b) return [];
  const out = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      out.push({ row: r, col: c });
    }
  }
  return out;
}

function evaluateExpr(expr, sheet, getValueAt) {
  const trimmed = expr.trim();
  if (/^".*"$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  if (/^[A-Z]+\d+$/i.test(stripDollar(trimmed))) {
    return evalCellRef(stripDollar(trimmed), sheet, getValueAt);
  }
  if (/^[-+]?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (/^[A-Z_]+\(/i.test(trimmed)) {
    return evaluateFormula("=" + trimmed, sheet, getValueAt);
  }
  return trimmed;
}

function evaluateCondition(conditionExpr, sheet, getValueAt) {
  const ops = [">=", "<=", "<>", "=", ">", "<"];
  for (const op of ops) {
    const idx = conditionExpr.indexOf(op);
    if (idx > -1) {
      const left = conditionExpr.slice(0, idx).trim();
      const right = conditionExpr.slice(idx + op.length).trim();
      const lVal = evaluateExpr(left, sheet, getValueAt);
      const rVal = evaluateExpr(right, sheet, getValueAt);
      return compare(lVal, rVal, op);
    }
  }
  return false;
}

function compare(a, b, op) {
  const left = isFinite(Number(a)) ? Number(a) : String(a);
  const right = isFinite(Number(b)) ? Number(b) : String(b);
  switch (op) {
    case ">=": return left >= right;
    case "<=": return left <= right;
    case "<>": return left !== right;
    case "=": return left === right;
    case ">": return left > right;
    case "<": return left < right;
    default: return false;
  }
}

function applyOperator(left, right, op) {
  switch (op) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/": return right === 0 ? "#DIV/0!" : left / right;
    default: return "#OP!";
  }
}

function rangeValues(rangeLabel, sheet, getValueAt) {
  const [a, b] = stripDollar(rangeLabel).split(":").map((r) => parseRef(r.trim(), sheet));
  if (!a || !b) return [];
  const startRow = Math.min(a.row, b.row);
  const endRow = Math.min(Math.max(a.row, b.row), sheetRowCount(sheet) - 1);
  const startCol = Math.min(a.col, b.col);
  const endCol = Math.min(Math.max(a.col, b.col), sheetColCount(sheet) - 1);
  const out = [];
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      out.push(getValueAt(r, c));
    }
  }
  return out;
}

function evalCellRef(refLabel, sheet, getValueAt) {
  const ref = parseRef(refLabel, sheet);
  if (!ref) return "#REF!";
  return getValueAt(ref.row, ref.col);
}

function extractParen(text) {
  const start = text.indexOf("(");
  const end = text.lastIndexOf(")");
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start + 1, end);
}

function splitArgs(text) {
  const result = [];
  let current = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inString = !inString;
      current += ch;
      continue;
    }
    if (ch === "," && !inString) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current) result.push(current.trim());
  return result;
}

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  return String(value);
}

function cellKey(row, col) {
  return `${row}:${col}`;
}

function parseRef(ref, sheet) {
  const m = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!m) return null;
  const col = lettersToCol(m[1].toUpperCase());
  const row = Number(m[2]) - 1;
  if (row < 0 || col < 0) return null;
  return { row, col };
}

function lettersToCol(letters) {
  let n = 0;
  for (let i = 0; i < letters.length; i++) {
    n = n * 26 + (letters.charCodeAt(i) - 64);
  }
  return n - 1;
}

function columnName(index) {
  let num = index + 1;
  let out = "";
  while (num > 0) {
    const rem = (num - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    num = Math.floor((num - 1) / 26);
  }
  return out;
}

function refLabel(row, col) {
  return `${columnName(col)}${row + 1}`;
}

function rangeLabel(sel) {
  const a = refLabel(sel.startRow, sel.startCol);
  const b = refLabel(sel.endRow, sel.endCol);
  return a === b ? a : `${a}:${b}`;
}

function setSelection(rowA, colA, rowB, colB) {
  state.selection = {
    startRow: Math.min(rowA, rowB),
    endRow: Math.max(rowA, rowB),
    startCol: Math.min(colA, colB),
    endCol: Math.max(colA, colB)
  };
}

function inSelection(row, col) {
  const s = state.selection;
  return row >= s.startRow && row <= s.endRow && col >= s.startCol && col <= s.endCol;
}

function syncFormulaBar() {
  const sheet = currentSheet();
  const cell = getCell(sheet, state.activeCell.row, state.activeCell.col);
  elements.nameBox.textContent = refLabel(state.activeCell.row, state.activeCell.col);
  elements.formulaInput.value = cell.formula || cell.raw || "";
}

function syncControls() {
  elements.freezeRowToggle.textContent = `Freeze row 1: ${state.freezeRow ? "On" : "Off"}`;
  elements.freezeColToggle.textContent = `Freeze column A: ${state.freezeCol ? "On" : "Off"}`;
}

function onCellMouseDown(event) {
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  elements.grid.focus();
  state.activeCell = { row, col };
  if (event.shiftKey) {
    setSelection(state.anchorCell.row, state.anchorCell.col, row, col);
  } else {
    state.anchorCell = { row, col };
    setSelection(row, col, row, col);
  }
  state.isDragging = true;
  state.dragMode = "select";
  render();
}

function onCellMouseEnter(event) {
  if (!state.isDragging || state.dragMode !== "select") return;
  const row = Number(event.currentTarget.dataset.row);
  const col = Number(event.currentTarget.dataset.col);
  state.activeCell = { row, col };
  setSelection(state.anchorCell.row, state.anchorCell.col, row, col);
  render();
}

document.addEventListener("mouseup", () => {
  state.isDragging = false;
  state.dragMode = null;
  state.resizeState = null;
});

function startResize(event, axis, index) {
  event.stopPropagation();
  const sheet = currentSheet();
  state.resizeState = {
    axis,
    index,
    startX: event.clientX,
    startY: event.clientY,
    initial: axis === "col" ? sheet.colWidths[index] : sheet.rowHeights[index]
  };
}

document.addEventListener("mousemove", (event) => {
  if (!state.resizeState) return;
  const sheet = currentSheet();
  const rs = state.resizeState;
  if (rs.axis === "col") {
    const next = Math.max(MIN_COL_WIDTH, rs.initial + (event.clientX - rs.startX));
    sheet.colWidths[rs.index] = next;
  } else {
    const next = Math.max(MIN_ROW_HEIGHT, rs.initial + (event.clientY - rs.startY));
    sheet.rowHeights[rs.index] = next;
  }
  render();
});

function startEditing(row, col) {
  if (editing) stopEditing(true);
  const cellEl = findCellElement(row, col);
  if (!cellEl) return;
  const sheet = currentSheet();
  const cell = getCell(sheet, row, col);

  const input = document.createElement("input");
  input.type = "text";
  input.value = cell.raw;
  input.style.width = "100%";
  input.style.height = "100%";
  input.style.border = "0";
  input.style.padding = "0";
  input.style.margin = "0";
  input.style.background = "transparent";
  input.style.color = "inherit";

  cellEl.textContent = "";
  cellEl.classList.add("editing");
  cellEl.appendChild(input);
  input.focus();
  input.select();

  editing = { row, col, input };

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      stopEditing(true);
      moveActiveBy(1, 0, false);
    }
    if (event.key === "Escape") {
      stopEditing(false);
    }
  });

  input.addEventListener("blur", () => stopEditing(true));
}

function stopEditing(commit) {
  if (!editing) return;
  const { row, col, input } = editing;
  if (commit) {
    const sheet = currentSheet();
    getCell(sheet, row, col).raw = input.value;
  }
  editing = null;
  render();
}

function findCellElement(row, col) {
  return elements.grid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}

function moveActiveBy(dRow, dCol, extend) {
  const sheet = currentSheet();
  const row = clamp(state.activeCell.row + dRow, 0, sheetRowCount(sheet) - 1);
  const col = clamp(state.activeCell.col + dCol, 0, sheetColCount(sheet) - 1);
  state.activeCell = { row, col };
  if (extend) {
    setSelection(state.anchorCell.row, state.anchorCell.col, row, col);
  } else {
    state.anchorCell = { row, col };
    setSelection(row, col, row, col);
  }
  ensureActiveVisible();
  render();
}

function ensureActiveVisible() {
  const cellEl = findCellElement(state.activeCell.row, state.activeCell.col);
  if (cellEl) {
    cellEl.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

elements.grid.addEventListener("keydown", (event) => {
  if (editing) return;
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveActiveBy(-1, 0, event.shiftKey);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    moveActiveBy(1, 0, event.shiftKey);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveActiveBy(0, -1, event.shiftKey);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    moveActiveBy(0, 1, event.shiftKey);
  } else if (event.key === "Tab") {
    event.preventDefault();
    moveActiveBy(0, event.shiftKey ? -1 : 1, false);
  } else if (event.key === "Enter") {
    event.preventDefault();
    startEditing(state.activeCell.row, state.activeCell.col);
  }
});

elements.formulaInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    const sheet = currentSheet();
    getCell(sheet, state.activeCell.row, state.activeCell.col).raw = elements.formulaInput.value;
    render();
    elements.grid.focus();
  }
});

elements.freezeRowToggle.addEventListener("click", () => {
  state.freezeRow = !state.freezeRow;
  render();
});

elements.freezeColToggle.addEventListener("click", () => {
  state.freezeCol = !state.freezeCol;
  render();
});

elements.filterInput.addEventListener("input", () => {
  state.filterText = elements.filterInput.value.trim().toLowerCase();
  applyFilter();
  render();
});

elements.clearFilter.addEventListener("click", () => {
  state.filterText = "";
  elements.filterInput.value = "";
  const sheet = currentSheet();
  sheet.visibleRows = Array.from({ length: sheetRowCount(sheet) }, (_, i) => i);
  render();
});

function applyFilter() {
  const sheet = currentSheet();
  if (!state.filterText) {
    sheet.visibleRows = Array.from({ length: sheetRowCount(sheet) }, (_, i) => i);
    return;
  }

  const out = [0];
  for (let r = 1; r < sheetRowCount(sheet); r++) {
    let matched = false;
    for (let c = 0; c < sheetColCount(sheet); c++) {
      const value = getCell(sheet, r, c).display.toLowerCase();
      if (value.includes(state.filterText)) {
        matched = true;
        break;
      }
    }
    if (matched) out.push(r);
  }
  sheet.visibleRows = out;
}

function getVisibleRows(sheet) {
  return sheet.visibleRows && sheet.visibleRows.length ? sheet.visibleRows : [0];
}

elements.sortAsc.addEventListener("click", () => sortByActiveColumn(false));
elements.sortDesc.addEventListener("click", () => sortByActiveColumn(true));

function sortByActiveColumn(desc) {
  const sheet = currentSheet();
  const col = state.activeCell.col;
  const bodyRows = Array.from({ length: Math.max(sheetRowCount(sheet) - 1, 0) }, (_, i) => i + 1);
  bodyRows.sort((a, b) => {
    const va = getCell(sheet, a, col).display;
    const vb = getCell(sheet, b, col).display;
    const na = Number(va);
    const nb = Number(vb);
    const cmp = Number.isFinite(na) && Number.isFinite(nb) ? na - nb : String(va).localeCompare(String(vb));
    return desc ? -cmp : cmp;
  });

  reorderRows(sheet, [0, ...bodyRows]);
  state.lastSortedCol = col;
  state.isDescSort = desc;
  applyFilter();
  render();
}

function reorderRows(sheet, rowOrder) {
  const nextCells = {};
  const nextHeights = [...sheet.rowHeights];
  for (let visual = 0; visual < rowOrder.length; visual++) {
    const sourceRow = rowOrder[visual];
    for (let c = 0; c < sheetColCount(sheet); c++) {
      nextCells[cellKey(visual, c)] = { ...getCell(sheet, sourceRow, c) };
    }
    nextHeights[visual] = sheet.rowHeights[sourceRow];
  }

  sheet.cells = nextCells;
  sheet.rowHeights = nextHeights;
  sheet.visibleRows = Array.from({ length: sheetRowCount(sheet) }, (_, i) => i);
}

elements.csvFile.addEventListener("change", () => {
  const file = elements.csvFile.files && elements.csvFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result));
    loadRowsIntoSheet(currentSheet(), rows);
    elements.csvFile.value = "";
    render();
  };
  reader.readAsText(file);
});

elements.exportCsv.addEventListener("click", () => {
  const csv = sheetToCsv(currentSheet());
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${currentSheet().name.replace(/\s+/g, "_").toLowerCase()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function resizeSheet(sheet, rowCount, colCount) {
  sheet.rowCount = Math.max(1, rowCount);
  sheet.colCount = Math.max(1, colCount);

  if (sheet.rowHeights.length < sheet.rowCount) {
    while (sheet.rowHeights.length < sheet.rowCount) sheet.rowHeights.push(MIN_ROW_HEIGHT);
  } else {
    sheet.rowHeights.length = sheet.rowCount;
  }

  if (sheet.colWidths.length < sheet.colCount) {
    while (sheet.colWidths.length < sheet.colCount) sheet.colWidths.push(110);
  } else {
    sheet.colWidths.length = sheet.colCount;
  }

  sheet.visibleRows = Array.from({ length: sheet.rowCount }, (_, i) => i);
}

function loadRowsIntoSheet(sheet, rows) {
  const nextRows = Math.max(rows.length || 1, sheet.rowCount);
  const nextCols = Math.max(...rows.map((r) => r.length), sheet.colCount, 1);
  resizeSheet(sheet, nextRows, nextCols);
  sheet.cells = {};

  for (let r = 0; r < sheet.rowCount; r++) {
    for (let c = 0; c < sheet.colCount; c++) {
      const value = rows[r] && rows[r][c] !== undefined ? rows[r][c] : "";
      if (value !== "") {
        sheet.cells[cellKey(r, c)] = { raw: String(value), display: String(value), formula: String(value).startsWith("=") ? String(value) : "", comment: "" };
      }
    }
  }
}

function sheetToCsv(sheet) {
  const lines = [];
  for (let r = 0; r < sheetRowCount(sheet); r++) {
    const cells = [];
    for (let c = 0; c < sheetColCount(sheet); c++) {
      const raw = String(getCell(sheet, r, c).raw ?? "");
      cells.push(escapeCsv(raw));
    }
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

function escapeCsv(value) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

elements.themeSelect.addEventListener("change", () => {
  const theme = elements.themeSelect.value;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sheet-theme", theme);
});

function initTheme() {
  const saved = localStorage.getItem("sheet-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  elements.themeSelect.value = saved;
}

elements.openShare.addEventListener("click", () => elements.shareModal.showModal());
elements.openHistory.addEventListener("click", () => elements.historyModal.showModal());

document.querySelectorAll("[data-close-modal]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = btn.getAttribute("data-close-modal");
    const modal = document.getElementById(id);
    if (modal) modal.close();
  });
});

function showComment(row, col, cellEl) {
  const sheet = currentSheet();
  const comment = getCell(sheet, row, col).comment;
  if (!comment) return;
  hideComment();
  notePopover = document.createElement("div");
  notePopover.className = "note-popover";
  notePopover.textContent = comment;
  document.body.appendChild(notePopover);
  const rect = cellEl.getBoundingClientRect();
  notePopover.style.left = `${rect.right + 6}px`;
  notePopover.style.top = `${rect.top + 4}px`;
}

function hideComment() {
  if (notePopover) {
    notePopover.remove();
    notePopover = null;
  }
}

async function loadWorkbookData() {
  try {
    const response = await fetch("data/workbook.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    return buildWorkbookFromPayload(payload);
  } catch (error) {
    console.error("Failed to load workbook.json", error);
    return buildFallbackWorkbook();
  }
}

async function init() {
  initTheme();
  state.workbook = await loadWorkbookData();
  state.activeSheetId = state.workbook.sheets[0]?.id || "";
  state.activeCell = { row: 0, col: 0 };
  state.anchorCell = { row: 0, col: 0 };
  setSelection(0, 0, 0, 0);
  render();
  elements.grid.focus();

  elements.grid.addEventListener("scroll", () => {
    elements.columnHeader.scrollLeft = elements.grid.scrollLeft;
    elements.rowHeader.scrollTop = elements.grid.scrollTop;
  });
}

init();
