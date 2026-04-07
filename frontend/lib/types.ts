// SSE Event types
export interface SSEEvent {
  event: string;
  data: {
    agent?: string;
    status?: string;
    message?: string;
    campaign_id?: string;
    timestamp?: string;
    progress?: number;
    content?: unknown;
    error?: string;
  };
}

export type AgentType = 'researcher' | 'copywriter' | 'editor' | 'system';

export interface AgentMessage {
  id: string;
  agent: AgentType;
  message: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string;
}

export type CampaignStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ContentTab = 'blog' | 'social' | 'email';

export interface TabItem {
  id: ContentTab;
  label: string;
}
