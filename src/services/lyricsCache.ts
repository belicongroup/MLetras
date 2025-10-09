interface CachedLyrics {
  id: string;
  title: string;
  artist: string;
  lyrics: string;
  imageUrl?: string;
  url?: string;
  timestamp: number;
  isLiked: boolean;
}

class LyricsCacheService {
  private dbName = "MLetrasDB";
  private dbVersion = 3; // Increment version to force database recreation
  private storeName = "lyrics";
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: "id" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("isLiked", "isLiked", { unique: false });
        }
      };
    });
  }

  async cacheLyrics(song: CachedLyrics): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.put(song);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCachedLyrics(songId: string): Promise<CachedLyrics | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(songId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllLikedSongs(): Promise<CachedLyrics[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.storeName], "readonly");
        const store = transaction.objectStore(this.storeName);

        // Always use the fallback approach to avoid index issues
        const request = store.getAll();

        request.onerror = () => {
          if (process.env.NODE_ENV !== 'production') {
            console.error("Error getting all songs:", request.error);
          }
          resolve([]);
        };

        request.onsuccess = () => {
          try {
            const allSongs = request.result || [];
            const likedSongs = allSongs.filter(
              (song) => song && song.isLiked === true,
            );
            resolve(likedSongs);
          } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
              console.error("Error filtering liked songs:", error);
            }
            resolve([]);
          }
        };
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Error in getAllLikedSongs:", error);
        }
        resolve([]);
      }
    });
  }

  async updateLikedStatus(songId: string, isLiked: boolean): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);

      // First get the existing record
      const getRequest = store.get(songId);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const existing = getRequest.result;
        if (existing) {
          existing.isLiked = isLiked;
          existing.timestamp = Date.now();

          const putRequest = store.put(existing);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        } else {
          resolve(); // Song not in cache, nothing to update
        }
      };
    });
  }

  async removeFromCache(songId: string): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(songId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async cleanupOldEntries(
    maxAge: number = 30 * 24 * 60 * 60 * 1000,
  ): Promise<void> {
    // Default: 30 days
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("timestamp");
      const cutoff = Date.now() - maxAge;

      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

export const lyricsCache = new LyricsCacheService();
export type { CachedLyrics };
