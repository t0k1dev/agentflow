import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="mt-2 text-gray-600">Overview of your agents and conversations.</p>
    </div>
  `,
})
export class DashboardComponent {}
