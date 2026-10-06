"use client";

import { useEffect, useRef } from "react";
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
};

export function ConfirmPanel({ payload, posted, copied, onCopy, onDownload }: ConfirmPanelProps) {
  const copy = useCopy();
  const panel = useRef<HTMLElement>(null);
  const blocks = confirmedBlocks(payload, copy.sections, copy.tags);

  useEffect(() => {
    panel.current?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <section
      ref={panel}
      aria-labelledby="confirmed-heading"
      className="rounded-xl border border-[#0f5132] bg-white p-4"
    >
      <h2 id="confirmed-heading" className="font-semibold">
        {copy.confirmedValues}
      </h2>
      <div className="mt-3 flex flex-col gap-4">
        {blocks.map((block) => (
          <div key={block.title}>
            <h3 className="text-sm font-semibold text-[#0f5132]">{block.title}</h3>
            <dl className="mt-1">
              {block.lines.map((line) => (
                <div key={`${block.title}-${line.label}`} className="grid grid-cols-[minmax(8rem,40%)_1fr] gap-3 border-b border-[#e7e5e4] py-2">
                  <dt className="text-[#44403c]">{line.label}</dt>
                  <dd className="font-medium break-words">{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[#292524]">{copy.integration}</p>
      {posted ? <p className="mt-1 text-[#292524]">{copy.posted}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="h-11 rounded-md bg-[#0f5132] px-4 font-semibold text-white hover:bg-[#0c3f27]"
        >
          {copied ? copy.copied : copy.copyJson}
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="h-11 rounded-md border border-[#0f5132] px-4 font-semibold text-[#0f5132] hover:bg-[#f3faf6]"
        >
          {copy.download}
        </button>
      </div>
      <h3 className="mt-4 text-sm font-semibold">{copy.confirmedTitle}</h3>
      <pre className="mt-2 max-h-80 overflow-auto rounded-md bg-[#1c1917] p-3 text-sm text-[#fafaf9]">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </section>
  );
}
