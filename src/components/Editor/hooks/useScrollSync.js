import { useEffect } from 'react';

// Syncs CodeMirror scroll with external listeners and optional line number gutter
// Emits window CustomEvent('editor-scroll', { detail: ratio })
export function useScrollSync(editorRef) {
  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const scroller = view.scrollDOM;
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const { scrollTop, scrollHeight, clientHeight } = scroller;
        if (!scrollHeight || !clientHeight || scrollHeight === clientHeight) return;
        const ratio = scrollTop / (scrollHeight - clientHeight);
        if (!isNaN(ratio)) {
          window.dispatchEvent(new CustomEvent('editor-scroll', { detail: ratio }));
        }
        const lineNumbers = document.querySelector('.line-numbers');
        if (lineNumbers) lineNumbers.scrollTop = scrollTop;
      });
    };
    scroller.addEventListener('scroll', handleScroll);
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, [editorRef]);
}
