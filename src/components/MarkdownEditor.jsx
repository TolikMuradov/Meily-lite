// src/components/MarkdownEditor.jsx
import { useEffect, useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap, highlightActiveLine, EditorView } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, foldGutter } from '@codemirror/language';
import '../css/MarkdownEditor.css';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import Preview from './Preview';

const SLASH_COMMANDS = [
  { label: 'break', snippet: '<br />\n' }, // HTML break + newline
  { label: 'Todo', snippet: '- [ ] ' },
  { label: 'Table', snippet: '| Başlık | Başlık |\n|---|---|\n| Hücre | Hücre |' },
  { label: 'Mermaid', snippet: '```mermaid\ngraph TD;\nA-->B;\n```' },
  { label: 'H1', snippet: '# ' },
  { label: 'img', snippet: '![alt](url)' },
  
];


// basit, bağımlılıksız debounce
function debounce(fn, delay = 1000) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export default function MarkdownEditor({ content, setContent, editorRef, onAutosave }) {
  const [themeVars, setThemeVars] = useState({});
  const containerRef = useRef(null);
  const [showSlash, setShowSlash] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [showPreview, setShowPreview] = useState(true); // Preview görünümünü kontrol eden state
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
    // Handle OS drag & drop directly via CodeMirror
    EditorView.domEventHandlers({
      dragover: (e, view) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        return true;
      },
      drop: (e, view) => {
        const files = Array.from(e.dataTransfer?.files || []);
        if (!files.length) return false;
        const file = files.find(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name));
        if (!file) return false;
        e.preventDefault();
        e.stopPropagation();
        const doInsert = async () => {
          try {
            if (!window.api?.copyImage && !window.api?.copyImageBuffer) {
              console.warn('copyImage/copyImageBuffer API unavailable; check Electron preload.');
              return;
            }
            let imagePath = null;
            if (file.path && window.api.copyImage) {
              imagePath = await window.api.copyImage(file.path);
            }
            if (!imagePath && window.api.copyImageBuffer) {
              const buf = await file.arrayBuffer();
              imagePath = await window.api.copyImageBuffer(file.name, buf);
            }
            if (!imagePath) return;
            const alt = file.name.replace(/\.[^.]+$/, '');
            const safePath = encodeURI(imagePath.replace(/^\//, ''));
            const md = `\n\n![${alt}](${safePath})\n\n`;
            const { state, dispatch } = view;
            const pos = state.selection.main.head;
            dispatch({ changes: { from: pos, to: pos, insert: md }, selection: { anchor: pos + md.length } });
            view.focus();
          } catch (err) {
            console.error('Image drop failed:', err);
          }
        };
        doInsert();
        return true;
      },
    }),
    keymap.of([...defaultKeymap, ...historyKeymap])
  ];

  const bindScrollSync = (view) => {
    const scroller = view.scrollDOM; // CodeMirror ana scroller
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      if (!scrollHeight || !clientHeight || scrollHeight === clientHeight) return;

      const ratio = scrollTop / (scrollHeight - clientHeight);
      if (isNaN(ratio)) return;

      window.dispatchEvent(new CustomEvent('editor-scroll', { detail: ratio }));

      const lineNumbers = document.querySelector('.line-numbers');
      if (lineNumbers) lineNumbers.scrollTop = scrollTop;
    };

    scroller.addEventListener('scroll', handleScroll);
    return () => scroller.removeEventListener('scroll', handleScroll);
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

      if (filteredCommands.length === 0) {
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
      if (onAutosave) onAutosave(value);
    }, 1000)
  ).current;

  useEffect(() => {
    return () => debouncedAutosave.cancel();
  }, [debouncedAutosave]);

  // Fallback: capture drop on wrapper as well (covers line numbers, padding, etc.)
  const handleContainerDragOver = (e) => {
    if (Array.from(e.dataTransfer?.files || []).length) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleContainerDrop = async (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    if (!files.length) return;
    const file = files.find(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name));
    if (!file) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      console.log('Drop detected on wrapper:', { name: file.name, path: file.path });
      if (!window.api?.copyImage && !window.api?.copyImageBuffer) {
        console.warn('copyImage/copyImageBuffer API unavailable at drop time');
        return;
      }
      let imagePath = null;
      if (file.path && window.api.copyImage) {
        imagePath = await window.api.copyImage(file.path);
      }
      if (!imagePath && window.api.copyImageBuffer) {
        const buf = await file.arrayBuffer();
        imagePath = await window.api.copyImageBuffer(file.name, buf);
      }
      if (!imagePath) {
        console.warn('copyImage returned null/empty');
        return;
      }
      const view = editorRef.current;
      if (!view) return;
      const alt = file.name.replace(/\.[^.]+$/, '');
      const safePath = encodeURI(String(imagePath).replace(/^\//, ''));
      const md = `\n\n![${alt}](${safePath})\n\n`;
      const { state, dispatch } = view;
      const pos = state.selection.main.head;
      dispatch({ changes: { from: pos, to: pos, insert: md }, selection: { anchor: pos + md.length } });
      view.focus();
    } catch (err) {
      console.error('Image drop (wrapper) failed:', err);
    }
  };

  // Global capture listeners: ensure we see drops even if a child stops bubbling
  useEffect(() => {
    const onDragOver = (e) => {
      const hasFiles = Array.from(e.dataTransfer?.items || []).some(i => i.kind === 'file');
      if (!hasFiles) return;
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e) => {
      const container = containerRef.current;
      if (!container) return;
      if (!container.contains(e.target)) return;
      handleContainerDrop(e);
    };
    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('drop', onDrop, true);
    };
  }, []);

  // ...existing code...

  return (
  <div ref={containerRef} className="markdown-editor" style={{ ...themeVars }} onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
      {/* CodeMirror editörünü koşullu olarak göster */}
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
          onCreateEditor={(view) => {
            editorRef.current = view;
            // Bind scroll sync
            const detachScroll = bindScrollSync(view);
            return () => {
              detachScroll?.();
            };
          }}
          onChange={(value) => {
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

      {/* Sağ alt köşede Preview Aç/Kapat butonu */}
      {/* <button className="preview-toggle-button" onClick={togglePreview}>
        {showPreview ? <FiEyeOff /> : <FiEye />}
      </button> */}

      {/* Preview bileşenini kaldırdım */}
    </div>
  );
}
