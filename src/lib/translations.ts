export interface Translations {
  // Search Page
  searchPlaceholder: string;
  searchResults: string;
  noLyricsFound: string;
  noLyricsFoundSubtitle: string;
  noRecentSearches: string;
  recentSearches: string;
  findYourLyrics: string;

  // Lyrics Page
  noSongDataFound: string;
  goBackToSearch: string;
  autoScroll: string;
  boldText: string;
  listenOnStreamingServices: string;
  spotify: string;
  appleMusic: string;
  youtube: string;
  searchForChords: string;
  lyricsNotAvailable: string;
  lyricsNotAvailableSubtitle: string;
  loadingLyrics: string;

  // Settings Page
  settings: string;
  customizeYourExperience: string;
  displayAndBehavior: string;
  autoScrollSpeed: string;
  autoScrollSpeedDescription: string;
  boldTextDescription: string;
  darkMode: string;
  darkModeDescription: string;
  dataManagement: string;
  clearAllData: string;
  clearAllDataDescription: string;
  aboutMletra: string;
  version: string;
  privacyPolicy: string;
  termsOfService: string;
  madeWithLove: string;
  copyright: string;
  language: string;
  languageDescription: string;

  // Bookmarks Page
  bookmarks: string;
  likedSongs: string;
  folders: string;
  createFolder: string;
  folderName: string;
  createFolderDescription: string;
  addSongToFolderDescription: string;
  addSong: string;
  searchSongs: string;
  noSongsFound: string;
  noSongsFoundSubtitle: string;
  songs: string;
  song: string;

  // Notes Page
  notes: string;
  myNotes: string;
  createNote: string;
  editNote: string;
  artistName: string;
  songName: string;
  noteLyrics: string;
  noteLyricsPlaceholder: string;
  artistNameRequired: string;
  songNameRequired: string;
  noteCreated: string;
  noteUpdated: string;
  noteDeleted: string;
  noNotesFound: string;
  noNotesFoundSubtitle: string;
  confirmDeleteNote: string;
  deleteNoteDescription: string;

  // Common
  off: string;
  slow: string;
  medium: string;
  fast: string;
  delete: string;
  cancel: string;
  save: string;
  close: string;
  back: string;
  search: string;
  to: string;
  from: string;
}

export const translations: Record<"en" | "es", Translations> = {
  en: {
    // Search Page
    searchPlaceholder: "Search by song title or artist...",
    searchResults: "Search Results",
    noLyricsFound: "No lyrics found",
    noLyricsFoundSubtitle: "Try searching for a different song or artist",
    noRecentSearches: "No recent searches",
    recentSearches: "Recent Searches",
    findYourLyrics: "Find Your Lyrics",

    // Lyrics Page
    noSongDataFound: "No song data found",
    goBackToSearch: "Go back to search",
    autoScroll: "Auto-scroll",
    boldText: "Bold Text",
    listenOnStreamingServices: "Listen on streaming services",
    spotify: "Spotify",
    appleMusic: "Apple Music",
    youtube: "YouTube",
    searchForChords: "Search for chords",
    lyricsNotAvailable: "Lyrics not available",
    lyricsNotAvailableSubtitle: "We couldn't find the lyrics for this song.",
    loadingLyrics: "Loading lyrics...",

    // Settings Page
    settings: "Settings",
    customizeYourExperience: "Customize your MLETRAS experience",
    displayAndBehavior: "Display & Behavior",
    autoScrollSpeed: "Auto-scroll Speed",
    autoScrollSpeedDescription: "Choose your default auto-scroll speed",
    boldTextDescription: "Display lyrics in bold for better readability",
    darkMode: "Dark Mode",
    darkModeDescription: "Use dark theme (recommended)",
    dataManagement: "Data Management",
    clearAllData: "Clear All Data",
    clearAllDataDescription:
      "Remove all saved lyrics, folders, and preferences",
    aboutMletra: "About MLETRAS",
    version: "Version",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    madeWithLove: "Made with ❤️ for music lovers",
    copyright: "MLETRAS © 2024",
    language: "Language",
    languageDescription: "Choose your preferred language",

    // Bookmarks Page
    bookmarks: "Bookmarks",
    likedSongs: "Liked Songs",
    folders: "Folders",
    createFolder: "Create Folder",
    folderName: "Folder Name",
    createFolderDescription:
      "Create a new folder to organize your favorite songs.",
    addSongToFolderDescription:
      "Add songs to this folder from your liked songs or search for new ones.",
    addSong: "Add Song",
    searchSongs: "Search Songs",
    noSongsFound: "No songs found",
    noSongsFoundSubtitle: "Try searching for a different song or artist",
    songs: "songs",
    song: "song",

    // Notes Page
    notes: "Notes",
    myNotes: "My Notes",
    createNote: "Create Note",
    editNote: "Edit Note",
    artistName: "Artist Name",
    songName: "Song Name",
    noteLyrics: "Note Lyrics",
    noteLyricsPlaceholder: "Write your lyrics or notes here...",
    artistNameRequired: "Artist name is required",
    songNameRequired: "Song name is required",
    noteCreated: "Note created successfully",
    noteUpdated: "Note updated successfully",
    noteDeleted: "Note deleted successfully",
    noNotesFound: "No notes found",
    noNotesFoundSubtitle: "Create your first note to get started",
    confirmDeleteNote: "Delete Note",
    deleteNoteDescription: "Are you sure you want to delete this note? This action cannot be undone.",

    // Common
    off: "Off",
    slow: "Slow",
    medium: "Medium",
    fast: "Fast",
    delete: "Delete",
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    back: "Back",
    search: "Search",
    to: "to",
    from: "From",
  },
  es: {
    // Search Page
    searchPlaceholder: "Buscar por título o artista...",
    searchResults: "Resultados de búsqueda",
    noLyricsFound: "No se encontraron letras",
    noLyricsFoundSubtitle: "Intenta buscar una canción o artista diferente",
    noRecentSearches: "Sin búsquedas recientes",
    recentSearches: "Búsquedas Recientes",
    findYourLyrics: "Encuentra Tus Letras",

    // Lyrics Page
    noSongDataFound: "No se encontraron datos de la canción",
    goBackToSearch: "Volver a buscar",
    autoScroll: "Auto-scroll",
    boldText: "Texto en Negrita",
    listenOnStreamingServices: "Escuchar en servicios de streaming",
    spotify: "Spotify",
    appleMusic: "Apple Music",
    youtube: "YouTube",
    searchForChords: "Buscar acordes",
    lyricsNotAvailable: "Letras no disponibles",
    lyricsNotAvailableSubtitle:
      "No pudimos encontrar las letras para esta canción.",
    loadingLyrics: "Cargando letras...",

    // Settings Page
    settings: "Configuración",
    customizeYourExperience: "Personaliza tu experiencia MLETRAS",
    displayAndBehavior: "Pantalla y Comportamiento",
    autoScrollSpeed: "Velocidad de Auto-scroll",
    autoScrollSpeedDescription:
      "Elige tu velocidad de auto-scroll predeterminada",
    boldTextDescription: "Mostrar letras en negrita para mejor legibilidad",
    darkMode: "Modo Oscuro",
    darkModeDescription: "Usar tema oscuro (recomendado)",
    dataManagement: "Gestión de Datos",
    clearAllData: "Borrar Todos los Datos",
    clearAllDataDescription:
      "Eliminar todas las letras, carpetas y preferencias guardadas",
    aboutMletra: "Acerca de MLETRAS",
    version: "Versión",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos de Servicio",
    madeWithLove: "Hecho con ❤️ para amantes de la música",
    copyright: "MLETRAS © 2024",
    language: "Idioma",
    languageDescription: "Elige tu idioma preferido",

    // Bookmarks Page
    bookmarks: "Marcadores",
    likedSongs: "Canciones Favoritas",
    folders: "Carpetas",
    createFolder: "Crear Carpeta",
    folderName: "Nombre de Carpeta",
    createFolderDescription:
      "Crear una nueva carpeta para organizar tus canciones favoritas.",
    addSongToFolderDescription:
      "Agregar canciones a esta carpeta desde tus canciones favoritas o buscar nuevas.",
    addSong: "Agregar Canción",
    searchSongs: "Buscar Canciones",
    noSongsFound: "No se encontraron canciones",
    noSongsFoundSubtitle: "Intenta buscar una canción o artista diferente",
    songs: "canciones",
    song: "canción",

    // Notes Page
    notes: "Notas",
    myNotes: "Mis Notas",
    createNote: "Crear Nota",
    editNote: "Editar Nota",
    artistName: "Nombre del Artista",
    songName: "Nombre de la Canción",
    noteLyrics: "Letras de la Nota",
    noteLyricsPlaceholder: "Escribe tus letras o notas aquí...",
    artistNameRequired: "El nombre del artista es requerido",
    songNameRequired: "El nombre de la canción es requerido",
    noteCreated: "Nota creada exitosamente",
    noteUpdated: "Nota actualizada exitosamente",
    noteDeleted: "Nota eliminada exitosamente",
    noNotesFound: "No se encontraron notas",
    noNotesFoundSubtitle: "Crea tu primera nota para comenzar",
    confirmDeleteNote: "Eliminar Nota",
    deleteNoteDescription: "¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer.",

    // Common
    off: "Apagado",
    slow: "Lento",
    medium: "Medio",
    fast: "Rápido",
    delete: "Eliminar",
    cancel: "Cancelar",
    save: "Guardar",
    close: "Cerrar",
    back: "Atrás",
    search: "Buscar",
    to: "a",
    from: "De",
  },
};

export const useTranslations = () => {
  // This will be used in components that already have access to settings
  return translations;
};
