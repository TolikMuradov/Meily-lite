// hooks/useGlobalShortcutsGuard.js
import { useEffect } from 'react';

export default function useGlobalShortcutsGuard(isModalOpen) {
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const typing =
        t?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(t?.tagName);
      if (typing || isModalOpen) {
        // Yazı alanında veya modal açıkken global kısayollar devre dışı
        return;
      }
      // Ör: Ctrl/Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        // saveNote(); // varsa senin fonksiyonun
      }
    };
    window.addEventListener('keydown', onKey, true); // capture
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isModalOpen]);
}
