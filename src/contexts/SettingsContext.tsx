import React, { createContext, useContext, useState, useEffect } from "react";

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
  const [settings, setSettings] = useState<Settings>(() => {
    // Load settings from localStorage on initialization
    const savedSettings = localStorage.getItem("mletras-settings");
    if (savedSettings) {
      try {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
      } catch (error) {
        console.error("Error parsing saved settings:", error);
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

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
