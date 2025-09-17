import { useEffect, useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, foldGutter } from '@codemirror/language';
import debounce from 'lodash.debounce';
import '../css/MarkdownEditor.css';

const SLASH_COMMANDS = [
  { label: 'Todo', snippet: '- [ ] ' },
  { label: 'Table', snippet: '| Başlık | Başlık |\n|---|---|\n| Hücre | Hücre |' },
  { label: 'Mermaid', snippet: '```mermaid\ngraph TD;\nA-->B;\n```' },
  { label: 'H1', snippet: '# ' },
  { label: 'img', snippet: '![alt](url)' },
];

export default function MarkdownEditor({ content, setContent, editorRef, onAutosave }) {
  const [themeVars, setThemeVars] = useState({});
  const [showSlash, setShowSlash] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');
  const slashPos = useRef(null);
  const [lineCount, setLineCount] = useState(1);

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

  const editorExtensions = [
    markdown(),
    foldGutter(),
    highlightActiveLine(),
    indentOnInput(),
    history(),
    keymap.of([...defaultKeymap, ...historyKeymap])
  ];

  const bindScrollSync = (view) => {
    const sources = [view.scrollDOM, view.dom.querySelector('.cm-scroller')];
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = sources[0];
      if (!scrollHeight || !clientHeight || scrollHeight === clientHeight) return;

      const ratio = scrollTop / (scrollHeight - clientHeight);
      if (isNaN(ratio)) return;

      window.dispatchEvent(new CustomEvent("editor-scroll", { detail: ratio }));

      const lineNumbers = document.querySelector('.line-numbers');
      if (lineNumbers) {
        lineNumbers.scrollTop = scrollTop;
      }
    };

    sources.forEach((scroller) => {
      if (!scroller) return;
      scroller.addEventListener("scroll", handleScroll);
    });

    return () => {
      sources.forEach((scroller) => {
        if (!scroller) return;
        scroller.removeEventListener("scroll", handleScroll);
      });
    };
  };

  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    setThemeVars({
      backgroundColor: root.getPropertyValue('transparent')?.trim(),
      color: root.getPropertyValue('--text')?.trim(),
    });
  }, [document.documentElement.getAttribute('data-theme')]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;

    const handleKeyDown = (e) => {
      if (!showSlash) return;

      if (filteredCommands.length === 0) { // Close popup if no commands are available
        setShowSlash(false);
        return;
      }

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
  }, [showSlash, selectedIndex, filteredCommands.length]);

  const debouncedAutosave = useRef(
    debounce((value) => {
      if (onAutosave) {
        onAutosave(value);
      }
    }, 1000)
  ).current;

  useEffect(() => {
    return () => {
      debouncedAutosave.cancel();
    };
  }, [debouncedAutosave]);

  return (
    <div className="markdown-editor" style={{ ...themeVars }}>
      <div className="custom-editor-wrapper">
        <div className="line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="line-number">{i + 1}</div>
          ))}
        </div>
        <CodeMirror
          value={content}
          height="100%"
          extensions={editorExtensions}
          theme="dark"
          lineNumbers={false}
          onCreateEditor={(view) => {
            editorRef.current = view;
            const cleanup = bindScrollSync(view);
            return cleanup;
          }}
          onChange={(value, viewUpdate) => {
            setContent(value);
            debouncedAutosave(value);
            const view = editorRef.current;
            if (!view) return;
            setLineCount(view.state.doc.lines);

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
          }}
          style={{
            backgroundColor: 'transparent',
            color: 'inherit',
            border: 'none',
            outline: 'none',
            width: '100%',
          }}
        />
      </div>

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