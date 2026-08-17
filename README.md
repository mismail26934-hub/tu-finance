# Balance Sheet & Profit Loss G38

Next.js app that reads `Balance Sheet & Profit Loss G38.xlsx` and displays the **Profit & Loss** sheet with Excel-style row grouping (expand/collapse).

## Stack

- **Next.js 16** (App Router)
- **TanStack Query** — data fetching & cache
- **xlsx** — Excel parsing on the server
- **Tailwind CSS** — table styling (orange header, blue categories, green totals)

## Getting started

```bash
cd bs-pl-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** If the parent folder path contains `&`, use `npm run dev` (scripts invoke Next via `node` directly to avoid Windows shell issues).

## Data source

Excel file location: `data/Balance Sheet & Profit Loss G38.xlsx`

Replace this file to refresh report data. The API reads sheet **Profit & Loss** and grouping metadata from sheet **Guide** (column `Remark`).

## Grouping behaviour

- Each row's parent group is determined by the **Remark** column in sheet `Guide` (`Sub dari …`).
- Example: account rows with `Sub dari REVENUE PRIME PRODUCT` group under **PRIME PRODUCT**.
- Category rows like **PRIME PRODUCT** have `Sub dari TOTAL REVENUE` and can expand/collapse their detail accounts.
- Multi-level hierarchy is supported (e.g. TOTAL REVENUE → PRIME PRODUCT → account details).
- Default view collapses groups that contain account-level detail rows.

## Default view

Shows **Jan-26 → Jul-26** and **YTD 2026**, matching the Excel screenshot layout.
