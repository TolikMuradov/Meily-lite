import { useState, useEffect, useCallback } from 'react';

export function useOutline(content) {
  const [outline, setOutline] = useState([]);
  const [showOutline, setShowOutline] = useState(false);

  useEffect(() => {
    const lines = content.split(/\n/);
    const heads = [];
    lines.forEach((ln, i) => {
      const m = /^(#{1,6})\s+(.*)/.exec(ln);
      if (m) heads.push({ level: m[1].length, text: m[2].trim(), line: i });
    });
    setOutline(heads);
  }, [content]);

  const toggleOutline = useCallback(() => setShowOutline(o => !o), []);

  return { outline, showOutline, toggleOutline, setShowOutline };
}
