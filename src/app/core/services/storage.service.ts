import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface UploadResult {
  path: string;
  publicUrl: string;
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly AVATARS_BUCKET = 'avatars';
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
  private readonly ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ];

  constructor(private supabase: SupabaseService) {}

  validateFile(file: File): string | null {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return 'Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.';
    }
    if (file.size > this.MAX_FILE_SIZE) {
      return 'File is too large. Maximum size is 2MB.';
    }
    return null;
  }

  async uploadAvatar(
    userId: string,
    agentId: string,
    file: File
  ): Promise<UploadResult> {
    const validationError = this.validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `avatar_${Date.now()}.${ext}`;
    const filePath = `${userId}/${agentId}/${fileName}`;

    // Remove any existing avatars for this agent first
    await this.removeAvatarFolder(userId, agentId);

    const { error } = await this.supabase.storage
      .from(this.AVATARS_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.supabase.storage
      .from(this.AVATARS_BUCKET)
      .getPublicUrl(filePath);

    return { path: filePath, publicUrl };
  }

  async removeAvatar(avatarUrl: string): Promise<void> {
    // Extract the path from the public URL
    const bucketSegment = `/storage/v1/object/public/${this.AVATARS_BUCKET}/`;
    const idx = avatarUrl.indexOf(bucketSegment);
    if (idx === -1) return;

    const filePath = avatarUrl.substring(idx + bucketSegment.length);

    const { error } = await this.supabase.storage
      .from(this.AVATARS_BUCKET)
      .remove([filePath]);

    if (error) {
      throw new Error(`Failed to remove avatar: ${error.message}`);
    }
  }

  private async removeAvatarFolder(
    userId: string,
    agentId: string
  ): Promise<void> {
    const folderPath = `${userId}/${agentId}`;

    const { data } = await this.supabase.storage
      .from(this.AVATARS_BUCKET)
      .list(folderPath);

    if (data && data.length > 0) {
      const filesToRemove = data.map((f) => `${folderPath}/${f.name}`);
      await this.supabase.storage
        .from(this.AVATARS_BUCKET)
        .remove(filesToRemove);
    }
  }
}
