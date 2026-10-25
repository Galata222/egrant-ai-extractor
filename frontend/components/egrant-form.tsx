"use client";

import { useState } from "react";
import { useCopy } from "@/lib/locale";
import { guideKind } from "@/lib/field-guide";
import { invalidFormat } from "@/lib/validate";
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
              className="mt-2 h-11 rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft"
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
  const showOrders = items.some((item) => lineParts(item).order);
  const showProofs = items.some((item) => lineParts(item).proof);
  const descriptionLabel = sampleParts?.description
    ? (copy.tags[sampleParts.description.tag] ?? sampleParts.description.label)
    : copy.tags.TABLE_ITEM_STRING;
  const amountLabel = sampleParts?.amount
    ? (copy.tags[sampleParts.amount.tag] ?? sampleParts.amount.label)
    : copy.tags.TABLE_ITEM_CURRENCY;
  const fileLabelText = sampleParts?.file
    ? (copy.tags[sampleParts.file.tag] ?? sampleParts.file.label)
    : copy.tags["doklad.faktura"];
  const orderLabelText = copy.tags["doklad.objednavka"] ?? "Objednávka";
  const proofLabelText = copy.tags["doklad.plnenie"] ?? "Plnenie";
  return (
    <div className="max-h-[28rem] overflow-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-base text-muted">
            <th className="px-1 py-2 font-semibold">{descriptionLabel}</th>
            <th className="px-1 py-2 font-semibold">{amountLabel}</th>
            {showFiles ? <th className="px-1 py-2 font-semibold">{fileLabelText}</th> : null}
            {showOrders ? <th className="px-1 py-2 font-semibold">{orderLabelText}</th> : null}
            {showProofs ? <th className="px-1 py-2 font-semibold">{proofLabelText}</th> : null}
            <th className="px-1 py-2">
              <span className="sr-only">{copy.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const { description, amount, file: invoice, order, proof } = lineParts(item);
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
                    <FileLink value={invoice?.value ?? null} />
                  </td>
                ) : null}
                {showOrders ? (
                  <td className="px-1 py-2">
                    <FileLink value={order?.value ?? null} />
                  </td>
                ) : null}
                {showProofs ? (
                  <td className="px-1 py-2">
                    <FileLink value={proof?.value ?? null} />
                  </td>
                ) : null}
                <td className="px-1 py-2">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-11 rounded-full border border-line px-3 text-sm font-medium transition duration-200 hover:bg-soft"
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
  const file = item.tags.find((tag) => tag.tag === "doklad.faktura" || tag.tag.endsWith(".faktura"));
  const order = item.tags.find((tag) => tag.tag === "doklad.objednavka" || tag.tag.endsWith(".objednavka"));
  const proof = item.tags.find((tag) => tag.tag === "doklad.plnenie" || tag.tag.endsWith(".plnenie"));
  const links = new Set([file, order, proof].filter((tag) => tag !== undefined));
  const visible = item.tags.filter((tag) => !links.has(tag) && !isFileId(tag, item.tags));
  return { description: visible[0], amount: visible[1], file, order, proof };
}

function isFileId(tag: TagValue, tags: TagValue[]): boolean {
  if (tag.tag === "doklad.subor_id" || tag.tag.endsWith(".subor_id")) return true;
  return Boolean(tag.value && /^\d+$/.test(tag.value) && tags.some((item) => item.value?.includes("/file/")));
}

function FileLink({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <p className="pt-2 text-base break-all" title={value}>
      {fileLabel(value)}
    </p>
  );
}

function fileLabel(value: string | null): string {
  if (!value) return "";
  return value
    .split(";")
    .map((part) => {
      const text = part.trim();
      const stored = text.match(/\/file\/([^/\s]+)/i);
      if (stored) return stored[1];
      const name = text.split("?")[0]?.split("/").pop();
      return name || text;
    })
    .filter(Boolean)
    .join(", ");
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
  const kind = guideKind(tag.tag);
  const guide = copy.fieldGuide[kind];
  const blank = !tag.value?.trim();
  const badFormat = !blank && invalidFormat(tag.tag, tag.value);
  const hint = !attention ? null : blank ? guide.missing : badFormat ? guide.invalid : copy.unknown;
  const hintId = `${inputId}-hint`;
  const helpId = `${inputId}-help`;
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <div>
      {labelled ? (
        <div className="mb-1 flex items-center gap-2">
          <label htmlFor={inputId} className="font-medium">
            {label}
          </label>
          {guide.help ? (
            <button
              type="button"
              aria-expanded={helpOpen}
              aria-controls={helpId}
              onClick={() => setHelpOpen((open) => !open)}
              className="h-11 rounded-full border border-line px-3 text-sm font-medium transition duration-200 hover:bg-soft"
            >
              {copy.help}
            </button>
          ) : null}
        </div>
      ) : (
        <label htmlFor={inputId} className="sr-only">
          {label}
        </label>
      )}
      {labelled && helpOpen && guide.help ? (
        <p id={helpId} className="mb-2 max-w-md text-base text-muted">
          {guide.help}
        </p>
      ) : null}
      <input
        id={inputId}
        value={tag.value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={attention}
        aria-describedby={hint ? hintId : undefined}
        spellCheck={false}
        autoCorrect="off"
        placeholder={blank && guide.shape ? guide.shape : undefined}
        data-agent-focus={focused ? "true" : undefined}
        className={`h-12 w-full min-w-36 rounded-2xl px-4 text-base text-ink transition duration-200 placeholder:text-muted ${
          attention ? "border-2 border-warn bg-warn-bg" : "border border-transparent bg-soft"
        } ${focused ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""}`}
      />
      {hint ? (
        <p id={hintId} className="mt-1 flex gap-1 text-base text-warn">
          <WarningIcon />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  );
}
