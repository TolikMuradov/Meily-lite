const API_URL = 'http://52.65.1.213:8000/api';


export const fetchCategories = () =>
  fetch(`${API_URL}/categories/`).then(res => res.json());

export const fetchNotes = () =>
  fetch(`${API_URL}/notes/`).then(res => res.json());

export const fetchNotesByCategory = (categoryId) =>
  fetch(`${API_URL}/categories/${categoryId}/`).then(res => res.json());

export const createNote = (note) =>
  fetch(`${API_URL}/notes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  }).then(async res => {
    const data = await res.json();
    if (!res.ok) {
      console.error("❌ API HATASI:", JSON.stringify(data, null, 2));
    }
    return data;
  });
  
export const updateNote = (id, note) =>
    fetch(`${API_URL}/notes/${id}/`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(note)
    }).then(res => res.json());

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
    }).then(res => res.json());
  
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
        