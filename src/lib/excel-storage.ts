import fs from "fs";
import path from "path";
import { EXCEL_FILE_NAME, GUIDE_FILE_NAME } from "@/lib/excel-file";

const DATA_ROOT = path.join(process.cwd(), "data");
const EXCEL_PATH = path.join(DATA_ROOT, EXCEL_FILE_NAME);
const GUIDE_PATH = path.join(DATA_ROOT, "Guide", GUIDE_FILE_NAME);
const BACKUP_ROOT = path.join(DATA_ROOT, "backups");

export function readGuideBuffer(): Buffer | undefined {
  if (!fs.existsSync(GUIDE_PATH)) return undefined;
  return fs.readFileSync(GUIDE_PATH);
}

export function readExcelBuffer(): Buffer | null {
  if (!fs.existsSync(EXCEL_PATH)) return null;
  return fs.readFileSync(EXCEL_PATH);
}

export function guideFileExists(): boolean {
  return fs.existsSync(GUIDE_PATH);
}

export function saveExcelUpload(buffer: Buffer): { backupName: string | null } {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
  fs.mkdirSync(BACKUP_ROOT, { recursive: true });

  let backupName: string | null = null;
  if (fs.existsSync(EXCEL_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupName = `backup-${stamp}.xlsx`;
    fs.copyFileSync(EXCEL_PATH, `${BACKUP_ROOT}/${backupName}`);
  }

  fs.writeFileSync(EXCEL_PATH, buffer);
  return { backupName };
}
