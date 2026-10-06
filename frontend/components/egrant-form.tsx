"use client";

import { useCopy } from "@/lib/locale";
import { fieldNeedsAttention } from "@/lib/export";
import { isLineSection } from "@/lib/tree";
import type { TagValue, Tree } from "@/lib/types";
import { WarningIcon } from "@/components/warning-icon";

type EgrantFormProps = {
  tree: Tree;
  onChange: (sectionId: string, itemId: string, tag: string, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
};

export function EgrantForm({ tree, onChange, onAddItem, onRemoveItem }: EgrantFormProps) {
  const copy = useCopy();
  return (
    <div className="flex flex-col gap-6">
      {tree.roots[0]?.sections.map((section) =>
        isLineSection(tree, section.id, section.role) ? (
          <fieldset key={section.id} className="rounded-xl border border-[#d6d3d1] bg-white p-4">
            <legend className="px-1 font-semibold">{copy.sections[section.id] ?? section.title}</legend>
            {section.items.length === 0 ? (
              <p className="mb-3 text-[#44403c]">{copy.emptyItems}</p>
            ) : (
              <LineItemTable
                sectionId={section.id}
                items={section.items}
                onChange={onChange}
                onRemoveItem={onRemoveItem}
              />
            )}
            <button
              type="button"
              onClick={onAddItem}
              className="mt-2 h-11 rounded-md border border-[#0f5132] px-4 font-semibold text-[#0f5132] hover:bg-[#f3faf6]"
            >
              {copy.addItem}
            </button>
          </fieldset>
        ) : (
          <fieldset key={section.id} className="rounded-xl border border-[#d6d3d1] bg-white p-4">
            <legend className="px-1 font-semibold">{copy.sections[section.id] ?? section.title}</legend>
            <div className="flex flex-col gap-4">
              {section.items[0]?.tags.map((tag) => (
                <TagInput
                  key={tag.tag}
                  tag={tag}
                  inputId={`${section.id}-${tag.tag}`}
                  labelled
                  onChange={(value) => onChange(section.id, section.items[0].id, tag.tag, value)}
                />
              ))}
            </div>
          </fieldset>
        ),
      )}
    </div>
  );
}

function LineItemTable({
  sectionId,
  items,
  onChange,
  onRemoveItem,
}: {
  sectionId: string;
  items: Tree["roots"][number]["sections"][number]["items"];
  onChange: EgrantFormProps["onChange"];
  onRemoveItem: EgrantFormProps["onRemoveItem"];
}) {
  const copy = useCopy();
  const sample = items[0];
  const sampleParts = sample ? lineParts(sample) : null;
  const showFiles = items.some((item) => lineParts(item).file);
  const descriptionLabel = sampleParts?.description
    ? (copy.tags[sampleParts.description.tag] ?? sampleParts.description.label)
    : copy.tags.TABLE_ITEM_STRING;
  const amountLabel = sampleParts?.amount
    ? (copy.tags[sampleParts.amount.tag] ?? sampleParts.amount.label)
    : copy.tags.TABLE_ITEM_CURRENCY;
  const fileLabelText = sampleParts?.file
    ? (copy.tags[sampleParts.file.tag] ?? sampleParts.file.label)
    : copy.tags["doklad.faktura"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-sm text-[#44403c]">
            <th className="px-1 py-2 font-semibold">{descriptionLabel}</th>
            <th className="px-1 py-2 font-semibold">{amountLabel}</th>
            {showFiles ? <th className="px-1 py-2 font-semibold">{fileLabelText}</th> : null}
            <th className="px-1 py-2">
              <span className="sr-only">{copy.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { description, amount, file: invoice } = lineParts(item);
            return (
              <tr key={item.id} className="align-top">
                <td className="px-1 py-2">
                  {description ? (
                    <TagInput
                      tag={description}
                      sibling={amount}
                      inputId={`${item.id}-${description.tag}`}
                      onChange={(value) => onChange(sectionId, item.id, description.tag, value)}
                    />
                  ) : null}
                </td>
                <td className="px-1 py-2">
                  {amount ? (
                    <TagInput
                      tag={amount}
                      sibling={description}
                      inputId={`${item.id}-${amount.tag}`}
                      onChange={(value) => onChange(sectionId, item.id, amount.tag, value)}
                    />
                  ) : null}
                </td>
                {showFiles ? (
                  <td className="px-1 py-2">
                    <p className="pt-2 text-sm break-all" title={invoice?.value ?? undefined}>
                      {fileLabel(invoice?.value ?? null)}
                    </p>
                  </td>
                ) : null}
                <td className="px-1 py-2">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-11 rounded-md border border-[#d6d3d1] px-3 text-sm font-semibold hover:bg-[#f5f5f4]"
                  >
                    {copy.removeItem}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function lineParts(item: { tags: TagValue[] }) {
  const file = item.tags.find((tag) => tag.tag === "doklad.faktura" || Boolean(tag.value && tag.value.includes("/file/")));
  const visible = item.tags.filter((tag) => tag !== file && !isFileId(tag, item.tags));
  return { description: visible[0], amount: visible[1], file };
}

function isFileId(tag: TagValue, tags: TagValue[]): boolean {
  if (tag.tag === "doklad.subor_id" || tag.tag.endsWith(".subor_id")) return true;
  return Boolean(tag.value && /^\d+$/.test(tag.value) && tags.some((item) => item.value?.includes("/file/")));
}

function fileLabel(value: string | null): string {
  if (!value) return "";
  const match = value.match(/\/file\/([^/\s]+)/i);
  return match?.[1] ?? value;
}

function TagInput({
  tag,
  sibling,
  inputId,
  labelled = false,
  onChange,
}: {
  tag: TagValue;
  sibling?: TagValue;
  inputId: string;
  labelled?: boolean;
  onChange: (value: string) => void;
}) {
  const copy = useCopy();
  const label = copy.tags[tag.tag] ?? tag.label;
  const attention = fieldNeedsAttention(tag, sibling);
  const hintId = `${inputId}-hint`;
  return (
    <div>
      {labelled ? (
        <label htmlFor={inputId} className="mb-1 block font-medium">
          {label}
        </label>
      ) : (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      )}
      <input
        id={inputId}
        value={tag.value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={attention}
        aria-describedby={attention ? hintId : undefined}
        className={`h-11 w-full min-w-36 rounded-md px-3 text-base text-[#1c1917] ${
          attention ? "border-2 border-[#92600a] bg-[#fff7e6]" : "border border-[#d6d3d1] bg-white"
        }`}
      />
      {attention ? (
        <p id={hintId} className="mt-1 flex gap-1 text-sm text-[#5c3d06]">
          <WarningIcon />
          <span>{copy.unknown}</span>
        </p>
      ) : null}
    </div>
  );
}
