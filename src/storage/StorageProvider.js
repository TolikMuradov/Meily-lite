// Generic storage provider factory
export function createStorage(provider) {
  return {
    getNotes: () => provider.getNotes(),
    createNote: (note) => provider.createNote(note),
    updateNote: (id, patch) => provider.updateNote(id, patch),
    softDeleteNote: (id) => provider.softDeleteNote(id),
    forceDeleteNote: (id) => provider.forceDeleteNote(id),
    getCategories: () => provider.getCategories(),
    createCategory: (cat) => provider.createCategory(cat),
    updateCategory: (id, patch) => provider.updateCategory(id, patch),
    deleteCategory: (id) => provider.deleteCategory(id),
    getTags: () => provider.getTags?.() ?? [],
    createTag: (t) => provider.createTag?.(t),
    updateTag: (id, t) => provider.updateTag?.(id, t),
    deleteTag: (id) => provider.deleteTag?.(id),
  };
}
