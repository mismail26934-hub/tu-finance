import fs from "fs";

const exportSrc = fs.readFileSync("src/lib/export-pl-excel.ts", "utf8");
if (exportSrc.includes("sheetFormat")) {
  console.error(
    "Deploy source is outdated: export-pl-excel.ts still uses sheetFormat."
  );
  console.error("Hostinger must deploy latest GitHub main branch (commit a6935cd+).");
  process.exit(1);
}

const uploadSrc = fs.readFileSync(
  "src/app/api/pl-report/upload/route.ts",
  "utf8"
);
if (uploadSrc.includes("fs.copyFileSync") || uploadSrc.includes("fs.writeFileSync")) {
  console.error(
    "Deploy source is outdated: upload route still writes files directly."
  );
  console.error("Expected excel-storage.ts helper on latest main branch.");
  process.exit(1);
}

console.log("Deploy source verification passed.");
