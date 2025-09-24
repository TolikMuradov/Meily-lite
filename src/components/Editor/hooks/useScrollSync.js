import { useEffect } from 'react';

// Syncs CodeMirror scroll with external listeners and optional line number gutter
// Emits window CustomEvent('editor-scroll', { detail: ratio })
export function useScrollSync(editorRef) {
  useEffect(() => {
    let scroller = null;
    let cancelled = false;
    let ticking = false;
    // Detect programmatic scrolls set by preview -> editor sync using a temp attribute flag
    const isProgrammatic = () => scroller && scroller.getAttribute('data-syncing') === '1';

    const attach = () => {
      if (cancelled) return;
      const view = editorRef.current;
      if (!view) {
        // Editor henüz oluşturulmamış; kısa bir gecikmeyle tekrar dene.
        setTimeout(attach, 60);
        return;
      }
      scroller = view.scrollDOM;
      if (!scroller) {
        setTimeout(attach, 60);
        return;
      }
      scroller.addEventListener('scroll', handleScroll, { passive: true });
    };

    const handleScroll = () => {
      if (isProgrammatic()) return; // skip programmatic sync writes
      if (ticking || !scroller) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (!scroller) return;
        const { scrollTop, scrollHeight, clientHeight } = scroller;
        if (!scrollHeight || !clientHeight || scrollHeight === clientHeight) return;
        const rawRatio = scrollTop / (scrollHeight - clientHeight);
        let ratio = rawRatio;
        // Basit smoothing: ani küçük dalgalanmaları azalt (autosave render sonrası ufak layout kaymaları)
        // 5px altındaki değişimleri yok say
        const prev = scroller._lastRatioScrollTop || 0;
        if (Math.abs(scrollTop - prev) < 5) {
          return; // ihmal et – preview'e tekrar event gitmesin
        }
        scroller._lastRatioScrollTop = scrollTop;
        if (!isNaN(ratio)) {
          window.dispatchEvent(new CustomEvent('editor-scroll', { detail: ratio }));
        }
        const lineNumbers = document.querySelector('.line-numbers');
        if (lineNumbers) lineNumbers.scrollTop = scrollTop;
      });
    };

    attach();
    return () => {
      cancelled = true;
      if (scroller) scroller.removeEventListener('scroll', handleScroll);
    };
  }, [editorRef]);
}
