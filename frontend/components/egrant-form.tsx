"use client";

import { useCopy } from "@/lib/locale";
import { fieldNeedsAttention } from "@/lib/export";
import { isLineSection } from "@/lib/tree";
import type { AgentField, TagValue, Tree } from "@/lib/types";
import { WarningIcon } from "@/components/warning-icon";

type EgrantFormProps = {
  tree: Tree;
  focus: AgentField | null;
  onChange: (sectionId: string, itemId: string, tag: string, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
};

export function EgrantForm({ tree, focus, onChange, onAddItem, onRemoveItem }: EgrantFormProps) {
  const copy = useCopy();
  return (
    <div className="flex flex-col">
      {tree.roots[0]?.sections.map((section) =>
        isLineSection(tree, section.id, section.role) ? (
          <fieldset key={section.id} className="border-t border-line pt-8">
            <legend className="display mb-4 block w-full text-[28px]">
              {copy.sections[section.id] ?? section.title}
              <span className="ml-3 font-sans text-base font-medium tracking-normal text-muted">{section.items.length}</span>
            </legend>
            {section.items.length === 0 ? (
              <p className="mb-3 text-muted">{copy.emptyItems}</p>
            ) : (
              <LineItemTable
                sectionId={section.id}
                items={section.items}
                focus={focus}
                onChange={onChange}
                onRemoveItem={onRemoveItem}
              />
            )}
            <button
              type="button"
              onClick={onAddItem}
              className="mt-2 h-10 rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft"
            >
              {copy.addItem}
            </button>
          </fieldset>
        ) : (
          <fieldset key={section.id} className="border-t border-line pt-8 first:border-t-0 first:pt-0">
            <legend className="display mb-5 block w-full text-[28px]">{copy.sections[section.id] ?? section.title}</legend>
            <div className="flex flex-col gap-4">
              {section.items[0]?.tags.map((tag) => (
                <TagInput
                  key={tag.tag}
                  tag={tag}
                  inputId={`${section.id}-${tag.tag}`}
                  labelled
                  focused={isAgentFocus(focus, section.id, section.items[0].id, tag.tag)}
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
  focus,
  onChange,
  onRemoveItem,
}: {
  sectionId: string;
  items: Tree["roots"][number]["sections"][number]["items"];
  focus: AgentField | null;
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
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-sm text-muted">
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
                      focused={isAgentFocus(focus, sectionId, item.id, description.tag)}
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
                      focused={isAgentFocus(focus, sectionId, item.id, amount.tag)}
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
                    className="h-10 rounded-full border border-line px-3 text-sm font-medium transition duration-200 hover:bg-soft"
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

function isAgentFocus(focus: AgentField | null, sectionId: string, itemId: string, tag: string) {
  return focus?.section_id === sectionId && focus.item_id === itemId && focus.tag === tag;
}

function TagInput({
  tag,
  sibling,
  inputId,
  labelled = false,
  focused = false,
  onChange,
}: {
  tag: TagValue;
  sibling?: TagValue;
  inputId: string;
  labelled?: boolean;
  focused?: boolean;
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
        data-agent-focus={focused ? "true" : undefined}
        className={`h-12 w-full min-w-36 rounded-2xl px-4 text-base text-ink transition duration-200 ${
          attention ? "border-2 border-warn bg-warn-bg" : "border border-transparent bg-soft"
        } ${focused ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""}`}
      />
      {attention ? (
        <p id={hintId} className="mt-1 flex gap-1 text-sm text-warn">
          <WarningIcon />
          <span>{copy.unknown}</span>
        </p>
      ) : null}
    </div>
  );
}
