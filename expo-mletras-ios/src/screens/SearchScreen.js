import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { searchSongs, getSongLyrics } from '../musixmatchApi';

const SongItem = ({ song, onPress, isActive }) => (
  <TouchableOpacity onPress={() => onPress(song)} style={[styles.songCard, isActive && styles.songCardActive]}>
    <View style={styles.songHeader}>
      <Text style={styles.songTitle}>{song.title}</Text>
      {song.hasLyrics ? <Text style={styles.badge}>Lyrics</Text> : null}
    </View>
    <Text style={styles.songArtist}>{song.artist}</Text>
    <Text style={styles.songMeta}>{song.album ? `Album: ${song.album}` : 'Album: Unknown'}</Text>
  </TouchableOpacity>
);

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingLyrics, setLoadingLyrics] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [lyrics, setLyrics] = useState('');
  const [statusMessage, setStatusMessage] = useState('Search for a song to get started.');

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStatusMessage('Please enter a search term.');
      return;
    }

    setLoadingSearch(true);
    setStatusMessage('Searching…');
    setSelectedSong(null);
    setLyrics('');

    const data = await searchSongs(trimmed, 10, 1);
    if (data.length === 0) {
      setStatusMessage('No results found. Try another search term.');
    } else {
      setStatusMessage(`Found ${data.length} result${data.length > 1 ? 's' : ''}. Select a song to view lyrics.`);
    }
    setResults(data);
    setLoadingSearch(false);
  }, [query]);

  const handleSelectSong = useCallback(async (song) => {
    setSelectedSong(song);
    setLyrics('');
    setLoadingLyrics(true);
    setStatusMessage(`Fetching lyrics for “${song.title}” …`);

    const lyricText = await getSongLyrics(song.id);
    setLyrics(lyricText);
    setLoadingLyrics(false);
    setStatusMessage(lyricText.startsWith('Error') ? lyricText : 'Lyrics loaded.');
  }, []);

  const renderItem = ({ item }) => (
    <SongItem song={item} onPress={handleSelectSong} isActive={selectedSong?.id === item.id} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>MLetras</Text>
      <Text style={styles.subheading}>Lyrics &amp; Music Notes Companion</Text>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by song title"
          placeholderTextColor="#9CA3AF"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          {loadingSearch ? <ActivityIndicator color="#FFF" /> : <Text style={styles.searchButtonText}>Search</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.statusText}>{statusMessage}</Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        style={styles.list}
        ListEmptyComponent={!loadingSearch && <Text style={styles.emptyState}>Your results will appear here.</Text>}
      />

      <View style={styles.lyricsCard}>
        <Text style={styles.lyricsHeading}>Lyrics</Text>
        {loadingLyrics ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : selectedSong && lyrics ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.lyricsScroll}>
            <Text style={styles.lyricsTitle}>{selectedSong.title}</Text>
            <Text style={styles.lyricsArtist}>{selectedSong.artist}</Text>
            <Text style={styles.lyricsText}>{lyrics}</Text>
          </ScrollView>
        ) : (
          <Text style={styles.lyricsPlaceholder}>Select a song to view the lyrics.</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  subheading: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusText: {
    marginTop: 4,
    fontSize: 14,
    color: '#4B5563',
  },
  listContent: {
    paddingVertical: 16,
  },
  list: {
    flexGrow: 0,
    maxHeight: 280,
  },
  emptyState: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 32,
  },
  songCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  songCardActive: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  songHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  songArtist: {
    fontSize: 15,
    color: '#4B5563',
    marginBottom: 4,
  },
  songMeta: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  badge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: '600',
  },
  lyricsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flex: 1,
  },
  lyricsHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  lyricsScroll: {
    marginTop: 8,
  },
  lyricsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  lyricsArtist: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 12,
  },
  lyricsText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
  },
  lyricsPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default SearchScreen;

