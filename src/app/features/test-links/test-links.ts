import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import {
  TestLink,
  TestLinkStatus,
  getTestLinkStatus,
  getStatusLabel,
  getStatusColor,
} from '../../core/models/test-link.model';
import { TestLinkService } from '../../core/services/test-link.service';

@Component({
  selector: 'app-test-links',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './test-links.html',
})
export class TestLinksComponent implements OnInit {
  testLinks: TestLink[] = [];
  loading = true;
  showCreateModal = false;
  creating = false;
  copiedSlug: string | null = null;
  linkToDelete: TestLink | null = null;

  createForm = {
    expiresAt: '',
    maxSessions: null as number | null,
    password: '',
  };

  private agentId = '';
  private readonly BASE_URL = 'https://app.agentflow.dev/chat';

  constructor(
    private route: ActivatedRoute,
    private testLinkService: TestLinkService
  ) {}

  ngOnInit(): void {
    this.agentId = this.route.snapshot.paramMap.get('id') || '';
    this.loadTestLinks();
  }

  async loadTestLinks(): Promise<void> {
    this.loading = true;
    try {
      this.testLinks = await this.testLinkService.getTestLinks(this.agentId);
    } catch (err) {
      console.error('Failed to load test links:', err);
    } finally {
      this.loading = false;
    }
  }

  getFullUrl(slug: string): string {
    return `${this.BASE_URL}/${slug}`;
  }

  async copyUrl(slug: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getFullUrl(slug));
      this.copiedSlug = slug;
      setTimeout(() => {
        this.copiedSlug = null;
      }, 2000);
    } catch {
      // Fallback: do nothing
    }
  }

  getTestLinkStatus(link: TestLink): TestLinkStatus {
    return getTestLinkStatus(link);
  }

  getStatusLabelText(link: TestLink): string {
    return getStatusLabel(getTestLinkStatus(link));
  }

  getStatusColorClass(link: TestLink): string {
    return getStatusColor(getTestLinkStatus(link));
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  async createLink(): Promise<void> {
    this.creating = true;
    try {
      const options: Record<string, unknown> = {};
      if (this.createForm.expiresAt) {
        options['expires_at'] = new Date(this.createForm.expiresAt).toISOString();
      }
      if (this.createForm.maxSessions && this.createForm.maxSessions > 0) {
        options['max_sessions'] = this.createForm.maxSessions;
      }
      if (this.createForm.password.trim()) {
        options['password'] = this.createForm.password.trim();
      }

      await this.testLinkService.createTestLink(this.agentId, options as any);
      this.closeCreateModal();
      await this.loadTestLinks();
    } catch (err) {
      console.error('Failed to create test link:', err);
    } finally {
      this.creating = false;
    }
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createForm = { expiresAt: '', maxSessions: null, password: '' };
  }

  async revokeLink(link: TestLink): Promise<void> {
    try {
      await this.testLinkService.revokeTestLink(link.id);
      await this.loadTestLinks();
    } catch (err) {
      console.error('Failed to revoke test link:', err);
    }
  }

  confirmDeleteLink(link: TestLink): void {
    this.linkToDelete = link;
  }

  async deleteLink(): Promise<void> {
    if (!this.linkToDelete) return;
    try {
      await this.testLinkService.deleteTestLink(this.linkToDelete.id);
      this.linkToDelete = null;
      await this.loadTestLinks();
    } catch (err) {
      console.error('Failed to delete test link:', err);
    }
  }
}
