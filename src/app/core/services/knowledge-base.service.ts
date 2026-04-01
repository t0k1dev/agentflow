import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { KnowledgeBaseItem } from '../models/knowledge-base.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class KnowledgeBaseService {
  private readonly TABLE = 'knowledge_base_items';
  private readonly DOCUMENTS_BUCKET = 'documents';
  private readonly MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_DOC_TYPES = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
  ];
  private readonly ALLOWED_DOC_EXTENSIONS = ['pdf', 'txt', 'md', 'csv'];

  constructor(private supabase: SupabaseService) {}

  async getItems(agentId: string): Promise<KnowledgeBaseItem[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch KB items: ${error.message}`);
    }

    return data as KnowledgeBaseItem[];
  }

  async getItem(id: string): Promise<KnowledgeBaseItem> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch KB item: ${error.message}`);
    }

    return data as KnowledgeBaseItem;
  }

  async createTextItem(
    agentId: string,
    title: string,
    content: string
  ): Promise<KnowledgeBaseItem> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert({
        agent_id: agentId,
        title,
        content,
        source_type: 'text',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create KB item: ${error.message}`);
    }

    const item = data as KnowledgeBaseItem;

    // Trigger embedding in background (fire-and-forget)
    this.triggerEmbedding(item.id, agentId).catch(() => {});

    return item;
  }

  validateDocument(file: File): string | null {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (
      !this.ALLOWED_DOC_TYPES.includes(file.type) &&
      !this.ALLOWED_DOC_EXTENSIONS.includes(ext)
    ) {
      return 'Invalid file type. Only PDF, TXT, MD, and CSV files are allowed.';
    }
    if (file.size > this.MAX_DOC_SIZE) {
      return 'File is too large. Maximum size is 10MB.';
    }
    return null;
  }

  async uploadDocument(
    agentId: string,
    title: string,
    file: File
  ): Promise<KnowledgeBaseItem> {
    const validationError = this.validateDocument(file);
    if (validationError) {
      throw new Error(validationError);
    }

    // Upload file to storage
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${agentId}/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from(this.DOCUMENTS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload document: ${uploadError.message}`);
    }

    // Create KB item record
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert({
        agent_id: agentId,
        title,
        source_type: 'document',
        file_path: filePath,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if DB insert fails
      await this.supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .remove([filePath]);
      throw new Error(`Failed to create KB item: ${error.message}`);
    }

    const item = data as KnowledgeBaseItem;

    // Trigger embedding in background
    this.triggerEmbedding(item.id, agentId).catch(() => {});

    return item;
  }

  async deleteItem(id: string): Promise<void> {
    // Get the item first to check for file_path
    const item = await this.getItem(id);

    // Delete from DB (cascades to document_chunks)
    const { error } = await this.supabase
      .from(this.TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete KB item: ${error.message}`);
    }

    // Remove file from storage if it's a document
    if (item.file_path) {
      await this.supabase.storage
        .from(this.DOCUMENTS_BUCKET)
        .remove([item.file_path])
        .catch(() => {}); // Ignore storage cleanup errors
    }
  }

  private async triggerEmbedding(
    knowledgeBaseItemId: string,
    agentId: string
  ): Promise<void> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    const response = await fetch(
      `${environment.supabaseUrl}/functions/v1/embed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || environment.supabaseAnonKey}`,
        },
        body: JSON.stringify({
          knowledge_base_item_id: knowledgeBaseItemId,
          agent_id: agentId,
        }),
      }
    );

    if (!response.ok) {
      console.error('Embedding trigger failed:', await response.text());
    }
  }
}
