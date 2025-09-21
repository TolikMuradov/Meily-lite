import { useCallback, useEffect, useState } from 'react';
import { storage } from '../../../storage';

// Kategori yönetimi: liste, seçili kategori, CRUD ve context menu koordinasyonu
export default function useCategories() { // params kaldırıldı (unused)
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [contextCategory, setContextCategory] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  // İlk yükleme
  useEffect(() => {
    let mounted = true;
    storage.getCategories()
      .then(cats => {
        if (!mounted) return;
        setCategories(cats || []); // do not auto-select; leave filter as 'all'
      })
      .catch(err => {
        console.error('Kategori fetch hatası:', err);
        setCategories([]);
      });
    return () => { mounted = false; };
  }, []);

  const handleAddCategory = useCallback((name) => {
    return storage.createCategory({ name })
      .then(newCat => {
        setCategories(prev => [...prev, newCat]);
        if (!selectedCategory) setSelectedCategory(newCat);
        return newCat;
      });
  }, [selectedCategory]);

  const handleRenameCategory = useCallback((category, newName) => {
    return storage.updateCategory(category.id, { ...category, name: newName })
      .then(updatedCat => {
        setCategories(prev => prev.map(c => c.id === updatedCat.id ? updatedCat : c));
        if (selectedCategory?.id === updatedCat.id) setSelectedCategory(updatedCat);
        return updatedCat;
      });
  }, [selectedCategory]);

  const handleDeleteCategory = useCallback((category) => {
    return storage.deleteCategory(category.id)
      .then(() => {
        setCategories(prev => prev.filter(c => c.id !== category.id));
        setSelectedCategory(prev => prev && prev.id === category.id ? null : prev);
        // İlgili notları üst katman temizler (App içinde notes filtreleme)
      });
  }, []);

  const api = {
    categories,
    setCategories,
    selectedCategory,
    setSelectedCategory,
    contextCategory,
    setContextCategory,
    showContextMenu,
    setShowContextMenu,
    contextMenuPos,
    setContextMenuPos,
    handleAddCategory,
    handleRenameCategory,
    handleDeleteCategory,
  };

  return api;
}
