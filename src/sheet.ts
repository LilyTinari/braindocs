export type Grid = Record<string, string>;

export type CellValue = { value: number | null; error?: string };

const REF = /^[A-Z]\d+$/;

export function compute(grid: Grid, id: string, stack: string[] = []): CellValue {
  if (stack.includes(id)) return { value: null, error: "cycle" };
  const raw = (grid[id] ?? "").trim();
  if (!raw) return { value: null };
  if (raw.startsWith("=")) return evalExpr(raw.slice(1), grid, [...stack, id]);
  const n = Number(raw);
  if (Number.isFinite(n) && raw !== "") return { value: n };
  return { value: null, error: "text" };
}

function evalExpr(expr: string, grid: Grid, stack: string[]): CellValue {
  const m = expr.trim().match(/^([A-Z]\d+|\d+(?:\.\d+)?)\s*([+\-*/])\s*([A-Z]\d+|\d+(?:\.\d+)?)$/);
  if (!m) return { value: null, error: "formula" };
  const left = operand(m[1], grid, stack);
  const right = operand(m[3], grid, stack);
  if (left.error || right.error || left.value === null || right.value === null) {
    return { value: null, error: left.error || right.error || "empty" };
  }
  const a = left.value;
  const b = right.value;
  if (m[2] === "+") return { value: a + b };
  if (m[2] === "-") return { value: a - b };
  if (m[2] === "*") return { value: a * b };
  if (b === 0) return { value: null, error: "divide" };
  return { value: a / b };
}

function operand(token: string, grid: Grid, stack: string[]): CellValue {
  if (REF.test(token)) return compute(grid, token, stack);
  const n = Number(token);
  return Number.isFinite(n) ? { value: n } : { value: null, error: "formula" };
}

const CLAIM = /(?:difference|gap|delta|variance)\s*(?:=|of|at|is|:)?\s*(\d+(?:\.\d+)?)/gi;

export function claimsIn(text: string) {
  CLAIM.lastIndex = 0;
  const found: { value: number; index: number; length: number }[] = [];
  for (const match of text.matchAll(CLAIM)) {
    if (match.index === undefined || !match[1]) continue;
    found.push({ value: Number(match[1]), index: match.index, length: match[0].length });
  }
  return found;
}

export function alignClaim(text: string, next: number) {
  CLAIM.lastIndex = 0;
  return text.replace(CLAIM, (full, num: string) => full.replace(num, String(next)));
}

export const COLS = ["A", "B", "C", "D", "E"] as const;
export const ROWS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function shown(grid: Grid, id: string) {
  const raw = (grid[id] ?? "").trim();
  if (!raw) return "";
  if (!raw.startsWith("=")) return raw;
  const value = compute(grid, id);
  if (value.value === null) return value.error ?? "";
  return String(round(value.value));
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function toCsv(grid: Grid) {
  return ROWS.map((row) =>
    COLS.map((col) => csvCell(grid[`${col}${row}`] ?? "")).join(","),
  ).join("\n");
}

function csvCell(value: string) {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function fromCsv(text: string): Grid {
  const grid: Grid = {};
  text
    .replaceAll("\r", "")
    .split("\n")
    .slice(0, ROWS.length)
    .forEach((line, rowIndex) => {
      parseLine(line)
        .slice(0, COLS.length)
        .forEach((cell, colIndex) => {
          if (cell.trim()) grid[`${COLS[colIndex]}${ROWS[rowIndex]}`] = cell.trim();
        });
    });
  return grid;
}

function parseLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted && ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

