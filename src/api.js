const API_URL = import.meta.env.VITE_API_URL;


export const fetchCategories = async () => {
  const res = await fetch(`${API_URL}/categories/`);
  if (!res.ok) {
    const text = await res.text();
    console.error("❌ API HATASI:", text);
    throw new Error("fetchCategories başarısız");
  }
  return res.json();
};

export const fetchNotes = (includeDeleted = false) =>
  fetch(`${API_URL}/notes/?include_deleted=${includeDeleted}`).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  });



export const fetchNotesByCategory = (categoryId) =>
  fetch(`${API_URL}/categories/${categoryId}/`).then(res => res.json());

export const createNote = async (note) => {
  try {
    const res = await fetch(`${API_URL}/notes/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note)
    });
    const data = await res.json();
    if (!res.ok) {
  console.error("❌ Note could not be created:", data);
      throw new Error("Create note failed");
    }
    return data;
  } catch (err) {
    console.error("❌ Bağlantı hatası:", err);
    throw err;
  }
};

  
export const updateNote = (id, note) =>
  fetch(`${API_URL}/notes/${id}/`, {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(note)
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) {
      console.error("❌ API HATASI:", JSON.stringify(data, null, 2));
    }
    return data;
  });

export const deleteNote = (id) =>
    fetch(`${API_URL}/notes/${id}/`, {
      method: 'DELETE',
    });
      

//kategory
// Yeni kategori oluştur
export const createCategory = (category) =>
    fetch(`${API_URL}/categories/`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(category)
    }).then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    }).catch(err => {
      console.error('Create category failed:', err);
      throw err;
    });
  
  // Kategori güncelle
  export const updateCategory = (id, category) =>
    fetch(`${API_URL}/categories/${id}/`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(category)
    }).then(res => res.json());
  
  // Kategori sil
  export const deleteCategory = (id) =>
    fetch(`${API_URL}/categories/${id}/`, {
      method: 'DELETE',
    });

    export const fetchTags = () =>
      fetch(`${API_URL}/tags/`).then(res => res.json());

    export const createTag = (tag) =>
      fetch(`${API_URL}/tags/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tag)
      }).then(res => res.json());
    
    

      export const updateTag = (id, tag) =>
        fetch(`${API_URL}/tags/${id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tag)
        }).then(res => res.json());
      
        export const deleteTag = (id) =>
          fetch(`${API_URL}/tags/${id}/`, {
            method: 'DELETE',
          }).then(res => {
            if (!res.ok) throw new Error('Tag silinemedi');
            return true;
          });
        
          export const permanentlyDeleteNote = (id) =>
            fetch(`${API_URL}/notes/${id}/force-delete/`, {
              method: 'DELETE',
            }).then(res => {
              if (!res.ok) throw new Error('Kalıcı silme başarısız');
              return true;
            });
          