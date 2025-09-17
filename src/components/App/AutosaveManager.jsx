import { useRef } from 'react';
import { debounce } from 'lodash';
import { updateNote } from '../../api';

export default function AutosaveManager({
  selectedNote,
  title,
  content,
  noteStatus,
  noteTags,
  setNotes,
  setTitle,
  setContent
}) {
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

  return { handleChangeTitle, handleChangeContent };
}