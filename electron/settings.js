// setTheme kaldırıldı (kullanılmıyor)

  const checkbox = document.getElementById('transparentToggle');
  const saved = localStorage.getItem('transparentMode') === 'true';
  checkbox.checked = saved;
  checkbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    window.api.setTransparentMode(isChecked);
    localStorage.setItem('transparentMode', isChecked ? 'true' : 'false');
  });

  // Search animation toggle
  const searchAnimToggle = document.getElementById('searchAnimToggle');
  const searchAnimSaved = localStorage.getItem('pref.searchAnimation');
  searchAnimToggle.checked = searchAnimSaved == null ? true : (searchAnimSaved === 'true');
  searchAnimToggle.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    localStorage.setItem('pref.searchAnimation', enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('pref-search-animation-changed', { detail: enabled }));
  });

  const categorySelect = document.getElementById('defaultCategorySelect');
  const resultMsg = document.getElementById('categoryResultMsg');

  async function loadCategories() {
    let data = [];
    try {
      const mod = await import('../src/utils/net.js');
      data = await mod.jsonFetch('/api/categories/');
    } catch (e) {
      console.error('Kategori yüklenemedi', e);
      resultMsg.textContent = '⚠️ Kategoriler alınamadı';
      return;
    }

    categorySelect.innerHTML = '';
    data.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      if (cat.name === 'Inbox') option.selected = true;
      categorySelect.appendChild(option);
    });
  }

  async function updateDefaultCategory() { // eslint-disable-line no-unused-vars
    const selectedId = categorySelect.value;
    try {
      const mod = await import('../src/utils/net.js');
      const data = await mod.jsonFetch('/api/categories/');
      await Promise.all(data.map(cat => {
        const isDefault = parseInt(cat.id) === parseInt(selectedId);
        return fetch(mod.getApiBase ? mod.getApiBase()+`/api/categories/${cat.id}/` : `/api/categories/${cat.id}/`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: cat.name, is_default: isDefault })
        });
      }));
      resultMsg.textContent = '✅ Varsayılan kategori güncellendi.';
    } catch (e) {
      console.error('Kategori güncellenemedi', e);
      resultMsg.textContent = '⚠️ Güncelleme başarısız';
    }
  }

  // function closeSettings() { /* unused legacy */ }

  loadCategories();