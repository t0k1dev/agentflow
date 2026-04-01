import { Component } from '@angular/core';

@Component({
  selector: 'app-public-chat',
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-gray-900">Public Chat</h1>
        <p class="mt-2 text-gray-600">Chat with an agent via test link.</p>
      </div>
    </div>
  `,
})
export class PublicChatComponent {}
