import path from "path";

export const EXCEL_FILE_NAME = "Balance Sheet & Profit Loss G38.xlsx";
export const GUIDE_FILE_NAME = "Guide.xlsx";

export function getExcelFilePath() {
  return path.join(process.cwd(), "data", EXCEL_FILE_NAME);
}

export function getGuideFilePath() {
  return path.join(process.cwd(), "data", "Guide", GUIDE_FILE_NAME);
}

export function getExcelBackupDir() {
  return path.join(process.cwd(), "data", "backups");
}
