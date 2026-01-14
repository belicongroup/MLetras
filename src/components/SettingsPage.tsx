import {
  Settings,
  Moon,
  Trash2,
  Info,
  Shield,
  Palette,
  Play,
  Crown,
  Lock,
  ExternalLink,
  AlertTriangle,
  User,
  Mail,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useProStatus } from "@/hooks/useProStatus";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { translations } from "@/lib/translations";
import { UpgradeModal } from "@/components/UpgradeModal";
import { LoginModal } from "@/components/LoginModal";
import { getPlatform } from "@/lib/capacitor";
import { userDataApi } from "@/services/userDataApi";
import { searchHistory } from "@/services/searchHistory";
import { subscriptionService } from "@/services/subscriptionService";
import { musixmatchApi } from "@/services/musixmatchApi";
import { toast } from "sonner";

interface SettingsPageProps {
  onOpenAuth?: () => void;
}

const SettingsPage = ({ onOpenAuth }: SettingsPageProps = {}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const { user, isAuthenticated, logout } = useAuth();
  const { isPro } = useProStatus();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showOfflineSyncSuccessDialog, setShowOfflineSyncSuccessDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const t = translations[settings.language];

  const handleManageSubscription = () => {
    const platform = getPlatform();
    if (platform === 'ios') {
      // Open iOS subscription management page
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else {
      // For Android or web, provide instructions
      alert(t.manageSubscriptionMessage);
    }
  };

  const handleClearAllData = async () => {
    setIsClearingData(true);
    try {
      // If authenticated, delete all backend data first
      if (isAuthenticated) {
        try {
          // Get all folders, bookmarks, and notes
          const foldersResponse = await userDataApi.getFolders();
          const bookmarksResponse = await userDataApi.getBookmarks();
          const notesResponse = await userDataApi.getNotes();

          // Delete all bookmarks first (including those in folders)
          const deleteBookmarkPromises = bookmarksResponse.bookmarks.map(bookmark => 
            userDataApi.deleteBookmark(bookmark.id)
          );
          await Promise.all(deleteBookmarkPromises);

          // Delete all folders (bookmarks are already deleted above)
          const deleteFolderPromises = foldersResponse.folders.map(folder => 
            userDataApi.deleteFolder(folder.id)
          );
          await Promise.all(deleteFolderPromises);

          // Delete all notes
          const deleteNotePromises = notesResponse.notes.map(note => 
            userDataApi.deleteNote(note.id)
          );
          await Promise.all(deleteNotePromises);
        } catch (error: any) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Failed to delete backend data:', error);
          }
          // Continue with local data clearing even if backend deletion fails
        }
      }

      // Clear search history
      searchHistory.clearHistory();
      
      // Clear all localStorage items except authentication
      const keysToRemove = [
        'mletras-folders',
        'userNotes',
        'userNotes_lastSync',
        'likedNotes',
        'likedSongs',
        'likedSongs_lastSync',
        'mletras-settings',
        'mletras-theme',
        'searchHistory',
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Reset settings to default
      setSettings({
        autoScrollSpeed: 'off',
        boldText: false,
        language: 'en',
      });

      // Reset theme to light
      setTheme('light');

      // Dispatch events to notify other components
      window.dispatchEvent(new Event('mletras-data-cleared'));
      window.dispatchEvent(new Event('mletras-notes-updated'));

      toast.success(t.dataClearedSuccess);
      setShowClearDataDialog(false);
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to clear data:', error);
      }
      toast.error(t.dataClearFailed);
    } finally {
      setIsClearingData(false);
    }
  };

  const handleOfflineSync = async () => {
    setIsSyncingOffline(true);
    try {
      let syncedCount = 0;
      let errorCount = 0;
      const trackIdsToSync = new Set<string>();

      // Get server bookmarks (if authenticated)
      if (isAuthenticated) {
        try {
          const bookmarksResponse = await userDataApi.getBookmarks();
          if (bookmarksResponse.success && bookmarksResponse.bookmarks) {
            bookmarksResponse.bookmarks.forEach(bookmark => {
              if (bookmark.track_id) {
                trackIdsToSync.add(bookmark.track_id);
              }
            });
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Error fetching server bookmarks:', error);
          }
        }
      }

      // Get local liked songs
      try {
        const localLikedSongs = localStorage.getItem('likedSongs');
        if (localLikedSongs) {
          const songs: Array<{ id: string }> = JSON.parse(localLikedSongs);
          songs.forEach(song => {
            if (song.id) {
              trackIdsToSync.add(song.id);
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error reading local liked songs:', error);
        }
      }

      // Get local folders and their songs
      try {
        const localFolders = localStorage.getItem('mletras-folders');
        if (localFolders) {
          const folders: Array<{ songs: Array<{ id: string }> }> = JSON.parse(localFolders);
          folders.forEach(folder => {
            if (folder.songs) {
              folder.songs.forEach(song => {
                if (song.id) {
                  trackIdsToSync.add(song.id);
                }
              });
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Error reading local folders:', error);
        }
      }

      // Sync lyrics for each unique track
      for (const trackId of trackIdsToSync) {
        try {
          const success = await musixmatchApi.syncLyricsForOffline(trackId);
          if (success) {
            syncedCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(`Error syncing lyrics for track ${trackId}:`, error);
          }
          errorCount++;
        }
      }

      // If we have tracks synced, show success dialog
      if (syncedCount > 0) {
        setShowOfflineSyncSuccessDialog(true);
      } else if (trackIdsToSync.size === 0) {
        toast.info("No songs with lyrics found to sync.");
      } else {
        toast.error(t.offlineSyncFailed);
      }
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to sync offline data:', error);
      }
      toast.error(t.offlineSyncFailed);
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await userDataApi.deleteAccount();
      
      if (result.success) {
        // Clear search history
        searchHistory.clearHistory();
        
        // Clear all localStorage items
        const keysToRemove = [
          'sessionToken',
          'cached_user',
          'mletras-folders',
          'userNotes',
          'userNotes_lastSync',
          'likedNotes',
          'likedSongs',
          'likedSongs_lastSync',
          'mletras-settings',
          'mletras-theme',
          'searchHistory',
        ];

        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });

        // Reset settings to default
        setSettings({
          autoScrollSpeed: 'off',
          boldText: false,
          language: 'en',
        });

        // Reset theme to light
        setTheme('light');

        // Dispatch events to notify other components
        window.dispatchEvent(new Event('mletras-data-cleared'));
        window.dispatchEvent(new Event('mletras-notes-updated'));

        toast.success(t.accountDeletedSuccess);
        // Logout user
        await logout();
        // Close dialog
        setShowDeleteAccountDialog(false);
      } else {
        throw new Error(result.message || 'Failed to delete account');
      }
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Failed to delete account:', error);
      }
      const errorMessage = error?.message || error?.toString() || t.accountDeleteFailed;
      toast.error(errorMessage);
    } finally {
      setIsDeletingAccount(false);
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
          {t.settings}
        </h2>
      </div>

      {/* Sign Up Banner - Show to all non-authenticated users */}
      {!isAuthenticated && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 p-2 shadow-lg">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowLoginModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-3 py-1.5 text-xs rounded-lg shadow-md transition-all flex-shrink-0"
            >
              {t.signUp}
            </Button>
            <p className="text-white text-xs font-medium leading-tight flex-1">
              Create a free account to sync your favorite songs, folders, notes across devices
            </p>
          </div>
        </div>
      )}

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
              <div className="flex items-center gap-2">
                <p className="font-medium">{t.autoScrollSpeed}</p>
                {!isPro && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Crown className="w-3 h-3" />
                    {t.pro}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {!isPro
                  ? t.proSubscriptionRequired
                  : t.autoScrollSpeedDescription
                }
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
              disabled={!isPro}
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
              <div className="flex items-center gap-2">
                <p className="font-medium">{t.darkMode}</p>
                {!isPro && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Crown className="w-3 h-3" />
                    {t.pro}
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {!isPro
                  ? t.darkModeProRequired
                  : t.darkModeDescription
                }
              </p>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={toggleTheme}
              disabled={!isPro}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium">{t.offlineAccess}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t.offlineAccessDescription}
              </p>
            </div>
            <Button
              onClick={handleOfflineSync}
              disabled={isSyncingOffline}
              variant="outline"
              className="ml-4 flex-shrink-0"
            >
              {isSyncingOffline ? t.syncing : t.syncNow}
            </Button>
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
                <SelectItem value="en">{t.english}</SelectItem>
                <SelectItem value="es">{t.spanish}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Account and Subscription */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            {t.accountAndSubscription}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Your Account */}
          <button
            onClick={() => {
              if (isAuthenticated) {
                // Show logout confirmation dialog
                setShowLogoutDialog(true);
              } else {
                // Show login modal
                setShowLoginModal(true);
              }
            }}
            className="flex flex-col items-start w-full text-left py-2 gap-1"
          >
            <div className="flex items-center justify-between w-full">
              <p className="font-medium">{t.yourAccount}</p>
              <span className="text-muted-foreground text-sm flex items-center gap-1 flex-shrink-0 ml-2">
                {isAuthenticated ? (t.logOut || "Log Out") : t.logIn} 
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
            {isAuthenticated && user && (
              <p className="text-xs text-muted-foreground truncate w-full pr-8" dir="rtl">
                {user.email || user.id || 'Apple Account'}
              </p>
            )}
          </button>

          {!isPro && (
            <>
              <Separator />

              {/* Subscribe to MLetras Pro */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center justify-between w-full text-left py-2"
              >
                <p className="font-medium">{t.subscribeToMLetrasPro}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}

          {/* Manage Subscription - Show to ALL Pro users (including guest users with active subscriptions) */}
          {isPro && (
            <>
              <Separator />
              <button
                onClick={handleManageSubscription}
                className="flex items-center justify-between w-full text-left py-2"
              >
                <p className="font-medium">{t.manageSubscription || "Manage Subscription"}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}

          <Separator />

          {/* Restore Purchase */}
          <button
            onClick={async () => {
              try {
                const result = await subscriptionService.restorePurchases();
                
                if (result.restored) {
                  // Verify subscription from StoreKit
                  const status = await subscriptionService.checkSubscriptionStatus();
                  
                  if (status.isActive) {
                    toast.success("Purchases restored! 🎉");
                    window.dispatchEvent(new Event('subscription-updated'));
                  } else {
                    toast.info("No active subscription found.");
                  }
                } else {
                  toast.info("No previous purchases found.");
                }
              } catch (error: any) {
                toast.error(error.message || "Failed to restore purchases.");
              }
            }}
            className="flex items-center justify-between w-full text-left py-2"
          >
            <p className="font-medium">{t.restorePurchase}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>


      {/* Privacy */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {t.privacy}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Privacy Policy */}
          <button
            onClick={() => window.open('https://mletras.com/privacy', '_blank')}
            className="flex items-center justify-between w-full text-left py-2"
          >
            <span className="font-medium">{t.privacyPolicy}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </button>

          <Separator />

          {/* Terms of Service */}
          <button
            onClick={() => window.open('https://mletras.com/terms', '_blank')}
            className="flex items-center justify-between w-full text-left py-2"
          >
            <span className="font-medium">{t.termsOfService}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </button>

          <Separator />

          {/* Contact Support */}
          <button
            onClick={() => window.open('mailto:support@mletras.com', '_blank')}
            className="flex items-center justify-between w-full text-left py-2"
          >
            <span className="font-medium">{t.contactSupport}</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </button>

          <Separator />

          {/* Clear All Data */}
          <button
            onClick={() => setShowClearDataDialog(true)}
            className="flex items-center justify-between w-full text-left py-2"
          >
            <p className="font-medium">{t.clearAllData}</p>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Delete Account - Only show if authenticated */}
          {isAuthenticated && (
            <>
              <Separator />
              <button
                onClick={() => setShowDeleteAccountDialog(true)}
                className="flex items-center justify-between w-full text-left py-2"
              >
                <p className="font-medium">{t.deleteAccount}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </>
          )}

          <Separator />

          {/* App Version */}
          <div className="flex items-center justify-between py-2">
            <p className="font-medium">{t.appVersion}</p>
            <p className="text-sm text-muted-foreground">1.1.7</p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          {t.madeWithLove}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{t.copyright}</p>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      {/* Clear All Data Confirmation Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl font-bold">
              Clear all data
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2 pt-4">
              <p className="text-muted-foreground">
                You're about to remove all saved lyrics, folders, and preferences. Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingData}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearingData}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearingData ? t.clearing : t.clearAllData}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent className="bg-background border-border max-w-md p-6">
          <AlertDialogHeader className="text-center space-y-4 pb-0">
            <AlertDialogTitle className="text-2xl font-bold text-foreground">
              Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-center px-0 text-sm leading-relaxed">
              If you log out, your liked songs, folders, and notes will no longer be backed up to the cloud or synced across devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4 mt-6">
            <AlertDialogAction
              onClick={async () => {
                await logout();
                setShowLogoutDialog(false);
              }}
              className="w-full bg-background border-2 border-foreground/20 text-foreground hover:bg-foreground/10 hover:border-foreground/40 rounded-2xl py-3.5 font-medium transition-colors"
            >
              Log out on this device
            </AlertDialogAction>
            <button
              onClick={() => setShowLogoutDialog(false)}
              className="w-full text-foreground hover:text-foreground/80 py-2 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Offline Sync Success Dialog */}
      <AlertDialog open={showOfflineSyncSuccessDialog} onOpenChange={setShowOfflineSyncSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl font-bold">
              {t.offlineSyncSuccess}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2 pt-4">
              <p className="text-muted-foreground">
                {t.offlineSyncSuccessMessage}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowOfflineSyncSuccessDialog(false)}
              className="w-full"
            >
              {t.close || "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl font-bold">
              Delete your account permanently
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-2 pt-4">
              <p className="text-muted-foreground">
                You're about to permanently delete your account. This includes any saved liked songs, folders, notes. Are you sure you want to continue?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAccount ? t.deleting : t.deleteAccount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
