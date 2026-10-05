"use client";

import { ConfirmPanel } from "@/components/confirm-panel";
import { DocumentPane } from "@/components/document-pane";
import { EgrantForm } from "@/components/egrant-form";
import { useCopy } from "@/lib/locale";
import type { ConfirmedFill, Tree } from "@/lib/types";

type VerificationDeskProps = {
  file: File;
  previewUrl: string;
  pagePreview: string | null;
  tree: Tree;
  documentKind: string;
  posted: boolean;
  blocked: string[];
  confirmed: ConfirmedFill | null;
  copied: boolean;
  onChange: (sectionId: string, itemId: string, tag: string, value: string) => void;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onConfirm: () => void;
  onReset: () => void;
  onCopy: () => void;
  onDownload: () => void;
};

export function VerificationDesk(props: VerificationDeskProps) {
  const copy = useCopy();
  const disabled = props.blocked.length > 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 lg:grid-cols-2 lg:items-start">
      <div className="lg:sticky lg:top-4">
        <DocumentPane file={props.file} url={props.previewUrl} pagePreview={props.pagePreview} />
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!disabled) props.onConfirm();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">{copy.form}</h2>
          <button
            type="button"
            onClick={props.onReset}
            className="h-11 rounded-md border border-[#d6d3d1] bg-white px-4 font-semibold hover:bg-[#f5f5f4]"
          >
            {copy.reset}
          </button>
        </div>
        <p className="text-[#44403c]">{copy.reviewNote}</p>
        <p className="text-sm font-semibold text-[#0f5132]">{copy.kinds[props.documentKind] ?? props.documentKind}</p>
        <EgrantForm
          tree={props.tree}
          onChange={props.onChange}
          onAddItem={props.onAddItem}
          onRemoveItem={props.onRemoveItem}
        />
        {props.confirmed ? null : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={disabled}
              className="h-12 rounded-md bg-[#0f5132] px-5 font-semibold text-white hover:bg-[#0c3f27] disabled:cursor-not-allowed disabled:bg-[#e7e5e4] disabled:text-[#44403c]"
            >
              {copy.confirm}
            </button>
            {disabled ? (
              <p className="text-[#5c3d06]">{copy.missingCount(props.blocked.length)}</p>
            ) : null}
          </div>
        )}
        {props.confirmed ? (
          <ConfirmPanel
            payload={props.confirmed}
            posted={props.posted}
            copied={props.copied}
            onCopy={props.onCopy}
            onDownload={props.onDownload}
          />
        ) : null}
      </form>
    </div>
  );
}
