import React from 'react';

export default function FilterManager({
  noteFilter,
  categories,
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption
}) {
  const getFilterTitle = () => {
    if (noteFilter.type === 'pinned') return 'Pinned Notes';
    if (noteFilter.type === 'trash') return 'Trash';
    if (noteFilter.type === 'status') return noteFilter.status;
    if (noteFilter.type === 'category') {
      const cat = categories.find(c => c.id === noteFilter.id);
      return cat?.name || 'Not Defteri';
    }
    if (noteFilter.type === 'tag') return `#${noteFilter.tag}`;
    return 'All Notes';
  };

  return (
    <div className="filter-manager">
      <h2>{getFilterTitle()}</h2>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search notes..."
      />
      <select
        value={sortOption}
        onChange={(e) => setSortOption(e.target.value)}
      >
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
        <option value="created-asc">Created (Oldest)</option>
        <option value="created-desc">Created (Newest)</option>
        <option value="updated-asc">Updated (Oldest)</option>
        <option value="updated-desc">Updated (Newest)</option>
      </select>
    </div>
  );
}