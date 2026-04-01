import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Agent Detail</h1>
      <p class="mt-2 text-gray-600">View and manage your agent.</p>
      <div class="mt-4 flex gap-2">
        <a [routerLink]="['/agents', agentId, 'edit']" class="text-indigo-600 hover:underline">Edit</a>
        <a [routerLink]="['/agents', agentId, 'knowledge-base']" class="text-indigo-600 hover:underline">Knowledge Base</a>
        <a [routerLink]="['/agents', agentId, 'playground']" class="text-indigo-600 hover:underline">Playground</a>
        <a [routerLink]="['/agents', agentId, 'test-links']" class="text-indigo-600 hover:underline">Test Links</a>
      </div>
    </div>
  `,
})
export class AgentDetailComponent {
  agentId: string;

  constructor(private route: ActivatedRoute) {
    this.agentId = this.route.snapshot.paramMap.get('id') ?? '';
  }
}
