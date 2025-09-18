function calculateNoteStats(notes, categories) {
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

  notes.forEach(note => {
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach(tag => {
        if (!noteStats.tags[tag.name]) {
          noteStats.tags[tag.name] = { count: 0, id: tag.id, color: tag.color || '#E45826' };
        }
        noteStats.tags[tag.name].count += 1;
      });
    }
  });

  return noteStats;
}

export default calculateNoteStats;