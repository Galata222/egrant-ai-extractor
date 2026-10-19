export type GuideKind = "ico" | "dic" | "date" | "amount" | "text";

export function guideKind(tag: string): GuideKind {
  const key = tag.toLowerCase();
  if (key === "ico" || key.endsWith(".ico")) return "ico";
  if (key === "dic" || key.endsWith(".dic")) return "dic";
  if (key.includes("datum") || key.includes("date")) return "date";
  if (
    key.includes("suma") ||
    key.includes("cena") ||
    key.includes("amount") ||
    key.includes("total") ||
    key === "table_item_currency"
  ) {
    return "amount";
  }
  return "text";
}
