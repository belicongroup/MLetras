import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ProStatusProvider } from "@/contexts/ProStatusContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ApiErrorBoundary } from "@/components/ApiErrorBoundary";
import { lockScreenOrientation, isCapacitorEnvironment } from "@/lib/capacitor";
import { lazy, Suspense, useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
// Lazy load route components to improve startup time
const LyricsPage = lazy(() => import("./pages/LyricsPage"));
const NoteDetailPage = lazy(() => import("./pages/NoteDetailPage"));
const SearchDebugPage = lazy(() => import("@/components/SearchDebugPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times with exponential backoff
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error && typeof error.status === 'number') {
          if (error.status >= 400 && error.status < 500) {
            return false;
          }
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for critical data only
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
});

// Component to reset viewport zoom on orientation change (fixes iOS zoom glitch)
const ZoomResetManager = () => {
  useEffect(() => {
    let orientationChangeTimeout: NodeJS.Timeout;
    let lastOrientation: 'portrait' | 'landscape' | null = null;
    
    const handleOrientationChange = () => {
      // Clear any pending timeout
      if (orientationChangeTimeout) {
        clearTimeout(orientationChangeTimeout);
      }
      
      // Wait for orientation change to complete, then check if we're in portrait
      orientationChangeTimeout = setTimeout(() => {
        const isPortrait = window.innerHeight > window.innerWidth;
        const currentOrientation = isPortrait ? 'portrait' : 'landscape';
        
        // Only process if orientation actually changed
        if (lastOrientation === currentOrientation) {
          return;
        }
        
        lastOrientation = currentOrientation;
        
        if (isPortrait) {
          // Reset zoom by forcing viewport meta tag refresh
          // This fixes the iOS bug where zoom gets stuck after rotation
          const viewport = document.querySelector('meta[name="viewport"]');
          if (viewport) {
            // Force a refresh by temporarily changing the content, then restoring it
            // This triggers iOS to recalculate the viewport
            // Temporarily set to a slightly different value to force recalculation
            viewport.setAttribute('content', 'width=device-width, initial-scale=0.99, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
            
            // Use double requestAnimationFrame to ensure the change is processed
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Restore to correct value
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
                
                // Force a reflow
                void document.documentElement.offsetHeight;
              });
            });
          }
        }
      }, 100); // Small delay to ensure orientation change is complete
    };

    // Initialize orientation
    lastOrientation = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';

    // Listen for orientation changes
    window.addEventListener('orientationchange', handleOrientationChange);
    // Also listen for resize events as a fallback (some devices fire resize instead)
    window.addEventListener('resize', handleOrientationChange);

    return () => {
      if (orientationChangeTimeout) {
        clearTimeout(orientationChangeTimeout);
      }
      window.removeEventListener('orientationchange', handleOrientationChange);
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);

  return null;
};

// Component to manage screen orientation based on current route
const OrientationManager = () => {
  const location = useLocation();

  useEffect(() => {
    // Only manage orientation in Capacitor environment (native apps)
    if (!isCapacitorEnvironment()) {
      return;
    }

    // Lock to portrait for all routes except Lyrics Viewer
    // For /lyrics route, orientation is managed by LyricsPage component
    if (location.pathname !== '/lyrics') {
      lockScreenOrientation('portrait');
    }
  }, [location.pathname]);

  return null;
};

const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Debug route is ONLY enabled in development mode, never in production
  const enableSearchDebug =
    process.env.NODE_ENV !== 'production' &&
    typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_ENABLE_SEARCH_DEBUG === "true" ||
      import.meta.env?.VITE_ENABLE_SEARCH_DEBUG === true);

  // Only show loading screen if we truly have no cached data
  // This prevents blocking the UI when we have cached user data
  const hasCachedUser = typeof window !== 'undefined' && localStorage.getItem('cached_user') !== null;
  if (isLoading && !hasCachedUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow app to work without authentication - login is now optional
  return (
    <BrowserRouter>
      <ZoomResetManager />
      <OrientationManager />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/lyrics" element={
          <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
            <LyricsPage />
          </Suspense>
        } />
        <Route path="/note-detail" element={
          <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
            <NoteDetailPage />
          </Suspense>
        } />
        {enableSearchDebug && (
          <Route path="/debug/search" element={
            <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>}>
              <SearchDebugPage />
            </Suspense>
          } />
        )}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProStatusProvider>
            <ThemeProvider>
              <SettingsProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <ApiErrorBoundary>
                    <AppContent />
                  </ApiErrorBoundary>
                </TooltipProvider>
              </SettingsProvider>
            </ThemeProvider>
          </ProStatusProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
