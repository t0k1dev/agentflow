import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { KnowledgeBaseService } from '../../core/services/knowledge-base.service';
import { KnowledgeBaseItem } from '../../core/models/knowledge-base.model';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './knowledge-base.html',
})
export class KnowledgeBaseComponent implements OnInit {
  agentId = '';
  items = signal<KnowledgeBaseItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Add text modal
  showTextModal = signal(false);
  textTitle = '';
  textContent = '';
  savingText = signal(false);
  textError = signal<string | null>(null);

  // Upload document
  uploadingDoc = signal(false);
  docError = signal<string | null>(null);

  // Delete
  confirmDeleteId = signal<string | null>(null);
  deletingId = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private kbService: KnowledgeBaseService
  ) {}

  ngOnInit(): void {
    this.agentId = this.route.snapshot.paramMap.get('id') || '';
    if (this.agentId) {
      this.loadItems();
    }
  }

  async loadItems(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const items = await this.kbService.getItems(this.agentId);
      this.items.set(items);
    } catch (err: any) {
      this.error.set(err.message || 'Failed to load knowledge base items');
    } finally {
      this.loading.set(false);
    }
  }

  // --- Text snippet modal ---

  openTextModal(): void {
    this.textTitle = '';
    this.textContent = '';
    this.textError.set(null);
    this.showTextModal.set(true);
  }

  closeTextModal(): void {
    this.showTextModal.set(false);
  }

  async saveTextSnippet(): Promise<void> {
    if (!this.textTitle.trim()) {
      this.textError.set('Title is required');
      return;
    }
    if (!this.textContent.trim()) {
      this.textError.set('Content is required');
      return;
    }

    this.savingText.set(true);
    this.textError.set(null);

    try {
      const item = await this.kbService.createTextItem(
        this.agentId,
        this.textTitle.trim(),
        this.textContent.trim()
      );
      this.items.update((list) => [item, ...list]);
      this.closeTextModal();
    } catch (err: any) {
      this.textError.set(err.message || 'Failed to save text snippet');
    } finally {
      this.savingText.set(false);
    }
  }

  // --- Document upload ---

  onDocumentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validationError = this.kbService.validateDocument(file);
    if (validationError) {
      this.docError.set(validationError);
      input.value = '';
      return;
    }

    this.docError.set(null);
    this.uploadDocument(file);
    input.value = '';
  }

  async uploadDocument(file: File): Promise<void> {
    this.uploadingDoc.set(true);
    this.docError.set(null);

    try {
      const title = file.name.replace(/\.[^/.]+$/, '');
      const item = await this.kbService.uploadDocument(
        this.agentId,
        title,
        file
      );
      this.items.update((list) => [item, ...list]);
    } catch (err: any) {
      this.docError.set(err.message || 'Failed to upload document');
    } finally {
      this.uploadingDoc.set(false);
    }
  }

  // --- Delete ---

  showDeleteConfirm(id: string, event: Event): void {
    event.stopPropagation();
    this.confirmDeleteId.set(id);
  }

  cancelDelete(): void {
    this.confirmDeleteId.set(null);
  }

  async confirmDelete(id: string): Promise<void> {
    this.deletingId.set(id);

    try {
      await this.kbService.deleteItem(id);
      this.items.update((list) => list.filter((item) => item.id !== id));
    } catch (err: any) {
      this.error.set(err.message || 'Failed to delete item');
    } finally {
      this.deletingId.set(null);
      this.confirmDeleteId.set(null);
    }
  }

  // --- Helpers ---

  getSourceBadgeClass(sourceType: string): string {
    switch (sourceType) {
      case 'text':
        return 'bg-blue-100 text-blue-700';
      case 'document':
        return 'bg-amber-100 text-amber-700';
      case 'url':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getSourceLabel(sourceType: string): string {
    switch (sourceType) {
      case 'text':
        return 'Text';
      case 'document':
        return 'Document';
      case 'url':
        return 'URL';
      default:
        return sourceType;
    }
  }

  getContentPreview(item: KnowledgeBaseItem): string {
    const text = item.content || item.file_path || '';
    if (text.length <= 100) return text;
    return text.substring(0, 100) + '...';
  }
}
