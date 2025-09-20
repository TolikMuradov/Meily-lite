# Inkdrop Parity Roadmap

Bu dosya, uygulamayı Inkdrop benzeri (profesyonel, extensible, performans odaklı) bir mimariye evrimleştirmek için yapılacak işleri içerir. Görevler kategorilere ayrılmıştır; öncelikler dalga (wave) yaklaşımı ile yönetilir.

## Kategoriler

- Core Editor / UX
- Table Editing & Markdown Enhancements
- Plugin & Extensibility
- Performance & Architecture
- Storage & Data
- Tooling, Tests & Packaging
- Internationalization & Accessibility
- Documentation & Developer Experience
- Knowledge Graph Features

---

### 1. Core Editor / UX

1. Codebase audit & cleanup – Kullanılmayan kodları ve geçici table logic'ini envanterle.
2. Editor compartments setup – Syntax, tema, keymap, plugin compartment'ları.
3. Commands registry abstraction – Tek kaynak (id, title, run, category, key?).
4. Central keymap generation – Registry'den OS koşullu keymap üret.
5. Command palette UI – Fuzzy arama, kategori filtreleri.
6. Shortcuts help modal – Registry'den türetilmiş liste.
7. Split view layout toggle – Horizontal/vertical, kalıcı tercih.
8. Note statistics panel – Word/char/tasks/table count.
9. Internal link completions – [[...]] tetikleyici.
10. Backlinks extraction panel – Ters link grafiği.
11. Parity review & polish – Son UX tutarlılık turu.

### 2. Table Editing & Markdown Enhancements

1. Table kernel adapter – @susisu/mte-kernel entegrasyonu (format, nav, ops).
2. Table format command – Tek transaction undo garantisi.
3. Table alignment commands – Left/center/right + palette entries.
4. Front-matter parsing – YAML meta -> model (title, tags, flags).
5. Extended fenced code meta – `mermaid` ve `katex` fence algısı.
6. Smart list continuation – Enter sonrası liste/checkbox devamı.
7. Callout syntax refinements – Yeni varyantlar / icon theme senk.

### 3. Plugin & Extensibility

1. Plugin loader skeleton – Lokal klasörden dinamik import.
2. Plugin API design – registerCommand/Extension, hooks.
3. Plugin sandbox & errors – İzolasyon + error surface.
4. Dynamic theme switching – Theme compartment + plugin temaları.
5. Plugin samples folder – Hello-world, theme, table enhancer.

### 4. Performance & Architecture

1. Worker markdown pipeline – Parse'i web worker'a taşı.
2. Preview incremental diff – Minimal DOM güncellemesi.
3. Performance profiling tools – Parse/render metrik panosu.
4. Virtualized notes list – Büyük koleksiyon optimizasyonu.

### 5. Storage & Data

1. Storage abstraction refactor – Sync genişlemesine hazır arayüz.
2. Export/import with assets – Zip JSON + assets merge logic.
3. Search index service – Inverted index (title/content/tags).
4. Advanced filter language – `tag:`, `status:` ve metin tokenları.
5. Backlinks index – Link grafiği güncelleme planı.

### 6. Tooling, Tests & Packaging

1. Core unit tests – Table adapter, managers, front-matter, filter parser.
2. Playwright integration tests – Ana kullanıcı senaryoları.
3. Electron packaging setup – electron-builder config + scriptler.
4. Update mechanism placeholder – Otomatik ya da manuel check iskeleti.
5. Versioning & changelog – SemVer + CHANGELOG.md.

### 7. Internationalization & Accessibility

1. Internationalization scaffold – i18n (en, tr) + key extraction pattern.
2. Accessibility improvements – ARIA, odak stilleri, palette a11y.

### 8. Documentation & Developer Experience

1. Architecture documentation – Data flow, extension pipeline, lifecycle.
2. README parity & sections – Feature matrix, shortcuts, plugin rehberi.
3. Diagnostics mode – Kategori bazlı structured logging toggle.
4. Contribution guide – Plugin geliştirme & test talimatları.

### 9. Knowledge Graph Features

1. Note graph generation – Basit force-directed veya adjacency list.
2. Graph view interactions – Tıklama ile nota git, filtreleme.

---

## Öncelik Önerisi (Dalga Bazlı)

- Wave 1 (Foundations): Core 1–4, Table 1–2, Perf 1, Tooling 1 & 3, Docs 1
- Wave 2 (UX & Extensibility): Core 5–8, Table 3–5, Plugin tümü, Perf 2–3, Storage 2–3, Docs 2–3
- Wave 3 (Knowledge & Perf): Core 9–11, Table 6–7, Storage 4–5, Tooling 2–5, Intl/A11y, Knowledge Graph, Docs 4

## Başarı Kriterleri Örnekleri

- Table format komutu: <16ms, undo tek adım.
- Worker parse: Ana thread blok süresi %40 azalma (referans ölçüm tanımlanacak).
- Plugin API: Örnek plugin 5 dakikadan kısa sürede çalıştırılabilir.
- Search index: 5K notta sorgu <50ms.

## Riskler & Mitigasyon

- Fazla paralel iş → Dalga bazlı freeze noktaları.
- Plugin sandbox güvenliği → Yürütme timeout + try/catch wrap.
- Worker senk kaybı → Versiyon numaralı mesajlaşma.

## Notlar

Bu liste yaşayan bir dokümandır; her görev tamamlandığında kısa sonuç / ölçüt güncellenecek. Önceliklendirme gerektiğinde dalga içi sıralama revize edilebilir.
