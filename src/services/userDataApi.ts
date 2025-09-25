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
  : 'https://mletras-auth-api-dev.belicongroup.workers.dev';  // Production API for emulator and production

interface Folder {
  id: string;
  user_id: string;
  folder_name: string;
  created_at: string;
  updated_at: string;
}

interface Bookmark {
  id: string;
  user_id: string;
  folder_id?: string;
  song_title: string;
  artist_name: string;
  created_at: string;
  folder_name?: string;
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
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Request failed');
    }

    return response.json();
  }

  // Folder Management
  async getFolders(): Promise<{ success: boolean; folders: Folder[] }> {
    return this.makeRequest('/api/user/folders');
  }

  async createFolder(folderName: string): Promise<{ success: boolean; folder: Folder; message: string }> {
    return this.makeRequest('/api/user/folders', {
      method: 'POST',
      body: JSON.stringify({ folder_name: folderName }),
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

  async createBookmark(songTitle: string, artistName: string, folderId?: string): Promise<{ success: boolean; bookmark: Bookmark; message: string }> {
    return this.makeRequest('/api/user/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ 
        song_title: songTitle, 
        artist_name: artistName, 
        folder_id: folderId 
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

  // Notes Management
  async getNotes(): Promise<{ success: boolean; notes: Note[] }> {
    return this.makeRequest('/api/user/notes');
  }

  async createNote(noteTitle: string, noteContent: string, artistName?: string, songName?: string): Promise<{ success: boolean; note: Note; message: string }> {
    return this.makeRequest('/api/user/notes', {
      method: 'POST',
      body: JSON.stringify({ 
        note_title: noteTitle, 
        note_content: noteContent,
        artist_name: artistName,
        song_name: songName
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
}

export const userDataApi = new UserDataApi();
export type { Folder, Bookmark, Note };
