import { Component } from '@angular/core';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Conversation Detail</h1>
      <p class="mt-2 text-gray-600">View the full conversation thread.</p>
    </div>
  `,
})
export class ConversationDetailComponent {}
