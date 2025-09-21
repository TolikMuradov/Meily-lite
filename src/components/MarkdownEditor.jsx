// src/components/MarkdownEditor.jsx
import { useEffect, useState, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { keymap, highlightActiveLine, EditorView, Decoration } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import { languageCompartment, keymapCompartment } from '../editor/compartments';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { indentOnInput, foldGutter, syntaxTree } from '@codemirror/language';
import { Prec } from '@codemirror/state';
import '../css/MarkdownEditor.css';
import { formatTable, moveCell, tableKernelExtension, handleEnter } from '../editor/tableKernelAdapter';
import { buildKeySpecs } from '../commands/registry';
import CommandPalette from './CommandPalette';
import ShortcutsModal from './ShortcutsModal';
import SearchOverlay from './editor/SearchOverlay';
import OutlinePanel from './editor/OutlinePanel';
import SlashCommandPopup from './editor/SlashCommandPopup';
import EditorToasts from './editor/EditorToasts';
import { useOutline } from './editor/hooks/useOutline';
import { useAutosave } from './editor/hooks/useAutosave';
import { useImageDrop } from './editor/hooks/useImageDrop';
import { useSlashCommands } from './editor/hooks/useSlashCommands';
import { useSearch, searchHighlightField } from './editor/hooks/useSearch';
import { useScrollSync } from './editor/hooks/useScrollSync';
import { getSearchAnimationEnabled } from '../editor/editorPreferences';

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

// (search highlight field & logic now in useSearch hook)


// (debounce kaldırıldı - kullanılmıyor)

export default function MarkdownEditor({ content, setContent, editorRef, onAutosave }) {
  const [themeVars, setThemeVars] = useState({});
  const containerRef = useRef(null);
  // preview toggle kaldırıldı (kullanılmıyor)
  const [lineCount, setLineCount] = useState(1);
  const toastTimeouts = useRef([]);
  const [toasts, setToasts] = useState([]);
  const [searchAnimEnabled, setSearchAnimEnabled] = useState(() => getSearchAnimationEnabled());
  // search UI state handled entirely inside useSearch hook now
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Search handled by useSearch
  const { open: searchOpen, toggle: toggleSearch, close: closeSearch, query: searchQuery, setQuery: setSearchQuery, replaceValue, setReplaceValue, matches: searchMatches, activeIndex: activeMatch, setActiveIndex, replaceOne: doReplaceOne, replaceAll: doReplaceAll } = useSearch({ content, editorRef });
  const { outline, showOutline, setShowOutline } = useOutline(content);
  const { schedule: scheduleAutosave, flush: flushAutosave } = useAutosave(onAutosave, editorRef, content);
  const { showSlash, selectedIndex, setSelectedIndex, filteredCommands, insertSnippet, handleTextChanged } = useSlashCommands(editorRef, SLASH_COMMANDS);
  const { handleContainerDrop } = useImageDrop(editorRef, (msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2500);
  }, containerRef);

  // focus management moved inside hook (if needed later)

  const editorExtensions = [
    languageCompartment.of(markdown()),
    foldGutter(),
    highlightActiveLine(),
    indentOnInput(),
    history(),
    searchHighlightField,
    keymap.of([{ key: 'Mod-f', preventDefault: true, run: () => { toggleSearch(); return true; } }]),
    EditorView.domEventHandlers({
      dragover: (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'; return true; },
      drop: (e, view) => {
        const files = Array.from(e.dataTransfer?.files || []);
        if (!files.length) return false;
        const file = files.find(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name));
        if (!file) return false;
        e.preventDefault(); e.stopPropagation();
        (async () => {
          try {
            let imagePath = null;
            if (file.path && window.api?.copyImage) imagePath = await window.api.copyImage(file.path);
            if (!imagePath && window.api?.copyImageBuffer) {
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
          } catch (err) { console.error('Image drop failed:', err); }
        })();
        return true;
      }
    }),
    keymapCompartment.of(keymap.of([
      ...buildKeySpecs(),
      ...defaultKeymap,
      ...historyKeymap
    ])),
    tableKernelExtension(),
    Prec.highest(keymap.of([
      { key: 'Enter', run: (view) => {
        if (handleEnter(view)) return true;
        try {
          const state = view.state; const pos = state.selection.main.head; const tree = syntaxTree(state); const node = tree.resolve(pos,1);
          if (node && /Table(Row|Header)/.test(node.name)) {
            const line = state.doc.lineAt(pos); const pipeCount = (line.text.match(/\|/g) || []).length - 1;
            if (pipeCount > 0) {
              const blank = '|' + (' '.repeat(1) + '|').repeat(pipeCount);
              view.dispatch({ changes: { from: pos, to: pos, insert: '\n' + blank }, selection: { anchor: pos + 1 + blank.length } });
              formatTable(view); return true;
            }
          }
        } catch (e) { console.warn('[table.hybrid.enter.error]', e); }
        return false;
      }},
      { key: 'Tab', run: (v) => moveCell(v,'next') || false },
      { key: 'Shift-Tab', run: (v) => moveCell(v,'prev') || false }
    ]))
  ];
  // (legacy search artifacts removed)

  // scroll sync now handled by useScrollSync hook
  useScrollSync(editorRef);

  // Listen preference changes
  useEffect(() => {
    const handler = (e) => setSearchAnimEnabled(!!e.detail);
    window.addEventListener('pref-search-animation-changed', handler);
    return () => window.removeEventListener('pref-search-animation-changed', handler);
  }, []);

  const theme = document.documentElement.getAttribute('data-theme');
  useEffect(() => {
    const root = getComputedStyle(document.documentElement);
    setThemeVars({
      backgroundColor: root.getPropertyValue('transparent')?.trim(),
      color: root.getPropertyValue('--text')?.trim(),
    });
  }, [theme]);

  // (Slash komut klavye eventi useSlashCommands hook'u içinde yönetiliyor)

  useEffect(() => () => toastTimeouts.current.forEach(clearTimeout), []);

  useEffect(() => {
    const handleBlur = (e) => {
      if (!editorRef.current) return;
      if (!document.hasFocus()) return;
      if (containerRef.current && !containerRef.current.contains(e.relatedTarget)) {
        flushAutosave();
      }
    };
    const node = containerRef.current;
    if (!node) return;
    node.addEventListener('focusout', handleBlur);
    return () => node.removeEventListener('focusout', handleBlur);
  }, [flushAutosave, editorRef]);

  // (Removed legacy pushToast and manual drop handlers; now handled via hooks)

  // (Removed duplicate global drag/drop listeners; handled in useImageDrop hook)

  // ...existing code...

  return (
  <div ref={containerRef} className={`markdown-editor ${searchAnimEnabled ? '' : 'no-search-anim'}`} style={{ ...themeVars, position: 'relative' }} onDrop={handleContainerDrop}>
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
          onCreateEditor={(view) => { editorRef.current = view; }}
          onChange={(value) => {
            setContent(value);
            scheduleAutosave(value);

            const view = editorRef.current;
            if (!view) return;
            setLineCount(view.state.doc.lines);

            handleTextChanged(value, view);
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

      <SlashCommandPopup
        open={showSlash}
        commands={filteredCommands}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onPick={insertSnippet}
      />

      <OutlinePanel
        open={showOutline}
        outline={outline}
        onClose={() => setShowOutline(false)}
        onJump={(h) => {
          if (!editorRef.current) return;
          const view = editorRef.current;
          let pos = 0; let line = 0; const text = view.state.doc.toString();
          for (let j = 0; j < text.length && line < h.line; j++) { if (text[j] === '\n') line++; pos = j + 1; }
          view.dispatch({ selection: { anchor: pos }, scrollIntoView: true });
          view.focus();
        }}
      />

      <SearchOverlay
        open={searchOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        replaceValue={replaceValue}
        setReplaceValue={setReplaceValue}
        searchMatches={searchMatches}
        activeMatch={activeMatch}
        setActiveMatch={setActiveIndex}
        doReplaceOne={doReplaceOne}
        doReplaceAll={doReplaceAll}
        onClose={closeSearch}
      />

  <EditorToasts toasts={toasts} />

      {/* Sağ alt köşede Preview Aç/Kapat butonu */}
      {/* <button className="preview-toggle-button" onClick={togglePreview}>
        {showPreview ? <FiEyeOff /> : <FiEye />}
      </button> */}

      {/* Preview bileşenini kaldırdım */}
      <CommandPalette open={showPalette} onClose={()=> setShowPalette(false)} editorRef={editorRef} />
      <ShortcutsModal open={showShortcuts} onClose={()=> setShowShortcuts(false)} />
    </div>
  );
}
