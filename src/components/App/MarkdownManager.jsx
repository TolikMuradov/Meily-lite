export default function MarkdownManager({
  setContent,
  editorRef
}) {
  const handleInsertMarkdown = (syntax) => setContent((prev) => prev + syntax);

  const insertMarkdownAtCursor = (snippetStart, snippetEnd = '') => {
    const view = editorRef.current;
    if (!view) return;

    const { state, dispatch } = view;
    const selection = state.selection.main;
    const selectedText = state.sliceDoc(selection.from, selection.to);

    const newText = `${snippetStart}${selectedText}${snippetEnd}`;
    dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: newText
      },
      selection: {
        anchor: selection.from + snippetStart.length,
        head: selection.from + snippetStart.length + selectedText.length
      }
    });
  };
  const applyStrikethrough = () => {
    const view = editorRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const sel = state.selection.main;
    let from = sel.from;
    let to = sel.to;

    // If no selection, expand to word under cursor
    if (from === to) {
      const line = state.doc.lineAt(from);
      const lineText = line.text;
      const cursorInLine = from - line.from;
      // Word characters: letters, numbers, underscore, dash
      const isWordChar = (ch) => /[\w-]/.test(ch);
      let start = cursorInLine;
      let end = cursorInLine;
      while (start > 0 && isWordChar(lineText[start - 1])) start--;
      while (end < lineText.length && isWordChar(lineText[end])) end++;
      from = line.from + start;
      to = line.from + end;
    }

    const targetText = state.sliceDoc(from, to);
    const has = /^~~[\s\S]*~~$/.test(targetText);
    let insert;
    let newFrom = from;
    let newTo;
    if (has) {
      // Remove surrounding ~~
      insert = targetText.replace(/^~~/, '').replace(/~~$/, '');
      newTo = newFrom + insert.length;
    } else {
      insert = `~~${targetText || 'text'}~~`;
      // If we inserted placeholder 'text' adjust selection inside
      if (!targetText) {
        newFrom = from + 2;
        newTo = newFrom + 4; // 'text'
      } else {
        newTo = from + insert.length;
      }
    }

    dispatch({
      changes: { from, to, insert },
      selection: { anchor: newFrom, head: newTo }
    });
    view.focus();
  };

  function toggleWrapper(wrapper, placeholder = 'text') {
    const view = editorRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const sel = state.selection.main;
    let from = sel.from;
    let to = sel.to;
    if (from === to) {
      const line = state.doc.lineAt(from);
      const lineText = line.text;
      const cursorInLine = from - line.from;
      const isWordChar = (ch) => /[\w-]/.test(ch);
      let start = cursorInLine;
      let end = cursorInLine;
      while (start > 0 && isWordChar(lineText[start - 1])) start--;
      while (end < lineText.length && isWordChar(lineText[end])) end++;
      from = line.from + start;
      to = line.from + end;
    }
    const target = state.sliceDoc(from, to);
    const wrapped = wrapper + target + wrapper;
    const already = target.startsWith(wrapper) && target.endsWith(wrapper) && target.length >= wrapper.length * 2;
    let insert, selFrom = from, selTo;
    if (already) {
      insert = target.slice(wrapper.length, target.length - wrapper.length);
      selTo = selFrom + insert.length;
    } else {
      if (!target) {
        insert = wrapper + placeholder + wrapper;
        selFrom = from + wrapper.length;
        selTo = selFrom + placeholder.length;
      } else {
        insert = wrapped;
        selTo = from + insert.length;
      }
    }
    dispatch({ changes: { from, to, insert }, selection: { anchor: selFrom, head: selTo } });
    view.focus();
  }

  const applyBold = () => toggleWrapper('**');
  const applyItalic = () => toggleWrapper('_');

  const applyHeading = (level) => {
    const view = editorRef.current; if (!view) return; if (level < 1 || level > 6) return;
    const { state, dispatch } = view; const sel = state.selection.main; const line = state.doc.lineAt(sel.from);
    const prefix = '#'.repeat(level) + ' ';
    const text = line.text.replace(/^\s+/, '');
    const stripped = text.replace(/^#{1,6}\s+/, '');
    const insert = prefix + stripped;
    dispatch({ changes: { from: line.from, to: line.to, insert } });
    view.focus();
  };

  const toggleListPrefix = (marker, numbered = false) => {
    const view = editorRef.current; if (!view) return; const { state, dispatch } = view; const sel = state.selection.main; const line = state.doc.lineAt(sel.from);
    const text = line.text;
    const listRegex = numbered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
    if (listRegex.test(text)) {
      const newText = text.replace(listRegex, '');
      dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    } else {
      const insert = (numbered ? '1. ' : marker + ' ') + text.replace(/^\s+/, '');
      dispatch({ changes: { from: line.from, to: line.to, insert } });
    }
    view.focus();
  };
  const toggleBulletList = () => toggleListPrefix('-');
  const toggleOrderedList = () => toggleListPrefix('1.', true);

  const toggleBlockquote = () => {
    const view = editorRef.current; if (!view) return; const { state, dispatch } = view; const sel = state.selection.main; const line = state.doc.lineAt(sel.from);
    const text = line.text;
    if (/^\s*>\s?/.test(text)) {
      const newText = text.replace(/^\s*>\s?/, '');
      dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    } else {
      const newText = '> ' + text.replace(/^\s+/, '');
      dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    }
    view.focus();
  };

  const toggleInlineCode = () => toggleWrapper('`');

  const toggleTaskItem = () => {
    const view = editorRef.current; if (!view) return; const { state, dispatch } = view; const sel = state.selection.main; const line = state.doc.lineAt(sel.from);
    const text = line.text;
    if (/^\s*[-*+]\s*\[ \]\s+/.test(text)) {
      const newText = text.replace(/^\s*([-*+])\s*\[ \]/, '$1 [x]');
      dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    } else if (/^\s*[-*+]\s*\[x\]\s+/.test(text)) {
      const newText = text.replace(/^\s*([-*+])\s*\[x\]/i, '$1 [ ]');
      dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    } else {
      const newText = '- [ ] ' + text.replace(/^\s+/, '');
      dispatch({ changes: { from: line.from, to: line.to, insert: newText } });
    }
    view.focus();
  };

  const createNewNote = (cb) => { if (cb) cb(); };

  return { handleInsertMarkdown, insertMarkdownAtCursor, applyStrikethrough, applyBold, applyItalic,
    applyHeading, toggleBulletList, toggleOrderedList, toggleBlockquote, toggleInlineCode, toggleTaskItem, createNewNote };
}