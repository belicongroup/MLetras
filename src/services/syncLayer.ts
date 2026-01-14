/**
 * Sync Layer - Batched, rate-limited sync for bookmarks and notes
 * Keeps UX instant while being server-friendly
 */

import { userDataApi } from './userDataApi';
import { syncDebug } from '../lib/syncDebug';

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
    
    syncDebug.log(`Queued ${operation.type} ${operation.action}`, {
      operation: `${operation.type}.${operation.action}`,
      data: {
        type: operation.type,
        action: operation.action,
        data: operation.data,
        queueLength: this.syncQueue.length,
      },
      status: 'start',
    });
    
    syncDebug.logQueueStatus(this.syncQueue.length, this.isSyncing);
    
    this.scheduleBatchSync();
  }

  /**
   * Schedule a batch sync with debouncing
   */
  private scheduleBatchSync() {
    // Clear existing timer
    if (this.batchTimer !== null) {
      clearTimeout(this.batchTimer);
      syncDebug.log('Rescheduled batch sync (previous timer cleared)', {
        operation: 'scheduleBatchSync',
        data: { queueLength: this.syncQueue.length },
      });
    }

    // Schedule new batch sync
    syncDebug.log(`Scheduled batch sync in ${this.BATCH_DELAY}ms`, {
      operation: 'scheduleBatchSync',
      data: { queueLength: this.syncQueue.length, batchDelay: this.BATCH_DELAY },
    });
    
    this.batchTimer = window.setTimeout(() => {
      this.processSyncQueue();
    }, this.BATCH_DELAY);
  }

  /**
   * Process queued sync operations in batches
   */
  private async processSyncQueue() {
    const timer = syncDebug.createTimer('processSyncQueue');
    
    if (this.isSyncing || this.syncQueue.length === 0) {
      if (this.isSyncing) {
        syncDebug.log('Sync already in progress, skipping', {
          operation: 'processSyncQueue',
          status: 'warning',
        });
      }
      if (this.syncQueue.length === 0) {
        syncDebug.log('Queue is empty, nothing to process', {
          operation: 'processSyncQueue',
          status: 'info',
        });
      }
      return;
    }

    // Rate limiting: ensure minimum interval between syncs
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    if (timeSinceLastSync < this.MIN_SYNC_INTERVAL) {
      const delay = this.MIN_SYNC_INTERVAL - timeSinceLastSync;
      syncDebug.log(`Rate limited: rescheduling in ${delay}ms`, {
        operation: 'processSyncQueue',
        data: { timeSinceLastSync, minSyncInterval: this.MIN_SYNC_INTERVAL, delay },
        status: 'info',
      });
      
      // Reschedule for later
      this.batchTimer = window.setTimeout(() => {
        this.processSyncQueue();
      }, delay);
      return;
    }

    this.isSyncing = true;
    this.lastSyncTime = Date.now();

    // Take batch of operations
    const batch = this.syncQueue.splice(0, this.MAX_BATCH_SIZE);
    
    syncDebug.log(`Starting batch processing`, {
      operation: 'processSyncQueue',
      data: {
        batchSize: batch.length,
        maxBatchSize: this.MAX_BATCH_SIZE,
        remainingInQueue: this.syncQueue.length,
        operations: batch.map(op => `${op.type}.${op.action}`),
      },
      status: 'start',
    });

    const batchStartTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    let retryCount = 0;

    // Process each operation
    for (let i = 0; i < batch.length; i++) {
      const operation = batch[i];
      const opTimer = syncDebug.createTimer(`${operation.type}.${operation.action}`);
      
      try {
        syncDebug.log(`Processing operation ${i + 1}/${batch.length}`, {
          operation: `${operation.type}.${operation.action}`,
          data: {
            index: i + 1,
            total: batch.length,
            operationData: operation.data,
            retries: operation.retries,
            queuedAt: new Date(operation.timestamp).toISOString(),
            timeInQueue: Date.now() - operation.timestamp,
          },
          status: 'start',
        });
        
        await this.executeOperation(operation);
        successCount++;
        opTimer.end();
        
        syncDebug.log(`Operation completed successfully`, {
          operation: `${operation.type}.${operation.action}`,
          data: operation.data,
          status: 'success',
        });
      } catch (error) {
        errorCount++;
        const duration = opTimer.end();
        
        syncDebug.log(`Operation failed`, {
          operation: `${operation.type}.${operation.action}`,
          data: operation.data,
          error,
          timing: duration,
          status: 'error',
        });
        
        // Retry logic
        if (operation.retries < this.MAX_RETRIES) {
          operation.retries++;
          retryCount++;
          this.syncQueue.push(operation); // Re-queue for retry
          
          syncDebug.log(`Re-queued for retry`, {
            operation: `${operation.type}.${operation.action}`,
            data: {
              retryAttempt: operation.retries,
              maxRetries: this.MAX_RETRIES,
              operationData: operation.data,
            },
            status: 'warning',
          });
        } else {
          syncDebug.log(`Max retries reached, operation failed permanently`, {
            operation: `${operation.type}.${operation.action}`,
            data: {
              retries: operation.retries,
              maxRetries: this.MAX_RETRIES,
              operationData: operation.data,
            },
            error,
            status: 'error',
          });
        }
      }
    }

    const batchDuration = Date.now() - batchStartTime;
    this.isSyncing = false;

    syncDebug.log(`Batch processing completed`, {
      operation: 'processSyncQueue',
      data: {
        batchSize: batch.length,
        successCount,
        errorCount,
        retryCount,
        remainingInQueue: this.syncQueue.length,
      },
      timing: batchDuration,
      status: 'success',
    });
    
    syncDebug.logQueueStatus(this.syncQueue.length, this.isSyncing, retryCount);
    timer.end();

    // If there are more operations, schedule next batch
    if (this.syncQueue.length > 0) {
      syncDebug.log(`More operations in queue, scheduling next batch`, {
        operation: 'processSyncQueue',
        data: { remainingInQueue: this.syncQueue.length },
      });
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
    const timer = syncDebug.createTimer(`syncBookmark.${operation.action}`);
    
    syncDebug.log(`Syncing bookmark: ${operation.action}`, {
      operation: `syncBookmark.${operation.action}`,
      data: operation.data,
      status: 'start',
    });
    
    try {
      switch (operation.action) {
        case 'create':
          await userDataApi.createBookmark(
            operation.data.song_title,
            operation.data.artist_name,
            operation.data.folder_id,
            operation.data.track_id
          );
          break;
        case 'update':
          await userDataApi.updateBookmark(operation.data.id, operation.data.folder_id);
          break;
      case 'delete': {
        const candidateIds: Set<string> = new Set();
        if (operation.data.id) {
          candidateIds.add(String(operation.data.id));
        }
        if (operation.data.bookmarkId) {
          candidateIds.add(String(operation.data.bookmarkId));
        }

        let deletedAny = false;

        const trackId =
          operation.data.track_id !== undefined && operation.data.track_id !== null
            ? String(operation.data.track_id)
            : null;

        syncDebug.log(`Deleting bookmark`, {
          operation: 'syncBookmark.delete',
          data: {
            candidateIds: Array.from(candidateIds),
            trackId,
            operationData: operation.data,
          },
          status: 'start',
        });

        if (trackId) {
          try {
            const response = await userDataApi.deleteBookmarksByTrack(trackId);
            if (response.success) {
              deletedAny = true;
              syncDebug.log(`Deleted bookmarks by track`, {
                operation: 'syncBookmark.deleteByTrack',
                data: { trackId, deleted: response.deleted },
                status: 'success',
              });
            }
          } catch (error) {
            syncDebug.log(`Failed to delete bookmarks by track, will fall back to individual IDs`, {
              operation: 'syncBookmark.deleteByTrack',
              data: { trackId },
              error,
              status: 'warning',
            });
          }
        }

        for (const candidate of candidateIds) {
          try {
            await userDataApi.deleteBookmark(candidate);
            deletedAny = true;
            syncDebug.log(`Deleted bookmark by ID`, {
              operation: 'syncBookmark.deleteById',
              data: { bookmarkId: candidate },
              status: 'success',
            });
          } catch (error) {
            syncDebug.log(`Failed to delete bookmark by ID`, {
              operation: 'syncBookmark.deleteById',
              data: { bookmarkId: candidate },
              error,
              status: 'warning',
            });
          }
        }

        if (!deletedAny) {
          const error = new Error('Unable to delete bookmark - no matching id found');
          syncDebug.log(`Bookmark deletion failed - no matching ID found`, {
            operation: 'syncBookmark.delete',
            data: {
              candidateIds: Array.from(candidateIds),
              trackId,
            },
            error,
            status: 'error',
          });
          throw error;
        }
        break;
      }
      }
      
      timer.end();
      syncDebug.log(`Bookmark sync completed: ${operation.action}`, {
        operation: `syncBookmark.${operation.action}`,
        data: operation.data,
        status: 'success',
      });
    } catch (error) {
      timer.end();
      syncDebug.log(`Bookmark sync failed: ${operation.action}`, {
        operation: `syncBookmark.${operation.action}`,
        data: operation.data,
        error,
        status: 'error',
      });
      throw error;
    }
  }

  /**
   * Sync note operation
   */
  private async syncNote(operation: SyncOperation) {
    const timer = syncDebug.createTimer(`syncNote.${operation.action}`);
    
    // Get StoreKit-verified Pro status from localStorage (source of truth)
    const cachedProStatus = localStorage.getItem('cached_pro_status');
    const isPro = cachedProStatus === 'true';
    
    syncDebug.log(`Syncing note: ${operation.action}`, {
      operation: `syncNote.${operation.action}`,
      data: {
        ...operation.data,
        isPro,
        cachedProStatus,
      },
      status: 'start',
    });
    
    try {
      switch (operation.action) {
        case 'create':
          await userDataApi.createNote(
            operation.data.note_title,
            operation.data.note_content,
            operation.data.artist_name,
            operation.data.song_name,
            isPro // Pass StoreKit-verified Pro status
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
      
      timer.end();
      syncDebug.log(`Note sync completed: ${operation.action}`, {
        operation: `syncNote.${operation.action}`,
        data: operation.data,
        status: 'success',
      });
    } catch (error) {
      timer.end();
      syncDebug.log(`Note sync failed: ${operation.action}`, {
        operation: `syncNote.${operation.action}`,
        data: operation.data,
        error,
        status: 'error',
      });
      throw error;
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

