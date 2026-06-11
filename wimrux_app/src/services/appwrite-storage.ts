/**
 * Appwrite Storage Adapter
 * Mirrors the Appwrite Storage API pattern
 */

import { storage, BUCKETS } from 'src/boot/appwrite';
import { ID } from 'appwrite';

export interface StorageUploadResponse {
  path: string;
  id: string;
  fullPath: string;
}

export interface StorageFile {
  id: string;
  name: string;
  bucketId: string;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export const appwriteStorage = {
  // Upload file
  async upload(
    bucketId: string,
    file: File | Blob,
    fileName?: string,
    fileId?: string
  ): Promise<{ data: StorageFile | null; error: Error | null }> {
    try {
      const name = fileName || (file instanceof File ? file.name : 'file');
      const id = fileId || ID.unique();

      const response = await storage.createFile(bucketId, id, file as File);

      // Build file URL
      const url = this.getPublicUrl(bucketId, response.$id);

      const storageFile: StorageFile = {
        id: response.$id,
        name: response.name,
        bucketId: response.bucketId,
        mimeType: response.mimeType,
        size: response.sizeOriginal,
        createdAt: response.$createdAt,
        updatedAt: response.$updatedAt,
        url,
      };

      return { data: storageFile, error: null };
    } catch (error) {
      console.error('[Appwrite Storage] Upload error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Download file - returns download URL
  async download(bucketId: string, fileId: string): Promise<{ data: string | null; error: Error | null }> {
    try {
      const url = this.getDownloadUrl(bucketId, fileId);
      return { data: url, error: null };
    } catch (error) {
      console.error('[Appwrite Storage] Download error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Get file URL (for viewing)
  getPublicUrl(bucketId: string, fileId: string): string {
    // Appwrite uses a different URL structure
    // This is the direct view URL
    return storage.getFileView(bucketId, fileId).toString();
  },

  // Get file preview URL (for images)
  getPreviewUrl(bucketId: string, fileId: string, width?: number, height?: number): string {
    return storage.getFilePreview(bucketId, fileId, width, height).toString();
  },

  // Get file for download
  getDownloadUrl(bucketId: string, fileId: string): string {
    return storage.getFileDownload(bucketId, fileId).toString();
  },

  // Delete file
  async remove(bucketId: string, fileId: string): Promise<{ error: Error | null }> {
    try {
      await storage.deleteFile(bucketId, fileId);
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Storage] Delete error:', error);
      return { error: error as Error };
    }
  },

  // List files in bucket
  async list(
    bucketId: string,
    options?: { limit?: number; offset?: number; search?: string }
  ): Promise<{ data: StorageFile[]; error: Error | null }> {
    try {
      const queries: string[] = [];
      if (options?.search) {
        queries.push(`search("name", "${options.search}")`);
      }

      const response = await storage.listFiles(bucketId, queries);

      const files: StorageFile[] = response.files.map(file => ({
        id: file.$id,
        name: file.name,
        bucketId: file.bucketId,
        mimeType: file.mimeType,
        size: file.sizeOriginal,
        createdAt: file.$createdAt,
        updatedAt: file.$updatedAt,
        url: this.getPublicUrl(bucketId, file.$id),
      }));

      return { data: files, error: null };
    } catch (error) {
      console.error('[Appwrite Storage] List error:', error);
      return { data: [], error: error as Error };
    }
  },

  // Get file info
  async getFile(bucketId: string, fileId: string): Promise<{ data: StorageFile | null; error: Error | null }> {
    try {
      const response = await storage.getFile(bucketId, fileId);

      const file: StorageFile = {
        id: response.$id,
        name: response.name,
        bucketId: response.bucketId,
        mimeType: response.mimeType,
        size: response.sizeOriginal,
        createdAt: response.$createdAt,
        updatedAt: response.$updatedAt,
        url: this.getPublicUrl(bucketId, response.$id),
      };

      return { data: file, error: null };
    } catch (error) {
      console.error('[Appwrite Storage] Get file error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Update file (name only in Appwrite)
  async update(
    bucketId: string,
    fileId: string,
    updates: { name?: string }
  ): Promise<{ data: StorageFile | null; error: Error | null }> {
    try {
      if (updates.name) {
        const response = await storage.updateFile(bucketId, fileId, updates.name);

        const file: StorageFile = {
          id: response.$id,
          name: response.name,
          bucketId: response.bucketId,
          mimeType: response.mimeType,
          size: response.sizeOriginal,
          createdAt: response.$createdAt,
          updatedAt: response.$updatedAt,
          url: this.getPublicUrl(bucketId, response.$id),
        };

        return { data: file, error: null };
      }

      // If no updates, just get current file
      return this.getFile(bucketId, fileId);
    } catch (error) {
      console.error('[Appwrite Storage] Update error:', error);
      return { data: null, error: error as Error };
    }
  },

  // Delete file
  async delete(bucketId: string, fileId: string): Promise<{ error: Error | null }> {
    try {
      await storage.deleteFile(bucketId, fileId);
      return { error: null };
    } catch (error) {
      console.error('[Appwrite Storage] Delete error:', error);
      return { error: error as Error };
    }
  },

  // Note: Bucket management is done via Appwrite Console or Admin API
  // Client SDK doesn't expose createBucket/deleteBucket
  // Use Appwrite Console to create buckets: invoice-pdfs, company-logos, receipts, attachments, reports

  // Helper to upload with automatic bucket selection
  async uploadInvoicePdf(file: File, invoiceId: string): Promise<{ data: StorageFile | null; error: Error | null }> {
    const fileName = `invoice-${invoiceId}-${Date.now()}.pdf`;
    return this.upload(BUCKETS.INVOICE_PDFS, file, fileName);
  },

  async uploadCompanyLogo(file: File, companyId: string): Promise<{ data: StorageFile | null; error: Error | null }> {
    const fileName = `logo-${companyId}-${Date.now()}.${file.name.split('.').pop()}`;
    return this.upload(BUCKETS.COMPANY_LOGOS, file, fileName);
  },

  async uploadReceipt(file: File, transactionId: string): Promise<{ data: StorageFile | null; error: Error | null }> {
    const fileName = `receipt-${transactionId}-${Date.now()}.${file.name.split('.').pop()}`;
    return this.upload(BUCKETS.RECEIPTS, file, fileName);
  },

  async uploadAttachment(file: File, referenceId: string): Promise<{ data: StorageFile | null; error: Error | null }> {
    const fileName = `attachment-${referenceId}-${Date.now()}.${file.name.split('.').pop()}`;
    return this.upload(BUCKETS.ATTACHMENTS, file, fileName);
  },
};

export default appwriteStorage;
