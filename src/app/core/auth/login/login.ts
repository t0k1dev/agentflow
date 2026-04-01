import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent {
  email = '';
  password = '';
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(private authService: AuthService) {}

  async onSubmit(): Promise<void> {
    this.error.set(null);
    this.loading.set(true);

    const { error } = await this.authService.signIn(this.email, this.password);

    if (error) {
      this.error.set(error.message);
    }

    this.loading.set(false);
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await this.authService.signInWithOAuth('google');
    if (error) {
      this.error.set(error.message);
    }
  }

  async signInWithGithub(): Promise<void> {
    const { error } = await this.authService.signInWithOAuth('github');
    if (error) {
      this.error.set(error.message);
    }
  }
}
