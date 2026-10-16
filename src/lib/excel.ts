import writeXlsxFile from "write-excel-file/browser";

export type XCell = string | number | { value: string | number; bold?: boolean; money?: boolean };
export interface XSheet {
  name: string;
  widths: number[];
  rows: XCell[][];
}

function cell(c: XCell) {
  if (typeof c === "string") return { value: c, type: String };
  if (typeof c === "number") return { value: c, type: Number };
  const base: Record<string, unknown> = typeof c.value === "number" ? { value: c.value, type: Number } : { value: c.value, type: String };
  if (c.bold) base.fontWeight = "bold";
  if (c.money && typeof c.value === "number") base.format = '"$"#,##0';
  return base;
}

/** Genera y descarga un archivo .xlsx (Excel) directamente en el navegador. */
export async function downloadXlsx(fileName: string, sheets: XSheet[]): Promise<void> {
  await writeXlsxFile(
    sheets.map((s) => ({
      sheet: s.name,
      columns: s.widths.map((width) => ({ width })),
      data: s.rows.map((r) => r.map((c) => cell(c) as never)),
    })) as never,
  ).toFile(fileName);
}
