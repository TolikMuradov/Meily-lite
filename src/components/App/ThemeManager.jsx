import { useEffect } from 'react';

export default function ThemeManager({ theme, setTheme }) {
  useEffect(() => {
    if (window.api && window.api.onThemeChange) {
      window.api.onThemeChange((theme) => {
        setTheme(theme);
        localStorage.setItem('selectedTheme', theme);
        document.documentElement.setAttribute('data-theme', theme);
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return null;
}