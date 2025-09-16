components/CategorySelect.jsx

export default function CategorySelect({ categories, selectedCategoryId, onChange }) {
    return (
      <select
        className="category-select"
        value={selectedCategoryId || ''}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="" disabled>Kategori Seç</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    );
  }
  