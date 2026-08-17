export type RowType = "detail" | "category" | "total" | "metric" | "header";

export interface PLRow {
  id: string;
  label: string;
  remark?: string;
  parentLabel?: string;
  rowType: RowType;
  values: Record<string, number | null>;
  subRows?: PLRow[];
  /** Direct child labels from Guide, in P&L order */
  childLabels?: string[];
}

export interface PLReport {
  sheetName: string;
  periods: string[];
  rows: PLRow[];
}

export interface GuideEntry {
  label: string;
  remark: string;
  parent: string;
}
