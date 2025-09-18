import { createNote, updateNote } from '../../api';

export default function NoteActionsManager({
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
}) {
  const handleAddNote = (categoryId) => {
    console.log('handleAddNote called with categoryId:', categoryId);
    
    const fallbackCategory = categories.find(c => c.is_default) || categories[0];
    const resolvedCategoryId = categoryId || fallbackCategory?.id;
    console.log('Resolved categoryId:', resolvedCategoryId);

    const newNote = {
      title: 'Yeni Not',
      content: 'write something here ...',
      category: resolvedCategoryId,
      is_pinned: false,
      is_deleted: false,
      status: 'active',
      tag_ids: []
    };

    console.log('Payload for createNote:', newNote);

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
      .then(saved => {
        setNotes(prev => prev.map(n => n.id === saved.id ? saved : n));
        setSelectedNote(saved);
      })
      .catch(err => console.error('Not güncellenemedi:', err));
  };

  return { handleAddNote, handleUpdateNote };
}