import { useState } from "react";
import { Settings, Moon, Bell, Trash2, Info, Shield, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    autoScroll: true,
    darkMode: true,
    notifications: false,
    boldText: false,
  });

  const updateSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-4">
        <div className="inline-flex p-3 bg-gradient-primary rounded-2xl shadow-glow mb-4">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-mobile-hero mb-2">
          <span className="bg-gradient-primary bg-clip-text text-transparent">Settings</span>
        </h2>
        <p className="text-muted-foreground">
          Customize your MLETRA experience
        </p>
      </div>

      {/* App Preferences */}
      <Card className="glass border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Display & Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-scroll Lyrics</p>
              <p className="text-sm text-muted-foreground">
                Automatically scroll through lyrics
              </p>
            </div>
            <Switch
              checked={settings.autoScroll}
              onCheckedChange={() => updateSetting('autoScroll')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Bold Text</p>
              <p className="text-sm text-muted-foreground">
                Display lyrics in bold for better readability
              </p>
            </div>
            <Switch
              checked={settings.boldText}
              onCheckedChange={() => updateSetting('boldText')}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-muted-foreground">
                Use dark theme (recommended)
              </p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={() => updateSetting('darkMode')}
            />
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
              onCheckedChange={() => updateSetting('notifications')}
            />
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
              >
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
        <p className="text-xs text-muted-foreground mt-1">
          MLETRA © 2024
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;