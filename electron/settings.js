const setTheme = (theme) => {
    window.api.setTheme(theme);
  };

  const checkbox = document.getElementById('transparentToggle');
  const saved = localStorage.getItem('transparentMode') === 'true';
  checkbox.checked = saved;

  checkbox.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    window.api.setTransparentMode(isChecked);
    localStorage.setItem('transparentMode', isChecked ? 'true' : 'false');
  });

  const categorySelect = document.getElementById('defaultCategorySelect');
  const resultMsg = document.getElementById('categoryResultMsg');

  async function loadCategories() {
    const res = await fetch('http://52.65.1.213:8000/api/categories/');
    const data = await res.json();

    categorySelect.innerHTML = '';
    data.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      if (cat.name === 'Inbox') option.selected = true;
      categorySelect.appendChild(option);
    });
  }

  async function updateDefaultCategory() {
    const selectedId = categorySelect.value;

    // Tüm kategorileri çek ve diğerlerinin is_default'ını sıfırla
    const res = await fetch('http://52.65.1.213:8000/api/categories/');
    const data = await res.json();

    for (let cat of data) {
      const isDefault = parseInt(cat.id) === parseInt(selectedId);
      await fetch(`http://52.65.1.213:8000/api/categories/${cat.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cat.name,
          is_default: isDefault
        })
      });
    }

    resultMsg.textContent = '✅ Varsayılan kategori güncellendi.';
  }

  function closeSettings() {
    window.api.closeSettingsWindow();
  }

  loadCategories();