export type KBSourceType = 'text' | 'document' | 'url';

export interface KnowledgeBaseItem {
  id: string;
  agent_id: string;
  title: string;
  content: string | null;
  source_type: KBSourceType;
  source_url: string | null;
  file_path: string | null;
  created_at: string;
}

export interface CreateTextItemRequest {
  title: string;
  content: string;
}

export interface UploadDocumentRequest {
  title: string;
  file: File;
}
