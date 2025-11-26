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
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
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
import { getPlatform } from "@/lib/capacitor";
import { userDataApi } from "@/services/userDataApi";
import { searchHistory } from "@/services/searchHistory";
import { toast } from "sonner";

interface SettingsPageProps {
  onOpenAuth?: () => void;
}

const SettingsPage = ({ onOpenAuth }: SettingsPageProps = {}) => {
  const { theme, toggleTheme, setTheme } = useTheme();
  const { settings, setSettings } = useSettings();
  const { user, isAuthenticated, logout } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [showClearDataDialog, setShowClearDataDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isClearingData, setIsClearingData] = useState(false);
  const t = translations[settings.language];

  const handleManageSubscription = () => {
    const platform = getPlatform();
    if (platform === 'ios') {
      // Open iOS subscription management page
      window.open('https://apps.apple.com/account/subscriptions', '_blank');
    } else {
      // For Android or web, provide instructions
      alert('Please manage your subscription through your device\'s app store settings.');
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
          console.error('Failed to delete backend data:', error);
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

      toast.success('All data cleared successfully');
      setShowClearDataDialog(false);
    } catch (error: any) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear data. Please try again.');
    } finally {
      setIsClearingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      const result = await userDataApi.deleteAccount();
      
      if (result.success) {
        toast.success('Account deleted successfully');
        // Clear local storage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('cached_user');
        // Logout user
        await logout();
        // Close dialog
        setShowDeleteAccountDialog(false);
      } else {
        throw new Error(result.message || 'Failed to delete account');
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to delete account. Please try again.';
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

      {/* Sign Up / Sign In Section - Only show when not authenticated */}
      {!isAuthenticated && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Sign Up / Sign In
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create an account to sync your bookmarks and notes across all your devices. Your data will be safely stored in the cloud.
              </p>
              <Button
                onClick={() => onOpenAuth?.()}
                className="w-full bg-gradient-primary hover:bg-gradient-accent text-white font-semibold py-3"
              >
                <User className="h-4 w-4 mr-2" />
                Sign Up / Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Status / Upgrade - Only show when authenticated */}
      {isAuthenticated && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.username && (
              <div className="text-center py-2">
                <p className="text-lg font-medium text-primary">Welcome {user.username}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium capitalize">{user?.subscription_type} Plan</p>
                <p className="text-sm text-muted-foreground">
                  {user?.subscription_type === 'free' 
                    ? "Limited features, upgrade to Pro for full access"
                    : "Full access to all features"
                  }
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                user?.subscription_type === 'free' 
                  ? 'bg-amber-100 text-amber-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {user?.subscription_type === 'free' ? 'Free' : 'Pro'}
              </div>
            </div>
            
            {user?.subscription_type === 'free' && (
              <Button
                onClick={() => setShowUpgradeModal(true)}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg transition-all"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to MLetras Pro
              </Button>
            )}

            {user?.subscription_type === 'pro' && (
              <Button
                onClick={handleManageSubscription}
                variant="outline"
                className="w-full mt-2"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Manage Subscription
              </Button>
            )}
          </CardContent>
        </Card>
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
                {(!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')) && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Crown className="w-3 h-3" />
                    Pro
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')
                  ? "Auto-scroll is available with Pro subscription"
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
              disabled={!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')}
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
                {(!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')) && (
                  <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                    <Crown className="w-3 h-3" />
                    Pro
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')
                  ? "Dark mode is available with Pro subscription"
                  : t.darkModeDescription
                }
              </p>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={toggleTheme}
              disabled={!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')}
            />
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
              <Button 
                variant="destructive" 
                size="sm" 
                className="w-full"
                onClick={() => setShowClearDataDialog(true)}
                disabled={isClearingData}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isClearingData ? 'Clearing...' : 'Clear All Data'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion */}
      {isAuthenticated && (
        <Card className="glass border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Account Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-medium mb-1 text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setShowDeleteAccountDialog(true)}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* App Information */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            About MLETRAS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Version</p>
            <p className="text-sm text-muted-foreground">1.0.7</p>
          </div>

          <Separator />

          <Button 
            variant="ghost" 
            className="w-full justify-start p-0 h-auto"
            onClick={() => window.open('https://mletras.com/privacy', '_blank')}
          >
            <Shield className="w-4 h-4 mr-2 text-primary" />
            Privacy Policy
          </Button>

          <Button 
            variant="ghost" 
            className="w-full justify-start p-0 h-auto"
            onClick={() => window.open('https://mletras.com/terms', '_blank')}
          >
            <Info className="w-4 h-4 mr-2 text-primary" />
            Terms of Service
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground">
          made by belicongroup
        </p>
        <p className="text-xs text-muted-foreground mt-1">MLETRAS © 2025</p>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />

      {/* Clear All Data Confirmation Dialog */}
      <AlertDialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Clear All Data?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to clear all your data? This action cannot be undone.
              </p>
              <p className="font-medium">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {isAuthenticated && (
                  <>
                    <li>All folders and bookmarks from your account</li>
                    <li>All notes from your account</li>
                  </>
                )}
                <li>All search history</li>
                <li>All saved preferences and settings</li>
                <li>All locally stored data</li>
              </ul>
              {isAuthenticated && (
                <p className="text-muted-foreground text-sm mt-2">
                  Your account will remain active, but all your data will be removed.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingData}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              disabled={isClearingData}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearingData ? 'Clearing...' : 'Clear All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <p className="font-medium">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Your account and profile information</li>
                <li>All folders and bookmarks</li>
                <li>All notes</li>
                <li>Your subscription data</li>
              </ul>
              <p className="text-destructive font-medium mt-2">
                You will be logged out immediately after deletion.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAccount}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SettingsPage;
