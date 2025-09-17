import {
  Settings,
  Moon,
  Bell,
  Trash2,
  Info,
  Shield,
  Palette,
  Play,
  Database,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { lyricsCache } from "@/services/lyricsCache";
import { translations } from "@/lib/translations";

const SettingsPage = () => {
  const { theme, toggleTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const t = translations[settings.language];

  useEffect(() => {
    const updateCacheSize = async () => {
      try {
        const size = await lyricsCache.getCacheSize();
        setCacheSize(size);
      } catch (error) {
        console.error("Error getting cache size:", error);
      }
    };

    updateCacheSize();

    const handleOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await lyricsCache.clearCache();
      setCacheSize(0);
    } catch (error) {
      console.error("Error clearing cache:", error);
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            {t.settings}
          </span>
        </h2>
      </div>

      {/* App Preferences */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            {t.displayAndBehavior}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t.autoScrollSpeed}</p>
              <p className="text-sm text-muted-foreground">
                {t.autoScrollSpeedDescription}
              </p>
            </div>
            <Select
              value={settings.autoScrollSpeed}
              onValueChange={(value) => {
                setSettings((prev) => ({
                  ...prev,
                  autoScrollSpeed: value as "off" | "slow" | "medium" | "fast",
                }));
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">{t.off}</SelectItem>
                <SelectItem value="slow" className="text-green-500">
                  {t.slow}
                </SelectItem>
                <SelectItem value="medium" className="text-yellow-500">
                  {t.medium}
                </SelectItem>
                <SelectItem value="fast" className="text-red-500">
                  {t.fast}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t.boldText}</p>
              <p className="text-sm text-muted-foreground">
                {t.boldTextDescription}
              </p>
            </div>
            <Switch
              checked={settings.boldText}
              onCheckedChange={() =>
                setSettings((prev) => ({ ...prev, boldText: !prev.boldText }))
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t.darkMode}</p>
              <p className="text-sm text-muted-foreground">
                {t.darkModeDescription}
              </p>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t.language}</p>
              <p className="text-sm text-muted-foreground">
                {t.languageDescription}
              </p>
            </div>
            <Select
              value={settings.language}
              onValueChange={(value) => {
                setSettings((prev) => ({
                  ...prev,
                  language: value as "en" | "es",
                }));
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified about new features and updates
              </p>
            </div>
            <Switch
              checked={settings.notifications}
              onCheckedChange={() =>
                setSettings((prev) => ({
                  ...prev,
                  notifications: !prev.notifications,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Cache & Offline Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Connection Status</p>
              <p className="text-sm text-muted-foreground">
                {isOnline
                  ? "Online - Full access"
                  : "Offline - Cached content only"}
              </p>
            </div>
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-yellow-500" />
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Cached Lyrics</p>
              <p className="text-sm text-muted-foreground">
                {cacheSize} songs available offline
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              disabled={isClearingCache || cacheSize === 0}
            >
              {isClearingCache ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cache
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-destructive" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <p className="font-medium mb-1">Clear All Data</p>
              <p className="text-sm text-muted-foreground mb-3">
                Remove all saved lyrics, folders, and preferences
              </p>
              <Button variant="destructive" size="sm" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Information */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            About MLETRA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Version</p>
            <p className="text-sm text-muted-foreground">1.0.0</p>
          </div>

          <Separator />

          <Button variant="ghost" className="w-full justify-start p-0 h-auto">
            <Shield className="w-4 h-4 mr-2 text-primary" />
            Privacy Policy
          </Button>

          <Button variant="ghost" className="w-full justify-start p-0 h-auto">
            <Info className="w-4 h-4 mr-2 text-primary" />
            Terms of Service
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          Made with ❤️ for music lovers
        </p>
        <p className="text-xs text-muted-foreground mt-1">MLETRA © 2024</p>
      </div>
    </div>
  );
};

export default SettingsPage;
