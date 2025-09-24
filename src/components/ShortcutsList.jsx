import React, { useMemo } from 'react';
import { listShortcuts } from '../shortcuts/shortcutsConfig';

export default function ShortcutsList() {
  const groups = useMemo(() => {
    const byCat = new Map();
    for (const sc of listShortcuts()) {
      const cat = sc.category || 'Diğer';
      if (!byCat.has(cat)) byCat.set(cat, []);
      byCat.get(cat).push(sc);
    }
    for (const arr of byCat.values()) arr.sort((a,b)=>a.title.localeCompare(b.title));
    return Array.from(byCat.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, []);

  return (
    <div style={{maxHeight:'60vh', overflow:'auto'}} className="shortcuts-list">
      {groups.map(([cat, items]) => (
        <div key={cat} style={{marginBottom:'1.25rem'}} className="shortcut-group">
          <h3 style={{margin:'0 0 0.5rem', fontSize:'0.9rem', textTransform:'uppercase', opacity:0.7}}>{cat}</h3>
          <ul style={{listStyle:'none', margin:0, padding:0}}>
            {items.map(it => {
              const combos = Array.isArray(it.combo) ? it.combo : [it.combo];
              return (
                <li key={it.id} style={{display:'flex', alignItems:'flex-start', gap:'0.75rem', padding:'4px 0', borderBottom:'1px solid var(--border-color, #2222)'}}>
                  <div style={{flex:'0 0 180px', fontWeight:500}}>{it.title}</div>
                  <div style={{flex:'0 0 140px', fontFamily:'monospace', fontSize:'0.75rem', display:'flex', flexWrap:'wrap', gap:'4px'}}>
                    {combos.map(c => <kbd key={c} style={{background:'var(--kbd-bg,#333)', padding:'2px 6px', borderRadius:4}}>{c}</kbd>)}
                  </div>
                  <div style={{flex:1, fontSize:'0.7rem', opacity:0.8}}>{it.description || ''}</div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p style={{fontSize:'0.65rem', opacity:0.6}}>Not: Mod = Ctrl (Win/Linux) veya Cmd (macOS)</p>
    </div>
  );
}
