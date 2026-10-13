export type TagValue = {
  tag: string;
  label: string;
  value: string | null;
  confidence: number;
  needs_review: boolean;
  required: boolean;
  key?: string | null;
};

export type Item = {
  id: string;
  tags: TagValue[];
};

export type Section = {
  id: string;
  title: string;
  items: Item[];
  role?: string | null;
};

export type Root = {
  id: string;
  sections: Section[];
};

export type Tree = {
  roots: Root[];
};

export type AgentField = {
  section_id: string;
  item_id: string;
  tag: string;
  label: string;
};

export type AgentTurn = {
  session_id: string;
  status: "waiting" | "ready" | "failed";
  decider: "model" | "rules";
  code: "ask_reviewer" | "ready_to_confirm" | "agent_failed";
  focus: AgentField | null;
  missing_count: number;
  missing: AgentField[];
};

export type ExtractionResponse = {
  document_id: string;
  needs_review: string[];
  document_kind?: string;
  page_preview: string;
  tree: Tree;
};

export type ConfirmedTag = {
  tag: string;
  value: string | null;
};

export type ConfirmedFill = {
  contract: "egrant-fill.v1";
  document_id: string;
  confirmed_at: string;
  integration: {
    method: "POST";
    path: "/api/v1/applications/{id}/fill";
  };
  tree: {
    roots: Array<{
      id: string;
      sections: Array<{
        id: string;
        items: Array<{
          id: string;
          tags: ConfirmedTag[];
        }>;
      }>;
    }>;
  };
};
