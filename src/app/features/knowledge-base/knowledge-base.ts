import { Component } from '@angular/core';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Knowledge Base</h1>
      <p class="mt-2 text-gray-600">Manage documents and text snippets for your agent.</p>
    </div>
  `,
})
export class KnowledgeBaseComponent {}
