import type { Response } from "express";
import { serializeItem } from "./serializers";
import { HttpError } from "./http";

export type ExportFormat = "csv" | "json";

type ExportItemInput = Parameters<typeof serializeItem>[0];
type SerializedExportItem = ReturnType<typeof serializeItem>;

const csvColumns: Array<{
  header: string;
  value: (item: SerializedExportItem) => string | number | boolean | null | undefined;
}> = [
  { header: "id", value: (item) => item.id },
  { header: "closet", value: (item) => item.closet?.name },
  { header: "section", value: (item) => item.section?.name },
  { header: "brand", value: (item) => item.brand },
  { header: "name", value: (item) => item.name },
  { header: "price", value: (item) => item.price },
  { header: "originalPrice", value: (item) => item.originalPrice },
  { header: "currency", value: (item) => item.currency },
  { header: "season", value: (item) => item.season },
  { header: "onSale", value: (item) => item.onSale },
  { header: "inStock", value: (item) => item.inStock },
  { header: "favorited", value: (item) => item.favorited },
  { header: "tags", value: (item) => item.tags.join("; ") },
  { header: "colors", value: (item) => item.colors.join("; ") },
  { header: "url", value: (item) => item.url },
  { header: "source", value: (item) => item.source },
  { header: "description", value: (item) => item.description },
  { header: "note", value: (item) => item.note },
  { header: "addedAt", value: (item) => item.addedAt },
  { header: "updatedAt", value: (item) => item.updatedAt },
  { header: "lastCheckedAt", value: (item) => item.lastCheckedAt }
];

export function parseExportFormat(value: unknown): ExportFormat {
  if (value === undefined) {
    return "csv";
  }

  if (value === "csv" || value === "json") {
    return value;
  }

  throw new HttpError(400, "format must be csv or json.");
}

export function sendItemsExport(
  res: Response,
  items: ExportItemInput[],
  format: ExportFormat,
  filenameBase: string
) {
  const serialized = items.map(serializeItem);
  const extension = format === "json" ? "json" : "csv";
  const filename = `${sanitizeFilename(filenameBase)}.${extension}`;

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  if (format === "json") {
    res.type("application/json").send(JSON.stringify(serialized, null, 2));
    return;
  }

  res.type("text/csv").send(toCsv(serialized));
}

function toCsv(items: SerializedExportItem[]) {
  return [
    csvColumns.map((column) => csvCell(column.header)).join(","),
    ...items.map((item) => csvColumns.map((column) => csvCell(column.value(item))).join(","))
  ].join("\n");
}

export function csvCell(value: string | number | boolean | null | undefined) {
  const raw = value === null || value === undefined ? "" : String(value);
  // Neutralize CSV formula injection: a string field (e.g. a scraped product name) starting
  // with a formula trigger is forced to text with a leading apostrophe. Numbers/booleans from
  // the app are trusted and left untouched so legit values (negative prices) aren't mangled.
  const guarded = typeof value === "string" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  const escaped = guarded.replace(/"/g, "\"\"");

  return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "wishlist";
}
