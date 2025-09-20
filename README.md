# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Storage Mode (Local / Remote)

Bu proje hem uzak (backend API) hem de tamamen yerel (IndexedDB) modda çalışabilecek şekilde soyutlanmıştır.

### Ortam Değişkeni

`VITE_STORAGE_MODE`:

- `remote` (varsayılan): `src/api.js` üzerinden HTTP çağrılarını kullanır.
- `local`: Verileri tarayıcı IndexedDB içinde saklar (`idb-keyval`).

`.env` örneği:

```bash
VITE_STORAGE_MODE=local
# Opsiyonel: uzak moda geçtiğinizde backend URL'si
# VITE_API_URL=http://localhost:3000
```

### Dosya Yapısı

- `src/storage/index.js`: Mod seçimi ve dışa aktarılan `storage` nesnesi.
- `src/storage/remoteProvider.js`: Mevcut API fonksiyonlarını saran sağlayıcı.
- `src/storage/localProvider.js`: IndexedDB tabanlı CRUD implementasyonu.
- `src/storage/StorageProvider.js`: Ortak arayüz/factory.

### Desteklenen Operasyonlar

- Notes: `getNotes`, `createNote`, `updateNote`, `softDeleteNote`, `forceDeleteNote`
- Categories: `getCategories`, `createCategory`, `updateCategory`, `deleteCategory`
- Tags: `getTags`, `createTag`, `updateTag`, `deleteTag`

### Entegrasyon

`App.jsx` ve ilgili hook'lar (`useCategories`, `useNoteActions`) artık doğrudan `storage` kullanır. Böylece mod değiştirmek için sadece `.env` dosyasında değeri düzenlemeniz yeterlidir; uygulama kodu değişmez.

### Notlar

- Local modda oluşturulan kayıtlar sadece tarayıcı/electron oturumuna aittir, senkronizasyon yapılmaz.
- ID üretimi zaman damgası + rastgele ek ile yapılır; çakışma olasılığı düşüktür fakat global benzersizlik garanti edilmez.
- İleride senkronizasyon/çakışma çözümü eklemek isterseniz her kayda `version` veya `updated_at` temelli bir karşılaştırma stratejisi ekleyebilirsiniz.

### Geliştirme

Mod değiştirdikten sonra dev sunucusunu yeniden başlatın:

```bash
pnpm dev
```

Electron paket tarayıcı katmanını kullandığı için aynı değişkenler preload sırasında da geçerli olacaktır.

## Electron Geliştirme Akışı (Auto-Restart)

Electron ana süreç (`electron/main.js`, `electron/preload.js`) değiştiğinde sıcak yenileme (HMR) çalışmaz; uygulamayı yeniden başlatmak gerekir. Bunu otomatikleştirmek için `electronmon` + `concurrently` entegre edildi.

### Komutlar

```bash
npm run dev        # Vite + Electron (auto-restart)
npm run dev:renderer  # Sadece React (Vite)
npm run dev:electron  # Sadece Electron (renderer hazır olunca başlar)
```

### Nasıl Çalışır

- `dev:renderer`: Vite 5173 portunda başlar.
- `dev:electron`: `wait-on tcp:5173` ile renderer hazır olana kadar bekler, sonra `electronmon` ile Electron sürecini başlatır.
- `electronmon`: `electron/` altındaki dosya değişikliklerinde ana süreci yeniden başlatır.

### Dosya İzleme

Varsayılan olarak proje kökü izlenir. Gerekirse `electronmon.json` ekleyip özel izlemesini yapılandırabilirsiniz.

Örnek `electronmon.json` (isteğe bağlı):

```json
{
  "watch": ["electron"],
  "ext": "js,json,html,css"
}
```

### İpuçları

- Preload değiştiyse (IPC API), renderer tarafı yeni metodları kullanmadan önce yeniden bağlanır.
- Ağır crash sonrası port kilitlenirse: ilgili node/electron süreçlerini kapatıp `npm run dev` tekrar çalıştırın.
- Windows’ta terminalde renkli çıktı için `concurrently` `-c` parametresi kullanıldı.

### Sorun Giderme

| Belirti | Çözüm |
|---------|-------|
| Electron açılmıyor | 5173 portu dolu mu? Vite çalışıyor mu? |
| IPC handler yok uyarısı | Ana süreç yeniden başlamamış olabilir, kaydedip bekle veya `npm run dev` yeniden başlat. |
| Değişiklik yansımıyor | Dosya uzantısı izlemeye dahil mi (örn. `.ts` eklediysen config’i güncelle)? |

---
Bu bölüm Electron geliştirme sürecini hızlandırmak için eklenmiştir.

---

## Feature Summary (Recent Enhancements)

Bu projede son eklenen / iyileştirilen başlıca özellikler:

### Editor & Markdown

- Slash komut menüsü (statik sol-alt konum) ve hızlı snippet ekleme (divider, todo, callout, mermaid, math, vb.).
- GFM alert / callout desteği (`> [!note]`, `> [!warning]`, `> [!tip]`, `> [!important]`, `> [!caution]`, `> [!success]`, `> [!danger]`, `> [!primary]`).
- Callout bileşenlerinde ikon + başlık etiketi (react-icons) ve sade (arka plansız) görsel stil.
- Otomatik image drag & drop (Electron preload üzerinden kopyalama) ve lightbox görüntüleme.
- Kod bloklarında kopyala düğmesi, highlight.js teması, Mermaid diyagram desteği.
- Math (KaTeX) inline ve block render.
- Task listeleri için interaktif checkbox (Preview → Editor senkron toggling) + strike-through.
- Görev satırları ilk yüklemede de pre-scan ile doğru render.
- Genişletilmiş paragraph normalizasyonu: block-level elemanla karışık inline içeriğin doğru gruplanması.

### Arama & Üretkenlik

- Özel arama paneli (Ctrl+F) ile tüm eşleşmeleri highlight eden CodeMirror StateField.
- Replace (tek / tüm) desteği + klavye navigasyonu.
- Outline paneli (başlıkları level + line ile listeler). Ctrl+B toggle.
- Otomatik kaydetme (debounce + blur flush) ve toast bildirimleri.

### UI / UX

- Modal odak ve etkileşim sorunları giderildi (focus trap ve güvenli kapama).
- Tema değişimi (ThemeManager) + CSS değişkenleri.
- Not listesinde her not için task progress bar (tamamlanan / toplam + %).
- Pinned, status (active / on_hold / completed / dropped) ikonları.

### Veri / Yapı

- Storage mod soyutlaması: `local` (IndexedDB) veya `remote` seçilebilir (`VITE_STORAGE_MODE`).
- Kategoriler opsiyonel; varsayılan/boş kategori mantığı kaldırıldı.
- Tags ve status alanları için UI bileşenleri + renkli etiketler.

### Kod Organizasyonu

- `Preview` ve `MarkdownEditor` rolleri net ayrıştırıldı.
- Editor içinde drag & drop, search highlight, outline gibi işlevler modüler eklendi.
- Callout / blockquote işleyici sade ve genişletilebilir yapı.

### Güvenlik / Dayanıklılık

- Native GFM task checkbox render devre dışı bırakıldı (çift kontrol engellendi).
- Pre-scan fallback ile markdown parse edge-case’lerinde tutarlı task toggling.
- Electron yeniden başlatma akışı stabil (wait-on + electronmon).

### Planlanan (Dokümante Edilebilir) Olası Sonraki Adımlar

- Task progress bar renk durumları (ör: >80% yeşil, <30% sarı, orta mavi).
- Toplu alt görev toggle (parent list prefix üzerinden).
- Not içi arama sonuçlarından outline jump highlight.
- GFM tabloları için responsive wrap / yatay scroll iyileştirmesi.

## Reinstall / Clean Setup (Quick Guide)

Projeyi sıfırdan kurmak veya kirli node_modules durumunu temizlemek için:

### 1. Çevre Gereksinimleri

- Node.js 18+ (Electron 35 uyumlu). `node -v`
- npm veya pnpm (örn. `npm i -g pnpm`).
- Windows için: Uzun path desteği (isteğe bağlı) ve PowerShell ExecutionPolicy engeli yok.

### 2. Temiz Kurulum Adımları

```bash
rm -rf node_modules package-lock.json pnpm-lock.yaml # Windows PowerShell: rmdir node_modules -Recurse -Force
npm install
```

Electron ilk kez çalıştırırken antivirüs gecikmesi olursa 2–3 sn bekleyin.

### 3. Geliştirme Başlatma

```bash
npm run dev      # Vite + Electron (auto restart)
```

Yalnızca renderer gerekirse:

```bash
npm run dev:renderer
```

### 4. Yayın (Build) (ileride)

Electron builder entegre (`electron-builder`). Prod paket için tipik komut (eklenmemişse script ekleyin):

```bash
npm run build && electron-builder
```

### 5. Sorun Giderme

| Problem | Olası Neden | Çözüm |
|---------|-------------|-------|
| `Cannot find module` | Bozuk cache / eksik modül | `rm -rf node_modules && npm install` |
| Port 5173 dolu | Eski Vite süreci açık | Görev Yöneticisi’nde Node/Electron kapat, tekrar `npm run dev` |
| Electron açılmıyor | wait-on timeout | Önce `npm run dev:renderer` çalıştığından emin ol |
| Preload API undefined | Electron yeniden başlamamış | Dosyayı kaydet, auto-restart bekle veya süreci kapat |
| Checkbox görünmüyor | İlk render race | (Çözüldü) useMemo pre-scan; yine de cache bozuksa tam refresh |

### 6. Önerilen Geliştirme Alışkanlıkları

- Büyük değişiklikten sonra: `npm run dev` yeniden başlat.
- Depolama modunu değiştirdiğinde: `.env` düzenle, dev sürecini kapat/aç.
- Markdown test notu oluşturup callout + task + mermaid + math kombinasyonlarını hızlıca doğrula.

### 7. Ek Notlar

- Windows PowerShell’de temiz kaldırma:

```powershell
rmdir node_modules -Recurse -Force
Remove-Item package-lock.json
npm install
```

- Eğer pnpm tercih edersen: `pnpm install` ardından komutlar aynı kalır.

---
Bu özet ve reinstall rehberi güncel eklemeleri belgeler; yeni özellikler geldikçe güncellenebilir.

