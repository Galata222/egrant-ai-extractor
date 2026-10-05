"use client";

import { useEffect, useRef, useState } from "react";
import { UploadPanel } from "@/components/upload-panel";
import { VerificationDesk } from "@/components/verification-desk";
import { extractFile, validateFile } from "@/lib/api";
import { LanguageSwitch, useCopy } from "@/lib/locale";
import { blockers, toConfirmed } from "@/lib/export";
import { addLineItem, removeLineItem, updateTagValue } from "@/lib/tree";
import type { ConfirmedFill, Tree } from "@/lib/types";

type Phase = "upload" | "loading" | "review";

export function ExtractorApp({ embed }: { embed: boolean }) {
  const copy = useCopy();
  const [phase, setPhase] = useState<Phase>("upload");
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [pagePreview, setPagePreview] = useState<string | null>(null);
  const [tree, setTree] = useState<Tree | null>(null);
  const [documentKind, setDocumentKind] = useState<string>("invoice");
  const [confirmed, setConfirmed] = useState<ConfirmedFill | null>(null);
  const [copied, setCopied] = useState(false);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function rememberFile(next: File | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = next ? URL.createObjectURL(next) : null;
    previewUrlRef.current = url;
    setFile(next);
    setPreviewUrl(url);
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
      const result = await extractFile(next);
      setDocumentId(result.document_id);
      setPagePreview(result.page_preview);
      setTree(structuredClone(result.tree));
      setDocumentKind(result.document_kind || "invoice");
      setPhase("review");
    } catch (reason) {
      rememberFile(null);
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
      await submit(new File([blob], "sample-invoice.pdf", { type: "application/pdf" }));
    } catch (reason) {
      setError(reason instanceof Error ? (copy.errors[reason.message] ?? reason.message) : copy.errors.sample_failed);
      setPhase("upload");
    }
  }

  function reset() {
    setPhase("upload");
    rememberFile(null);
    setTree(null);
    setDocumentKind("invoice");
    setDocumentId(null);
    setPagePreview(null);
    setConfirmed(null);
    setCopied(false);
    setPosted(false);
    setError(null);
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

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-[#d6d3d1] bg-white">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-4 py-4">
          <div>
            {embed ? null : <p className="text-sm font-semibold text-[#0f5132]">{copy.brand}</p>}
            <h1 className="text-2xl font-semibold tracking-tight">{embed ? copy.embedTitle : copy.title}</h1>
            {embed ? null : <p className="mt-1 text-[#44403c]">{copy.subtitle}</p>}
          </div>
          <LanguageSwitch />
        </div>
      </header>
      <main className="flex-1">
        {phase === "loading" ? (
          <p role="status" className="px-4 py-16 text-center text-xl font-medium">
            {copy.loading}
          </p>
        ) : null}
        {phase === "upload" ? <UploadPanel error={error} onFile={submit} onSample={loadSample} /> : null}
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
            onChange={(sectionId, itemId, tag, value) => {
              setTree((current) => (current ? updateTagValue(current, sectionId, itemId, tag, value) : current));
              setConfirmed(null);
            }}
            onAddItem={() => {
              setTree((current) => (current ? addLineItem(current) : current));
              setConfirmed(null);
            }}
            onRemoveItem={(itemId) => {
              setTree((current) => (current ? removeLineItem(current, itemId) : current));
              setConfirmed(null);
            }}
            onConfirm={confirm}
            onReset={reset}
            onCopy={copyJson}
            onDownload={downloadJson}
          />
        ) : null}
      </main>
    </div>
  );
}
