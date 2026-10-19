"use client";

import { AgentPanel } from "@/components/agent-panel";
import { ConfirmPanel } from "@/components/confirm-panel";
import { DocumentPane } from "@/components/document-pane";
import { EgrantForm } from "@/components/egrant-form";
import { firstGap } from "@/lib/export";
import { useCopy } from "@/lib/locale";
import type { AgentTurn, ConfirmedFill, Tree } from "@/lib/types";

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
  confirming: boolean;
  onConfirm: () => void;
  onRevise: () => void;
  onReset: () => void;
  onCopy: () => void;
  onDownload: () => void;
  agent: AgentTurn | null;
  agentBusy: boolean;
  agentValue: string;
  agentError: string | null;
  onAgentValue: (value: string) => void;
  onAgentSend: () => void;
};

export function VerificationDesk(props: VerificationDeskProps) {
  const copy = useCopy();
  const disabled = props.blocked.length > 0 || props.confirming;
  const kind = copy.kinds[props.documentKind] ?? props.documentKind;
  const gap = firstGap(props.tree);
  const gapLabel = gap ? (copy.tags[gap.tag] ?? gap.tag) : "";

  function goToGap() {
    if (!gap) return;
    const node = document.getElementById(gap.inputId);
    node?.scrollIntoView({ block: "center" });
    if (node instanceof HTMLElement) node.focus();
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pt-12 pb-16">
      <div className="h-16 w-[3px] rounded-full bg-gradient-to-b from-[#5b6cff] to-[#9b6bff]" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-base text-muted">{props.file.name}</p>
          <h1 className="display mt-2 text-5xl leading-[0.95] sm:text-6xl">{kind}</h1>
          <p className="mt-4 max-w-md text-base text-muted">
            {props.blocked.length > 0 ? copy.checkHighlighted : copy.reviewNote}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={props.onReset}
            className="h-11 rounded-full border border-line bg-card px-5 text-sm font-medium transition duration-200 hover:bg-soft"
          >
            {copy.reset}
          </button>
          {props.confirmed ? (
            <button
              type="button"
              onClick={props.onRevise}
              className="h-11 rounded-full border border-line bg-card px-5 text-sm font-medium transition duration-200 hover:bg-soft"
            >
              {copy.revise}
            </button>
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={props.onConfirm}
              className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-canvas transition duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted disabled:opacity-100"
            >
              {props.confirming ? copy.confirming : copy.confirm}
            </button>
          )}
        </div>
      </div>

      <div className="mt-10 overflow-hidden rounded-[28px] border border-line bg-line lg:grid lg:grid-cols-2">
        <div className="bg-card lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-auto">
          <DocumentPane file={props.file} url={props.previewUrl} pagePreview={props.pagePreview} />
        </div>
        <form
          className="flex flex-col gap-8 bg-canvas px-5 py-6 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (!disabled) props.onConfirm();
          }}
        >
          <h2 className="display text-3xl">{copy.form}</h2>
          {props.confirmed ? null : (
            <AgentPanel
              turn={props.agent}
              busy={props.agentBusy}
              value={props.agentValue}
              error={props.agentError}
              formReady={props.blocked.length === 0}
              onValue={props.onAgentValue}
              onSend={props.onAgentSend}
            />
          )}
          <EgrantForm
            tree={props.tree}
            focus={props.agent?.focus ?? null}
            onChange={props.onChange}
            onAddItem={props.onAddItem}
            onRemoveItem={props.onRemoveItem}
          />
          {props.confirmed ? (
            <ConfirmPanel
              payload={props.confirmed}
              posted={props.posted}
              copied={props.copied}
              onCopy={props.onCopy}
              onDownload={props.onDownload}
              onRevise={props.onRevise}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={disabled}
                className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-canvas transition duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted disabled:opacity-100"
              >
                {props.confirming ? copy.confirming : copy.confirm}
              </button>
              {props.blocked.length > 0 && gap ? (
                <button type="button" onClick={goToGap} className="text-base text-warn">
                  {gap.reason === "invalid" ? copy.invalidField(gapLabel) : copy.missingField(gapLabel)}
                </button>
              ) : null}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
