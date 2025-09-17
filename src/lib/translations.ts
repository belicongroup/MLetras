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
    customizeYourExperience: "Customize your MLETRA experience",
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
    aboutMletra: "About MLETRA",
    version: "Version",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    madeWithLove: "Made with ❤️ for music lovers",
    copyright: "MLETRA © 2024",
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
    customizeYourExperience: "Personaliza tu experiencia MLETRA",
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
    aboutMletra: "Acerca de MLETRA",
    version: "Versión",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos de Servicio",
    madeWithLove: "Hecho con ❤️ para amantes de la música",
    copyright: "MLETRA © 2024",
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
