import { useState, useCallback } from 'react';
import { apiClient, ApiError } from '../lib/api';
import { Song, LyricsResponse, SearchResponse } from '../types';

interface LyricsState {
  searchResults: Song[];
  currentLyrics: string | null;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
}

interface LyricsActions {
  searchSongs: (query: string) => Promise<void>;
  getLyrics: (trackId: number) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export function useLyrics(): LyricsState & LyricsActions {
  const [state, setState] = useState<LyricsState>({
    searchResults: [],
    currentLyrics: null,
    isLoading: false,
    isSearching: false,
    error: null,
  });

  /**
   * Search for songs
   */
  const searchSongs = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: [], error: null }));
      return;
    }

    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      const response: SearchResponse = await apiClient.searchSongs(query);
      
      if (response.message?.body?.track_list) {
        const songs = response.message.body.track_list.map(item => item.track);
        setState(prev => ({
          ...prev,
          searchResults: songs,
          isSearching: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          searchResults: [],
          isSearching: false,
        }));
      }
    } catch (error) {
      let errorMessage = 'Failed to search songs';
      
      if (error instanceof ApiError) {
        if (error.status === 429) {
          errorMessage = `Rate limit exceeded. ${error.retryAfter ? `Try again in ${error.retryAfter} seconds.` : 'Please try again later.'}`;
        } else if (error.status === 401) {
          errorMessage = 'Please log in to search for songs';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      setState(prev => ({
        ...prev,
        searchResults: [],
        isSearching: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Get lyrics for a specific track
   */
  const getLyrics = useCallback(async (trackId: number): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null, currentLyrics: null }));

    try {
      const response: LyricsResponse = await apiClient.getLyrics(trackId);
      
      if (response.message?.body?.lyrics?.lyrics_body) {
        setState(prev => ({
          ...prev,
          currentLyrics: response.message.body.lyrics.lyrics_body,
          isLoading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          currentLyrics: null,
          isLoading: false,
          error: 'No lyrics found for this song',
        }));
      }
    } catch (error) {
      let errorMessage = 'Failed to get lyrics';
      
      if (error instanceof ApiError) {
        if (error.status === 429) {
          errorMessage = `Rate limit exceeded. ${error.retryAfter ? `Try again in ${error.retryAfter} seconds.` : 'Please try again later.'}`;
        } else if (error.status === 401) {
          errorMessage = 'Please log in to view lyrics';
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      
      setState(prev => ({
        ...prev,
        currentLyrics: null,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      searchResults: [],
      currentLyrics: null,
      error: null,
    }));
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    searchSongs,
    getLyrics,
    clearResults,
    clearError,
  };
}
