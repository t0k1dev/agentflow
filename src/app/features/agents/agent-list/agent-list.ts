import { Component, signal, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AgentService } from '../../../core/services/agent.service';
import { Agent } from '../../../core/models/agent.model';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './agent-list.html',
})
export class AgentListComponent implements OnInit {
  agents = signal<Agent[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  confirmDeleteId = signal<string | null>(null);

  constructor(
    private agentService: AgentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  async loadAgents(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const agents = await this.agentService.getAgents();
      this.agents.set(agents);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load agents');
    } finally {
      this.loading.set(false);
    }
  }

  navigateToAgent(id: string): void {
    this.router.navigate(['/agents', id]);
  }

  showDeleteConfirm(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  async confirmDelete(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    this.deletingId.set(id);

    try {
      await this.agentService.deleteAgent(id);
      this.agents.update((agents) => agents.filter((a) => a.id !== id));
    } catch (err: any) {
      this.error.set(err.message || 'Failed to delete agent');
    } finally {
      this.deletingId.set(null);
      this.confirmDeleteId.set(null);
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

  getTypeLabel(type: string): string {
    switch (type) {
      case 'personal':
        return 'Personal';
      case 'customer_service':
        return 'Customer Service';
      case 'sales':
        return 'Sales';
      default:
        return type;
    }
  }
}
