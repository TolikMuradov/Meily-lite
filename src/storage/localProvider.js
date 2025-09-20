import { get, set } from 'idb-keyval';

const KEYS = { notes: 'notes', categories: 'categories', tags: 'tags' };

async function ensureArray(key) {
  const val = await get(key);
  if (Array.isArray(val)) return val;
  await set(key, []);
  return [];
}

function genId() { return Date.now() + Math.floor(Math.random() * 1000); }

const localProvider = {
  async getNotes() { return ensureArray(KEYS.notes); },
  async createNote(note) {
    const list = await ensureArray(KEYS.notes);
    const tagList = await ensureArray(KEYS.tags);
    const resolvedTags = Array.isArray(note.tag_ids)
      ? tagList.filter(t => note.tag_ids.includes(t.id))
      : (note.tags || []);
    const newNote = {
      ...note,
      tags: resolvedTags,
      id: genId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await set(KEYS.notes, [newNote, ...list]);
    return newNote;
  },
  async updateNote(id, patch) {
    const list = await ensureArray(KEYS.notes);
    const tagList = await ensureArray(KEYS.tags);
    const updated = list.map(n => {
      if (n.id !== id) return n;
      const tagIds = Array.isArray(patch.tag_ids) ? patch.tag_ids : (patch.tags ? patch.tags.map(t => t.id) : n.tags?.map(t => t.id) || []);
      const resolvedTags = tagList.filter(t => tagIds.includes(t.id));
      return {
        ...n,
        ...patch,
        tags: resolvedTags,
        updated_at: new Date().toISOString()
      };
    });
    await set(KEYS.notes, updated);
    return updated.find(n => n.id === id);
  },
  async softDeleteNote(id) {
    const list = await ensureArray(KEYS.notes);
    const updated = list.map(n => n.id === id ? { ...n, is_deleted: true } : n);
    await set(KEYS.notes, updated);
    return true;
  },
  async forceDeleteNote(id) {
    const list = await ensureArray(KEYS.notes);
    await set(KEYS.notes, list.filter(n => n.id !== id));
    return true;
  },
  async getCategories() { return ensureArray(KEYS.categories); },
  async createCategory(cat) {
    const list = await ensureArray(KEYS.categories);
    const { is_default, ...rest } = cat || {};
    const newCat = { id: genId(), ...rest };
    await set(KEYS.categories, [...list, newCat]);
    return newCat;
  },
  async updateCategory(id, patch) {
    const list = await ensureArray(KEYS.categories);
    const updated = list.map(c => c.id === id ? { ...c, ...patch } : c);
    await set(KEYS.categories, updated);
    return updated.find(c => c.id === id);
  },
  async deleteCategory(id) {
    const list = await ensureArray(KEYS.categories);
    await set(KEYS.categories, list.filter(c => c.id !== id));
    return true;
  },
  async getTags() { return ensureArray(KEYS.tags); },
  async createTag(tag) {
    const list = await ensureArray(KEYS.tags);
    const newTag = { ...tag, id: genId() };
    await set(KEYS.tags, [...list, newTag]);
    return newTag;
  },
  async updateTag(id, patch) {
    const list = await ensureArray(KEYS.tags);
    const updatedTags = list.map(t => t.id === id ? { ...t, ...patch } : t);
    await set(KEYS.tags, updatedTags);
    // Notes içindeki tag referanslarını da güncelle
    const notes = await ensureArray(KEYS.notes);
    const newNotes = notes.map(n => {
      if (!Array.isArray(n.tags)) return n;
      const changed = n.tags.some(t => t.id === id);
      if (!changed) return n;
      return {
        ...n,
        tags: n.tags.map(t => t.id === id ? updatedTags.find(x => x.id === id) : t),
        updated_at: new Date().toISOString()
      };
    });
    await set(KEYS.notes, newNotes);
    return updatedTags.find(t => t.id === id);
  },
  async deleteTag(id) {
    const list = await ensureArray(KEYS.tags);
    await set(KEYS.tags, list.filter(t => t.id !== id));
    return true;
  }
};

export default localProvider;
