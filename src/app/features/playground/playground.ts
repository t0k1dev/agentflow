import { Component } from '@angular/core';

@Component({
  selector: 'app-playground',
  standalone: true,
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Playground</h1>
      <p class="mt-2 text-gray-600">Test your agent in a live chat interface.</p>
    </div>
  `,
})
export class PlaygroundComponent {}
