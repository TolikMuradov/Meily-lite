import { useState, useEffect, useRef } from 'react';
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
import AutosaveManager from './components/App/AutosaveManager';
import ThemeManager from './components/App/ThemeManager';
import NoteStatsManager from './components/App/NoteStatsManager';
import NoteActionsManager from './components/App/NoteActionsManager';
import MarkdownManager from './components/App/MarkdownManager';
import {
  fetchCategories, fetchNotes, createNote,
  updateNote, deleteNote, createCategory,
  updateCategory, deleteCategory, permanentlyDeleteNote,
} from './api';
import useGlobalShortcutsGuard from './hooks/useGlobalShortcutsGuard';

export default function App() {

  window.addEventListener("editor-scroll", (e) => {
    console.log("📥 Global scroll event geldi:", e.detail);
  });
  
  
  const editorRef = useRef(null);
  const previewRef = useRef(null);

  const [theme, setTheme] = useState(() => localStorage.getItem('selectedTheme') || 'TokyoNight');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteStatus, setNoteStatus] = useState('active');
  const [noteTags, setNoteTags] = useState([]);
  const [noteFilter, setNoteFilter] = useState({ type: 'all' });
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useGlobalShortcutsGuard(isModalOpen);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDefaultValue, setModalDefaultValue] = useState('');
  const [onModalSubmit, setOnModalSubmit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contextCategory, setContextCategory] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [globalTags, setGlobalTags] = useState([]);
  const [sortOption, setSortOption] = useState('updated-desc');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkText, setLinkText] = useState('');
  const [linkHref, setLinkHref] = useState('');
  
  const defaultCategory = categories.find(c => c.is_default);

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

  const filteredNotes = notes
  .filter(note => {
    if (noteFilter.type === 'pinned') return note.is_pinned && !note.is_deleted;
    if (noteFilter.type === 'trash') return note.is_deleted;
    if (noteFilter.type === 'category') return note.category === noteFilter.id && !note.is_deleted;
    if (noteFilter.type === 'status') return note.status === noteFilter.status && !note.is_deleted;
    if (noteFilter.type === 'tag') return (note.tags || []).some(t => t.name === noteFilter.tag) && !note.is_deleted;
    return !note.is_deleted;
  })
  .filter(note => {
    if (!searchTerm) return true;
    return (
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  })
  .sort((a, b) => {
    switch (sortOption) {
      case 'title-asc':
        return (a.title ?? '').localeCompare(b.title ?? '');
      case 'title-desc':
        return (b.title ?? '').localeCompare(a.title ?? '');
      case 'created-asc':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'created-desc':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'updated-asc':
        return new Date(a.updated_at) - new Date(b.updated_at);
      case 'updated-desc':
      default:
        return new Date(b.updated_at) - new Date(a.updated_at);
    }
  });


  useEffect(() => {
    window.editorRef = editorRef;
    window.previewRef = previewRef;
  }, []);


    

  const getFilterTitle = () => {
    if (noteFilter.type === 'pinned') return 'Pinned Notes';
    if (noteFilter.type === 'trash') return 'Trash';
    if (noteFilter.type === 'status') return noteFilter.status;
    if (noteFilter.type === 'category') {
      const cat = categories.find(c => c.id === noteFilter.id);
      return cat?.name || 'Not Defteri';
    }
    if (noteFilter.type === 'tag') return `#${noteFilter.tag}`;
    return 'All Notes';
  };

  const restoreNote = (note) => {
    const restored = {
      ...note,
      is_deleted: false,
      tag_ids: (note.tags || []).map(t => t.id),
    };
  
    updateNote(note.id, restored)
      .then((updated) => {
        if (!updated?.id) {
          console.error("Backend geçersiz veri döndürdü.");
          return;
        }
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      })
      .catch(err => {
        console.error("Geri alma API hatası:", err);
      });
  };
  
  const permanentlyDelete = (id) => {
    if (!confirm("Bu not kalıcı olarak silinecek. Emin misiniz?")) return;
    permanentlyDeleteNote(id).then(() => {
      setNotes(prev => prev.filter(n => n.id !== id));
    }).catch(err => {
      console.error("❌ Kalıcı silme hatası:", err);
      alert("Not kalıcı olarak silinemedi.");
    });
  };

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
    Promise.all([fetchCategories(), fetchNotes()])
      .then(([cats, allNotes]) => {
        setCategories(cats);
        setNotes(allNotes);

        const def = cats.find(c => c.is_default);
        if (def) {
          setSelectedCategory(def);
          setNoteFilter({ type: 'category', id: def.id });
        } else {
          setSelectedCategory(cats[0] || null);
        }
      })
      .catch(err => {
        console.error("Veriler alınamadı:", err);
        // Set empty arrays to prevent further errors
        setCategories([]);
        setNotes([]);
      });
  }, []);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent((prev) => {
        if (prev !== selectedNote.content) {
          return selectedNote.content;
        }
        return prev;
      });
      setNoteStatus(selectedNote.status);
      setNoteTags(selectedNote.tags || []);
    } else {
      setTitle('');
      setContent('');
      setNoteStatus('active');
      setNoteTags([]);
    }
  }, [selectedNote]);

  useEffect(() => {
    if (selectedNote?.id) {
      autosaveRef.current({
        ...selectedNote,
        title,
        content,
        status: noteStatus,
        tag_ids: noteTags.map(t => t.id),
      });
    }
  }, [noteTags]);

  const noteStats = NoteStatsManager({ notes, categories });

  const { handleAddNote, handleUpdateNote } = NoteActionsManager({
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
    setNoteFilter,
    setSelectedCategory,
    categories
  });

  const handleDeleteNote = () => {
    if (!selectedNote || !confirm("trush stediğinize emin misiniz?")) return;
  
    const updatedNote = {
      ...selectedNote,
      is_deleted: true,
      tag_ids: (selectedNote.tags || []).map(t => t.id),
    };
  
    updateNote(selectedNote.id, updatedNote).then(() => {
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
      setSelectedNote(null);
    });
  };

  const openModal = (title, defaultValue, onSubmit) => {
    setModalTitle(title);
    setModalDefaultValue(defaultValue);
    setOnModalSubmit(() => onSubmit);
    setIsModalOpen(true);
  };

  const handleAddCategory = () => {
    openModal('Yeni Kategori Ekle', '', name => {
      createCategory({ name }).then(newCategory => {
        setCategories(prev => [...prev, newCategory]);
        if (!selectedCategory) setSelectedCategory(newCategory);
      });
    });
  };

  const handleUpdateCategory = (category, newName) => {
    updateCategory(category.id, { ...category, name: newName })
      .then(updatedCategory => {
        setCategories(categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
        setSelectedCategory(updatedCategory);
      })
      .catch(err => {
        console.error("Kategori güncellenemedi:", err);
        alert("Kategori güncellenemedi!");
      });
  };

  const handleDeleteCategory = (category) => {
    if (!confirm(`"${category.name}" silinsin mi?`)) return;
    deleteCategory(category.id).then(() => {
      setCategories(categories.filter(c => c.id !== category.id));
      setSelectedCategory(null);
      setNotes(notes.filter(n => n.category !== category.id));
    });
  };

  const { handleInsertMarkdown, insertMarkdownAtCursor } = MarkdownManager({
    setContent,
    editorRef
  });

  const handleExportNote = async () => {
    if (!selectedNote) return;
    if (window.api && window.api.exportNote) {
      const exported = await window.api.exportNote({ title, content });
      if (exported) alert('📄 Not başarıyla dışa aktarıldı!');
    }
  };




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
  
  

  const { handleChangeTitle, handleChangeContent } = AutosaveManager({
    selectedNote,
    title,
    content,
    noteStatus,
    noteTags,
    setNotes,
    setTitle,
    setContent
  });

  return (
    <div className="app-container">
      <div className='drag-bar'></div>
      <div className="window-controls">
        <button className='minimize' onClick={() => window.api && window.api.minimize()}>–</button>
        <button className='maximize' onClick={() => window.api && window.api.maximize()}>◻</button>
        <button className='close' onClick={() => window.api && window.api.close()}>×</button>
      </div>

      <Sidebar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        onAddCategory={handleAddCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        setNoteFilter={setNoteFilter}
        noteStats={noteStats}
        setContextCategory={setContextCategory}
        setContextMenuPos={setContextMenuPos}
        setShowContextMenu={setShowContextMenu}
        handleAddCategory={handleAddCategory}
        width={sidebarWidth}
        tagsList={allTags}
        noteFilter={noteFilter}
      />

      <NotesList
        notes={filteredNotes}
        selectedNote={selectedNote}
        onSelectNote={setSelectedNote}
        onAddNote={handleAddNote}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        noteFilter={noteFilter}
        filterTitle={getFilterTitle()}
        restoreNote={restoreNote}
        permanentlyDelete={permanentlyDelete}
        sortOption={sortOption}
        setSortOption={setSortOption}
      />

      {selectedNote ? (
        <div className="editor-panel-container">
          <EditorTop
            title={title}
            setTitle={handleChangeTitle}
            onInsertMarkdown={insertMarkdownAtCursor}
            onSave={handleUpdateNote}
            onDelete={handleDeleteNote}
            onExport={handleExportNote}
            onLinkClick={handleLinkClick}
            categories={categories}
            selectedCategoryId={selectedNote?.category || selectedCategoryId}
            setSelectedCategoryId={(id) => {
              setSelectedCategoryId(id);
              if (selectedNote) {
                const updated = { ...selectedNote, category: parseInt(id) };
                setSelectedNote(updated);
                autosaveRef.current(updated);
              }
            }}
            noteStatus={noteStatus}
            setNoteStatus={(status) => {
              setNoteStatus(status);
              if (selectedNote) {
                const updated = { ...selectedNote, status };
                setSelectedNote(updated);
                autosaveRef.current(updated);
              }
            }}
            noteTags={noteTags}
            setNoteTags={setNoteTags}

            note={selectedNote}
            onTogglePin={() => {
              if (!selectedNote) return;
              const updated = {
                ...selectedNote,
                is_pinned: !selectedNote.is_pinned,
                tag_ids: (selectedNote.tags || []).map(t => t.id),
              };
          
              setSelectedNote(updated);
              setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
          
              updateNote(updated.id, updated)
                .catch(err => console.error('📌 Pin güncelleme hatası:', err));
            
  }}
          />

              <div className="editor-preview-container">
              <MarkdownEditor
                content={content}
                setContent={handleChangeContent}
                editorRef={editorRef}
              />
                <Preview content={content} ref={previewRef} />
              </div>

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
        onModalSubmit={onModalSubmit}
        setIsModalOpen={setIsModalOpen}
        isLinkModalOpen={isLinkModalOpen}
        linkText={linkText}
        setLinkText={setLinkText}
        linkHref={linkHref}
        setLinkHref={setLinkHref}
      />


      {showContextMenu && contextCategory && (
        <div
          className="context-menu"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onMouseLeave={() => setShowContextMenu(false)}
        >
          {!contextCategory.is_default && (
            <>
              <div
                className="context-menu-item"
                onClick={() => {
                  setShowContextMenu(false);
                  openModal("Kategori Adını Değiştir", contextCategory.name, (newName) => {
                    handleUpdateCategory({ ...contextCategory }, newName);
                  });
                }}
              >
                Rename
              </div>
              <div
                className="context-menu-item"
                onClick={() => {
                  setShowContextMenu(false);
                  handleDeleteCategory(contextCategory);
                }}
              >
                Delete
              </div>
            </>
          )}
          {contextCategory.is_default && (
            <div className="context-menu-item disabled" style={{ color: 'var(--text-muted)' }}>
              Sistem kategorisi
            </div>
          )}
        </div>
      )}

      <ThemeManager theme={theme} setTheme={setTheme} />
    </div>
  );
}
