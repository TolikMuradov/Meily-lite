import { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import './index.css';
import './css/Modal.css';
import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import MarkdownEditor from './components/MarkdownEditor';
import Preview from './components/Preview';
import EditorTop from './components/EditorTop';
import Modal from './components/Modal';
import {
  fetchCategories, fetchNotes, createNote,
  updateNote, deleteNote, createCategory,
  updateCategory, deleteCategory, permanentlyDeleteNote,
} from './api';

export default function App() {
  
  const editorRef = useRef(null);

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

  const autosaveRef = useRef(
    debounce((note) => {
      if (!note.category) return;
      updateNote(note.id, note)
        .then(saved => setNotes(prev => prev.map(n => n.id === saved.id ? saved : n)))
        .catch(err => console.error("Autosave hatası:", err));
    }, 1000)
  );

  const handleChangeTitle = (val) => {
    setTitle(val);
    if (selectedNote?.id) {
      autosaveRef.current({
        ...selectedNote,
        title: val,
        content,
        status: noteStatus,
        tag_ids: noteTags.map(t => t.id),
      });
    }
  };

  const handleChangeContent = (val) => {
    setContent(val);
    if (selectedNote?.id) {
      autosaveRef.current({
        ...selectedNote,
        title,
        content: val,
        status: noteStatus,
        tag_ids: noteTags.map(t => t.id),
      });
    }
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
    if (window.api?.onTransparentToggle) {
      window.api.onTransparentToggle((value) => {
        document.body.classList.toggle('opaque', !value);
        localStorage.setItem('transparentMode', value ? 'true' : 'false');
      });
    }
  }, []);

  useEffect(() => {
    window.api.onThemeChange((theme) => {
      setTheme(theme);
      localStorage.setItem('selectedTheme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    });
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
      .catch(err => console.error("Veriler alınamadı:", err));
  }, []);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
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

  const noteStats = {
    all: notes.filter(n => !n.is_deleted).length,
    pinned: notes.filter(n => n.is_pinned && !n.is_deleted).length,
    trash: notes.filter(n => n.is_deleted).length,
    status: {
      active: notes.filter(n => n.status === 'active' && !n.is_deleted).length,
      on_hold: notes.filter(n => n.status === 'on_hold' && !n.is_deleted).length,
      completed: notes.filter(n => n.status === 'completed' && !n.is_deleted).length,
      dropped: notes.filter(n => n.status === 'dropped' && !n.is_deleted).length,
    },
    category: {},
    tags: {}
  };

  categories.forEach(cat => {
    noteStats.category[cat.id] = notes.filter(n => n.category === cat.id && !n.is_deleted).length;
  });
  allTags.forEach(tag => {
    noteStats.tags[tag.name] = notes.filter(n =>
      (n.tags || []).some(t => t.name === tag.name) && !n.is_deleted
    ).length;
  });

  const handleAddNote = () => {
    const defaultCategory = categories.find(c => c.is_default);
    let categoryId = null;

    if (noteFilter.type === 'category') {
      categoryId = noteFilter.id;
    } else if (selectedCategory?.id) {
      categoryId = selectedCategory.id;
    }

    if (!categoryId) {
      const fallback = defaultCategory || categories[0];
      if (fallback) {
        categoryId = fallback.id;
        setSelectedCategory(fallback);
        setNoteFilter({ type: 'category', id: fallback.id });
      }
    }

    const newNote = {
      title: 'Yeni Not',
      content: 'write something here ...',
      category: categoryId,
      is_pinned: false,
      is_deleted: false,
      status: 'active',
      tag_ids: []
    };

    createNote(newNote)
      .then(note => {
        if (note?.id) {
          setNotes(prev => [note, ...prev]);
          setSelectedNote(note);
          setTitle(note.title);
          setContent(note.content);
        } else {
          alert('Not oluşturulamadı.');
        }
      })
      .catch(err => console.error('Not oluşturulamadı:', err));
  };
  
  

  const handleUpdateNote = () => {
    if (!selectedNote?.id) return alert('Güncellemek için not seçmelisin!');
    const updatedNote = {
      ...selectedNote,
      title: title || "Başlıksız",
      content: content || "İçerik boş olamaz",
      status: noteStatus,
      tag_ids: noteTags.map(t => t.id)
    };
    updateNote(selectedNote.id, updatedNote)
      .then(note => {
        if (note?.id) {
          setNotes(notes.map(n => n.id === note.id ? note : n));
          setSelectedNote(note);
        } else {
          alert('Backend geçersiz veri döndü.');
        }
      })
      .catch(err => {
        console.error('Güncelleme hatası:', err);
        alert('Not güncellenemedi!');
      });
  };

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

  const handleInsertMarkdown = (syntax) => setContent((prev) => prev + syntax);

  const handleExportNote = async () => {
    if (!selectedNote) return;
    const exported = await window.api.exportNote({ title, content });
    if (exported) alert('📄 Not başarıyla dışa aktarıldı!');
  };




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
        head: selection.from + newText.length - snippetEnd.length
      },
      scrollIntoView: true
    });
  
    view.focus();
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
  

  return (
    <div className="app-container">
      <div className='drag-bar'></div>
      <div className="window-controls">
        <button className='minimize' onClick={() => window.api.minimize()}>–</button>
        <button className='maximize' onClick={() => window.api.maximize()}>◻</button>
        <button className='close' onClick={() => window.api.close()}>×</button>
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
                setContent={setContent}
                editorRef={editorRef}
              />
                <Preview content={content} />
              </div>

        </div>
      ) : (
        <div className="editor-placeholder">
          <h2>📝 Not seçilmedi</h2>
          <p>Notu düzenlemek için bir not seçin ya da yeni not oluşturun.</p>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        title={modalTitle}
        defaultValue={modalDefaultValue}
        onSubmit={onModalSubmit}
        onClose={() => setIsModalOpen(false)}
      />

{isLinkModalOpen && (
  <div className="modal-overlay">
    <div className="modal-content" onClick={e => e.stopPropagation()}>
      <h3>Link Ekle</h3>
      <form onSubmit={(e) => {
          e.preventDefault(); // sayfa yenilenmesini engelle
          const view = editorRef.current;
          if (!view) return;

          const { state, dispatch } = view;
          const selection = state.selection.main;

          const markdown = `[${linkText}](${linkHref})`;

          dispatch({
            changes: { from: selection.from, to: selection.to, insert: markdown },
            selection: {
              anchor: selection.from + markdown.length,
            },
            scrollIntoView: true,
          });

          setIsLinkModalOpen(false);
        }}>
      <label>Metin</label>
      <input
        type="text"
        value={linkText}
        onChange={(e) => setLinkText(e.target.value)}
      />

      <label>URL</label>
      <input
        type="text"
        value={linkHref}
        onChange={(e) => setLinkHref(e.target.value)}
        placeholder="https://..."
      />

      <div className="modal-buttons">
        <button className="btn" onClick={() => {
          const view = editorRef.current;
          if (!view) return;

          const { state, dispatch } = view;
          const selection = state.selection.main;

          const markdown = `[${linkText}](${linkHref})`;

          dispatch({
            changes: { from: selection.from, to: selection.to, insert: markdown },
            selection: {
              anchor: selection.from + markdown.length,
            },
            scrollIntoView: true,
          });

          setIsLinkModalOpen(false);
        }}>Ekle</button>
        <button className="btn" onClick={() => setIsLinkModalOpen(false)}>İptal</button>
      </div>
      </form>
    </div>
  </div>
)}


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
      
    </div>
  );
}
