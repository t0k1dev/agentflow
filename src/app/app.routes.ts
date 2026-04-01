import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { ShellComponent } from './shared/components/shell/shell';

export const routes: Routes = [
  // Public routes (no auth, no shell)
  {
    path: 'login',
    loadComponent: () =>
      import('./core/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./core/auth/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'chat/:slug',
    loadComponent: () =>
      import('./features/public-chat/public-chat').then(
        (m) => m.PublicChatComponent
      ),
  },

  // Authenticated routes (with app shell)
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'agents',
        loadComponent: () =>
          import('./features/agents/agent-list/agent-list').then(
            (m) => m.AgentListComponent
          ),
      },
      {
        path: 'agents/new',
        loadComponent: () =>
          import('./features/agents/agent-editor/agent-editor').then(
            (m) => m.AgentEditorComponent
          ),
      },
      {
        path: 'agents/:id',
        loadComponent: () =>
          import('./features/agents/agent-detail/agent-detail').then(
            (m) => m.AgentDetailComponent
          ),
      },
      {
        path: 'agents/:id/edit',
        loadComponent: () =>
          import('./features/agents/agent-editor/agent-editor').then(
            (m) => m.AgentEditorComponent
          ),
      },
      {
        path: 'agents/:id/knowledge-base',
        loadComponent: () =>
          import('./features/knowledge-base/knowledge-base').then(
            (m) => m.KnowledgeBaseComponent
          ),
      },
      {
        path: 'agents/:id/playground',
        loadComponent: () =>
          import('./features/playground/playground').then(
            (m) => m.PlaygroundComponent
          ),
      },
      {
        path: 'agents/:id/test-links',
        loadComponent: () =>
          import('./features/test-links/test-links').then(
            (m) => m.TestLinksComponent
          ),
      },
      {
        path: 'conversations',
        loadComponent: () =>
          import(
            './features/conversations/conversation-list/conversation-list'
          ).then((m) => m.ConversationListComponent),
      },
      {
        path: 'conversations/:id',
        loadComponent: () =>
          import(
            './features/conversations/conversation-detail/conversation-detail'
          ).then((m) => m.ConversationDetailComponent),
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
