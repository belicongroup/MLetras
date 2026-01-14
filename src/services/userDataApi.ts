// User Data API Client for MLetras
// Use local development server when running locally
// For Android emulator, use 10.0.2.2 instead of localhost
// API URL configuration for different environments
// Check if we're in local web development (not Android emulator)
const isLocalWebDev = process.env.NODE_ENV === 'development' && 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1');

const API_BASE_URL = isLocalWebDev 
  ? 'http://10.0.2.2:8787'  // Use local backend for web development only
  : 'https://mletras-auth-api-dev.belicongroup.workers.dev';  // Using dev worker until production is fixed

import { syncDebug } from '../lib/syncDebug';

interface Folder {
  id: string;
  user_id: string;
  folder_name: string;
  created_at: string;
  updated_at: string;
  is_locked?: boolean;  // Lock status for free tier downgrade
}

interface Bookmark {
  id: string;
  user_id: string;
  folder_id?: string;
  song_title: string;
  artist_name: string;
  track_id?: string;  // Musixmatch track ID for fetching lyrics
  created_at: string;
  folder_name?: string;
  is_locked?: boolean;  // Lock status for free tier downgrade
}

interface Note {
  id: string;
  user_id: string;
  note_title: string;
  note_content: string;
  artist_name?: string;
  song_name?: string;
  created_at: string;
  updated_at: string;
}

class UserDataApi {
  private getAuthHeaders(): Record<string, string> {
    const sessionToken = localStorage.getItem('sessionToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
    
    return headers;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const requestStartTime = Date.now();
    
    // Log request
    let requestBody: any = null;
    if (options.body) {
      try {
        requestBody = JSON.parse(options.body as string);
      } catch {
        requestBody = options.body;
      }
    }
    
    syncDebug.logApiRequest(method, endpoint, requestBody);
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const requestDuration = Date.now() - requestStartTime;

      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        let errorData: any = null;
        
        // Clone response to read body without consuming it
        const clonedResponse = response.clone();
        
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } else {
            const text = await clonedResponse.text();
            if (text) errorMessage = text;
          }
        } catch (e) {
          // If we can't parse the response, try to get text from cloned response
          try {
            const text = await clonedResponse.text();
            if (text && text.length < 500) { // Only use if reasonable length
              errorMessage = text;
            }
          } catch (textError) {
            // Use default status-based message
            if (process.env.NODE_ENV !== 'production') {
              console.error('Error parsing error response:', e, textError);
            }
          }
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).data = errorData;
        
        syncDebug.logApiResponse(method, endpoint, response.status, errorData, requestDuration);
        throw error;
      }

      const responseData = await response.json();
      syncDebug.logApiResponse(method, endpoint, response.status, responseData, requestDuration);
      
      return responseData;
    } catch (error: any) {
      const requestDuration = Date.now() - requestStartTime;
      
      // Handle network errors with user-friendly messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network connectivity issue
        const networkError = new Error('Unable to connect to the server. Please check your internet connection and try again.');
        (networkError as any).isNetworkError = true;
        (networkError as any).status = 0;
        
        syncDebug.logApiResponse(method, endpoint, 0, { error: 'Network error', message: networkError.message }, requestDuration);
        throw networkError;
      }
      
      // Handle timeout errors
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        const timeoutError = new Error('Request timed out. Please check your connection and try again.');
        (timeoutError as any).isNetworkError = true;
        (timeoutError as any).status = 0;
        
        syncDebug.logApiResponse(method, endpoint, 0, { error: 'Timeout', message: timeoutError.message }, requestDuration);
        throw timeoutError;
      }
      
      syncDebug.logApiResponse(method, endpoint, error?.status || 0, { error: error?.message || 'Unknown error' }, requestDuration);
      
      // Re-throw if it's already an Error with a message
      if (error instanceof Error && error.message) {
        throw error;
      }
      // Otherwise wrap it with a user-friendly message
      throw new Error(error?.message || 'An error occurred. Please try again.');
    }
  }

  // Folder Management
  async getFolders(): Promise<{ success: boolean; folders: Folder[] }> {
    return this.makeRequest('/api/user/folders');
  }

  async createFolder(folderName: string, isPro?: boolean): Promise<{ success: boolean; folder: Folder; message: string }> {
    const requestBody = { 
      folder_name: folderName,
      is_pro: isPro // Pass StoreKit-verified Pro status (source of truth)
    };
    console.log('🔍 [DEBUG] API Request body:', {
      ...requestBody,
      isProValue: isPro,
      isProType: typeof isPro,
      isProTruthy: !!isPro,
      isProStrictTrue: isPro === true
    });
    return this.makeRequest('/api/user/folders', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  async updateFolder(folderId: string, folderName: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/api/user/folders/${folderId}`, {
      method: 'PUT',
      body: JSON.stringify({ folder_name: folderName }),
    });
  }

  async deleteFolder(folderId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/api/user/folders/${folderId}`, {
      method: 'DELETE',
    });
  }

  // Bookmark Management
  async getBookmarks(): Promise<{ success: boolean; bookmarks: Bookmark[] }> {
    return this.makeRequest('/api/user/bookmarks');
  }

  async createBookmark(songTitle: string, artistName: string, folderId?: string, trackId?: string): Promise<{ success: boolean; bookmark: Bookmark; message: string }> {
    return this.makeRequest('/api/user/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ 
        song_title: songTitle, 
        artist_name: artistName, 
        folder_id: folderId,
        track_id: trackId
      }),
    });
  }

  async updateBookmark(bookmarkId: string, folderId?: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/api/user/bookmarks/${bookmarkId}`, {
      method: 'PUT',
      body: JSON.stringify({ folder_id: folderId }),
    });
  }

  async deleteBookmark(bookmarkId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/api/user/bookmarks/${bookmarkId}`, {
      method: 'DELETE',
    });
  }

  async deleteBookmarksByTrack(trackId: string): Promise<{ success: boolean; message: string; deleted?: number }> {
    return this.makeRequest(`/api/user/bookmarks/track/${encodeURIComponent(trackId)}`, {
      method: 'DELETE',
    });
  }

  // Notes Management
  async getNotes(): Promise<{ success: boolean; notes: Note[] }> {
    return this.makeRequest('/api/user/notes');
  }

  async createNote(noteTitle: string, noteContent: string, artistName?: string, songName?: string, isPro?: boolean): Promise<{ success: boolean; note: Note; message: string }> {
    return this.makeRequest('/api/user/notes', {
      method: 'POST',
      body: JSON.stringify({ 
        note_title: noteTitle, 
        note_content: noteContent,
        artist_name: artistName,
        song_name: songName,
        is_pro: isPro // Pass StoreKit-verified Pro status (source of truth)
      }),
    });
  }

  async updateNote(noteId: string, noteTitle: string, noteContent: string, artistName?: string, songName?: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/api/user/notes/${noteId}`, {
      method: 'PUT',
      body: JSON.stringify({ 
        note_title: noteTitle, 
        note_content: noteContent,
        artist_name: artistName,
        song_name: songName
      }),
    });
  }

  async deleteNote(noteId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/api/user/notes/${noteId}`, {
      method: 'DELETE',
    });
  }

  // Username Management
  async setUsername(username: string): Promise<{ success: boolean; message: string; username: string }> {
    return this.makeRequest('/api/user/username', {
      method: 'POST',
      body: JSON.stringify({ username }),
    });
  }

  // Subscription Management
  async updateSubscriptionStatus(isPro: boolean, transactionId?: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/api/user/subscription', {
      method: 'POST',
      body: JSON.stringify({ 
        subscription_type: isPro ? 'pro' : 'free',
        transaction_id: transactionId
      }),
    });
  }

  // Account Management
  async deleteAccount(): Promise<{ success: boolean; message: string }> {
    return this.makeRequest('/api/user/account', {
      method: 'DELETE',
    });
  }
}

export const userDataApi = new UserDataApi();
export type { Folder, Bookmark, Note };
