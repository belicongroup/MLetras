import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

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
  const { user, isAuthenticated } = useAuth();
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("mletras-theme");
    return (savedTheme as Theme) || "light"; // Default to light mode
  });

  // Force light mode for non-authenticated users and free users
  useEffect(() => {
    if ((!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')) && theme === 'dark') {
      setTheme('light');
    }
  }, [isAuthenticated, user?.subscription_type, theme]);

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(theme);

    localStorage.setItem("mletras-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    // Prevent non-authenticated users and free users from switching to dark mode
    if (!isAuthenticated || (isAuthenticated && user?.subscription_type === 'free')) {
      return; // Do nothing for non-authenticated or free users
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
