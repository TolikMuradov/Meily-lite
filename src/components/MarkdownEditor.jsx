// src/components/MarkdownEditor.jsx
import { useEffect, useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap, highlightActiveLine, EditorView, Decoration } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
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
import { markdownTableEditor } from '../editor/markdownTableEditor';

const SLASH_COMMANDS = [
  { label: 'divider', snippet: '\n---\n' },
  { label: 'todo', snippet: '- [ ] ' },
  { label: 'todo checked', snippet: '- [x] ' },
  { label: 'table', snippet: '| Header | Header |\n|--------|--------|\n| Cell | Cell |' },
  { label: 'callout info', snippet: '> [!info] Info here' },
  { label: 'callout warning', snippet: '> [!warning] Warning details' },
  { label: 'callout danger', snippet: '> [!danger] Danger details' },
  { label: 'callout success', snippet: '> [!success] Success details' },
  { label: 'mermaid flow', snippet: '```mermaid\ngraph TD;\nA-->B;\n```' },
  { label: 'mermaid sequence', snippet: '```mermaid\nsequenceDiagram\nAlice->>Bob: Hi\n```' },
  { label: 'mermaid class', snippet: '```mermaid\nclassDiagram\nClass01 <|-- Class02\n```' },
  { label: 'code block', snippet: '```javascript\n// code\n```' },
  { label: 'math inline', snippet: '$E=mc^2$' },
  { label: 'math block', snippet: '$$\nE=mc^2\n$$' },
  { label: 'link', snippet: '[text](url)' },
  { label: 'image', snippet: '![alt](url)' },
  { label: 'break', snippet: '<br />\n' }
];

// --- Search highlight infrastructure (CodeMirror 6) ---
const setSearchHighlightsEffect = StateEffect.define();
const searchHighlightField = StateField.define({
  create() { return Decoration.none; },
  update(value, tr) {
    for (let e of tr.effects) if (e.is(setSearchHighlightsEffect)) return e.value;
    if (tr.docChanged) return Decoration.none; // reset on doc change until recomputed
    return value;
  },
  provide: f => EditorView.decorations.from(f)
});

function buildSearchHighlights(matches, activeIndex, doc) {
  if (!matches.length) return Decoration.none;
  const decos = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const cls = i === activeIndex ? 'cm-search-match-active' : 'cm-search-match';
    decos.push(Decoration.mark({ class: cls }).range(m.from, m.to));
  }
  return Decoration.set(decos, true);
}


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
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const toastTimeouts = useRef([]);
  const [toasts, setToasts] = useState([]);
  const [showPreview, setShowPreview] = useState(true); // Preview görünümünü kontrol eden state
  const slashPos = useRef(null);
  const [lineCount, setLineCount] = useState(1);
  const [outline, setOutline] = useState([]);
  const [showOutline, setShowOutline] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [activeMatch, setActiveMatch] = useState(0);
  const searchFocusIndex = useRef(0); // roving focus within search overlay

  const focusSearchElement = (idx) => {
    const container = document.querySelector('.editor-search-overlay');
    if (!container) return;
    const focusables = container.querySelectorAll('input,button');
    if (!focusables.length) return;
    const i = ((idx % focusables.length) + focusables.length) % focusables.length;
    searchFocusIndex.current = i;
    focusables[i].focus();
  };

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
    ...markdownTableEditor(),
    foldGutter(),
    highlightActiveLine(),
    indentOnInput(),
    history(),
    searchHighlightField,
    keymap.of([{
      key: 'Mod-f',
      preventDefault: true,
      run: () => {
        // Toggle our custom overlay instead of default
        setShowSearch(prev => {
          const next = !prev;
          if (!prev && !next) return next; // no-op safety
          if (!prev) {
            setTimeout(() => {
              const el = document.querySelector('.editor-search-overlay input[name="query"]');
              el?.focus();
            }, 0);
          }
          return next;
        });
        return true; // handled
      }
    }]),
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

  // Outline extraction whenever content changes (basic parse for headings)
  useEffect(() => {
    const lines = content.split(/\n/);
    const heads = [];
    lines.forEach((ln, i) => {
      const m = /^(#{1,6})\s+(.*)/.exec(ln);
      if (m) heads.push({ level: m[1].length, text: m[2].trim(), line: i });
    });
    setOutline(heads);
  }, [content]);

  // Keyboard shortcuts for outline & search
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'b') { // Ctrl+B toggle outline
        e.preventDefault();
        setShowOutline(o => !o);
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'f') { // Ctrl+F toggle search
        e.preventDefault();
        setShowSearch(prev => {
          const next = !prev;
            if (next) {
              setTimeout(() => {
                const el = document.querySelector('.editor-search-overlay input[name="query"]');
                el?.focus();
                searchFocusIndex.current = 0;
              }, 0);
            }
          return next;
        });
      }
      if (showSearch && e.key === 'Escape') {
        setShowSearch(false);
      }
      // Global arrow navigation only when search overlay focused and open
      if (showSearch && ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
        const container = document.querySelector('.editor-search-overlay');
        if (!container) return;
        const active = document.activeElement;
        if (!container.contains(active)) return; // only if focus inside overlay
        const focusables = container.querySelectorAll('input,button');
        if (!focusables.length) return;
        let dir = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') dir = 1; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') dir = -1;
        if (dir !== 0) {
          e.preventDefault();
          focusSearchElement(searchFocusIndex.current + dir);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSearch]);

  // Compute search matches
  useEffect(() => {
    if (!searchQuery) {
      setSearchMatches([]);
      setActiveMatch(0);
      return;
    }
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = [];
    let m;
    while ((m = regex.exec(content)) !== null) {
      matches.push({ from: m.index, to: m.index + m[0].length });
      if (matches.length > 5000) break; // safety cap
    }
    setSearchMatches(matches);
    setActiveMatch(0);
  }, [searchQuery, content]);

  const jumpToMatch = (index) => {
    if (!editorRef.current) return;
    const match = searchMatches[index];
    if (!match) return;
    const view = editorRef.current;
    view.dispatch({ selection: { anchor: match.from, head: match.to }, scrollIntoView: true });
    view.focus();
  };

  useEffect(() => {
    jumpToMatch(activeMatch);
  }, [activeMatch]);

  // Apply highlight decorations when matches or active index change
  useEffect(() => {
    if (!editorRef.current) return;
    const view = editorRef.current;
    const deco = buildSearchHighlights(searchMatches, activeMatch, view.state.doc);
    view.dispatch({ effects: setSearchHighlightsEffect.of(deco) });
  }, [searchMatches, activeMatch]);

  // When search overlay is closed, clear search-related state & highlights
  useEffect(() => {
    if (showSearch) return; // only act on close
    if (searchQuery || replaceValue || searchMatches.length) {
      setSearchQuery('');
      setReplaceValue('');
      setSearchMatches([]);
      setActiveMatch(0);
      if (editorRef.current) {
        editorRef.current.dispatch({ effects: setSearchHighlightsEffect.of(Decoration.none) });
      }
    }
  }, [showSearch]);

  const doReplaceOne = () => {
    if (!editorRef.current) return;
    const match = searchMatches[activeMatch];
    if (!match) return;
    const view = editorRef.current;
    view.dispatch({
      changes: { from: match.from, to: match.to, insert: replaceValue },
    });
  };

  const doReplaceAll = () => {
    if (!editorRef.current || !searchMatches.length) return;
    const view = editorRef.current;
    let offset = 0;
    const parts = [];
    let last = 0;
    searchMatches.forEach(m => {
      parts.push(view.state.doc.sliceString(last, m.from));
      parts.push(replaceValue);
      last = m.to;
    });
    parts.push(view.state.doc.sliceString(last));
    const full = parts.join('');
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: full } });
  };

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
    }, 800)
  ).current;

  const flushAutosave = () => {
    debouncedAutosave.cancel?.();
    if (onAutosave) onAutosave(editorRef.current ? editorRef.current.state.doc.toString() : content);
  };

  useEffect(() => {
    return () => debouncedAutosave.cancel();
  }, [debouncedAutosave]);

  useEffect(() => {
    const handleBlur = (e) => {
      if (!editorRef.current) return;
      if (!document.hasFocus()) return; // window blur
      // flush when focus leaves editor container
      if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
        flushAutosave();
      }
    };
    const node = containerRef.current;
    if (node) node.addEventListener('focusout', handleBlur);
    return () => node && node.removeEventListener('focusout', handleBlur);
  }, [containerRef.current]);

  const pushToast = (msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg }]);
    const timeout = setTimeout(() => {
      setToasts((t) => t.filter(x => x.id !== id));
    }, 2500);
    toastTimeouts.current.push(timeout);
  };
  useEffect(() => () => toastTimeouts.current.forEach(clearTimeout), []);

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
    const images = files.filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name));
    if (!images.length) return;
    e.preventDefault();
    e.stopPropagation();
    pushToast(`Importing ${images.length} image${images.length>1?'s':''}...`);
    for (const file of images) {
      try {
        if (!window.api?.copyImage && !window.api?.copyImageBuffer) {
          console.warn('copyImage/copyImageBuffer API unavailable at drop time');
          continue;
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
          continue;
        }
        const view = editorRef.current;
        if (!view) continue;
        const alt = file.name.replace(/\.[^.]+$/, '');
        const safePath = encodeURI(String(imagePath).replace(/^\//, ''));
        const md = `\n\n![${alt}](${safePath})\n\n`;
        const { state, dispatch } = view;
        const pos = state.selection.main.head;
        dispatch({ changes: { from: pos, to: pos, insert: md }, selection: { anchor: pos + md.length } });
      } catch (err) {
        console.error('Image drop (wrapper) failed:', err);
      }
    }
    const successCount = images.length; // we don't track failures individually now
    pushToast(`Inserted ${successCount} image${successCount>1?'s':''}`);
    editorRef.current?.focus();
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
  <div ref={containerRef} className="markdown-editor" style={{ ...themeVars, position: 'relative' }} onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
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
              // Compute popup position
              const sel = view.domAtPos(cursorPos);
              let rect = null;
              if (sel && sel.node) {
                const node = sel.node.nodeType === 3 ? sel.node.parentElement : sel.node;
                rect = node?.getBoundingClientRect();
              }
              if (rect) {
                setPopupPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
              } else {
                const editorRect = view.dom.getBoundingClientRect();
                setPopupPos({ top: editorRect.top + 40, left: editorRect.left + 16 });
              }
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
        <div
          className="slash-command-popup"
          style={{ position: 'absolute', left: 8, bottom: 8, zIndex: 50, top: 'auto' }}
        >
          {filteredCommands.length === 0 && (
            <div className="slash-command-item empty">No matches</div>
          )}
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

      {showOutline && outline.length > 0 && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 220, maxHeight: 400, overflow: 'auto', background: 'var(--bg-panel, #1e1e1e)', border: '1px solid var(--border, #333)', borderRadius: 6, padding: '8px 10px', fontSize: 12, zIndex: 60 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong style={{ fontSize: 12 }}>Outline</strong>
            <button className="btn" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => setShowOutline(false)}>×</button>
          </div>
          {outline.map((h, i) => (
            <div
              key={i}
              style={{
                padding: '2px 4px',
                cursor: 'pointer',
                marginLeft: (h.level - 1) * 8,
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                borderRadius: 4,
              }}
              onClick={() => {
                if (!editorRef.current) return;
                const view = editorRef.current;
                // Find position by counting newlines
                let pos = 0; let line = 0; const text = view.state.doc.toString();
                for (let j = 0; j < text.length && line < h.line; j++) {
                  if (text[j] === '\n') line++;
                  pos = j + 1;
                }
                view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
                view.focus();
              }}
              title={h.text}
            >
              {h.text}
            </div>
          ))}
        </div>
      )}

      {showSearch && (
        <div
          className="editor-search-overlay"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            background: 'rgba(25,25,30,0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--border, #333)',
            borderTopRightRadius: 0,
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 10,
            borderBottomRightRadius: 0,
            padding: '10px 10px 12px',
            zIndex: 100,
            width: 260,
            boxShadow: '0 6px 18px -4px rgba(0,0,0,0.55)',
            fontSize: 12,
            lineHeight: 1.3
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <input
              name="query"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchMatches.length) {
                    if (e.shiftKey) {
                      setActiveMatch(m => (m - 1 + searchMatches.length) % searchMatches.length);
                    } else {
                      setActiveMatch(m => (m + 1) % searchMatches.length);
                    }
                  }
                }
              }}
              placeholder="Find"
              className="input"
              style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
            />
            <button className="btn" style={{ padding: '4px 6px', fontSize: 11 }} onClick={() => setShowSearch(false)}>×</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <input
              value={replaceValue}
              onChange={e => setReplaceValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.ctrlKey || e.metaKey) {
                    doReplaceAll();
                  } else {
                    doReplaceOne();
                  }
                }
              }}
              placeholder="Replace"
              className="input"
              style={{ flex: 1, fontSize: 12, padding: '4px 6px' }}
            />
            <span style={{ opacity: 0.6, fontSize: 11 }}>{searchMatches.length ? `${activeMatch + 1}/${searchMatches.length}` : '0/0'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={() => setActiveMatch(m => (m - 1 + searchMatches.length) % searchMatches.length)}>Prev</button>
            <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={() => setActiveMatch(m => (m + 1) % searchMatches.length)}>Next</button>
            <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={doReplaceOne}>One</button>
            <button className="btn" style={{ fontSize: 11, padding: '4px 0' }} disabled={!searchMatches.length} onClick={doReplaceAll}>All</button>
          </div>
          <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6, textAlign: 'center' }}>Ctrl+F / Esc</div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="editor-toasts" style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {toasts.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-panel, #222)', color: 'var(--text, #fff)', padding: '8px 12px', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.25)' }}>{t.msg}</div>
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
