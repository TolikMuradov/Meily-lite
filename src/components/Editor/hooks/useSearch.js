import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorView, Decoration } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';

// Effect & field for external highlight decoration updates
export const setSearchHighlightsEffect = StateEffect.define();
export const searchHighlightField = StateField.define({
  create() { return Decoration.none; },
  update(value, tr) {
    for (let e of tr.effects) if (e.is(setSearchHighlightsEffect)) return e.value;
    if (tr.docChanged) return Decoration.none;
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});

function buildHighlights(matches, activeIndex) {
  if (!matches.length) return Decoration.none;
  const decos = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const cls = i === activeIndex ? 'cm-search-match-active' : 'cm-search-match';
    decos.push(Decoration.mark({ class: cls }).range(m.from, m.to));
  }
  return Decoration.set(decos, true);
}

export function useSearch({ content, editorRef }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [matches, setMatches] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scanTokenRef = useRef(0); // cancellation token
  const debounceRef = useRef();

  // Focus management for overlay keyboard nav
  const focusIndexRef = useRef(0);
  const focusSearchElement = useCallback((idx) => {
    const container = document.querySelector('.editor-search-overlay');
    if (!container) return;
    const focusables = container.querySelectorAll('input,button');
    if (!focusables.length) return;
    const i = ((idx % focusables.length) + focusables.length) % focusables.length;
    focusIndexRef.current = i;
    focusables[i].focus();
  }, []);

  // Debounced + incremental scan for large documents
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const token = ++scanTokenRef.current;
      if (!query) {
        setMatches([]); setActiveIndex(0);
        if (editorRef.current) editorRef.current.dispatch({ effects: setSearchHighlightsEffect.of(Decoration.none) });
        return;
      }
      const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safe, 'gi');
      const maxMatches = 5000;
      const text = content;
      const size = text.length;
      const chunkSize = size > 50000 ? 20000 : size; // chunk if big
      const found = [];
      let index = 0;
      function scanChunk() {
        if (token !== scanTokenRef.current) return; // cancelled
        const start = index; const end = Math.min(size, start + chunkSize);
        const slice = text.slice(start, end);
        regex.lastIndex = 0; let m;
        while ((m = regex.exec(slice)) !== null) {
          const from = start + m.index;
            found.push({ from, to: from + m[0].length });
          if (found.length >= maxMatches) break;
        }
        if (found.length >= maxMatches || end >= size) {
          if (token === scanTokenRef.current) {
            setMatches(found); setActiveIndex(0);
          }
          return;
        }
        index = end - safe.length + 1; // overlap region for boundary matches
        if (index < end) index = end; // safety
        requestAnimationFrame(scanChunk);
      }
      scanChunk();
    }, 120); // 120ms debounce
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, content, editorRef]);

  // Jump to active match
  const jumpTo = useCallback((index) => {
    if (!editorRef.current) return;
    const match = matches[index];
    if (!match) return;
    const view = editorRef.current;
    view.dispatch({ selection: { anchor: match.from, head: match.to }, scrollIntoView: true });
    view.focus();
  }, [matches, editorRef]);

  useEffect(() => { jumpTo(activeIndex); }, [activeIndex, jumpTo]);

  // Update highlights decoration
  useEffect(() => {
    if (!editorRef.current) return;
    const view = editorRef.current;
    const deco = buildHighlights(matches, activeIndex);
    view.dispatch({ effects: setSearchHighlightsEffect.of(deco) });
  }, [matches, activeIndex, editorRef]);

  // Replace one
  const replaceOne = useCallback(() => {
    if (!editorRef.current) return;
    const match = matches[activeIndex];
    if (!match) return;
    const view = editorRef.current;
    view.dispatch({ changes: { from: match.from, to: match.to, insert: replaceValue } });
  }, [matches, activeIndex, replaceValue, editorRef]);

  // Replace all
  const replaceAll = useCallback(() => {
    if (!editorRef.current || !matches.length) return;
    const view = editorRef.current;
    const parts = [];
    let last = 0;
    matches.forEach(m => {
      parts.push(view.state.doc.sliceString(last, m.from));
      parts.push(replaceValue);
      last = m.to;
    });
    parts.push(view.state.doc.sliceString(last));
    const full = parts.join('');
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: full } });
  }, [matches, replaceValue, editorRef]);

  // Close cleanup
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setReplaceValue('');
    setMatches([]);
    setActiveIndex(0);
    if (editorRef.current) {
      editorRef.current.dispatch({ effects: setSearchHighlightsEffect.of(Decoration.none) });
    }
  }, [editorRef]);

  // Keyboard (arrows & escape) handler when open
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
        const container = document.querySelector('.editor-search-overlay');
        if (!container) return;
        const active = document.activeElement;
        if (!container.contains(active)) return;
        const focusables = container.querySelectorAll('input,button');
        if (!focusables.length) return;
        let dir = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') dir = 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') dir = -1;
        if (dir !== 0) {
          e.preventDefault();
          focusSearchElement(focusIndexRef.current + dir);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close, focusSearchElement]);

  const toggle = useCallback(() => {
    setOpen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          const el = document.querySelector('.editor-search-overlay input[name="query"]');
          el?.focus();
          focusIndexRef.current = 0;
        }, 0);
      }
      return next;
    });
  }, []);

  return {
    open,
    toggle,
    close,
    query,
    setQuery,
    replaceValue,
    setReplaceValue,
    matches,
    activeIndex,
    setActiveIndex,
    replaceOne,
    replaceAll,
    jumpTo,
  };
}
