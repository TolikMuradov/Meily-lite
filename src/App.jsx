import { useState, useEffect, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
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
import useNoteActions, { extendNoteActions } from './components/App/hooks/useNoteActions';
import MarkdownManager from './components/App/MarkdownManager';
import useNoteFiltering from './components/App/hooks/useNoteFiltering';
import useCategories from './components/App/hooks/useCategories';
import { storage } from './storage';
import useGlobalShortcutsGuard from './hooks/useGlobalShortcutsGuard';
import ViewModeSwitcher from './components/ViewModeSwitcher';

export default function App() {

  window.addEventListener("editor-scroll", (e) => {
     console.log("📥 Global scroll event geldi:", e.detail);
 });
  
  const autosaveRef = useRef(
    debounce((note) => {
      if (!note.category) return;
      updateNote(note.id, note)
        .then(saved => setNotes(prev => prev.map(n => n.id === saved.id ? saved : n)))
        .catch(err => console.error("Autosave hatası:", err));
    }, 1000)
  );
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('selectedTheme') || 'TokyoNight');
  const [notes, setNotes] = useState([]);
  const [noteFilter, setNoteFilter] = useState({ type: 'all' });
  const {
    categories,
    setCategories,
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
  } = useNoteEditing({ selectedNote, setNotes, setSelectedNote });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useGlobalShortcutsGuard(isModalOpen);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDefaultValue, setModalDefaultValue] = useState('');
  const [onModalSubmit, setOnModalSubmit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [globalTags, setGlobalTags] = useState([]);
  const [sortOption, setSortOption] = useState('updated-desc');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkHref, setLinkHref] = useState('');
  const [viewMode, setViewMode] = useState('both'); // 'editor' | 'preview' | 'both
  const [isMaximized, setIsMaximized] = useState(false);
  

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
  const {
    handleAddNote,
    handleUpdateNote,
    handleSoftDelete,
    handleRestore,
    handlePermanentDelete,
    handleTogglePin,
    handleExport,
  } = extendNoteActions(baseActions, {
    selectedNote,
    setSelectedNote,
    setNotes,
    title,
    content,
    noteTags,
  });

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

  const { handleInsertMarkdown, insertMarkdownAtCursor } = MarkdownManager({
    setContent,
    editorRef
  });

  // Export işlemi handleExport içinde




  const handleLinkClick = () => {
    const view = editorRef.current;
    if (!view) return;
  
    const { state } = view;
    const selection = state.selection.main;
    const selectedText = state.sliceDoc(selection.from, selection.to);
  
    setLinkText(selectedText);
    setLinkHref('');
    setIsLinkModalOpen(true);
  };

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
  
      const max = preview.scrollHeight - preview.clientHeight;
      if (max <= 0) return;
  
      const scrollTop = max * ratio;
      preview.scrollTop = scrollTop;
      console.log("📥 PREVIEW scrollTop set:", scrollTop);
    };
  
    window.addEventListener("editor-scroll", handleScroll);
    return () => window.removeEventListener("editor-scroll", handleScroll);
  }, []);
  
  

  // AutosaveManager kaldırıldı

  return (
    <div className="app-container">
      <div className='drag-bar'></div>
      <div className="window-controls">
        <button className='minimize' onClick={() => window.api && window.api.minimize()}>–</button>
        <button className='maximize' title={isMaximized ? 'Restore' : 'Maximize'} onClick={() => { if (window.api) { console.log('[renderer] maximize button click. isMaximized=', isMaximized); window.api.maximize(); } }}>
          {isMaximized ? '🗗' : '◻'}
        </button>
        <button className='close' onClick={() => window.api && window.api.close()}>×</button>
      </div>

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
      />

      <NotesList
        notes={filteredNotes}
        selectedNote={selectedNote}
        onSelectNote={setSelectedNote}
        onAddNote={handleAddNote} // create note with selected category
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
          <EditorTop
            title={title}
            setTitle={setTitle}
            onInsertMarkdown={insertMarkdownAtCursor}
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
