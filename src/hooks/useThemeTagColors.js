import { useEffect, useState } from 'react';

// Tema kök değişkenlerinden tag paleti çıkarır
export default function useThemeTagColors() {
  const [colors, setColors] = useState([]);

  useEffect(() => {
    function extract() {
      const styles = getComputedStyle(document.documentElement);
      const keys = ['--orange','--teal','--violet','--yellow','--blue','--green','--pink'];
      const list = keys.map(k => styles.getPropertyValue(k).trim()).filter(Boolean);
      setColors(list);
    }
    extract();
    // Tema attribute değişimlerini gözle
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          extract();
          break;
        }
      }
    });
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);

  return colors;
}
