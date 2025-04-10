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
  fetchCategories, fetchNotesByCategory, createNote, 
  updateNote, deleteNote, createCategory, 
  updateCategory, deleteCategory, 
} from './api';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('selectedTheme') || 'TokyoNight';
  });

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDefaultValue, setModalDefaultValue] = useState('');
  const [onModalSubmit, setOnModalSubmit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [noteFilter, setNoteFilter] = useState({ type: 'all' });
  const [contextCategory, setContextCategory] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const defaultCategory = categories.find(c => c.is_default);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [noteStatus, setNoteStatus] = useState('active');
  const [noteTags, setNoteTags] = useState([]);

  const allTags = [...new Set(notes.flatMap(n => n.tags || []))];



  const filteredNotes = notes
  .filter(note => {
    if (noteFilter.type === 'pinned') return note.is_pinned && !note.is_deleted;
    if (noteFilter.type === 'trash') return note.is_deleted;
    if (noteFilter.type === 'category') return note.category === noteFilter.id && !note.is_deleted;
    if (noteFilter.type === 'status') return note.status === noteFilter.status && !note.is_deleted;
    return !note.is_deleted; // all
  })
  .filter(note => {
    if (!searchTerm) return true;
    return (
      note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  const getFilterTitle = () => {
    if (noteFilter.type === 'pinned') return "Pinned Notes";
    if (noteFilter.type === 'trash') return "Trash";
    if (noteFilter.type === 'status') {
      return noteFilter.status.charAt(0).toUpperCase() + noteFilter.status.slice(1);
    }
    if (noteFilter.type === 'category') {
      const cat = categories.find(c => c.id === noteFilter.id);
      return cat?.name || "Not Defteri";
    }
    return "All Notes";
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
    window.api.onTransparentToggle((value) => {
      if (value) {
        document.body.classList.remove('opaque');
      } else {
        document.body.classList.add('opaque');
      }
    });
  }, []);
  
 // Uygulama açılışında tema localStorage'dan alınarak ayarlansın
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);

  useEffect(() => {
    window.api.onThemeChange((theme) => {
      setTheme(theme);
      localStorage.setItem('selectedTheme', theme); // <-- yerel depolamaya kaydet
      document.documentElement.setAttribute('data-theme', theme);
    });
  }, []);

  useEffect(() => {
    fetchCategories().then(data => {
      console.log("Gelen kategoriler:", data); // 🔥 ekle
      setCategories(data);
      setSelectedCategory(data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchNotesByCategory(selectedCategory.id).then(data => {
        setNotes(data.notes);
        setSelectedNote(null);
      });
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title);
      setContent(selectedNote.content);
      setNoteStatus(selectedNote.status); // ✅ yeni
    } else {
      setTitle('');
      setContent('');
      setNoteStatus('active');
      setNoteTags(selectedNote?.tags || []);
    }
  }, [selectedNote]);

  const autosaveRef = useRef(
    debounce((note) => {
      if (!note.category) {
        console.warn("⛔ Kategori atanmadı, autosave iptal.");
        return;
      }
      updateNote(note.id, note)
        .then((saved) => {
          console.log("📝 Otomatik kaydedildi:", saved.title);
          setNotes(prev => prev.map(n => n.id === saved.id ? saved : n));
        })
        .catch((err) => {
          console.error("Autosave hatası:", err);
        });
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
        tags: noteTags,
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
        status: noteStatus, // ✅
      });
    }
  };
  
  

  const handleAddNote = () => {
    let categoryId = null;
  
    if (noteFilter.type === 'category') {
      categoryId = noteFilter.id;
    } else if (selectedCategory?.id) {
      categoryId = selectedCategory.id;
    }
  
    if (!categoryId) {
      const fallback = categories.find(c => c.is_default) || categories[0];
      categoryId = fallback.id;
      setSelectedCategory(fallback);
      setNoteFilter({ type: 'category', id: fallback.id });
    }
  
    const newNote = {
      title: "Yeni Not",
      content: "write something here ...",
      category: categoryId,
      is_pinned: false,
      is_deleted: false,
      status: "active",
      tags: [],
    };
    console.log("Yeni not gönderiliyor:");
    console.log(JSON.stringify(newNote, null, 2));

  
    createNote(newNote)
      .then(note => {
        if (note && note.id) {
          setNotes(prev => [note, ...prev]);
          setSelectedNote(note); // 🔥 Editörü aç
          setTitle(note.title);
          setContent(note.content);
        } else {
          alert("Not oluşturulamadı.");
        }
      })
      .catch(err => {
        console.error("Not oluşturulamadı:", err);
      });
  };
  

  const handleUpdateNote = () => {
    if (!selectedNote || !selectedNote.id) {
      alert("Güncellemek için önce not seçmelisin!");
      return;
    }
  
    const updatedNote = {
      ...selectedNote,
      title: title || "Başlıksız",
      content: content || "İçerik boş olamaz",
    };
  
    updateNote(selectedNote.id, updatedNote)
      .then(note => {
        if (note && note.id) {
          setNotes(notes.map(n => (n.id === note.id ? note : n)));
          setSelectedNote(note);
        } else {
          alert('Backend geçersiz veri döndü.');
          console.error("Backend response:", note);
        }
      })
      .catch(err => {
        console.error("Güncelleme hatası:", err);
        alert("Not güncellenemedi!");
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
      createCategory({ name }).then(category => {
        setCategories([...categories, category]);
        setSelectedCategory(category);
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
      setNotes(notes.filter(n => n.category !== category.id)); // ilgili notları da sil
    });
  };

  const handleInsertMarkdown = (syntax) => {
    setContent((prev) => prev + syntax);
  };

  const handleExportNote = async () => {
    if (!selectedNote) return;
    const exported = await window.api.exportNote({
      title,
      content
    });
    if (exported) {
      alert('📄 Not başarıyla dışa aktarıldı!');
    }
  };


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
  };
  
 
  if (Array.isArray(categories) && categories.length > 0) {
    categories.forEach(cat => {
      noteStats.category[cat.id] = notes.filter(n => n.category === cat.id && !n.is_deleted).length;
    });
  }
  
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
                  autosaveRef.current(updated); // hemen kaydet
                }
              }}
              noteStatus={noteStatus} // ✅
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
          <MarkdownEditor
            content={content}
            setContent={handleChangeContent}
/>
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
    {/* Sadece default olmayan kategoriler için bu seçenekleri göster */}
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

    {/* Eğer default kategori ise mesaj göster (isteğe bağlı) */}
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
