import type { Item, TagValue, Tree } from "@/lib/types";

export function updateTagValue(
  tree: Tree,
  sectionId: string,
  itemId: string,
  tagName: string,
  raw: string,
): Tree {
  return {
    roots: tree.roots.map((root) => ({
      ...root,
      sections: root.sections.map((section) => {
        if (section.id !== sectionId) return section;
        return {
          ...section,
          items: section.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              tags: item.tags.map((tag) => (tag.tag === tagName ? editedTag(tag, raw) : tag)),
            };
          }),
        };
      }),
    })),
  };
}

export function addLineItem(tree: Tree): Tree {
  const item: Item = {
    id: `polozka-${Date.now()}`,
    tags: [
      blankTag("TABLE_ITEM_STRING", "Názov položky"),
      blankTag("TABLE_ITEM_CURRENCY", "Suma položky"),
    ],
  };
  return {
    roots: tree.roots.map((root) => ({
      ...root,
      sections: root.sections.map((section) =>
        section.id === "polozky" ? { ...section, items: [...section.items, item] } : section,
      ),
    })),
  };
}

export function removeLineItem(tree: Tree, itemId: string): Tree {
  return {
    roots: tree.roots.map((root) => ({
      ...root,
      sections: root.sections.map((section) =>
        section.id === "polozky"
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section,
      ),
    })),
  };
}

function editedTag(tag: TagValue, raw: string): TagValue {
  const blank = raw.trim().length === 0;
  return {
    ...tag,
    value: raw.length === 0 ? null : raw,
    confidence: blank ? 0 : 1,
    needs_review: blank,
  };
}

function blankTag(tag: string, label: string): TagValue {
  return {
    tag,
    label,
    value: null,
    confidence: 0,
    needs_review: true,
    required: false,
  };
}
