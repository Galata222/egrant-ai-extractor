"use client";

import { useEffect, useRef } from "react";
import { guideKind } from "@/lib/field-guide";
import { invalidFormat } from "@/lib/validate";
import { useCopy } from "@/lib/locale";
import type { AgentTurn } from "@/lib/types";

type AgentPanelProps = {
  turn: AgentTurn | null;
  busy: boolean;
  value: string;
  error: string | null;
  formReady: boolean;
  onValue: (value: string) => void;
  onSend: () => void;
};

export function AgentPanel({ turn, busy, value, error, formReady, onValue, onSend }: AgentPanelProps) {
  const copy = useCopy();
  const focus = turn?.focus ?? null;
  const inputRef = useRef<HTMLInputElement>(null);
  const label = focus ? (copy.tags[focus.tag] ?? focus.label) : "";
  const guide = focus ? copy.fieldGuide[guideKind(focus.tag)] : null;
  const shape = guide?.shape ?? "";
  const formatInvalid = Boolean(focus && value.trim() && invalidFormat(focus.tag, value));
  const waiting = Boolean(turn?.session_id && turn.status === "waiting" && focus) && !formReady;
  const ready = turn?.status === "ready" || formReady;
  const working = !turn || (busy && !focus && !ready);

  useEffect(() => {
    if (!waiting) return;
    inputRef.current?.focus();
  }, [waiting, focus?.section_id, focus?.item_id, focus?.tag]);

  const title = working ? copy.agentWorkingTitle : ready ? copy.agentReadyTitle : turn?.code === "ask_reviewer" ? label : copy.agentFailed;
  const detail = working ? copy.agentWorking : ready ? copy.agentReady : turn?.code === "ask_reviewer" ? copy.agentFromDocument : null;

  return (
    <section id="agent-panel" className="rounded-[24px] border border-line bg-card p-5">
      <div className="flex gap-4">
        <div
          className={`mt-1 h-14 w-[3px] shrink-0 rounded-full bg-gradient-to-b from-[#5b6cff] to-[#9b6bff] ${
            working ? "animate-pulse" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-medium">{copy.agentTitle}</p>
            {turn && turn.missing_count > 0 && !formReady ? (
              <p className="text-base text-warn">{copy.missingCount(turn.missing_count)}</p>
            ) : null}
          </div>
          <h2 className="display mt-1 text-[32px] leading-none">{title}</h2>
          {detail ? <p className="mt-2 max-w-md text-base text-muted">{detail}</p> : null}
          {error ? <p className="mt-2 text-base text-warn">{error}</p> : null}
          {waiting ? (
            <div className="mt-4 flex w-full flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="agent-value">
                {label}
              </label>
              <input
                id="agent-value"
                ref={inputRef}
                value={value}
                placeholder={shape || copy.unknown}
                spellCheck={false}
                autoCorrect="off"
                aria-invalid={formatInvalid}
                onChange={(event) => onValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && value.trim() && !formatInvalid && !busy) {
                    event.preventDefault();
                    onSend();
                  }
                }}
                className="h-12 min-w-56 flex-1 rounded-2xl border-2 border-warn bg-warn-bg px-4 text-base text-ink transition duration-200 placeholder:text-warn/80"
              />
              <button
                type="button"
                disabled={busy || value.trim().length === 0 || formatInvalid}
                onClick={onSend}
                className="h-11 rounded-full bg-ink px-5 text-sm font-medium text-canvas transition duration-200 hover:opacity-85 disabled:cursor-not-allowed disabled:bg-soft disabled:text-muted disabled:opacity-100"
              >
                {copy.agentSend}
              </button>
            </div>
          ) : null}
          {waiting && formatInvalid && guide ? <p className="mt-2 text-base text-warn">{guide.invalid}</p> : null}
        </div>
      </div>
    </section>
  );
}
