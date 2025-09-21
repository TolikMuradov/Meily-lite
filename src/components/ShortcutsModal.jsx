import React, { useMemo } from 'react';
import Modal from './Modal';
import { listCommands } from '../commands/registry';

// Basit kısayol modalı: Komutları kategoriye göre gruplar.
export default function ShortcutsModal({ open, onClose }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const cmd of listCommands()) {
      const cat = cmd.category || 'Misc';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(cmd);
    }
    for (const arr of map.values()) arr.sort((a,b)=>a.title.localeCompare(b.title));
    return Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]));
  }, []);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title="Kısayollar">
      <div className="shortcuts-modal-body" style={{maxHeight:'60vh', overflow:'auto'}}>
        {groups.map(([cat, cmds]) => (
          <div key={cat} className="shortcut-group" style={{marginBottom:'1.25rem'}}>
            <h3 style={{margin:'0 0 0.5rem', fontSize:'0.9rem', textTransform:'uppercase', opacity:0.7}}>{cat}</h3>
            <ul style={{listStyle:'none', margin:0, padding:0}}>
              {cmds.map(c => (
                <li key={c.id} style={{display:'flex', alignItems:'flex-start', gap:'0.75rem', padding:'4px 0', borderBottom:'1px solid var(--border-color, #2222)'}}>
                  <div style={{flex: '0 0 180px', fontWeight:500}}>{c.title}</div>
                  <div style={{flex: '0 0 140px', fontFamily:'monospace', fontSize:'0.75rem', display:'flex', flexWrap:'wrap', gap:'4px'}}>
                    { (Array.isArray(c.key) ? c.key : (c.key ? [c.key] : []))
                      .map(k => <kbd key={k} style={{background:'var(--kbd-bg, #333)', padding:'2px 6px', borderRadius:4}}>{k.replace('Mod','Ctrl')}</kbd>) }
                  </div>
                  <div style={{flex:1, fontSize:'0.75rem', opacity:0.8}}>{c.description || ''}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
  <p style={{fontSize:'0.65rem', opacity:0.6}}>Not: "Mod" = Ctrl veya Cmd</p>
      </div>
    </Modal>
  );
}
