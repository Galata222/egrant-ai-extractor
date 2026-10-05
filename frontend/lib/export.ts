import type { ConfirmedFill, TagValue, Tree } from "@/lib/types";

const THRESHOLD = 0.8;

export function fieldNeedsAttention(tag: TagValue, sibling?: TagValue): boolean {
  const blank = !tag.value?.trim();
  const siblingBlank = sibling ? !sibling.value?.trim() : true;
  if (tag.tag.startsWith("TABLE_ITEM_") && blank && siblingBlank) return false;
  if (blank) return true;
  return tag.needs_review || tag.confidence < THRESHOLD;
}

export function blockers(tree: Tree): string[] {
  const missing: string[] = [];
  for (const root of tree.roots) {
    for (const section of root.sections) {
      if (section.id === "polozky") {
        section.items.forEach((item, index) => {
          const description = item.tags.find((tag) => tag.tag === "TABLE_ITEM_STRING");
          const amount = item.tags.find((tag) => tag.tag === "TABLE_ITEM_CURRENCY");
          const hasDescription = Boolean(description?.value?.trim());
          const hasAmount = Boolean(amount?.value?.trim());
          if (hasDescription !== hasAmount) missing.push(`Položka ${index + 1}`);
        });
        continue;
      }
      for (const item of section.items) {
        for (const tag of item.tags) {
          if (tag.required && !tag.value?.trim()) missing.push(tag.label);
        }
      }
    }
  }
  return missing;
}

export function toConfirmed(tree: Tree, documentId: string, confirmedAt: string): ConfirmedFill {
  if (blockers(tree).length > 0) {
    throw new Error("Doplňte povinné údaje.");
  }
  const payload: ConfirmedFill = {
    contract: "egrant-fill.v1",
    document_id: documentId,
    confirmed_at: confirmedAt,
    integration: {
      method: "POST",
      path: "/api/v1/applications/{id}/fill",
    },
    tree: {
      roots: tree.roots.map((root) => ({
        id: root.id,
        sections: root.sections.map((section) => ({
          id: section.id,
          items: section.items
            .filter((item) => section.id !== "polozky" || item.tags.some((tag) => tag.value?.trim()))
            .map((item) => ({
              id: item.id,
              tags: item.tags.map((tag) => ({
                tag: tag.tag,
                value: tag.value?.trim() ? tag.value.trim() : null,
              })),
            })),
        })),
      })),
    },
  };
  assertShape(payload);
  return payload;
}

function assertShape(payload: ConfirmedFill) {
  if (payload.contract !== "egrant-fill.v1" || !payload.document_id) {
    throw new Error("Neplatný objekt eGrant.");
  }
  if (!Array.isArray(payload.tree.roots) || payload.tree.roots.length === 0) {
    throw new Error("Neplatný objekt eGrant.");
  }
  for (const root of payload.tree.roots) {
    if (!root.id || !Array.isArray(root.sections)) throw new Error("Neplatný objekt eGrant.");
    for (const section of root.sections) {
      if (!section.id || !Array.isArray(section.items)) throw new Error("Neplatný objekt eGrant.");
      for (const item of section.items) {
        if (!item.id || !Array.isArray(item.tags)) throw new Error("Neplatný objekt eGrant.");
        for (const tag of item.tags) {
          if (typeof tag.tag !== "string") throw new Error("Neplatný objekt eGrant.");
          if (tag.value !== null && typeof tag.value !== "string") throw new Error("Neplatný objekt eGrant.");
        }
      }
    }
  }
}
