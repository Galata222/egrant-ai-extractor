import type { AgentField, AgentTurn, Tree } from "@/lib/types";

export const FAILED_AGENT: AgentTurn = {
  session_id: "",
  status: "failed",
  decider: "rules",
  code: "agent_failed",
  focus: null,
  missing_count: 0,
  missing: [],
};

export function tagValue(tree: Tree, field: AgentField): string {
  for (const root of tree.roots) {
    for (const section of root.sections) {
      if (section.id !== field.section_id) continue;
      for (const item of section.items) {
        if (item.id !== field.item_id) continue;
        const found = item.tags.find((tag) => tag.tag === field.tag);
        return found?.value ?? "";
      }
    }
  }
  return "";
}

export async function startAgent(documentId: string, tree: Tree): Promise<AgentTurn> {
  return requestAgent("/api/agent/start", { document_id: documentId, tree });
}

export async function answerAgent(input: {
  sessionId: string;
  field: AgentField;
  value: string;
}): Promise<AgentTurn> {
  return requestAgent("/api/agent/answer", {
    session_id: input.sessionId,
    section_id: input.field.section_id,
    item_id: input.field.item_id,
    tag: input.field.tag,
    value: input.value,
  });
}

async function requestAgent(path: string, body: unknown): Promise<AgentTurn> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (!response.ok) {
    throw new Error(errorCode(payload));
  }
  return payload as AgentTurn;
}

function errorCode(payload: { detail?: unknown } | null): string {
  const detail = payload?.detail;
  if (detail && typeof detail === "object" && "code" in detail && typeof detail.code === "string") {
    return detail.code;
  }
  return "agent_failed";
}
