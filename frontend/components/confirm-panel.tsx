"use client";

import { useEffect, useRef, useState } from "react";
import { useCopy } from "@/lib/locale";
import type { ConfirmedFill } from "@/lib/types";

type ValueBlock = {
  title: string;
  lines: Array<{ label: string; value: string }>;
};

function confirmedBlocks(
  payload: ConfirmedFill,
  sections: Record<string, string>,
  tags: Record<string, string>,
): ValueBlock[] {
  const blocks: ValueBlock[] = [];
  for (const root of payload.tree.roots) {
    for (const section of root.sections) {
      const lines: ValueBlock["lines"] = [];
      section.items.forEach((item, index) => {
        if (section.id === "polozky") {
          const visible = item.tags.filter((tag) => !isFileTag(tag, item.tags));
          const name = item.tags.find((tag) => tag.tag === "TABLE_ITEM_STRING")?.value ?? visible[0]?.value;
          const amount = item.tags.find((tag) => tag.tag === "TABLE_ITEM_CURRENCY")?.value ?? visible[1]?.value;
          lines.push({
            label: String(index + 1),
            value: [name, amount].filter(Boolean).join(" — ") || "—",
          });
          return;
        }
        for (const tag of item.tags) {
          lines.push({
            label: tags[tag.tag] ?? tag.tag,
            value: tag.value?.trim() ? tag.value : "—",
          });
        }
      });
      blocks.push({ title: sections[section.id] ?? section.id, lines });
    }
  }
  return blocks;
}

function isFileTag(
  tag: { tag: string; value: string | null },
  tags: Array<{ tag: string; value: string | null }>,
): boolean {
  if (tag.tag === "doklad.faktura" || tag.tag === "doklad.subor_id" || tag.tag.endsWith(".subor_id")) return true;
  if (tag.value?.includes("/file/")) return true;
  return Boolean(tag.value && /^\d+$/.test(tag.value) && tags.some((item) => item.value?.includes("/file/")));
}

type ConfirmPanelProps = {
  payload: ConfirmedFill;
  posted: boolean;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onRevise: () => void;
};

export function ConfirmPanel({ payload, posted, copied, onCopy, onDownload, onRevise }: ConfirmPanelProps) {
  const copy = useCopy();
  const panel = useRef<HTMLElement>(null);
  const blocks = confirmedBlocks(payload, copy.sections, copy.tags);
  const [technical, setTechnical] = useState(false);

  useEffect(() => {
    panel.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <section
      ref={panel}
      aria-labelledby="confirmed-heading"
      className="scroll-mt-28 border-t border-line pt-8"
    >
      <h2 id="confirmed-heading" className="display text-3xl">
        {copy.readyForEgrant}
      </h2>
      <p className="mt-2 text-base text-muted">{copy.confirmedValues}</p>
      {posted ? <p className="mt-2 text-base text-muted">{copy.posted}</p> : null}
      <div className="mt-4 flex flex-col gap-4">
        {blocks.map((block) => (
          <div key={block.title}>
            <h3 className="text-base font-semibold">{block.title}</h3>
            <dl className="mt-1">
              {block.lines.map((line) => (
                <div key={`${block.title}-${line.label}`} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-3 border-b border-line py-2">
                  <dt className="text-base text-muted">{line.label}</dt>
                  <dd className="text-base font-medium break-words">{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRevise}
          className="h-11 rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft"
        >
          {copy.revise}
        </button>
        <button
          type="button"
          aria-expanded={technical}
          onClick={() => setTechnical((open) => !open)}
          className="h-11 rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft"
        >
          {technical ? copy.hideTechnical : copy.showTechnical}
        </button>
      </div>
      {technical ? (
        <div className="mt-4">
          <p className="text-base text-muted">{copy.integration}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="h-11 rounded-full bg-ink px-4 text-sm font-medium text-canvas transition duration-200 hover:opacity-85"
            >
              {copied ? copy.copied : copy.copyJson}
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="h-11 rounded-full border border-line px-4 text-sm font-medium transition duration-200 hover:bg-soft"
            >
              {copy.download}
            </button>
          </div>
          <h3 className="mt-4 text-base font-semibold">{copy.confirmedTitle}</h3>
          <pre className="mt-2 max-h-80 overflow-auto rounded-xl bg-ink p-3 text-sm text-canvas">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
