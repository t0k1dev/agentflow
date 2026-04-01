export type AgentType = 'personal' | 'customer_service' | 'sales';

export type AgentModel = 'gpt-4o' | 'gpt-4o-mini';

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  type: AgentType;
  personality: string | null;
  avatar_url: string | null;
  model: AgentModel;
  temperature: number;
  max_tokens: number;
  welcome_message: string | null;
  widget_color: string;
  public_key: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentRequest {
  name: string;
  description?: string;
  type: AgentType;
  personality?: string;
  model?: AgentModel;
  temperature?: number;
  max_tokens?: number;
  welcome_message?: string;
  widget_color?: string;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string | null;
  type?: AgentType;
  personality?: string | null;
  avatar_url?: string | null;
  model?: AgentModel;
  temperature?: number;
  max_tokens?: number;
  welcome_message?: string | null;
  widget_color?: string;
  is_active?: boolean;
}
