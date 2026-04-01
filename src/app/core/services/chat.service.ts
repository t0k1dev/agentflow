import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SendMessageOptions {
  agentPublicKey: string;
  message: string;
  sessionId: string;
  source: 'playground' | 'widget' | 'test_link';
  testLinkId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private get chatUrl(): string {
    return `${environment.supabaseUrl}/functions/v1/chat`;
  }

  /**
   * Send a message to the chat Edge Function and return a ReadableStream
   * of SSE events for real-time token streaming.
   */
  async sendMessage(
    options: SendMessageOptions,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    const body: Record<string, string> = {
      agent_public_key: options.agentPublicKey,
      message: options.message,
      session_id: options.sessionId,
      source: options.source,
    };

    if (options.testLinkId) {
      body['test_link_id'] = options.testLinkId;
    }

    try {
      const response = await fetch(this.chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: environment.supabaseAnonKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg =
          errorData.error || `Request failed with status ${response.status}`;
        onError(errorMsg);
        return;
      }

      // Read the SSE stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onToken(parsed.content);
            }
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      // If we exit the loop without [DONE], still call onDone
      onDone();
    } catch (err) {
      onError(
        err instanceof Error ? err.message : 'Failed to connect to chat service'
      );
    }
  }
}
