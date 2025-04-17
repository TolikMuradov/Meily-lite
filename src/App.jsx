// 🔄 GÜNCELLENMİŞ App.jsx - Tag filtre desteğiyle

import { useState, useEffect, useRef } from 'react';
import { debounce } from 'lodash';
import './index.css';
import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import MarkdownEditor from './components/MarkdownEditor';
import Preview from './components/Preview';
import EditorTop from './components/EditorTop';
import Modal from './components/Modal';
import {
  fetchCategories, fetchNotes, createNote,
  updateNote, deleteNote, createCategory,
  updateCategory, deleteCategory
} from './api';

export default function App() {
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


  const defaultCategory = categories.find(c => c.is_default);

  const uniqueTags = [...new Set(
    notes.flatMap(n => (n.tags || []).map(t => t.name))

  )];

    const allTags = uniqueTags.map(name => {
    const tagObj = notes.find(n => (n.tags || []).some(t => t.name === name));
    const fullTag = tagObj?.tags?.find(t => t.name === name);

    return {
      id: fullTag?.id ?? name, // 🔐 key için garanti
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
      if (noteFilter.type === 'tag')
        return (note.tags || []).some(t => t.name === noteFilter.tag) && !note.is_deleted;
      
      return !note.is_deleted;
    })
    .filter(note => {
      if (!searchTerm) return true;
      return (
        note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
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
        tag_ids: noteTags.filter(t => t.id).map(t => t.id),
      });
    }
  }

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

  useEffect(() => document.documentElement.setAttribute('data-theme', theme), [theme]);

  useEffect(() => {
    Promise.all([fetchCategories(), fetchNotes()])
      .then(([cats, allNotes]) => {
        setCategories(cats);
        setNotes(allNotes);
        setSelectedCategory(cats[0] || null);
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
    all: Array.isArray(notes) ? notes.filter(n => !n.is_deleted).length : 0,
    pinned: Array.isArray(notes) ? notes.filter(n => n.is_pinned && !n.is_deleted).length : 0,
    trash: Array.isArray(notes) ? notes.filter(n => n.is_deleted).length : 0,
    status: {
      active: 0,
      on_hold: 0,
      completed: 0,
      dropped: 0,
    },
    category: {},
    tags: {},
  };
  
  if (Array.isArray(notes)) {
    noteStats.status.active = notes.filter(n => n.status === 'active' && !n.is_deleted).length;
    noteStats.status.on_hold = notes.filter(n => n.status === 'on_hold' && !n.is_deleted).length;
    noteStats.status.completed = notes.filter(n => n.status === 'completed' && !n.is_deleted).length;
    noteStats.status.dropped = notes.filter(n => n.status === 'dropped' && !n.is_deleted).length;
  }

  categories.forEach(cat => {
    noteStats.category[cat.id] = notes.filter(n => n.category === cat.id && !n.is_deleted).length;
  });
  allTags.forEach(tag => {
    noteStats.tags[tag.name] = notes.filter(n =>
      (n.tags || []).some(t => t.name === tag.name) && !n.is_deleted
    ).length;
  });

  const handleAddNote = () => {
    let categoryId = null;
    if (noteFilter.type === 'category') categoryId = noteFilter.id;
    else if (selectedCategory?.id) categoryId = selectedCategory.id;
    if (!categoryId) {
      const fallback = categories.find(c => c.is_default) || categories[0];
      categoryId = fallback.id;
      setSelectedCategory(fallback);
      setNoteFilter({ type: 'category', id: fallback.id });
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
    createNote(newNote).then(note => {
      if (note?.id) {
        setNotes(prev => [note, ...prev]);
        setSelectedNote(note);
        setTitle(note.title);
        setContent(note.content);
      } else alert('Not oluşturulamadı.');
    }).catch(err => console.error('Not oluşturulamadı:', err));
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
          console.error('Backend response:', note);
        }
      })
      .catch(err => {
        console.error('Güncelleme hatası:', err);
        alert('Not güncellenemedi!');
      });
  };
  const handleDeleteNote = () => {
    if (!selectedNote || !confirm('Silmek istediğinize emin misiniz?')) return;
    deleteNote(selectedNote.id).then(() => {
      setNotes(notes.filter(n => n.id !== selectedNote.id));
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
  
        // Eğer hiç kategori seçili değilse (ilk kategori)
        if (!selectedCategory) {
          setSelectedCategory(newCategory);
        }
  
        // Eğer kullanıcı yeni kategoriye geçmek istiyorsa bu satırı aktif et:
        // setSelectedCategory(newCategory);
      });
    });
  };

  const handleUpdateCategory = category => {
    openModal('Kategoriyi Düzenle', category.name, newName => {
      updateCategory(category.id, { ...category, name: newName }).then(updatedCategory => {
        setCategories(categories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat));
        setSelectedCategory(updatedCategory);
      });
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
      />

      {selectedNote ? (
        <div className="editor-panel-container">
          <EditorTop
            title={title}
            setTitle={handleChangeTitle}
            onInsertMarkdown={handleInsertMarkdown}
            onSave={handleUpdateNote}
            onDelete={handleDeleteNote}
            onExport={handleExportNote}
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
          />

          <div className="editor-preview-container">
            <MarkdownEditor content={content} setContent={handleChangeContent} />
            <Preview note={{ title, content }} />
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
