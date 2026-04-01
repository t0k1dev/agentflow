import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AgentService } from '../../../core/services/agent.service';
import { Agent } from '../../../core/models/agent.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './agent-detail.html',
})
export class AgentDetailComponent implements OnInit {
  agent = signal<Agent | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  notFound = signal(false);

  // UI state
  showFullPersonality = signal(false);
  confirmDeleteVisible = signal(false);
  deleting = signal(false);
  confirmRegenKeyVisible = signal(false);
  regeneratingKey = signal(false);
  togglingActive = signal(false);
  copiedKey = signal(false);
  copiedEmbed = signal(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private agentService: AgentService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAgent(id);
    } else {
      this.notFound.set(true);
      this.loading.set(false);
    }
  }

  private async loadAgent(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const agent = await this.agentService.getAgent(id);
      this.agent.set(agent);
    } catch (err: any) {
      if (
        err.message?.includes('No rows') ||
        err.message?.includes('not found')
      ) {
        this.notFound.set(true);
      } else {
        this.error.set(err.message || 'Failed to load agent');
      }
    } finally {
      this.loading.set(false);
    }
  }

  // --- Type helpers ---

  getTypeLabel(type: string): string {
    switch (type) {
      case 'personal':
        return 'Personal Assistant';
      case 'customer_service':
        return 'Customer Service';
      case 'sales':
        return 'Sales';
      default:
        return type;
    }
  }

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'personal':
        return 'bg-blue-100 text-blue-700';
      case 'customer_service':
        return 'bg-green-100 text-green-700';
      case 'sales':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getModelLabel(model: string): string {
    switch (model) {
      case 'gpt-4o':
        return 'GPT-4o';
      case 'gpt-4o-mini':
        return 'GPT-4o Mini';
      default:
        return model;
    }
  }

  // --- Personality toggle ---

  get truncatedPersonality(): string {
    const p = this.agent()?.personality;
    if (!p) return '';
    if (p.length <= 200) return p;
    return p.substring(0, 200) + '...';
  }

  get personalityNeedsTruncation(): boolean {
    return (this.agent()?.personality?.length ?? 0) > 200;
  }

  togglePersonality(): void {
    this.showFullPersonality.update((v) => !v);
  }

  // --- Embed code ---

  get embedCode(): string {
    const a = this.agent();
    if (!a) return '';
    const baseUrl = environment.supabaseUrl.replace(
      '.supabase.co',
      '.functions.supabase.co'
    );
    return `<script
  src="${baseUrl}/widget/agentflow-widget.js"
  data-agent-key="${a.public_key}"
  data-color="${a.widget_color}"${a.welcome_message ? `\n  data-welcome="${a.welcome_message}"` : ''}
  async>
</script>`;
  }

  // --- Clipboard ---

  async copyPublicKey(): Promise<void> {
    const key = this.agent()?.public_key;
    if (!key) return;
    await navigator.clipboard.writeText(key);
    this.copiedKey.set(true);
    setTimeout(() => this.copiedKey.set(false), 2000);
  }

  async copyEmbedCode(): Promise<void> {
    await navigator.clipboard.writeText(this.embedCode);
    this.copiedEmbed.set(true);
    setTimeout(() => this.copiedEmbed.set(false), 2000);
  }

  // --- Regenerate key ---

  showRegenKeyConfirm(): void {
    this.confirmRegenKeyVisible.set(true);
  }

  cancelRegenKey(): void {
    this.confirmRegenKeyVisible.set(false);
  }

  async confirmRegenKey(): Promise<void> {
    const a = this.agent();
    if (!a) return;

    this.regeneratingKey.set(true);
    try {
      const updated = await this.agentService.regeneratePublicKey(a.id);
      this.agent.set(updated);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to regenerate key');
    } finally {
      this.regeneratingKey.set(false);
      this.confirmRegenKeyVisible.set(false);
    }
  }

  // --- Toggle active ---

  async toggleActive(): Promise<void> {
    const a = this.agent();
    if (!a) return;

    this.togglingActive.set(true);
    try {
      const updated = await this.agentService.updateAgent(a.id, {
        is_active: !a.is_active,
      });
      this.agent.set(updated);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to update status');
    } finally {
      this.togglingActive.set(false);
    }
  }

  // --- Delete ---

  showDeleteConfirm(): void {
    this.confirmDeleteVisible.set(true);
  }

  cancelDelete(): void {
    this.confirmDeleteVisible.set(false);
  }

  async confirmDelete(): Promise<void> {
    const a = this.agent();
    if (!a) return;

    this.deleting.set(true);
    try {
      await this.agentService.deleteAgent(a.id);
      this.router.navigate(['/agents']);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to delete agent');
      this.deleting.set(false);
      this.confirmDeleteVisible.set(false);
    }
  }
}
