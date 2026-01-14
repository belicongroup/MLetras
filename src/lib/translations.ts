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
  offlineAccess: string;
  offlineAccessDescription: string;
  syncNow: string;
  syncing: string;
  offlineSyncSuccess: string;
  offlineSyncSuccessMessage: string;
  offlineSyncFailed: string;
  dataManagement: string;
  clearAllData: string;
  clearAllDataDescription: string;
    aboutMletra: string;
    version: string;
    appVersion: string;
    privacyPolicy: string;
    termsOfService: string;
    privacy: string;
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

  // Settings Page Additional
  signUpSignIn: string;
  signUpSignInDescription: string;
  subscriptionStatus: string;
  accountAndSubscription: string;
  yourAccount: string;
  subscribeToMLetrasPro: string;
  restorePurchase: string;
  signUp: string;
  logIn: string;
  logOut: string;
  welcome: string;
  free: string;
  pro: string;
  limitedFeatures: string;
  fullAccess: string;
  upgradeToPro: string;
  manageSubscription: string;
  proSubscriptionRequired: string;
  darkModeProRequired: string;
  english: string;
  spanish: string;
  clearing: string;
  accountManagement: string;
  deleteAccount: string;
  deleteAccountDescription: string;
  deleting: string;
  clearAllDataQuestion: string;
  clearAllDataConfirm: string;
  clearAllDataWillDelete: string;
  allFoldersAndBookmarks: string;
  allNotesFromAccount: string;
  allSearchHistory: string;
  allSavedPreferences: string;
  allLocallyStoredData: string;
  accountRemainsActive: string;
  deleteAccountQuestion: string;
  deleteAccountWillDelete: string;
  accountAndProfileInfo: string;
  allFoldersAndBookmarksAccount: string;
  allNotesAccount: string;
  subscriptionData: string;
  loggedOutImmediately: string;
  manageSubscriptionMessage: string;
  dataClearedSuccess: string;
  dataClearFailed: string;
  accountDeletedSuccess: string;
    accountDeleteFailed: string;
    deleteAccountConfirm: string;
    contactSupport: string;
    supportEmail: string;
    helpAndSupport: string;
    supportDescription: string;

  // Notes Page Additional
  generalNote: string;
  noNotesYet: string;
  createFirstNote: string;
    noLyricsInNote: string;
    noLyricsInNoteDescription: string;

  // Auth Modal
  signInToMLetras: string;
  verifyYourEmail: string;
  createYourProfile: string;
  authWelcome: string;
  authentication: string;
  enterEmailForCode: string;
  enterSixDigitCode: string;
  chooseUsernameForProfile: string;
  accountReady: string;
  emailAddress: string;
  enterEmailAddress: string;
  sendVerificationCode: string;
  sendingCode: string;
  verificationCode: string;
  enterSixDigitCodePlaceholder: string;
  checkEmailForCode: string;
  verifying: string;
  verifyCode: string;
  backToEmail: string;
  chooseUsername: string;
  enterUsername: string;
  usernameRequirements: string;
  creatingAccount: string;
  createAccount: string;
  welcomeToMLetras: string;
  loggedInMessage: string;
  getStarted: string;
  secureSignIn: string;
  otpSent: string;
  welcomeToMLetrasSuccess: string;
  accountCreatedSuccess: string;
  failedToSendOTP: string;
  invalidOTP: string;
    failedToSetUsername: string;
    plan: string;
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
    autoScrollSpeedDescription: "Hands-free lyric scrolling while you play music",
    boldTextDescription: "Auto bold for all lyrics displayed",
    darkMode: "Dark Mode",
    darkModeDescription: "Easier on the eyes during night or stage use",
    offlineAccess: "Offline Access",
    offlineAccessDescription: "Sync all liked songs, folders, and lyrics to access offline",
    syncNow: "Sync Now",
    syncing: "Syncing...",
    offlineSyncSuccess: "Offline Sync Complete",
    offlineSyncSuccessMessage: "All songs and lyrics have been successfully stored for offline use.",
    offlineSyncFailed: "Failed to sync offline data. Please try again.",
    dataManagement: "Data Management",
    clearAllData: "Clear All Data",
    clearAllDataDescription:
      "Remove all saved lyrics, folders, and preferences",
    aboutMletra: "About MLETRAS",
    version: "Version",
    appVersion: "App Version",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    privacy: "Privacy",
    madeWithLove: "made by belicongroup",
    copyright: "MLETRAS © 2025",
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

    // Settings Page Additional
    signUpSignIn: "Sign Up / Sign In",
    signUpSignInDescription: "Sign in (optional) to sync your bookmarks and notes across all your devices. Your data will be safely stored in the cloud. You can use all Pro features without signing in.",
    subscriptionStatus: "Subscription Status",
    accountAndSubscription: "Account and Subscription",
    yourAccount: "Your Account",
    subscribeToMLetrasPro: "Subscribe to MLetras Pro",
    restorePurchase: "Restore Purchase",
    signUp: "Sign up",
    logIn: "Log in",
    logOut: "Log Out",
    welcome: "Welcome",
    free: "Free",
    pro: "Pro",
    limitedFeatures: "Limited features, upgrade to Pro for full access",
    fullAccess: "Full access to all features",
    upgradeToPro: "Upgrade to MLetras Pro",
    manageSubscription: "Manage Subscription",
    proSubscriptionRequired: "Hands-free lyric scrolling while you play music",
    darkModeProRequired: "Easier on the eyes during night or stage use",
    english: "English",
    spanish: "Español",
    clearing: "Clearing...",
    accountManagement: "Account Management",
    deleteAccount: "Delete Account",
    deleteAccountDescription: "Permanently delete your account and all associated data. This action cannot be undone.",
    deleting: "Deleting...",
    clearAllDataQuestion: "Clear All Data?",
    clearAllDataConfirm: "Are you sure you want to clear all your data? This action cannot be undone.",
    clearAllDataWillDelete: "This will permanently delete:",
    allFoldersAndBookmarks: "All folders and bookmarks from your account",
    allNotesFromAccount: "All notes from your account",
    allSearchHistory: "All search history",
    allSavedPreferences: "All saved preferences and settings",
    allLocallyStoredData: "All locally stored data",
    accountRemainsActive: "Your account will remain active, but all your data will be removed.",
    deleteAccountQuestion: "Delete Account?",
    deleteAccountWillDelete: "This will permanently delete:",
    accountAndProfileInfo: "Your account and profile information",
    allFoldersAndBookmarksAccount: "All folders and bookmarks",
    allNotesAccount: "All notes",
    subscriptionData: "Your subscription data",
    loggedOutImmediately: "You will be logged out immediately after deletion.",
    manageSubscriptionMessage: "Please manage your subscription through your device's app store settings.",
    dataClearedSuccess: "All data cleared successfully",
    dataClearFailed: "Failed to clear data. Please try again.",
    accountDeletedSuccess: "Account deleted successfully",
    accountDeleteFailed: "Failed to delete account. Please try again.",
    deleteAccountConfirm: "Are you sure you want to delete your account? This action cannot be undone.",
    contactSupport: "Contact Support",
    supportEmail: "support@mletras.com",
    helpAndSupport: "Help & Support",
    supportDescription: "Need help? Contact us for assistance with your account or subscription.",

    // Notes Page Additional
    generalNote: "General Note",
    noNotesYet: "No notes yet",
    createFirstNote: "Create your first note to get started.",
    noLyricsInNote: "No lyrics available",
    noLyricsInNoteDescription: "This note doesn't have any lyrics content.",

    // Auth Modal
    signInToMLetras: "Sign in to MLetras",
    verifyYourEmail: "Verify Your Email",
    createYourProfile: "Create Your Profile",
    authWelcome: "Welcome!",
    authentication: "Authentication",
    enterEmailForCode: "Enter your email to receive a verification code",
    enterSixDigitCode: "Enter the 6-digit code sent to your email",
    chooseUsernameForProfile: "Choose a username for your profile",
    accountReady: "Your account is ready!",
    emailAddress: "Email Address",
    enterEmailAddress: "Enter your email address",
    sendVerificationCode: "Send Verification Code",
    sendingCode: "Sending Code...",
    verificationCode: "Verification Code",
    enterSixDigitCodePlaceholder: "Enter 6-digit code",
    checkEmailForCode: "Check your email for the verification code",
    verifying: "Verifying...",
    verifyCode: "Verify Code",
    backToEmail: "Back to Email",
    chooseUsername: "Choose Username",
    enterUsername: "Enter your username",
    usernameRequirements: "3-20 characters, letters, numbers, and underscores only",
    creatingAccount: "Creating Account...",
    createAccount: "Create Account",
    welcomeToMLetras: "Welcome to MLetras",
    loggedInMessage: "Your liked songs, folders, and notes will now be synced to the cloud and across devices",
    getStarted: "Get Started",
    secureSignIn: "Secure sign-in powered by email verification",
    otpSent: "OTP sent to your email!",
    welcomeToMLetrasSuccess: "Welcome to MLetras!",
    accountCreatedSuccess: "Account created successfully!",
    failedToSendOTP: "Failed to send OTP",
    invalidOTP: "Invalid OTP",
    failedToSetUsername: "Failed to set username",
    plan: "Plan",
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
      "Desplazamiento de letras sin manos mientras reproduces música",
    boldTextDescription: "Negrita automática para todas las letras mostradas",
    darkMode: "Modo Oscuro",
    darkModeDescription: "Más fácil para la vista durante el uso nocturno o en el escenario",
    offlineAccess: "Acceso Sin Conexión",
    offlineAccessDescription: "Sincronizar todas las canciones favoritas, carpetas y letras para acceder sin conexión",
    syncNow: "Sincronizar Ahora",
    syncing: "Sincronizando...",
    offlineSyncSuccess: "Sincronización Sin Conexión Completa",
    offlineSyncSuccessMessage: "Todas las canciones y letras se han almacenado exitosamente para uso sin conexión.",
    offlineSyncFailed: "Error al sincronizar datos sin conexión. Por favor, inténtalo de nuevo.",
    dataManagement: "Gestión de Datos",
    clearAllData: "Borrar Todos los Datos",
    clearAllDataDescription:
      "Eliminar todas las letras, carpetas y preferencias guardadas",
    aboutMletra: "Acerca de MLETRAS",
    version: "Versión",
    appVersion: "Versión de la App",
    privacyPolicy: "Política de Privacidad",
    termsOfService: "Términos de Servicio",
    privacy: "Privacidad",
    madeWithLove: "made by belicongroup",
    copyright: "MLETRAS © 2025",
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

    // Settings Page Additional
    signUpSignIn: "Registrarse / Iniciar Sesión",
    signUpSignInDescription: "Inicia sesión (opcional) para sincronizar tus marcadores y notas en todos tus dispositivos. Tus datos se guardarán de forma segura en la nube. Puedes usar todas las funciones Pro sin iniciar sesión.",
    subscriptionStatus: "Estado de Suscripción",
    accountAndSubscription: "Cuenta y Suscripción",
    yourAccount: "Tu Cuenta",
    subscribeToMLetrasPro: "Suscribirse a MLetras Pro",
    restorePurchase: "Restaurar Compra",
    signUp: "Registrarse",
    logIn: "iniciar sesión",
    logOut: "Cerrar Sesión",
    welcome: "Bienvenido",
    free: "Gratis",
    pro: "Pro",
    limitedFeatures: "Funciones limitadas, actualiza a Pro para acceso completo",
    fullAccess: "Acceso completo a todas las funciones",
    upgradeToPro: "Actualizar a MLetras Pro",
    manageSubscription: "Administrar Suscripción",
    proSubscriptionRequired: "Desplazamiento de letras sin manos mientras reproduces música",
    darkModeProRequired: "Más fácil para la vista durante el uso nocturno o en el escenario",
    english: "English",
    spanish: "Español",
    clearing: "Borrando...",
    accountManagement: "Gestión de Cuenta",
    deleteAccount: "Eliminar Cuenta",
    deleteAccountDescription: "Eliminar permanentemente tu cuenta y todos los datos asociados. Esta acción no se puede deshacer.",
    deleting: "Eliminando...",
    clearAllDataQuestion: "¿Borrar Todos los Datos?",
    clearAllDataConfirm: "¿Estás seguro de que quieres borrar todos tus datos? Esta acción no se puede deshacer.",
    clearAllDataWillDelete: "Esto eliminará permanentemente:",
    allFoldersAndBookmarks: "Todas las carpetas y marcadores de tu cuenta",
    allNotesFromAccount: "Todas las notas de tu cuenta",
    allSearchHistory: "Todo el historial de búsqueda",
    allSavedPreferences: "Todas las preferencias y configuraciones guardadas",
    allLocallyStoredData: "Todos los datos almacenados localmente",
    accountRemainsActive: "Tu cuenta permanecerá activa, pero todos tus datos serán eliminados.",
    deleteAccountQuestion: "¿Eliminar Cuenta?",
    deleteAccountWillDelete: "Esto eliminará permanentemente:",
    accountAndProfileInfo: "Tu cuenta e información de perfil",
    allFoldersAndBookmarksAccount: "Todas las carpetas y marcadores",
    allNotesAccount: "Todas las notas",
    subscriptionData: "Tus datos de suscripción",
    loggedOutImmediately: "Serás desconectado inmediatamente después de la eliminación.",
    manageSubscriptionMessage: "Por favor, administra tu suscripción a través de la configuración de la tienda de aplicaciones de tu dispositivo.",
    dataClearedSuccess: "Todos los datos borrados exitosamente",
    dataClearFailed: "Error al borrar datos. Por favor, inténtalo de nuevo.",
    accountDeletedSuccess: "Cuenta eliminada exitosamente",
    accountDeleteFailed: "Error al eliminar cuenta. Por favor, inténtalo de nuevo.",
    deleteAccountConfirm: "¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.",
    contactSupport: "Contactar Soporte",
    supportEmail: "support@mletras.com",
    helpAndSupport: "Ayuda y Soporte",
    supportDescription: "¿Necesitas ayuda? Contáctanos para asistencia con tu cuenta o suscripción.",

    // Notes Page Additional
    generalNote: "Nota General",
    noNotesYet: "Aún no hay notas",
    createFirstNote: "Crea tu primera nota para comenzar.",
    noLyricsInNote: "No hay letras disponibles",
    noLyricsInNoteDescription: "Esta nota no tiene contenido de letras.",

    // Auth Modal
    signInToMLetras: "Iniciar sesión en MLetras",
    verifyYourEmail: "Verifica Tu Email",
    createYourProfile: "Crea Tu Perfil",
    authWelcome: "¡Bienvenido!",
    authentication: "Autenticación",
    enterEmailForCode: "Ingresa tu email para recibir un código de verificación",
    enterSixDigitCode: "Ingresa el código de 6 dígitos enviado a tu email",
    chooseUsernameForProfile: "Elige un nombre de usuario para tu perfil",
    accountReady: "¡Tu cuenta está lista!",
    emailAddress: "Dirección de Email",
    enterEmailAddress: "Ingresa tu dirección de email",
    sendVerificationCode: "Enviar Código de Verificación",
    sendingCode: "Enviando Código...",
    verificationCode: "Código de Verificación",
    enterSixDigitCodePlaceholder: "Ingresa código de 6 dígitos",
    checkEmailForCode: "Revisa tu email para el código de verificación",
    verifying: "Verificando...",
    verifyCode: "Verificar Código",
    backToEmail: "Volver al Email",
    chooseUsername: "Elegir Nombre de Usuario",
    enterUsername: "Ingresa tu nombre de usuario",
    usernameRequirements: "3-20 caracteres, solo letras, números y guiones bajos",
    creatingAccount: "Creando Cuenta...",
    createAccount: "Crear Cuenta",
    welcomeToMLetras: "Bienvenido a MLetras",
    loggedInMessage: "Tus canciones favoritas, carpetas y notas ahora se sincronizarán en la nube y entre dispositivos",
    getStarted: "Comenzar",
    secureSignIn: "Inicio de sesión seguro mediante verificación por email",
    otpSent: "¡Código enviado a tu email!",
    welcomeToMLetrasSuccess: "¡Bienvenido a MLetras!",
    accountCreatedSuccess: "¡Cuenta creada exitosamente!",
    failedToSendOTP: "Error al enviar código",
    invalidOTP: "Código inválido",
    failedToSetUsername: "Error al establecer nombre de usuario",
    plan: "Plan",
  },
};

export const useTranslations = () => {
  // This will be used in components that already have access to settings
  return translations;
};
