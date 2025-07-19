import { useState } from "react";
import { Search, Heart, BookOpen, Settings, Music } from "lucide-react";
import SearchPage from "@/components/SearchPage";
import BookmarksPage from "@/components/BookmarksPage";
import SettingsPage from "@/components/SettingsPage";
import { Button } from "@/components/ui/button";
import { translations } from "@/lib/translations";
import { useSettings } from "@/contexts/SettingsContext";

type Tab = "search" | "bookmarks" | "settings";

const Index = () => {
  const { settings } = useSettings();
  const t = translations[settings.language];
  const [activeTab, setActiveTab] = useState<Tab>("search");

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return <SearchPage />;
      case "bookmarks":
        return <BookmarksPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <SearchPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="flex-1 pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-border/50 z-50">
        <div className="flex items-center justify-around safe-bottom safe-left safe-right px-4 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab("search")}
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