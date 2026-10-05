"use client";

import { useCopy } from "@/lib/locale";
import { fieldNeedsAttention } from "@/lib/export";
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
        section.id === "polozky" ? (
          <fieldset key={section.id} className="rounded-xl border border-[#d6d3d1] bg-white p-4">
            <legend className="px-1 font-semibold">{copy.sections[section.id] ?? section.title}</legend>
            {section.items.length === 0 ? (
              <p className="mb-3 text-[#44403c]">{copy.emptyItems}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="text-sm text-[#44403c]">
                      <th className="px-1 py-2 font-semibold">{copy.tags.TABLE_ITEM_STRING}</th>
                      <th className="px-1 py-2 font-semibold">{copy.tags.TABLE_ITEM_CURRENCY}</th>
                      <th className="px-1 py-2">
                        <span className="sr-only">{copy.actions}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item) => {
                      const description = item.tags[0];
                      const amount = item.tags[1];
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="px-1 py-2">
                            {description ? (
                              <TagInput
                                tag={description}
                                sibling={amount}
                                inputId={`${item.id}-${description.tag}`}
                                onChange={(value) => onChange(section.id, item.id, description.tag, value)}
                              />
                            ) : null}
                          </td>
                          <td className="px-1 py-2">
                            {amount ? (
                              <TagInput
                                tag={amount}
                                sibling={description}
                                inputId={`${item.id}-${amount.tag}`}
                                onChange={(value) => onChange(section.id, item.id, amount.tag, value)}
                              />
                            ) : null}
                          </td>
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
