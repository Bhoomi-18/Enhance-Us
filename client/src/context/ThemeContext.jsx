import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'enhanceus_theme';
const VALID_THEMES = ['light', 'dark', 'system'];

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID_THEMES.includes(stored)) {
        return stored;
      }
    } catch (e) {
      // Fallback if localStorage is inaccessible
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark') return 'dark';
      if (stored === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  });

  // Apply theme to DOM and determine resolved theme
  const applyTheme = useCallback((activeTheme) => {
    const root = document.documentElement;
    let isDark = false;

    if (activeTheme === 'dark') {
      isDark = true;
    } else if (activeTheme === 'light') {
      isDark = false;
    } else {
      // System mode
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (isDark) {
      root.classList.add('dark');
      setResolvedTheme('dark');
    } else {
      root.classList.remove('dark');
      setResolvedTheme('light');
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    if (!VALID_THEMES.includes(newTheme)) return;
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('[ThemeContext] Failed to save theme preference:', e.message);
    }
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Synchronize on mount and listen to system preference changes
  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      // Only react to OS changes if user preference is set to 'system'
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored || stored === 'system') {
          if (e.matches) {
            document.documentElement.classList.add('dark');
            setResolvedTheme('dark');
          } else {
            document.documentElement.classList.remove('dark');
            setResolvedTheme('light');
          }
        }
      } catch (err) {
        // Safe fallback
      }
    };

    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else if (mediaQuery?.addListener) {
      // Legacy Safari support
      mediaQuery.addListener(handleSystemChange);
      return () => mediaQuery.removeListener(handleSystemChange);
    }
  }, [theme, applyTheme]);

  const toggleTheme = useCallback(() => {
    // Quick toggle between light and dark
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  const value = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
