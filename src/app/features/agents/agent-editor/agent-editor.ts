import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AgentService } from '../../../core/services/agent.service';
import { StorageService } from '../../../core/services/storage.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  Agent,
  AgentType,
  AgentModel,
} from '../../../core/models/agent.model';

@Component({
  selector: 'app-agent-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './agent-editor.html',
})
export class AgentEditorComponent implements OnInit {
  form!: FormGroup;
  isEditMode = signal(false);
  agentId = signal<string | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  // Avatar state
  currentAvatarUrl = signal<string | null>(null);
  avatarPreview = signal<string | null>(null);
  avatarFile = signal<File | null>(null);
  avatarUploading = signal(false);
  avatarError = signal<string | null>(null);
  avatarRemoved = signal(false);

  agentTypes: { value: AgentType; label: string }[] = [
    { value: 'personal', label: 'Personal Assistant' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'sales', label: 'Sales' },
  ];

  models: { value: AgentModel; label: string }[] = [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private agentService: AgentService,
    private storageService: StorageService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.agentId.set(id);
      this.loadAgent(id);
    } else {
      this.loading.set(false);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: ['personal' as AgentType, [Validators.required]],
      personality: ['', [Validators.required]],
      welcome_message: [''],
      model: ['gpt-4o' as AgentModel, [Validators.required]],
      temperature: [
        0.7,
        [Validators.required, Validators.min(0), Validators.max(2)],
      ],
      max_tokens: [
        1024,
        [Validators.required, Validators.min(256), Validators.max(4096)],
      ],
      widget_color: ['#6366f1'],
    });
  }

  private async loadAgent(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const agent = await this.agentService.getAgent(id);
      this.currentAvatarUrl.set(agent.avatar_url);
      this.form.patchValue({
        name: agent.name,
        description: agent.description || '',
        type: agent.type,
        personality: agent.personality || '',
        welcome_message: agent.welcome_message || '',
        model: agent.model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        widget_color: agent.widget_color,
      });
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load agent');
    } finally {
      this.loading.set(false);
    }
  }

  get personalityLength(): number {
    return this.form.get('personality')?.value?.length || 0;
  }

  get temperatureValue(): number {
    return this.form.get('temperature')?.value ?? 0.7;
  }

  onTemperatureInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.get('temperature')?.setValue(parseFloat(input.value));
  }

  // --- Avatar methods ---

  onAvatarFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validate
    const validationError = this.storageService.validateFile(file);
    if (validationError) {
      this.avatarError.set(validationError);
      input.value = '';
      return;
    }

    this.avatarError.set(null);
    this.avatarFile.set(file);
    this.avatarRemoved.set(false);

    // Generate preview
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  removeAvatar(): void {
    this.avatarFile.set(null);
    this.avatarPreview.set(null);
    this.avatarError.set(null);
    if (this.currentAvatarUrl()) {
      this.avatarRemoved.set(true);
    }
  }

  get displayAvatarUrl(): string | null {
    if (this.avatarPreview()) return this.avatarPreview();
    if (this.avatarRemoved()) return null;
    return this.currentAvatarUrl();
  }

  // --- Form submission ---

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formValue = this.form.value;

    try {
      let avatarUrl: string | null | undefined = undefined;

      if (this.isEditMode() && this.agentId()) {
        // Handle avatar changes in edit mode
        avatarUrl = await this.handleAvatarUpload(this.agentId()!);

        await this.agentService.updateAgent(this.agentId()!, {
          name: formValue.name,
          description: formValue.description || null,
          type: formValue.type,
          personality: formValue.personality || null,
          welcome_message: formValue.welcome_message || null,
          model: formValue.model,
          temperature: formValue.temperature,
          max_tokens: formValue.max_tokens,
          widget_color: formValue.widget_color,
          ...(avatarUrl !== undefined ? { avatar_url: avatarUrl } : {}),
        });
        this.router.navigate(['/agents', this.agentId()]);
      } else {
        // Create agent first, then upload avatar
        const agent = await this.agentService.createAgent({
          name: formValue.name,
          description: formValue.description || undefined,
          type: formValue.type,
          personality: formValue.personality || undefined,
          model: formValue.model,
          temperature: formValue.temperature,
          max_tokens: formValue.max_tokens,
          welcome_message: formValue.welcome_message || undefined,
          widget_color: formValue.widget_color,
        });

        // Upload avatar if one was selected
        if (this.avatarFile()) {
          try {
            avatarUrl = await this.handleAvatarUpload(agent.id);
            if (avatarUrl) {
              await this.agentService.updateAgent(agent.id, {
                avatar_url: avatarUrl,
              });
            }
          } catch {
            // Avatar upload failed but agent was created — navigate anyway
          }
        }

        this.router.navigate(['/agents', agent.id]);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Failed to save agent');
    } finally {
      this.saving.set(false);
    }
  }

  private async handleAvatarUpload(
    agentId: string
  ): Promise<string | null | undefined> {
    const userId = this.authService.user()?.id;
    if (!userId) return undefined;

    // If avatar was removed
    if (this.avatarRemoved() && !this.avatarFile()) {
      if (this.currentAvatarUrl()) {
        try {
          await this.storageService.removeAvatar(this.currentAvatarUrl()!);
        } catch {
          // Ignore removal errors
        }
      }
      return null;
    }

    // If a new file was selected
    if (this.avatarFile()) {
      this.avatarUploading.set(true);
      try {
        const result = await this.storageService.uploadAvatar(
          userId,
          agentId,
          this.avatarFile()!
        );
        return result.publicUrl;
      } finally {
        this.avatarUploading.set(false);
      }
    }

    return undefined; // No change
  }

  get cancelRoute(): string {
    if (this.isEditMode() && this.agentId()) {
      return `/agents/${this.agentId()}`;
    }
    return '/agents';
  }

  hasError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  getError(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'This field is required';
    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.errors['min']) {
      return `Minimum value is ${control.errors['min'].min}`;
    }
    if (control.errors['max']) {
      return `Maximum value is ${control.errors['max'].max}`;
    }
    return 'Invalid value';
  }
}
