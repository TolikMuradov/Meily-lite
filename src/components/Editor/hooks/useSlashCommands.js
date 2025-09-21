import { useState, useRef, useCallback, useEffect } from 'react';

export function useSlashCommands(editorRef, commands, insertSnippetExternal) {
  const [showSlash, setShowSlash] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');
  const slashPos = useRef(null);

  const filteredCommands = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const insertSnippet = useCallback((snippet) => {
    const view = editorRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const from = slashPos.current;
    const to = state.selection.main.head;
    if (from != null) {
      dispatch({ changes: { from, to, insert: snippet }, selection: { anchor: from + snippet.length }, scrollIntoView: true });
      view.focus();
      slashPos.current = null;
      setQuery('');
      setShowSlash(false);
      insertSnippetExternal?.(snippet);
    }
  }, [editorRef, insertSnippetExternal]);

  const handleTextChanged = useCallback((value, view) => {
    const cursorPos = view.state.selection.main.head;
    const textBefore = view.state.sliceDoc(Math.max(0, cursorPos - 30), cursorPos);
    const match = /\/(\w*)?$/.exec(textBefore);
    if (match) {
      slashPos.current = cursorPos - match[0].length;
      setQuery(match[1] || '');
      setShowSlash(true);
      setSelectedIndex(0);
    } else {
      setShowSlash(false);
    }
  }, []);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    const handler = (e) => {
      if (!showSlash) return;
      if (filteredCommands.length === 0) { setShowSlash(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % filteredCommands.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const cmd = filteredCommands[selectedIndex]; if (cmd) insertSnippet(cmd.snippet); }
      else if (e.key === 'Escape') { setShowSlash(false); }
    };
    const dom = view.dom;
    dom.addEventListener('keydown', handler);
    return () => dom.removeEventListener('keydown', handler);
  }, [editorRef, showSlash, filteredCommands, selectedIndex, insertSnippet]);

  return { showSlash, selectedIndex, setSelectedIndex, query, filteredCommands, insertSnippet, handleTextChanged };
}
