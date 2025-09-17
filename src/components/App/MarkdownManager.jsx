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

  return { handleInsertMarkdown, insertMarkdownAtCursor };
}