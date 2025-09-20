import React, { useEffect, useState, useCallback } from 'react';
import { listCommands } from '../commands/registry';

function fuzzyScore(query, text) {
  if (!query) return 1;
  let qi = 0; let score = 0; const q = query.toLowerCase(); const t = text.toLowerCase();
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score += 1; qi++; }
  }
  return qi === q.length ? score / t.length : 0;
}

export default function CommandPalette({ open, onClose, editorRef }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);

  const refresh = useCallback(() => {
    const cmds = listCommands();
    const scored = cmds.map(c => ({ c, s: fuzzyScore(query, c.title + ' ' + c.id) }))
      .filter(x => x.s > 0 || !query)
      .sort((a,b)=> b.s - a.s || a.c.title.localeCompare(b.c.title))
      .slice(0, 80);
    setItems(scored.map(x => x.c));
    setIndex(0);
  }, [query]);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);
  useEffect(() => { refresh(); }, [query, refresh]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(i + 1, items.length -1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[index];
        if (item) {
          const view = editorRef?.current;
            try { item.run(view, {}); } catch(err){ console.error('command run error', err);}        
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [open, items, index, onClose, editorRef]);

  if (!open) return null;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.25)', display:'flex', justifyContent:'center', alignItems:'flex-start', paddingTop: '10vh' }} onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={{ width:600, background:'#1e1f24', border:'1px solid #333', borderRadius:10, boxShadow:'0 10px 40px -10px rgba(0,0,0,0.5)', overflow:'hidden', display:'flex', flexDirection:'column' }}>
        <input autoFocus placeholder="Type a command" value={query} onChange={e=>setQuery(e.target.value)} style={{ background:'#2a2c31', color:'#fff', border:'none', padding:'12px 14px', fontSize:14, outline:'none' }} />
        <div style={{ maxHeight:360, overflowY:'auto', fontSize:13 }}>
          {items.length === 0 && <div style={{ padding:12, opacity:0.6 }}>No commands</div>}
          {items.map((cmd,i)=>(
            <div key={cmd.id} style={{ padding:'8px 14px', cursor:'pointer', background: i===index? '#3a3f47':'transparent', display:'flex', flexDirection:'column', gap:2 }} onMouseEnter={()=>setIndex(i)} onMouseDown={(e)=>{e.preventDefault(); const view=editorRef?.current; cmd.run(view,{}); onClose();}}>
              <span>{cmd.title}</span>
              <span style={{ opacity:0.5, fontSize:11 }}>{cmd.id}{cmd.key? '  ·  '+(Array.isArray(cmd.key)?cmd.key.join(', '):cmd.key):''}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'6px 10px', textAlign:'right', fontSize:11, opacity:0.5 }}>Esc to close · Enter to run</div>
      </div>
    </div>
  );
}
