import React, { createContext, useContext, useEffect, useState } from "react";
import { useProStatus } from "@/hooks/useProStatus";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { isPro } = useProStatus();
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("mletras-theme");
    return (savedTheme as Theme) || "light"; // Default to light mode
  });

  // useProStatus hook will automatically update when subscription changes

  // Force light mode for non-Pro users
  useEffect(() => {
    if (!isPro && theme === 'dark') {
      setTheme('light');
    }
  }, [isPro, theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);

    localStorage.setItem("mletras-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    // Prevent non-Pro users from switching to dark mode
    if (!isPro) {
      return; // Do nothing for non-Pro users
    }
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const value = {
    theme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
