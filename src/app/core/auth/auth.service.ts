import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { User, Session, AuthError } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  private currentSession = signal<Session | null>(null);
  private loading = signal(true);

  readonly user = this.currentUser.asReadonly();
  readonly session = this.currentSession.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isLoading = this.loading.asReadonly();

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.init();
  }

  private async init(): Promise<void> {
    // Get initial session
    const {
      data: { session },
    } = await this.supabase.auth.getSession();

    this.currentSession.set(session);
    this.currentUser.set(session?.user ?? null);
    this.loading.set(false);

    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
    });
  }

  async signUp(
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (!error) {
      await this.router.navigate(['/dashboard']);
    }

    return { error };
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error) {
      await this.router.navigate(['/dashboard']);
    }

    return { error };
  }

  async signInWithOAuth(
    provider: 'google' | 'github'
  ): Promise<{ error: AuthError | null }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    return { error };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    await this.router.navigate(['/login']);
  }

  async getSession(): Promise<Session | null> {
    const {
      data: { session },
    } = await this.supabase.auth.getSession();
    return session;
  }
}
