import { useState, useEffect, lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import { Search, Heart, BookOpen, Settings, Music, StickyNote } from "lucide-react";
import SearchPage from "@/components/SearchPage";
// Lazy load heavy components to improve startup time
const BookmarksPage = lazy(() => import("@/components/BookmarksPage"));
const SettingsPage = lazy(() => import("@/components/SettingsPage"));
const NotesListPage = lazy(() => import("@/components/NotesListPage"));
const AuthModal = lazy(() => import("@/components/AuthModal").then(m => ({ default: m.AuthModal })));
const UpgradeModal = lazy(() => import("@/components/UpgradeModal").then(m => ({ default: m.UpgradeModal })));
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/translations";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProStatus } from "@/hooks/useProStatus";

type Tab = "search" | "bookmarks" | "notes" | "settings";

const Index = () => {
  const { settings } = useSettings();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isPro, isLoading: isProLoading } = useProStatus();
  const t = translations[settings.language];
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("search");
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [notesRefreshKey, setNotesRefreshKey] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);


  // Handle navigation state to set active tab
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location.state]);

  // Listen for open-auth-modal event (from UpgradeModal post-purchase sign-in prompt)
  useEffect(() => {
    const handleOpenAuthModal = () => {
      setShowAuthModal(true);
    };
    
    window.addEventListener('open-auth-modal', handleOpenAuthModal);
    
    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuthModal);
    };
  }, []);

  // Show UpgradeModal on app launch if user is not on pro version (only once per session)
  // Don't wait for ProStatus loading - show immediately based on cached state
  useEffect(() => {
    // Only show on initial mount, not when navigating back
    const hasShownModal = sessionStorage.getItem('upgradeModalShown');
    // Don't wait for isProLoading - use cached Pro status immediately
    if (!isPro && !hasShownModal && typeof window !== 'undefined') {
      // Use a flag to track if this is the initial mount
      const isInitialMount = !sessionStorage.getItem('appHasMounted');
      if (isInitialMount) {
        // Delay modal slightly to let UI render first (500ms)
        const timeoutId = setTimeout(() => {
          setShowUpgradeModal(true);
          sessionStorage.setItem('upgradeModalShown', 'true');
          sessionStorage.setItem('appHasMounted', 'true');
        }, 500);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isPro]); // Removed isProLoading dependency

  const handleSearchTabClick = () => {
    if (activeTab === "search") {
      // If already on search tab, refresh it
      setSearchRefreshKey(prev => prev + 1);
    } else {
      // If not on search tab, switch to it
      setActiveTab("search");
    }
  };

  const handleNotesTabClick = () => {
    if (activeTab === "notes") {
      // If already on notes tab, refresh it
      setNotesRefreshKey(prev => prev + 1);
    } else {
      // If not on notes tab, switch to it
      setActiveTab("notes");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return <SearchPage key={searchRefreshKey} />;
      case "bookmarks":
        return (
          <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading bookmarks...</div>}>
            <BookmarksPage onOpenAuth={() => setShowAuthModal(true)} />
          </Suspense>
        );
      case "notes":
        return (
          <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading notes...</div>}>
            <NotesListPage key={notesRefreshKey} onOpenAuth={() => setShowAuthModal(true)} />
          </Suspense>
        );
      case "settings":
        return (
          <Suspense fallback={<div className="p-4 text-center text-muted-foreground">Loading settings...</div>}>
            <SettingsPage onOpenAuth={() => setShowAuthModal(true)} />
          </Suspense>
        );
      default:
        return <SearchPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 pb-20">{renderContent()}</main>

      {/* Auth Modal - Rendered outside main content flow */}
      <Suspense fallback={null}>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </Suspense>

      {/* Upgrade Modal - Shown on app launch for non-pro users */}
      <Suspense fallback={null}>
        <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      </Suspense>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 z-50">
        <div className="flex items-center justify-around safe-bottom safe-left safe-right px-4 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSearchTabClick}
            className={`flex flex-col items-center gap-1 h-auto p-2 transition-smooth ${
              activeTab === "search"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-xs">{t.search}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("bookmarks")}
            className={`flex flex-col items-center gap-1 h-auto p-2 transition-smooth ${
              activeTab === "bookmarks"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Heart className="w-5 h-5" />
            <span className="text-xs">{t.bookmarks}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleNotesTabClick}
            className={`flex flex-col items-center gap-1 h-auto p-2 transition-smooth ${
              activeTab === "notes"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <StickyNote className="w-5 h-5" />
            <span className="text-xs">{t.notes}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center gap-1 h-auto p-2 transition-smooth ${
              activeTab === "settings"
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">{t.settings}</span>
          </Button>
        </div>
      </nav>
    </div>
  );
};

export default Index;
