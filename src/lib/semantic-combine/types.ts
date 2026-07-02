export interface SemanticNode {
  id: string;
  filename?: string;
  layer: number;
  layerName: string;
  concept: string;
  content: string;
  isActive: boolean;
  branch: string;
}

export interface SemanticTree {
  task: string;
  phantomName: string;
  nodes: SemanticNode[];
}

export interface InterceptorLog {
  action: string;
  changes: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "combine" | "agent";
  content: string;
  interceptorLog?: InterceptorLog;
}
