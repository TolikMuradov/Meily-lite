import { useCallback } from 'react';
import { storage } from '../../../storage';

export default function useNoteActions({
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
}) {
  const handleAddNote = useCallback((categoryId) => {
    // Use provided categoryId; allow null (uncategorized) if none selected
    console.log('[handleAddNote] incoming categoryId =', categoryId);
    const newNote = {
      title: 'Untitled',
      content: 'write something here ...',
      category: categoryId || null,
      is_pinned: false,
      is_deleted: false,
      status: 'active',
      tag_ids: []
    };
    console.log('[handleAddNote] payload.category =', newNote.category);

  storage.createNote(newNote)
      .then(note => {
        if (note?.id) {
          setNotes(prev => [note, ...prev]);
          setSelectedNote(note);
          setTitle(note.title);
          setContent(note.content);
        } else {
          alert('Note could not be created.');
        }
      })
  .catch(err => console.error('Note could not be created:', err));
  }, [setNotes, setSelectedNote, setTitle, setContent]);

  const handleUpdateNote = useCallback(() => {
    if (!selectedNote?.id) return alert('Güncellemek için not seçmelisin!');
    const updatedNote = {
      ...selectedNote,
  title: title || 'Untitled',
      content: content || 'İçerik boş olamaz',
      status: noteStatus,
      tag_ids: noteTags.map(t => t.id)
    };

  storage.updateNote(selectedNote.id, updatedNote)
      .then(saved => {
        setNotes(prev => prev.map(n => n.id === saved.id ? saved : n));
        setSelectedNote(saved);
      })
  .catch(err => console.error('Note could not be updated:', err));
  }, [selectedNote, title, content, noteStatus, noteTags, setNotes, setSelectedNote]);

  return { handleAddNote, handleUpdateNote };
}
// Ek aksiyonlar eklendi

export function extendNoteActions(base, deps) {
  const { selectedNote, setSelectedNote, setNotes, title, content, noteTags } = deps;

  const handleSoftDelete = useCallback(() => {
    if (!selectedNote || !confirm('trush stediğinize emin misiniz?')) return;
    const updatedNote = {
      ...selectedNote,
      is_deleted: true,
      tag_ids: (selectedNote.tags || []).map(t => t.id),
    };
  storage.updateNote(selectedNote.id, updatedNote).then(() => {
      setNotes(prev => prev.map(n => n.id === selectedNote.id ? updatedNote : n));
      setSelectedNote(null);
    });
  }, [selectedNote, setNotes, setSelectedNote]);

  const handleRestore = useCallback((note) => {
    const restored = {
      ...note,
      is_deleted: false,
      tag_ids: (note.tags || []).map(t => t.id),
    };
  storage.updateNote(note.id, restored)
      .then(updated => {
        if (!updated?.id) return;
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      })
      .catch(err => console.error('Geri alma API hatası:', err));
  }, [setNotes]);

  const handlePermanentDelete = useCallback((id) => {
    if (!confirm('Bu not kalıcı olarak silinecek. Emin misiniz?')) return;
  storage.forceDeleteNote(id)
      .then(() => setNotes(prev => prev.filter(n => n.id !== id)))
      .catch(err => {
        console.error('Kalıcı silme hatası:', err);
        alert('Not kalıcı olarak silinemedi.');
      });
  }, [setNotes]);

  const handleTogglePin = useCallback(() => {
    if (!selectedNote) return;
    const updated = {
      ...selectedNote,
      is_pinned: !selectedNote.is_pinned,
      tag_ids: (selectedNote.tags || []).map(t => t.id),
    };
    setSelectedNote(updated);
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
  storage.updateNote(updated.id, updated).catch(err => console.error('Pin güncelleme hatası:', err));
  }, [selectedNote, setSelectedNote, setNotes]);

  const handleExport = useCallback(async () => {
    if (!selectedNote) return;
    if (window.api && window.api.exportNote) {
      const exported = await window.api.exportNote({ title, content });
      if (exported) alert('📄 Not başarıyla dışa aktarıldı!');
    }
  }, [selectedNote, title, content]);

  return {
    ...base,
    handleSoftDelete,
    handleRestore,
    handlePermanentDelete,
    handleTogglePin,
    handleExport,
  };
}
