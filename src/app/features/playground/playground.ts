import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

import { Agent } from '../../core/models/agent.model';
import { AgentService } from '../../core/services/agent.service';
import { ChatService } from '../../core/services/chat.service';

interface PlaygroundMessage {
  role: 'user' | 'assistant';
  content: string;
  renderedContent?: SafeHtml;
}

@Component({
  selector: 'app-playground',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './playground.html',
})
export class PlaygroundComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('messageInput') messageInput!: ElementRef<HTMLTextAreaElement>;

  agent: Agent | null = null;
  loading = true;
  messages: PlaygroundMessage[] = [];
  inputMessage = '';
  isStreaming = false;
  streamingContent = '';
  streamingRendered: SafeHtml = '';
  errorMessage = '';
  sessionId = '';

  private shouldScrollToBottom = false;
  private agentId = '';

  constructor(
    private route: ActivatedRoute,
    private agentService: AgentService,
    private chatService: ChatService,
    private sanitizer: DomSanitizer
  ) {
    // Configure marked for safe rendering
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  ngOnInit(): void {
    this.agentId = this.route.snapshot.paramMap.get('id') || '';
    this.sessionId = this.generateSessionId();
    this.loadAgent();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  async loadAgent(): Promise<void> {
    this.loading = true;
    try {
      this.agent = await this.agentService.getAgent(this.agentId);

      // Add welcome message if configured
      if (this.agent.welcome_message) {
        this.messages.push({
          role: 'assistant',
          content: this.agent.welcome_message,
          renderedContent: this.renderMarkdown(this.agent.welcome_message),
        });
        this.shouldScrollToBottom = true;
      }
    } catch (err) {
      this.errorMessage = 'Failed to load agent';
    } finally {
      this.loading = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.inputMessage.trim();
    if (!content || this.isStreaming || !this.agent) return;

    // Add user message
    this.messages.push({ role: 'user', content });
    this.inputMessage = '';
    this.errorMessage = '';
    this.isStreaming = true;
    this.streamingContent = '';
    this.streamingRendered = '';
    this.shouldScrollToBottom = true;

    // Auto-resize textarea back to single line
    if (this.messageInput) {
      this.messageInput.nativeElement.style.height = 'auto';
    }

    try {
      await this.chatService.sendMessage(
        {
          agentPublicKey: this.agent.public_key,
          message: content,
          sessionId: this.sessionId,
          source: 'playground',
        },
        // onToken
        (token: string) => {
          this.streamingContent += token;
          this.streamingRendered = this.renderMarkdown(this.streamingContent);
          this.shouldScrollToBottom = true;
        },
        // onDone
        () => {
          // Move streaming content to a proper message
          if (this.streamingContent) {
            this.messages.push({
              role: 'assistant',
              content: this.streamingContent,
              renderedContent: this.renderMarkdown(this.streamingContent),
            });
          }
          this.streamingContent = '';
          this.streamingRendered = '';
          this.isStreaming = false;
          this.shouldScrollToBottom = true;
        },
        // onError
        (error: string) => {
          this.errorMessage = error;
          this.isStreaming = false;
          this.streamingContent = '';
          this.streamingRendered = '';
          this.shouldScrollToBottom = true;
        }
      );
    } catch {
      this.errorMessage = 'Failed to send message. Please try again.';
      this.isStreaming = false;
    }
  }

  resetConversation(): void {
    this.messages = [];
    this.inputMessage = '';
    this.errorMessage = '';
    this.streamingContent = '';
    this.streamingRendered = '';
    this.isStreaming = false;
    this.sessionId = this.generateSessionId();

    // Re-add welcome message
    if (this.agent?.welcome_message) {
      this.messages.push({
        role: 'assistant',
        content: this.agent.welcome_message,
        renderedContent: this.renderMarkdown(this.agent.welcome_message),
      });
    }
    this.shouldScrollToBottom = true;
  }

  private renderMarkdown(content: string): SafeHtml {
    const html = marked.parse(content, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch {
      // Ignore scroll errors
    }
  }
}
