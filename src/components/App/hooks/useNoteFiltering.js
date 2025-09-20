import { useMemo } from 'react';

export default function useNoteFiltering({ notes, noteFilter, searchTerm, sortOption, categories }) {
  const filteredNotes = useMemo(() => {
    if (!Array.isArray(notes)) return [];
    return notes
      .filter(note => {
        if (noteFilter?.type === 'pinned') return note.is_pinned && !note.is_deleted;
        if (noteFilter?.type === 'trash') return note.is_deleted;
  if (noteFilter?.type === 'category') return note.category === noteFilter.id && !note.is_deleted;
        if (noteFilter?.type === 'status') return note.status === noteFilter.status && !note.is_deleted;
        if (noteFilter?.type === 'tag') return (note.tags || []).some(t => t.name === noteFilter.tag) && !note.is_deleted;
        return !note.is_deleted;
      })
      .filter(note => {
        if (!searchTerm) return true;
        const t = searchTerm.toLowerCase();
        return (
          (note.title || '').toLowerCase().includes(t) ||
          (note.content || '').toLowerCase().includes(t)
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
  }, [notes, noteFilter, searchTerm, sortOption]);

  const getFilterTitle = () => {
    if (noteFilter?.type === 'pinned') return 'Pinned Notes';
    if (noteFilter?.type === 'trash') return 'Trash';
  if (noteFilter?.type === 'status') return noteFilter.status;
    if (noteFilter?.type === 'category') {
      const cat = categories?.find(c => c.id === noteFilter.id);
      return cat?.name || 'Not Defteri';
    }
    if (noteFilter?.type === 'tag') return `#${noteFilter.tag}`;
    return 'All Notes';
  };

  return { filteredNotes, getFilterTitle };
}
