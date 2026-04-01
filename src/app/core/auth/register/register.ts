import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  email = '';
  password = '';
  confirmPassword = '';
  error = signal<string | null>(null);
  loading = signal(false);

  constructor(private authService: AuthService) {}

  async onSubmit(): Promise<void> {
    this.error.set(null);

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    this.loading.set(true);

    const { error } = await this.authService.signUp(this.email, this.password);

    if (error) {
      this.error.set(error.message);
    }

    this.loading.set(false);
  }
}
