"use client";

import { useEffect, useRef, useState } from "react";
import { MappingPanel } from "@/components/mapping-panel";
import { UploadPanel } from "@/components/upload-panel";
import { VerificationDesk } from "@/components/verification-desk";
import { extractFile, validateFile } from "@/lib/api";
import { answerAgent, FAILED_AGENT, startAgent, tagValue } from "@/lib/agent";
import { EMPTY_MAPPING, loadMapping, mappingPayload, saveMapping, type StoredMapping } from "@/lib/form-export";
import { SiteHeader } from "@/components/site-header";
import { useCopy } from "@/lib/locale";
import { blockers, toConfirmed } from "@/lib/export";
import { addLineItem, removeLineItem, updateTagValue } from "@/lib/tree";
import type { AgentTurn, ConfirmedFill, Tree } from "@/lib/types";

type Phase = "upload" | "loading" | "review";

export function ExtractorApp({ embed }: { embed: boolean }) {
  const copy = useCopy();
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const treeRef = useRef<Tree | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pagePreview, setPagePreview] = useState<string | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [documentKind, setDocumentKind] = useState<string>("invoice");
  const [confirmed, setConfirmed] = useState<ConfirmedFill | null>(null);
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);
  const [mapping, setMapping] = useState<StoredMapping>(EMPTY_MAPPING);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [staged, setStaged] = useState<File | null>(null);
  const [agent, setAgent] = useState<AgentTurn | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [reviewKey, setReviewKey] = useState(0);

  useEffect(() => {
    setMapping(loadMapping());
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (reviewKey === 0 || !documentId) return;
    const snapshot = treeRef.current;
    if (!snapshot) return;
    const id = documentId;
    let cancel = false;
    setAgent(null);
    setAgentError(null);
    setAgentBusy(true);
    startAgent(id, snapshot)
      .then((turn) => {
        if (!cancel) setAgent(turn);
      })
      .catch(() => {
        if (!cancel) setAgent(FAILED_AGENT);
      })
      .finally(() => {
        if (!cancel) setAgentBusy(false);
      });
    return () => {
      cancel = true;
    };
  }, [reviewKey, documentId]);

  function rememberFile(next: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = next ? URL.createObjectURL(next) : null;
    previewUrlRef.current = url;
    setFile(next);
    setPreviewUrl(url);
  }

  function stage(next: File) {
    const problem = validateFile(next);
    if (problem) {
      setError(copy.errors[problem] ?? copy.errors.extract_failed);
      setStaged(null);
      setPhase("upload");
      return;
    }
    setError(null);
    setStaged(next);
    setPhase("upload");
  }

  async function submit(next: File) {
    const problem = validateFile(next);
    if (problem) {
      setError(copy.errors[problem] ?? copy.errors.extract_failed);
      setPhase("upload");
      return;
    }
    setError(null);
    setConfirmed(null);
    setCopied(false);
    rememberFile(next);
    setPhase("loading");
    try {
      const result = await extractFile(next, mappingPayload(mapping));
      setDocumentId(result.document_id);
      setPagePreview(result.page_preview);
      treeRef.current = structuredClone(result.tree);
      setTree(treeRef.current);
      setDocumentKind(result.document_kind || "invoice");
      setReviewKey((key) => key + 1);
      setPhase("review");
    } catch (reason) {
      rememberFile(null);
      treeRef.current = null;
      setTree(null);
      setDocumentKind("invoice");
      setError(reason instanceof Error ? (copy.errors[reason.message] ?? reason.message) : copy.errors.extract_failed);
      setPhase("upload");
    }
  }

  async function loadSample() {
    try {
      const response = await fetch("/samples/sample-invoice.pdf");
      if (!response.ok) throw new Error("sample_failed");
      const blob = await response.blob();
      stage(new File([blob], "sample-invoice.pdf", { type: "application/pdf" }));
    } catch (reason) {
      setError(reason instanceof Error ? (copy.errors[reason.message] ?? reason.message) : copy.errors.sample_failed);
      setPhase("upload");
    }
  }

  function reset() {
    setPhase("upload");
    rememberFile(null);
    treeRef.current = null;
    setTree(null);
    setDocumentKind("invoice");
    setDocumentId(null);
    setPagePreview(null);
    setConfirmed(null);
    setCopied(false);
    setPosted(false);
    setError(null);
    setStaged(null);
    setAgent(null);
    setAgentError(null);
    setAgentBusy(false);
  }

  function onFieldChange(sectionId: string, itemId: string, tag: string, value: string) {
    setTree((current) => {
      const next = current ? updateTagValue(current, sectionId, itemId, tag, value) : current;
      treeRef.current = next;
      return next;
    });
    setConfirmed(null);
  }

  async function sendAgentValue() {
    const current = treeRef.current;
    if (!agent?.focus || !agent.session_id || !current) return;
    const value = tagValue(current, agent.focus);
    if (!value.trim()) return;
    setAgentBusy(true);
    setAgentError(null);
    try {
      const turn = await answerAgent({ sessionId: agent.session_id, field: agent.focus, value });
      setAgent(turn);
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : "agent_failed";
      setAgentError(copy.errors[code] ?? copy.agentFailed);
    } finally {
      setAgentBusy(false);
    }
  }
  function confirm() {
    if (!tree || !documentId) return;
    const payload = toConfirmed(tree, documentId, new Date().toISOString());
    setConfirmed(payload);
    setCopied(false);
    const sent = embed && window.parent !== window;
    if (sent) window.parent.postMessage({ type: "egrant:fill", payload }, "*");
    setPosted(sent);
  }

  async function copyJson() {
    if (!confirmed) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(confirmed, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function downloadJson() {
    if (!confirmed) return;
    const blob = new Blob([JSON.stringify(confirmed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "egrant-fill.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const updateMapping = (next: StoredMapping) => {
    setMapping(next);
    saveMapping(next);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-canvas pt-[4.75rem] text-ink">
      <SiteHeader
        mappingOpen={mappingOpen}
        onToggleMapping={() => setMappingOpen((open) => !open)}
        onSample={loadSample}
      />
      {phase === "upload" || phase === "loading" ? (
        <UploadPanel
          error={error}
          loading={phase === "loading"}
          mapping={mapping}
          mappingOpen={mappingOpen}
          staged={staged}
          onMapping={updateMapping}
          onStage={stage}
          onClear={() => setStaged(null)}
          onContinue={() => {
            if (staged) void submit(staged);
          }}
        />
      ) : (
      <main className="flex-1">
        {mappingOpen ? (
          <div className="mx-auto w-full max-w-3xl px-5 pt-8">
            <MappingPanel value={mapping} onChange={updateMapping} />
          </div>
        ) : null}
        {phase === "review" && file && previewUrl && tree ? (
          <VerificationDesk
            file={file}
            previewUrl={previewUrl}
            pagePreview={pagePreview}
            tree={tree}
            documentKind={documentKind}
            posted={posted}
            blocked={blockers(tree)}
            confirmed={confirmed}
            copied={copied}
            onChange={onFieldChange}
            onAddItem={() => {
              setTree((current) => {
                const next = current ? addLineItem(current) : current;
                treeRef.current = next;
                return next;
              });
              setConfirmed(null);
            }}
            onRemoveItem={(itemId) => {
              setTree((current) => {
                const next = current ? removeLineItem(current, itemId) : current;
                treeRef.current = next;
                return next;
              });
              setConfirmed(null);
            }}
            onConfirm={confirm}
            onReset={reset}
            onCopy={copyJson}
            onDownload={downloadJson}
            agent={agent}
            agentBusy={agentBusy}
            agentValue={agent?.focus ? tagValue(tree, agent.focus) : ""}
            agentError={agentError}
            onAgentValue={(value) => {
              if (!agent?.focus) return;
              onFieldChange(agent.focus.section_id, agent.focus.item_id, agent.focus.tag, value);
            }}
            onAgentSend={() => {
              void sendAgentValue();
            }}
          />
        ) : null}
      </main>
      )}
    </div>
  );
}
