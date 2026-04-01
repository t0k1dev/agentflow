import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { TestLink, CreateTestLinkRequest } from '../models/test-link.model';

@Injectable({
  providedIn: 'root',
})
export class TestLinkService {
  private readonly TABLE = 'test_links';

  constructor(private supabase: SupabaseService) {}

  /**
   * Generate a URL-safe random slug (8-12 chars, alphanumeric).
   */
  private generateSlug(): string {
    const chars =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const length = 8 + Math.floor(Math.random() * 5); // 8-12 chars
    let slug = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      slug += chars.charAt(array[i] % chars.length);
    }
    return slug;
  }

  /**
   * Hash a password using SHA-256 via Web Crypto API.
   * For production, consider using bcrypt via a server-side function.
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async getTestLinks(agentId: string): Promise<TestLink[]> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch test links: ${error.message}`);
    }

    return data as TestLink[];
  }

  async createTestLink(
    agentId: string,
    options?: CreateTestLinkRequest
  ): Promise<TestLink> {
    const slug = this.generateSlug();

    const insertData: Record<string, unknown> = {
      agent_id: agentId,
      slug,
    };

    if (options?.expires_at) {
      insertData['expires_at'] = options.expires_at;
    }

    if (options?.max_sessions) {
      insertData['max_sessions'] = options.max_sessions;
    }

    if (options?.password) {
      insertData['password_hash'] = await this.hashPassword(options.password);
    }

    const { data, error } = await this.supabase
      .from(this.TABLE)
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test link: ${error.message}`);
    }

    return data as TestLink;
  }

  async revokeTestLink(id: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.TABLE)
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to revoke test link: ${error.message}`);
    }
  }

  async deleteTestLink(id: string): Promise<void> {
    const { error } = await this.supabase.from(this.TABLE).delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete test link: ${error.message}`);
    }
  }

  /**
   * Validate a test link by slug. Used by the public chat page.
   * Returns the test link if valid, null if not found.
   * Password validation should be done server-side in production.
   */
  async validateTestLink(
    slug: string,
    password?: string
  ): Promise<{ valid: boolean; testLink?: TestLink; error?: string }> {
    const { data, error } = await this.supabase
      .from(this.TABLE)
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Test link not found' };
    }

    const link = data as TestLink;

    if (!link.is_active) {
      return { valid: false, error: 'This test link has been revoked' };
    }

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return { valid: false, error: 'This test link has expired' };
    }

    if (link.max_sessions && link.sessions_used >= link.max_sessions) {
      return { valid: false, error: 'This test link has reached its session limit' };
    }

    if (link.password_hash && password) {
      const hashedInput = await this.hashPassword(password);
      if (hashedInput !== link.password_hash) {
        return { valid: false, error: 'Incorrect password' };
      }
    } else if (link.password_hash && !password) {
      return { valid: false, error: 'Password required' };
    }

    return { valid: true, testLink: link };
  }
}
