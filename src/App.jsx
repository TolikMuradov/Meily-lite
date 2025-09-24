import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './index.css';
import './css/Modal.css';
import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import MarkdownEditor from './components/MarkdownEditor';
import Preview from './components/Preview';
import EditorTop from './components/EditorTop';
import ModalManager from './components/App/ModalManager';
import FilterManager from './components/App/FilterManager';
// AutosaveManager kaldırıldı (useNoteEditing kullanılacak)
import useNoteEditing from './components/App/hooks/useNoteEditing';
import ThemeManager from './components/App/ThemeManager';
import calculateNoteStats from './components/App/NoteStatsManager';
// NoteActionsManager hook formatına dönüştürüldü
import useNoteActions, { useExtendedNoteActions } from './components/App/hooks/useNoteActions';
import MarkdownManager from './components/App/MarkdownManager';
import useNoteFiltering from './components/App/hooks/useNoteFiltering';
import useCategories from './components/App/hooks/useCategories';
import { storage } from './storage';
import useGlobalShortcutsGuard from './hooks/useGlobalShortcutsGuard';
import ViewModeSwitcher from './components/ViewModeSwitcher';

export default function App() {
  // Debug scroll log moved into effect to avoid duplicate listeners
  useEffect(() => {
    const handler = (e) => {
      // Uncomment if you still need to observe scroll sync ratios
      // console.log("📥 Global scroll event geldi:", e.detail);
    };
    window.addEventListener('editor-scroll', handler);
    return () => window.removeEventListener('editor-scroll', handler);
  }, []);
  
  // eski autosaveRef kaldırıldı (lint temizliği)
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  // Scroll sync loop guard flags
  const isSyncingFromEditor = useRef(false);
  const isSyncingFromPreview = useRef(false);
  const lastPreviewManualScrollRef = useRef(0);
  const MANUAL_SUPPRESS_MS = 1800; // süre boyunca editor->preview sync baskılanır

  const [theme, setTheme] = useState(() => localStorage.getItem('selectedTheme') || 'TokyoNight');
  const [notes, setNotes] = useState([]);
  const [noteFilter, setNoteFilter] = useState({ type: 'all' });
  const {
  categories,
  // setCategories kaldırıldı (unused)
    selectedCategory,
    setSelectedCategory,
    contextCategory,
    setContextCategory,
    showContextMenu,
    setShowContextMenu,
    contextMenuPos,
    setContextMenuPos,
    handleAddCategory,
    handleRenameCategory,
    handleDeleteCategory,
  } = useCategories({ setNotes, onInitialFilter: setNoteFilter });
  const [selectedNote, setSelectedNote] = useState(null);
  const {
    title,
    content,
    noteStatus,
    noteTags,
    setTitle,
    setContent,
    setNoteStatus,
    setNoteTags,
    updateCategory,
    autosaveControls
  } = useNoteEditing({ selectedNote, setNotes, setSelectedNote });
  const creatingRef = useRef(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useGlobalShortcutsGuard(isModalOpen);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDefaultValue, setModalDefaultValue] = useState('');
  const [onModalSubmit, setOnModalSubmit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarWidth] = useState(200); // setSidebarWidth kullanılmıyor
  // const [globalTags] = useState([]); // globalTags kullanılmıyor
  const [sortOption, setSortOption] = useState('updated-desc');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkHref, setLinkHref] = useState('');
  const [toasts, setToasts] = useState([]);
  const lastCreatedRef = useRef(null);
  const prevNoteBeforeCreateRef = useRef(null);
  const [viewMode, setViewMode] = useState('both'); // 'editor' | 'preview' | 'both
  const [isMaximized, setIsMaximized] = useState(false);
  const isMac = typeof window !== 'undefined' && window.api && window.api.platform === 'darwin';
  const [anchorPreview, setAnchorPreview] = useState(false);
  

  const uniqueTags = [...new Set(notes.flatMap(n => (n.tags || []).map(t => t.name)))];
  const allTags = uniqueTags.map(name => {
    const tagObj = notes.find(n => (n.tags || []).some(t => t.name === name));
    const fullTag = tagObj?.tags?.find(t => t.name === name);
    return {
      id: fullTag?.id ?? name,
      name,
      color: fullTag?.color || '#E45826'
    };
  });

  const { filteredNotes, getFilterTitle } = useNoteFiltering({
    notes,
    noteFilter,
    searchTerm,
    sortOption,
    categories
  });


  useEffect(() => {
    window.editorRef = editorRef;
    window.previewRef = previewRef;
  }, []);


    


  // Restore işlemi artık handleRestore üzerinden yönetiliyor
  
  // permanentlyDelete artık hook içinde (handlePermanentDelete)

  useEffect(() => {
    const transparent = localStorage.getItem('transparentMode') === 'true';
    document.body.classList.toggle('opaque', !transparent);
    if (window.api && window.api.onTransparentToggle) {
      window.api.onTransparentToggle((value) => {
        document.body.classList.toggle('opaque', !value);
        localStorage.setItem('transparentMode', value ? 'true' : 'false');
      });
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isMac) {
      document.body.classList.add('mac');
      return () => document.body.classList.remove('mac');
    }
  }, [isMac]);

  // Track maximize state from main process
  useEffect(() => {
    if (window.api && window.api.onWindowMaximized) {
      window.api.onWindowMaximized((val) => setIsMaximized(val));
    }
  }, []);

  useEffect(() => {
    storage.getNotes()
      .then(allNotes => setNotes(allNotes))
      .catch(err => {
        console.error('Notlar alınamadı:', err);
        setNotes([]);
      });
  }, []);

  // selectedNote senkronizasyonu ve autosave artık useNoteEditing içinde yönetiliyor

  const noteStats = useMemo(() => calculateNoteStats(notes, categories), [notes, categories]);

  const baseActions = useNoteActions({
    notes,
    setNotes,
    selectedNote,
    setSelectedNote,
    title,
    setTitle,
    content,
    setContent,
    noteStatus,
    noteTags,
    categories
  });
  const { handleAddNote, handleUpdateNote } = baseActions;
  const { handleSoftDelete, handleRestore, handlePermanentDelete, handleTogglePin, handleExport } = useExtendedNoteActions(baseActions, { selectedNote, setSelectedNote, setNotes, title, content, noteTags });

  // handleDeleteNote yerine handleSoftDelete kullanılıyor

  const openModal = (title, defaultValue, onSubmit) => {
    setModalTitle(title);
    setModalDefaultValue(defaultValue);
    setOnModalSubmit(() => onSubmit);
    setIsModalOpen(true);
  };

  const openNewCategoryModal = () => {
    openModal('Create Notebook', '', name => {
      handleAddCategory(name).catch(err => {
        console.error('Notebook does not created:', err);
        alert('Notebook does not created');
      });
    });
  };

  const openRenameCategoryModal = (category) => {
    openModal('Rename Notebook', category.name, (newName) => {
      handleRenameCategory(category, newName).catch(err => {
        console.error('Notebook does not renamed:', err);
        alert('Notebook does not renamed');
      });
    });
  };

  const safeDeleteCategory = (category) => {
    if (!confirm(`"${category.name}" silinsin mi?`)) return;
    handleDeleteCategory(category).then(() => {
      setNotes(prev => prev.filter(n => n.category !== category.id));
    }).catch(err => {
  console.error('Category could not be deleted:', err);
  alert('Category could not be deleted');
    });
  };

  const { insertMarkdownAtCursor, applyStrikethrough, applyBold, applyItalic,
    applyHeading, toggleBulletList, toggleOrderedList, toggleBlockquote,
    toggleInlineCode, toggleTaskItem } = MarkdownManager({
    setContent,
    editorRef
  });

  // Unified create note flow: robust save-first with autosave suppression
  const createNoteWithSave = useCallback(async () => {
    if (creatingRef.current) return; // reentrancy guard
    creatingRef.current = true;
    try {
      const { pauseAutosave, resumeAutosave, flushAutosave } = autosaveControls;
      pauseAutosave();
      // Pending debounced autosave işlemlerini bitir
      flushAutosave();
      let didSave = false;
      if (selectedNote?.id) {
        prevNoteBeforeCreateRef.current = selectedNote; // snapshot for undo
        const orig = selectedNote;
        const norm = (v) => (v || '').replace(/\r\n/g,'\n').trimEnd();
        const dirtyTitle = (orig.title || '') !== (title || '');
        const dirtyContent = norm(orig.content || '') !== norm(content || '');
        const dirtyStatus = (orig.status || 'active') !== noteStatus;
        const dirtyTags = JSON.stringify((orig.tags||[]).map(t=>t.id).sort()) !== JSON.stringify((noteTags||[]).map(t=>t.id).sort());
        const dirty = dirtyTitle || dirtyContent || dirtyStatus || dirtyTags;
        if (dirty) {
          const saved = await handleUpdateNote();
          didSave = !!saved;
          if (didSave) {
            const id = Date.now().toString(36)+Math.random().toString(36).slice(2,7);
            setToasts(t => [...t, { id, msg: 'Saved', type: 'success' }]);
            setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 1800);
          }
        }
      }
      if (didSave) await Promise.resolve();
      const newNote = await handleAddNote(selectedCategory?.id || null);
      if (newNote?.id) {
        lastCreatedRef.current = newNote.id;
        const undoId = 'u'+Date.now().toString(36);
        setToasts(t => [...t, { id: undoId, msg: 'New note created', type: 'info', undo: true }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== undoId)), 4000);
        setTimeout(() => { try { editorRef.current?.focus(); } catch(_) {} }, 30);
      }
    } catch (err) {
      console.error('createNoteWithSave error:', err);
    } finally {
      autosaveControls.resumeAutosave();
      creatingRef.current = false;
    }
  }, [autosaveControls, selectedNote, title, content, noteStatus, noteTags, handleUpdateNote, handleAddNote, selectedCategory]);

  // Link modalını tetikleyen fonksiyon (useEffect öncesine alınmalı)
  function handleLinkClick() {
    const view = editorRef.current;
    if (!view) return;
    const { state } = view;
    const selection = state.selection.main;
    const selectedText = state.sliceDoc(selection.from, selection.to);
    setLinkText(selectedText);
    setLinkHref('');
    setIsLinkModalOpen(true);
  }

  // Editor formatting & structural shortcut events
  useEffect(() => {
    const hBold = () => applyBold();
    const hItalic = () => applyItalic();
    const hStrike = () => applyStrikethrough();
    const hInlineCode = () => toggleInlineCode();
    const hBullet = () => toggleBulletList();
    const hOrdered = () => toggleOrderedList();
    const hTask = () => toggleTaskItem();
    const hQuote = () => toggleBlockquote();
    const hHeading = (e) => applyHeading(e.detail || 1);
    const hNew = () => { createNoteWithSave(); };
    const hSave = () => handleUpdateNote();
    const hExport = () => handleExport();
    const hLink = () => handleLinkClick();

    window.addEventListener('editor-do-bold', hBold);
    window.addEventListener('editor-do-italic', hItalic);
    window.addEventListener('editor-do-strike', hStrike);
    window.addEventListener('editor-inline-code', hInlineCode);
    window.addEventListener('editor-bullet-list', hBullet);
    window.addEventListener('editor-ordered-list', hOrdered);
    window.addEventListener('editor-task-item', hTask);
    window.addEventListener('editor-blockquote', hQuote);
    window.addEventListener('editor-heading', hHeading);
    window.addEventListener('editor-new-note', hNew);
    window.addEventListener('editor-save-note', hSave);
    window.addEventListener('editor-export-note', hExport);
    window.addEventListener('editor-insert-link', hLink);
    return () => {
      window.removeEventListener('editor-do-bold', hBold);
      window.removeEventListener('editor-do-italic', hItalic);
      window.removeEventListener('editor-do-strike', hStrike);
      window.removeEventListener('editor-inline-code', hInlineCode);
      window.removeEventListener('editor-bullet-list', hBullet);
      window.removeEventListener('editor-ordered-list', hOrdered);
      window.removeEventListener('editor-task-item', hTask);
      window.removeEventListener('editor-blockquote', hQuote);
      window.removeEventListener('editor-heading', hHeading);
      window.removeEventListener('editor-new-note', hNew);
      window.removeEventListener('editor-save-note', hSave);
      window.removeEventListener('editor-export-note', hExport);
      window.removeEventListener('editor-insert-link', hLink);
    };
  }, [applyBold, applyItalic, applyStrikethrough, toggleInlineCode, toggleBulletList, toggleOrderedList, toggleTaskItem, toggleBlockquote, applyHeading, createNoteWithSave, handleUpdateNote, handleExport]);

  // Global Ctrl+N (Mod-n) listener so initial focus not required
  useEffect(() => {
    const onKey = (e) => {
      const isMod = (isMac ? e.metaKey : e.ctrlKey);
      if (isMod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const btn = document.getElementById('create-note-btn');
        if (btn) {
          btn.click();
        } else {
          window.dispatchEvent(new CustomEvent('editor-new-note'));
        }
      }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [isMac]);

  // Export işlemi handleExport içinde




  // (handleLinkClick moved above)

  const handleLinkSubmit = ({ text, href }) => {
  const view = editorRef.current;
  if (!view) return;
  const { state, dispatch } = view;
  const sel = state.selection.main;
  const selectedText = (text && text.trim()) || state.sliceDoc(sel.from, sel.to) || 'link';
  const safeHref = (href && href.trim()) || '#';
  const insert = `[${selectedText}](${safeHref})`;
  dispatch({ changes: { from: sel.from, to: sel.to, insert }, selection: { anchor: sel.from + insert.length } });
  view.focus();
  };

  useEffect(() => {
    const handleScroll = (e) => {
      const ratio = e.detail;
      const preview = previewRef.current;
      if (!preview) return;
      // Eğer kullanıcı yakın zamanda (MANUAL_SUPPRESS_MS) preview'u manuel kaydırdıysa, senkronu atla
      if (Date.now() - lastPreviewManualScrollRef.current < MANUAL_SUPPRESS_MS) return;
      if (anchorPreview) return; // anchor modunda oransal scroll yerine satır bazlı hizalama tercih edilecek
      const max = preview.scrollHeight - preview.clientHeight;
      if (max <= 0) return;
      const scrollTop = max * ratio;
      isSyncingFromEditor.current = true;
      preview.scrollTop = scrollTop;
      // Clear flag next frame so user wheel events still propagate
      requestAnimationFrame(() => { isSyncingFromEditor.current = false; });
      // console.debug('[sync] editor -> preview', { ratio, scrollTop });
    };
    window.addEventListener('editor-scroll', handleScroll);
    return () => window.removeEventListener('editor-scroll', handleScroll);
  }, [anchorPreview]);

  // Preview -> Editor scroll sync
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onPreviewScroll = () => {
      if (isSyncingFromEditor.current) return; // ignore programmatic updates
      const scroller = editorRef.current?.scrollDOM;
      if (!scroller) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (!scrollHeight || scrollHeight === clientHeight) return;
      // Kaydırma kullanıcı kaydırması: zaman damgası tut
      lastPreviewManualScrollRef.current = Date.now();
      if (anchorPreview) return; // anchor açıkken preview manuel kaydırması editor oranını etkilemesin
      const ratio = scrollTop / (scrollHeight - clientHeight);
      const editorMax = scroller.scrollHeight - scroller.clientHeight;
      if (editorMax > 0) {
        isSyncingFromPreview.current = true;
        scroller.setAttribute('data-syncing','1');
        scroller.scrollTop = editorMax * ratio;
        requestAnimationFrame(() => { isSyncingFromPreview.current = false; });
        // Clear attribute flag shortly after frame paint
        setTimeout(() => { try { scroller.removeAttribute('data-syncing'); } catch(_) {} }, 40);
        // console.debug('[sync] preview -> editor', { ratio });
      }
    };
    el.addEventListener('scroll', onPreviewScroll, { passive: true });
    return () => el.removeEventListener('scroll', onPreviewScroll);
  }, [previewRef.current]);

  // Anchor mode: cursor satırına en yakın heading veya satır konumuna göre preview hizalama
  useEffect(() => {
    if (!anchorPreview) return;
    let lastAppliedLine = -1;
    let rafId = null;
    let pending = null;

    const apply = (lineNumber) => {
      const preview = previewRef.current;
      if (!preview || lineNumber == null) return;
      const blocks = Array.from(preview.querySelectorAll('[data-line]'));
      if (!blocks.length) return;
      // Binary search nearest block whose data-line <= lineNumber
      let low = 0, high = blocks.length - 1, best = 0;
      while (low <= high) {
        const mid = (low + high) >> 1;
        const ln = parseInt(blocks[mid].getAttribute('data-line') || '-1', 10);
        if (ln <= lineNumber) { best = mid; low = mid + 1; } else { high = mid - 1; }
      }
      const target = blocks[best];
      const rect = target.getBoundingClientRect();
      const containerRect = preview.getBoundingClientRect();
      const current = preview.scrollTop;
      // Desired scroll so target appears ~20% from top to give context
      const offsetWithin = rect.top - containerRect.top;
      const desired = current + offsetWithin - (preview.clientHeight * 0.2);
      const bounded = Math.max(0, Math.min(desired, preview.scrollHeight - preview.clientHeight));
      if (Math.abs(bounded - current) > 16) {
        preview.scrollTo({ top: bounded, behavior: Math.abs(bounded - current) < 240 ? 'smooth' : 'auto' });
      }
    };

    const handler = (e) => {
      const ln = e.detail;
      if (ln === lastAppliedLine) return;
      lastAppliedLine = ln;
      pending = ln;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const toApply = pending;
        pending = null;
        rafId = null;
        apply(toApply);
      });
    };

    window.addEventListener('editor-cursor-line', handler);
    return () => {
      window.removeEventListener('editor-cursor-line', handler);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [anchorPreview]);
  
  

  // AutosaveManager kaldırıldı

  return (
    <div className="app-container">
      <div className='drag-bar'></div>
      {!isMac && (
        <div className="window-controls">
          <button className='minimize' onClick={() => window.api && window.api.minimize()}>–</button>
          <button className='maximize' title={isMaximized ? 'Restore' : 'Maximize'} onClick={() => { if (window.api) { console.log('[renderer] maximize button click. isMaximized=', isMaximized); window.api.maximize(); } }}>
            {isMaximized ? '🗗' : '◻'}
          </button>
          <button className='close' onClick={() => window.api && window.api.close()}>×</button>
        </div>
      )}

      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
  onAddCategory={openNewCategoryModal}
  onUpdateCategory={handleRenameCategory}
  onDeleteCategory={safeDeleteCategory}
        setNoteFilter={setNoteFilter}
        noteStats={noteStats}
        setContextCategory={setContextCategory}
        setContextMenuPos={setContextMenuPos}
        setShowContextMenu={setShowContextMenu}
  handleAddCategory={openNewCategoryModal}
        width={sidebarWidth}
        tagsList={allTags}
        noteFilter={noteFilter}
        isMac={isMac}
      />

      <NotesList
        notes={filteredNotes}
        selectedNote={selectedNote}
        onSelectNote={setSelectedNote}
  onAddNote={createNoteWithSave} // unified save-then-create
        selectedCategoryId={selectedCategory?.id || null}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        noteFilter={noteFilter}
        filterTitle={getFilterTitle()}
  restoreNote={handleRestore}
  permanentlyDelete={handlePermanentDelete}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      {selectedNote ? (
        <div className="editor-panel-container">
          {/* Toasts (save + undo) */}
          {toasts.length > 0 && (
            <div style={{ position: 'absolute', top: 8, right: 12, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 500 }}>
              {toasts.map(t => (
                <div key={t.id} style={{ background: 'var(--bg-panel,#222)', border: '1px solid var(--border,#333)', padding: '6px 10px', borderRadius: 6, fontSize: 12, color: 'var(--text,#fff)', boxShadow: '0 4px 12px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{t.msg}</span>
                  {t.undo && lastCreatedRef.current && (
                    <button style={{ background: 'var(--primary,#3a7)', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }} onClick={() => {
                      const createdId = lastCreatedRef.current;
                      if (!createdId) return;
                      setNotes(prev => prev.filter(n => n.id !== createdId));
                      lastCreatedRef.current = null;
                      setToasts(ts => ts.filter(x => x.id !== t.id));
                      if (prevNoteBeforeCreateRef.current) {
                        setSelectedNote(prevNoteBeforeCreateRef.current);
                      } else {
                        setSelectedNote(null);
                      }
                    }}>Undo</button>
                  )}
                </div>
              ))}
            </div>
          )}
          <EditorTop
            title={title}
            setTitle={setTitle}
            onInsertMarkdown={insertMarkdownAtCursor}
            onStrikethrough={applyStrikethrough}
            onBold={applyBold}
            onItalic={applyItalic}
            onSave={handleUpdateNote}
            onDelete={handleSoftDelete}
            onExport={handleExport}
            onLinkClick={handleLinkClick}
            categories={categories}
            selectedCategoryId={selectedNote?.category || selectedCategoryId}
            setSelectedCategoryId={(id) => {
              setSelectedCategoryId(id);
              updateCategory(id);
            }}
            noteStatus={noteStatus}
            setNoteStatus={setNoteStatus}
            noteTags={noteTags}
            setNoteTags={setNoteTags}

            note={selectedNote}
            onTogglePin={handleTogglePin}
          />
          <div style={{ position:'absolute', top: 6, left: '50%', transform:'translateX(-50%)', zIndex: 400, display:'flex', gap:8 }}>
            
          </div>

              <div className="editor-preview-container">
              {viewMode !== 'preview' && (
                <MarkdownEditor
                  content={content}
                  setContent={setContent}
                  editorRef={editorRef}
                />
              )}
              {viewMode !== 'editor' && (
                <Preview
                  content={content}
                  ref={previewRef}
                  onToggleTask={(lineIndex, checked) => {
                    // Update the markdown line at lineIndex replacing - [ ] / - [x]
                    const lines = content.split(/\n/);
                    if (lineIndex < 0 || lineIndex >= lines.length) return;
                    const line = lines[lineIndex];
                    const replaced = line.replace(/(^\s*[-*+]\s*\[)( |x|X)(\])/, `$1${checked ? 'x' : ' '}$3`);
                    if (replaced !== line) {
                      lines[lineIndex] = replaced;
                      const next = lines.join('\n');
                      setContent(next);
                    }
                  }}
                />
              )}
              </div>

              <ViewModeSwitcher mode={viewMode} onChange={setViewMode} />
        </div>
      ) : (
        <div className="no-notes-placeholder">
          <img className='re-empty' src="./public/2.svg" alt="" />
          <p>Notu düzenlemek için bir not seçin ya da yeni not oluşturun.</p>
        </div>
      )}

      <ModalManager
        isModalOpen={isModalOpen}
        modalTitle={modalTitle}
        modalDefaultValue={modalDefaultValue}
        onModalSubmit={onModalSubmit} // keeps your existing flows (rename/create)
        setIsModalOpen={setIsModalOpen}
        isLinkModalOpen={isLinkModalOpen}
        linkText={linkText}
        setLinkText={setLinkText}
        linkHref={linkHref}
        setLinkHref={setLinkHref}
        setIsLinkModalOpen={setIsLinkModalOpen}
        onLinkSubmit={handleLinkSubmit} // <-- IMPORTANT for link modal
        />


      {showContextMenu && contextCategory && (
        <div
          className="context-menu"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              setShowContextMenu(false);
              openRenameCategoryModal({ ...contextCategory });
            }}
          >
            Rename
          </div>
          <div
            className="context-menu-item"
            onClick={() => {
              setShowContextMenu(false);
              safeDeleteCategory(contextCategory);
            }}
          >
            Delete
          </div>
        </div>
      )}

      <ThemeManager theme={theme} setTheme={setTheme} />
    </div>
  );
}
