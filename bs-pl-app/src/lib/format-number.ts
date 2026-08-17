export type NegativeFormat = "parentheses" | "minus";

export function formatNumber(
  value: number | null | undefined,
  negativeFormat: NegativeFormat = "parentheses"
): string {
  if (value == null) return "";
  if (value === 0) return "0.00";

  const abs = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (value < 0) {
    return negativeFormat === "parentheses" ? `(${abs})` : `-${abs}`;
  }

  return abs;
}

export function excelNumberFormat(negativeFormat: NegativeFormat): string {
  return negativeFormat === "parentheses"
    ? "#,##0.00;(#,##0.00)"
    : "#,##0.00;-#,##0.00";
}

export const NEGATIVE_FORMAT_OPTIONS: {
  value: NegativeFormat;
  label: string;
}[] = [
  { value: "parentheses", label: "( ) Parentheses" },
  { value: "minus", label: "- Minus" },
];
