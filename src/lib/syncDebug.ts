/**
 * Sync Debugging Utility
 * Provides consistent logging format for cloud sync operations
 */

const DEBUG_ENABLED = process.env.NODE_ENV !== 'production'; // Only enabled in development
const DEBUG_PREFIX = '☁️ [SYNC]';

interface DebugLogOptions {
  operation?: string;
  data?: any;
  timing?: number;
  error?: Error | any;
  status?: 'start' | 'success' | 'error' | 'info' | 'warning';
}

export const syncDebug = {
  /**
   * Log sync operation with consistent format
   */
  log(message: string, options: DebugLogOptions = {}) {
    if (!DEBUG_ENABLED) return;

    const { operation, data, timing, error, status = 'info' } = options;
    const timestamp = new Date().toISOString();
    const emoji = {
      start: '🟢',
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
    }[status];

    const logParts = [
      `${DEBUG_PREFIX} ${emoji} [${timestamp}]`,
      message,
    ];

    if (operation) {
      logParts.push(`\n   Operation: ${operation}`);
    }

    if (timing !== undefined) {
      logParts.push(`\n   Duration: ${timing}ms`);
    }

    if (data) {
      logParts.push(`\n   Data:`, data);
    }

    if (error) {
      logParts.push(`\n   Error:`, error);
      if (error instanceof Error && error.stack) {
        logParts.push(`\n   Stack:`, error.stack);
      }
    }

    const logMethod = status === 'error' ? console.error : status === 'warning' ? console.warn : console.log;
    logMethod(logParts.join(' '));
  },

  /**
   * Log sync queue status
   */
  logQueueStatus(queueLength: number, isSyncing: boolean, pendingRetries: number = 0) {
    if (!DEBUG_ENABLED) return;
    
    console.log(
      `${DEBUG_PREFIX} 📊 Queue Status:`,
      {
        queueLength,
        isSyncing,
        pendingRetries,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Log API request
   */
  logApiRequest(method: string, endpoint: string, body?: any) {
    if (!DEBUG_ENABLED) return;
    
    console.log(
      `${DEBUG_PREFIX} 📤 API Request:`,
      {
        method,
        endpoint,
        body: body ? JSON.stringify(body, null, 2) : undefined,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Log API response
   */
  logApiResponse(method: string, endpoint: string, status: number, data?: any, timing?: number) {
    if (!DEBUG_ENABLED) return;
    
    const emoji = status >= 200 && status < 300 ? '✅' : '❌';
    console.log(
      `${DEBUG_PREFIX} ${emoji} API Response:`,
      {
        method,
        endpoint,
        status,
        timing: timing ? `${timing}ms` : undefined,
        data: data ? (typeof data === 'object' ? JSON.stringify(data, null, 2) : data) : undefined,
        timestamp: new Date().toISOString(),
      }
    );
  },

  /**
   * Create a timer for measuring operation duration
   */
  createTimer(operation: string) {
    const startTime = Date.now();
    return {
      end: () => {
        const duration = Date.now() - startTime;
        syncDebug.log(`Operation completed: ${operation}`, { operation, timing: duration, status: 'success' });
        return duration;
      },
      log: (message: string, data?: any) => {
        const elapsed = Date.now() - startTime;
        syncDebug.log(`${message} (${elapsed}ms elapsed)`, { operation, data, timing: elapsed });
      },
    };
  },
};

