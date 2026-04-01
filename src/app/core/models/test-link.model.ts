export interface TestLink {
  id: string;
  agent_id: string;
  slug: string;
  password_hash: string | null;
  max_sessions: number | null;
  sessions_used: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export type TestLinkStatus = 'active' | 'expired' | 'limit_reached' | 'revoked';

export interface CreateTestLinkRequest {
  expires_at?: string;
  max_sessions?: number;
  password?: string;
}

export function getTestLinkStatus(link: TestLink): TestLinkStatus {
  if (!link.is_active) return 'revoked';
  if (link.expires_at && new Date(link.expires_at) < new Date()) return 'expired';
  if (link.max_sessions && link.sessions_used >= link.max_sessions) return 'limit_reached';
  return 'active';
}

export function getStatusLabel(status: TestLinkStatus): string {
  switch (status) {
    case 'active': return 'Active';
    case 'expired': return 'Expired';
    case 'limit_reached': return 'Limit Reached';
    case 'revoked': return 'Revoked';
  }
}

export function getStatusColor(status: TestLinkStatus): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700';
    case 'expired': return 'bg-amber-100 text-amber-700';
    case 'limit_reached': return 'bg-orange-100 text-orange-700';
    case 'revoked': return 'bg-red-100 text-red-700';
  }
}
