import { Component } from '@angular/core';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Conversations</h1>
      <p class="mt-2 text-gray-600">Browse all conversations across your agents.</p>
    </div>
  `,
})
export class ConversationListComponent {}
