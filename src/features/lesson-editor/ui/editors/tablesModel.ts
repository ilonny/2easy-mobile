/**
 * Tables exercise model (parity with 2easy-site).
 * One exercise holds several teacher-built tables (grammar / vocabulary).
 */

export const TABLES_EX_TYPE = 'TABLES';

export const TABLES_MAX_TABLES = 10;
export const TABLES_MAX_ROWS = 10;
export const TABLES_MAX_COLS = 10;
export const TABLES_DEFAULT_ROWS = 3;
export const TABLES_DEFAULT_COLS = 3;
export const TABLES_CAPTION_MAX = 200;

export const TABLE_TEXT_COLORS = [
  '#3F28C6',
  '#111827',
  '#16A34A',
  '#DC2626',
  '#2563EB',
  '#F59E0B',
] as const;

export type TCellRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
};

export type TTableCell = {
  runs: TCellRun[];
};

export type TLessonTable = {
  id: string;
  caption: string;
  /** First row is a header (column titles). */
  headerRow: boolean;
  rows: TTableCell[][];
};

export type TTablesExerciseData = {
  id?: number;
  sortIndex?: number;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  description?: string;
  images?: Array<Record<string, string>>;
  tables: TLessonTable[];
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function clampInt(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const v = value.trim();
  if (!HEX_COLOR.test(v)) {
    return undefined;
  }
  return v;
}

export function sameMarks(a: TCellRun, b: TCellRun): boolean {
  return (
    !!a.bold === !!b.bold &&
    !!a.italic === !!b.italic &&
    !!a.underline === !!b.underline &&
    (sanitizeColor(a.color) || '') === (sanitizeColor(b.color) || '')
  );
}

export function sanitizeRuns(raw: unknown): TCellRun[] {
  if (!Array.isArray(raw)) {
    return [{text: ''}];
  }
  const runs: TCellRun[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const rec = item as Record<string, unknown>;
    const text = String(rec.text ?? '').replace(/\u200b/g, '');
    if (!text) {
      continue;
    }
    const run: TCellRun = {text};
    if (rec.bold === true) {
      run.bold = true;
    }
    if (rec.italic === true) {
      run.italic = true;
    }
    if (rec.underline === true) {
      run.underline = true;
    }
    const color = sanitizeColor(rec.color);
    if (color) {
      run.color = color;
    }
    const prev = runs[runs.length - 1];
    if (prev && sameMarks(prev, run)) {
      prev.text += text;
    } else {
      runs.push(run);
    }
  }
  return runs.length ? runs : [{text: ''}];
}

export function cellPlainText(cell?: TTableCell | null): string {
  return (cell?.runs || []).map(run => run.text || '').join('');
}

export function cellIsEmpty(cell?: TTableCell | null): boolean {
  return !cellPlainText(cell).trim();
}

function readCell(value: unknown): TTableCell {
  const rec =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : null;
  return {runs: sanitizeRuns(rec?.runs)};
}

export function resizeGrid(
  rows: TTableCell[][] | undefined,
  nextRowCount: number,
  nextColCount: number,
): TTableCell[][] {
  const rowCount = clampInt(nextRowCount, 1, TABLES_MAX_ROWS, 1);
  const colCount = clampInt(nextColCount, 1, TABLES_MAX_COLS, 1);
  const source = Array.isArray(rows) ? rows : [];
  const out: TTableCell[][] = [];
  for (let r = 0; r < rowCount; r++) {
    const srcRow = Array.isArray(source[r]) ? source[r] : [];
    const row: TTableCell[] = [];
    for (let c = 0; c < colCount; c++) {
      row.push(readCell(srcRow[c]));
    }
    out.push(row);
  }
  return out;
}

export function gridSize(table?: TLessonTable | null): {
  rows: number;
  cols: number;
} {
  const rows = table?.rows?.length || 0;
  const cols = table?.rows?.[0]?.length || 0;
  return {
    rows: rows || TABLES_DEFAULT_ROWS,
    cols: cols || TABLES_DEFAULT_COLS,
  };
}

export function createTable(
  id: string,
  options?: {
    rows?: number;
    cols?: number;
    caption?: string;
    headerRow?: boolean;
  },
): TLessonTable {
  const rowCount = clampInt(
    options?.rows,
    1,
    TABLES_MAX_ROWS,
    TABLES_DEFAULT_ROWS,
  );
  const colCount = clampInt(
    options?.cols,
    1,
    TABLES_MAX_COLS,
    TABLES_DEFAULT_COLS,
  );
  return {
    id,
    caption: String(options?.caption || '').slice(0, TABLES_CAPTION_MAX),
    headerRow: options?.headerRow !== false,
    rows: resizeGrid([], rowCount, colCount),
  };
}

/** New empty table with the same shape as the previous one. */
export function blankTableLike(
  source: TLessonTable | undefined,
  id: string,
): TLessonTable {
  const size = gridSize(source);
  return createTable(id, {
    rows: source ? size.rows : TABLES_DEFAULT_ROWS,
    cols: source ? size.cols : TABLES_DEFAULT_COLS,
    headerRow: source ? source.headerRow : true,
  });
}

export function shrinkWouldDropContent(
  table: TLessonTable,
  nextRows: number,
  nextCols: number,
): boolean {
  const current = gridSize(table);
  const rowCount = clampInt(nextRows, 1, TABLES_MAX_ROWS, current.rows);
  const colCount = clampInt(nextCols, 1, TABLES_MAX_COLS, current.cols);
  const rows = table.rows || [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (r < rowCount && c < colCount) {
        continue;
      }
      if (!cellIsEmpty(row[c])) {
        return true;
      }
    }
  }
  return false;
}

export function tableHasText(table: TLessonTable): boolean {
  if (String(table.caption || '').trim()) {
    return true;
  }
  return (table.rows || []).some(row =>
    (row || []).some(cell => !cellIsEmpty(cell)),
  );
}

export function canAddTable(tables: TLessonTable[] | undefined): boolean {
  return (tables?.length || 0) < TABLES_MAX_TABLES;
}

export type TCellMarks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color?: string;
};

export function cellMarks(cell?: TTableCell | null): TCellMarks {
  const run = (cell?.runs || []).find(r => (r.text || '').trim()) ||
    cell?.runs?.[0];
  return {
    bold: !!run?.bold,
    italic: !!run?.italic,
    underline: !!run?.underline,
    color: sanitizeColor(run?.color),
  };
}

/** Store plain text with uniform marks (mobile cell editor). */
export function cellFromPlainText(
  text: string,
  marks?: Partial<TCellMarks>,
): TTableCell {
  const cleaned = String(text || '').replace(/\u200b/g, '');
  if (!cleaned) {
    return {runs: [{text: ''}]};
  }
  const run: TCellRun = {text: cleaned};
  if (marks?.bold) {
    run.bold = true;
  }
  if (marks?.italic) {
    run.italic = true;
  }
  if (marks?.underline) {
    run.underline = true;
  }
  const color = sanitizeColor(marks?.color);
  if (color) {
    run.color = color;
  }
  return {runs: [run]};
}

function normalizeTable(raw: unknown, idFallback: string): TLessonTable | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const rec = raw as Record<string, unknown>;
  const rowsRaw = Array.isArray(rec.rows) ? rec.rows : [];
  const cells: TTableCell[][] = rowsRaw.map(row =>
    (Array.isArray(row) ? row : []).map(cell => readCell(cell)),
  );
  const rowCount = clampInt(
    cells.length || rec.rowCount,
    1,
    TABLES_MAX_ROWS,
    TABLES_DEFAULT_ROWS,
  );
  const colCount = clampInt(
    (cells[0]?.length || 0) || rec.colCount,
    1,
    TABLES_MAX_COLS,
    TABLES_DEFAULT_COLS,
  );
  return {
    id: String(rec.id || idFallback),
    caption: String(rec.caption || '').slice(0, TABLES_CAPTION_MAX),
    headerRow: rec.headerRow !== false,
    rows: resizeGrid(cells, rowCount, colCount),
  };
}

export function normalizeTablesData(raw: unknown): TTablesExerciseData {
  const rec =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const tablesRaw = Array.isArray(rec.tables) ? rec.tables : [];
  const tables = tablesRaw
    .slice(0, TABLES_MAX_TABLES)
    .map((table, index) => normalizeTable(table, `table-${index + 1}`))
    .filter((table): table is TLessonTable => !!table);

  const idNum = Number(rec.id);
  const sortNum = Number(rec.sortIndex);
  const titleColor = sanitizeColor(rec.titleColor) || '#3F28C6';

  return {
    ...(Number.isInteger(idNum) && idNum > 0 ? {id: idNum} : {}),
    ...(Number.isInteger(sortNum) && sortNum >= 0 ? {sortIndex: sortNum} : {}),
    title: rec.title != null ? String(rec.title) : "Let's look!",
    titleColor,
    subtitle: rec.subtitle != null ? String(rec.subtitle) : '',
    description: rec.description != null ? String(rec.description) : '',
    images: Array.isArray(rec.images)
      ? (rec.images as Array<Record<string, string>>)
      : [],
    tables: tables.length ? tables : [createTable('table-1')],
  };
}
