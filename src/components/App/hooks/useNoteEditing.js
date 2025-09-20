import { useEffect, useRef, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { storage } from '../../../storage';

// Tek bir noktadan seçilen notun düzenleme (draft) state'ini ve autosave'i yönetir
export default function useNoteEditing({ selectedNote, setNotes, setSelectedNote }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteStatus, setNoteStatus] = useState('active');
  const [noteTags, setNoteTags] = useState([]);

  // Orijinal not referansı değiştikçe draft'ı senkronize et
  useEffect(() => {
    if (selectedNote) {
      setTitle(selectedNote.title || '');
      setContent(selectedNote.content || '');
      setNoteStatus(selectedNote.status || 'active');
      setNoteTags(selectedNote.tags || []);
    } else {
      setTitle('');
      setContent('');
      setNoteStatus('active');
      setNoteTags([]);
    }
  }, [selectedNote]);

  const autosaveDebounced = useRef(
    debounce((draft) => {
      if (!draft?.id) return;
      storage.updateNote(draft.id, draft)
        .then(saved => {
          if (!saved?.id) return;
          const merged = {
            ...saved,
            // localProvider set etmişse saved.tags vardır, yoksa draft.tags fallback
            tags: Array.isArray(saved.tags) ? saved.tags : (draft.tags || [])
          };
          setNotes(prev => prev.map(n => n.id === merged.id ? merged : n));
          setSelectedNote(prev => prev && prev.id === merged.id ? merged : prev);
        })
        .catch(err => console.error('Autosave error:', err));
    }, 1000)
  );

  // Draft güncelleme helper
  const queueAutosave = useCallback((partial) => {
    if (!selectedNote?.id) return;
    const draft = {
      ...selectedNote,
      title,
      content,
      status: noteStatus,
      tag_ids: (noteTags || []).map(t => t.id),
      tags: noteTags, // UI senkron için draft'a ekle
      ...partial,
    };
    autosaveDebounced.current(draft);
  }, [selectedNote, title, content, noteStatus, noteTags]);

  const updateTitle = (val) => {
    setTitle(val);
    queueAutosave({ title: val });
  };

  const updateContent = (val) => {
    setContent(val);
    queueAutosave({ content: val });
  };

  const updateStatus = (status) => {
    setNoteStatus(status);
    queueAutosave({ status });
    if (selectedNote) {
      const updated = { ...selectedNote, status };
      setSelectedNote(updated);
    }
  };

  const updateTags = (next) => {
    const resolved = typeof next === 'function' ? next(noteTags) : next;
    const safeArray = Array.isArray(resolved) ? resolved : [];
    setNoteTags(safeArray);
    queueAutosave({ tag_ids: safeArray.map(t => t.id) });
    if (selectedNote) {
      // selectedNote'u da anında güncelle ki UI gecikmesin
      const updated = { ...selectedNote, tags: safeArray };
      setSelectedNote(updated);
    }
  };

  const updateCategory = (categoryId) => {
    if (!selectedNote) return;
    const updated = { ...selectedNote, category: parseInt(categoryId, 10) };
    setSelectedNote(updated);
    queueAutosave({ category: parseInt(categoryId, 10) });
  };

  // Pin toggle dışarıdan kullanıma uygun kalsın diye fonksiyon döndürmüyoruz; App içinde kalabilir.

  return {
    title,
    content,
    noteStatus,
    noteTags,
    setNoteTags: updateTags,
    setNoteStatus: updateStatus,
    setTitle: updateTitle,
    setContent: updateContent,
    updateCategory,
  };
}
