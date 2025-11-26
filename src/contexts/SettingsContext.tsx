import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

interface Settings {
  autoScrollSpeed: "off" | "slow" | "medium" | "fast";
  boldText: boolean;
  language: "en" | "es";
}

interface SettingsContextType {
  settings: Settings;
  updateSetting: (key: keyof Settings) => void;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

const defaultSettings: Settings = {
  autoScrollSpeed: "off",
  boldText: false,
  language: "en",
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [settings, setSettings] = useState<Settings>(() => {
    // Load settings from localStorage on initialization
    const savedSettings = localStorage.getItem("mletras-settings");
    if (savedSettings) {
      try {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error("Error parsing saved settings:", error);
        }
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Force auto-scroll to 'off' for non-authenticated users and free users
  useEffect(() => {
    if (!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')) {
      if (settings.autoScrollSpeed !== 'off') {
        setSettings((prev) => ({
          ...prev,
          autoScrollSpeed: 'off',
        }));
      }
    }
  }, [isAuthenticated, user?.subscription_type, settings.autoScrollSpeed]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("mletras-settings", JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key: keyof Settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
