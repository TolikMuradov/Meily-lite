import * as api from '../api';

const remoteProvider = {
  async getNotes() { return api.fetchNotes(); },
  async createNote(note) { return api.createNote(note); },
  async updateNote(id, patch) { return api.updateNote(id, patch); },
  async softDeleteNote(id) { return api.updateNote(id, { is_deleted: true }); },
  async forceDeleteNote(id) { return api.permanentlyDeleteNote(id); },
  async getCategories() { return api.fetchCategories(); },
  async createCategory(cat) { return api.createCategory(cat); },
  async updateCategory(id, patch) { return api.updateCategory(id, patch); },
  async deleteCategory(id) { return api.deleteCategory(id); },
  async getTags() { return api.fetchTags?.() || []; },
  async createTag(tag) { return api.createTag?.(tag); },
  async updateTag(id, tag) { return api.updateTag?.(id, tag); },
  async deleteTag(id) { return api.deleteTag?.(id); },
};

export default remoteProvider;
