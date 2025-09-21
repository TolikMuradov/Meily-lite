import { useEffect } from 'react';

export default function ThemeManager({ theme, setTheme }) {
  useEffect(() => {
    if (window.api && window.api.onThemeChange) {
      window.api.onThemeChange((nextTheme) => {
        setTheme(nextTheme);
        localStorage.setItem('selectedTheme', nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
      });
    }
  }, [setTheme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}