import type { ExtractionResponse } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;

export function validateFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const allowedType = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ].includes(file.type);
  const allowedName = /\.(pdf|jpe?g|png|xlsx)$/.test(name);
  if (!allowedType && !allowedName) return "unsupported_type";
  if (file.size > MAX_BYTES) return "file_too_large";
  return null;
}

export async function extractFile(file: File, mapping: string | null = null): Promise<ExtractionResponse> {
  const body = new FormData();
  body.append("file", file, file.name);
  if (mapping) body.append("mapping", mapping);
  const response = await fetch("/api/extract", { method: "POST", body });
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (!response.ok) {
    throw new Error(errorCode(payload));
  }
  return payload as ExtractionResponse;
}

function errorCode(payload: { detail?: unknown } | null): string {
  const detail = payload?.detail;
  if (detail && typeof detail === "object" && "code" in detail && typeof detail.code === "string") {
    return detail.code;
  }
  return "extract_failed";
}
