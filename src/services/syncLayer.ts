/**
 * Sync Layer - Batched, rate-limited sync for bookmarks and notes
 * Keeps UX instant while being server-friendly
 */

import { userDataApi } from './userDataApi';

interface SyncOperation {
  type: 'bookmark' | 'note';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

class SyncLayerService {
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_DELAY = 2000; // Wait 2 seconds before batching writes
  private readonly MAX_BATCH_SIZE = 10;
  private batchTimer: number | null = null;
  private lastSyncTime = 0;
  private readonly MIN_SYNC_INTERVAL = 1000; // Min 1 second between sync batches

  /**
   * Queue an operation for batched sync
   */
  queueSync(operation: Omit<SyncOperation, 'timestamp' | 'retries'>) {
    const syncOp: SyncOperation = {
      ...operation,
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(syncOp);
    this.scheduleBatchSync();
  }

  /**
   * Schedule a batch sync with debouncing
   */
  private scheduleBatchSync() {
    // Clear existing timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
    }

    // Schedule new batch sync
    this.batchTimer = window.setTimeout(() => {
      this.processSyncQueue();
    }, this.BATCH_DELAY);
  }

  /**
   * Process queued sync operations in batches
   */
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    // Rate limiting: ensure minimum interval between syncs
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
      // Reschedule for later
      this.batchTimer = window.setTimeout(() => {
        this.processSyncQueue();
      }, this.MIN_SYNC_INTERVAL - timeSinceLastSync);
      return;
    }

    this.isSyncing = true;
    this.lastSyncTime = Date.now();

    // Take batch of operations
    const batch = this.syncQueue.splice(0, this.MAX_BATCH_SIZE);
    console.log(`🔄 Processing sync batch: ${batch.length} operations`);

    // Process each operation
    for (const operation of batch) {
      try {
        await this.executeOperation(operation);
        console.log(`✅ Synced: ${operation.type} ${operation.action}`);
      } catch (error) {
        console.error(`❌ Sync failed: ${operation.type} ${operation.action}`, error);
        
        // Retry logic
        if (operation.retries < this.MAX_RETRIES) {
          operation.retries++;
          this.syncQueue.push(operation); // Re-queue for retry
          console.log(`🔁 Re-queued for retry (${operation.retries}/${this.MAX_RETRIES})`);
        } else {
          console.error(`💥 Max retries reached for ${operation.type} ${operation.action}`);
        }
      }
    }

    this.isSyncing = false;

    // If there are more operations, schedule next batch
    if (this.syncQueue.length > 0) {
      this.scheduleBatchSync();
    }
  }

  /**
   * Execute a single sync operation
   */
  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'bookmark':
        await this.syncBookmark(operation);
        break;
      case 'note':
        await this.syncNote(operation);
        break;
    }
  }

  /**
   * Sync bookmark operation
   */
  private async syncBookmark(operation: SyncOperation) {
    switch (operation.action) {
      case 'create':
        await userDataApi.createBookmark(
          operation.data.song_title,
          operation.data.artist_name,
          operation.data.folder_id,
          operation.data.track_id,
          operation.data.album_art_url
        );
        break;
      case 'update':
        await userDataApi.updateBookmark(operation.data.id, operation.data.folder_id);
        break;
      case 'delete':
        await userDataApi.deleteBookmark(operation.data.id);
        break;
    }
  }

  /**
   * Sync note operation
   */
  private async syncNote(operation: SyncOperation) {
    switch (operation.action) {
      case 'create':
        await userDataApi.createNote(
          operation.data.note_title,
          operation.data.note_content,
          operation.data.artist_name,
          operation.data.song_name
        );
        break;
      case 'update':
        await userDataApi.updateNote(
          operation.data.id,
          operation.data.note_title,
          operation.data.note_content,
          operation.data.artist_name,
          operation.data.song_name
        );
        break;
      case 'delete':
        await userDataApi.deleteNote(operation.data.id);
        break;
    }
  }

  /**
   * Force immediate sync (for important operations)
   */
  async forceSyncNow() {
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    await this.processSyncQueue();
  }

  /**
   * Get pending operations count
   */
  getPendingCount(): number {
    return this.syncQueue.length;
  }
}

export const syncLayer = new SyncLayerService();

