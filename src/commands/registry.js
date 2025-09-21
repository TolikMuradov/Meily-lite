// Central commands registry
// Each command: { id, title, run(view, context), category, description?, key?: string|string[], when?: (ctx)=>bool }

const _commands = new Map();

export function registerCommand(cmd) {
  if (!cmd || !cmd.id) throw new Error('Command requires id');
  _commands.set(cmd.id, cmd);
}

export function getCommand(id) {
  return _commands.get(id);
}

export function listCommands(filter = {}) {
  const { category } = filter;
  const out = [];
  for (const c of _commands.values()) {
    if (category && c.category !== category) continue;
    out.push(c);
  }
  return out.sort((a,b)=>a.title.localeCompare(b.title));
}

export function buildKeymapExtension({ keymapLib }) {
  return keymapLib.of(buildKeySpecs());
}

export function buildKeySpecs() {
  const specs = [];
  for (const c of _commands.values()) {
    if (!c.key) continue;
    const keys = Array.isArray(c.key) ? c.key : [c.key];
    for (const k of keys) {
      specs.push({ key: k, preventDefault: true, run: (v) => !!c.run(v) });
    }
  }
  return specs;
}

// Bootstrap some core commands placeholder (table commands will be wired later)
export function bootstrapCore(register) {
  register({
    id: 'editor.toggleSearch',
    title: 'Toggle Search Overlay',
    category: 'Editor',
    description: 'Arama panelini aç/kapat',
    key: 'Mod-f',
    run: () => { /* handled already in component; will route later */ return true; }
  });
  register({
    id: 'show.shortcuts',
    title: 'Show Shortcuts Help',
    category: 'Help',
    description: 'Tüm kısayol listesini göster',
    key: 'Mod-Shift-/',
    run: () => {
      // UI içinde global state tetiklenecek; burada true dönerek engelle.
      const ev = new CustomEvent('open-shortcuts-modal');
      window.dispatchEvent(ev);
      return true;
    }
  });
}

// Table related commands (initial subset)
export function bootstrapTable(register, ops) {
  const { formatTable, insertRow, insertColumn, moveCell, alignColumn } = ops;
  register({ id: 'table.format', title: 'Format Table', category: 'Table', description: 'Tabloyu hizala ve yeniden biçimlendir', key: 'Alt-Shift-r', run: (view)=>formatTable(view) });
  register({ id: 'table.insertRowBelow', title: 'Insert Row Below', category: 'Table', description: 'Geçerli satırın altına satır ekle', key: 'Alt-Shift-Enter', run: (view)=>insertRow(view,'below') });
  register({ id: 'table.insertColumnAfter', title: 'Insert Column After', category: 'Table', description: 'Geçerli sütundan sonra sütun ekle', key: 'Alt-Shift-c', run: (view)=>insertColumn(view,'after') });
  register({ id: 'table.nextCell', title: 'Next Cell', category: 'Table', description: 'Sonraki hücreye git', key: 'Tab', run: (view)=> { moveCell(view,'next'); return true; } });
  register({ id: 'table.prevCell', title: 'Previous Cell', category: 'Table', description: 'Önceki hücreye git', key: 'Shift-Tab', run: (view)=> { moveCell(view,'prev'); return true; } });
  register({ id: 'table.align.left', title: 'Align Column Left', category: 'Table', description: 'Geçerli sütunu sola hizala', key: 'Alt-Shift-1', run: (view)=>alignColumn(view,'left') });
  register({ id: 'table.align.center', title: 'Align Column Center', category: 'Table', description: 'Geçerli sütunu ortaya hizala', key: 'Alt-Shift-2', run: (view)=>alignColumn(view,'center') });
  register({ id: 'table.align.right', title: 'Align Column Right', category: 'Table', description: 'Geçerli sütunu sağa hizala', key: 'Alt-Shift-3', run: (view)=>alignColumn(view,'right') });
}
