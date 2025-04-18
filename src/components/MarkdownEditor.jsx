import { useEffect, useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, foldGutter } from '@codemirror/language';
import '../css/MarkdownEditor.css';

const SLASH_COMMANDS = [
  { label: 'Todo', snippet: '- [ ] ' },
  { label: 'Table', snippet: '| Başlık | Başlık |\n|---|---|\n| Hücre | Hücre |' },
  { label: 'Mermaid', snippet: '```mermaid\ngraph TD;\nA-->B;\n```' },
  { label: 'H1', snippet: '#' },
  { label: 'img', snippet: '![alt](url)' },
];

export default function MarkdownEditor({ content, setContent, editorRef }) {
  const [themeVars, setThemeVars] = useState({});
  const [showSlash, setShowSlash] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');
  const slashPos = useRef(null);

  const filteredCommands = SLASH_COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const insertSnippet = (snippet) => {
    const view = editorRef.current;
    if (!view) return;
    const { state, dispatch } = view;
    const from = slashPos.current;
    const to = state.selection.main.head;

    if (from !== null) {
      dispatch({
        changes: { from, to, insert: snippet },
        selection: { anchor: from + snippet.length },
        scrollIntoView: true
      });
      view.focus();
      slashPos.current = null;
      setQuery('');
      setShowSlash(false);
    }
  };

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;

    const handleKeyDown = (e) => {
      if (!showSlash) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();

        const cmd = filteredCommands[selectedIndex];
        if (cmd) insertSnippet(cmd.snippet);

      } else if (e.key === 'Escape') {
        setShowSlash(false);
      }
    };

    const dom = view.dom;
    dom.addEventListener('keydown', handleKeyDown);
    return () => dom.removeEventListener('keydown', handleKeyDown);
  }, [showSlash, selectedIndex, filteredCommands]);

  const editorExtensions = [
    markdown(),
    lineNumbers(),
    foldGutter(),
    highlightActiveLine(),
    indentOnInput(),
    history(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
    ])
  ];

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    setThemeVars({
      backgroundColor: root.getPropertyValue('--bg-panel')?.trim(),
      color: root.getPropertyValue('--text')?.trim(),
    });
  }, [document.documentElement.getAttribute('data-theme')]);

  return (
    <div className="markdown-editor" style={{ ...themeVars }}>
      <CodeMirror
        value={content}
        height="100%"
        extensions={editorExtensions}
        theme="none"
        onCreateEditor={(view) => {
          if (editorRef) editorRef.current = view;
        }}
        onChange={(value, viewUpdate) => {
          setContent(value);
          const view = editorRef.current;
          if (!view) return;

          const cursorPos = view.state.selection.main.head;
          const textBefore = view.state.sliceDoc(Math.max(0, cursorPos - 30), cursorPos);
          const match = /\/(\w*)$/.exec(textBefore);

          if (match) {
            slashPos.current = cursorPos - match[0].length;
            setQuery(match[1]);
            setShowSlash(true);
            setSelectedIndex(0);
          } else {
            setShowSlash(false);
          }
        }}
        style={{
          backgroundColor: 'transparent',
          color: 'inherit',
        }}
      />

      {showSlash && (
        <div className="slash-command-popup">
          {filteredCommands.map((cmd, i) => (
            <div
              key={cmd.label}
              className={`slash-command-item ${i === selectedIndex ? 'selected' : ''}`}
              onMouseDown={() => insertSnippet(cmd.snippet)}
            >
              {cmd.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
