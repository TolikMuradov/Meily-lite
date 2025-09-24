// Central shortcuts configuration
// Each shortcut: { id, title, combo: string|string[], category, description }
// combo uses 'Mod' token (Ctrl on Win/Linux, Cmd on macOS)

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD_LABEL = isMac ? 'Cmd' : 'Ctrl';

function norm(combo) {
  if (Array.isArray(combo)) return combo.map(normOne);
  return normOne(combo);
}

function normOne(c) {
  if (!c) return c;
  return c.replace(/Mod/g, MOD_LABEL);
}

export const coreShortcuts = [
  // Genel
  { id: 'note.new', title: 'Yeni Not', combo: 'Mod-n', category: 'Genel', description: 'Yeni boş not oluştur' },
  { id: 'note.save', title: 'Kaydet', combo: 'Mod-s', category: 'Genel', description: 'Notu kaydet' },
  { id: 'note.export', title: 'Dışa Aktar', combo: 'Mod-Shift-e', category: 'Genel', description: 'Notu dışa aktar (export)' },
  { id: 'bold', title: 'Kalın', combo: 'Mod-b', category: 'Biçim', description: 'Seçimi **kalın** yap / kaldır' },
  { id: 'italic', title: 'İtalik', combo: 'Mod-i', category: 'Biçim', description: 'Seçimi *italik* yap / kaldır' },
  { id: 'strike', title: 'Üstü Çizili', combo: 'Alt-Shift-S', category: 'Biçim', description: 'Seçimi ~~üstünü çiz~~ yap / kaldır' },
  { id: 'inline.code', title: 'Inline Kod', combo: 'Mod-e', category: 'Biçim', description: 'Seçimi `inline code` yap / kaldır' },
  { id: 'blockquote', title: 'Alıntı Satırı', combo: 'Mod->', category: 'Biçim', description: 'Satırı blockquote (>) yap / kaldır' },
  { id: 'heading.1', title: 'Başlık H1', combo: 'Mod-Alt-1', category: 'Başlık', description: 'Satırı # başlığı yap' },
  { id: 'heading.2', title: 'Başlık H2', combo: 'Mod-Alt-2', category: 'Başlık', description: 'Satırı ## başlığı yap' },
  { id: 'heading.3', title: 'Başlık H3', combo: 'Mod-Alt-3', category: 'Başlık', description: 'Satırı ### başlığı yap' },
  { id: 'heading.4', title: 'Başlık H4', combo: 'Mod-Alt-4', category: 'Başlık', description: 'Satırı #### başlığı yap' },
  { id: 'heading.5', title: 'Başlık H5', combo: 'Mod-Alt-5', category: 'Başlık', description: 'Satırı ##### başlığı yap' },
  { id: 'heading.6', title: 'Başlık H6', combo: 'Mod-Alt-6', category: 'Başlık', description: 'Satırı ###### başlığı yap' },
  { id: 'list.bullet', title: 'Madde Listesi', combo: 'Mod-Shift-l', category: 'Liste', description: 'Satırı - madde listesi yap / kaldır' },
  { id: 'list.ordered', title: 'Numaralı Liste', combo: 'Mod-Shift-o', category: 'Liste', description: 'Satırı 1. numaralı liste yap / kaldır' },
  { id: 'list.task', title: 'Görev Kutusu', combo: 'Mod-Shift-t', category: 'Liste', description: 'Satırı - [ ] görev maddesi yap / toggle [x]' },
  { id: 'link.insert', title: 'Bağlantı', combo: 'Mod-k', category: 'Biçim', description: 'Seçimi bağlantı yap (modal aç)' },
  { id: 'search', title: 'Arama Paneli', combo: 'Mod-f', category: 'Genel', description: 'Arama panelini aç/kapat' },
  { id: 'shortcuts', title: 'Kısayollar Yardım', combo: 'Mod-Shift-/', category: 'Genel', description: 'Kısayol listesini aç' },
  { id: 'table.format', title: 'Tablo Biçimlendir', combo: 'Alt-Shift-r', category: 'Tablo', description: 'Tabloyu hizala ve biçimlendir' },
  { id: 'table.insertRowBelow', title: 'Satır Ekle (Alt)', combo: 'Alt-Shift-Enter', category: 'Tablo', description: 'Altına yeni satır' },
  { id: 'table.insertColumnAfter', title: 'Sütun Ekle (Sonra)', combo: 'Alt-Shift-c', category: 'Tablo', description: 'Geçerli sütundan sonra sütun' },
  { id: 'table.align.left', title: 'Sütun Sola', combo: 'Alt-Shift-1', category: 'Tablo', description: 'Sütunu sola hizala' },
  { id: 'table.align.center', title: 'Sütun Ortala', combo: 'Alt-Shift-2', category: 'Tablo', description: 'Sütunu ortaya hizala' },
  { id: 'table.align.right', title: 'Sütun Sağa', combo: 'Alt-Shift-3', category: 'Tablo', description: 'Sütunu sağa hizala' }
];

export function listShortcuts() {
  return coreShortcuts.map(sc => ({ ...sc, combo: norm(sc.combo) }));
}
