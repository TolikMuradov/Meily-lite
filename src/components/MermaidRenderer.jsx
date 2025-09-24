import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import '../css/Editor/mermaid.css';

// Minimal implementation: lazy render only.

function mapTheme(themeName) {
  if (!themeName) return 'dark';
  const t = themeName.toLowerCase();
  if (t.includes('light')) return 'default';
  return 'dark';
}

let lastInitTheme = null;
function ensureInit(theme) {
  if (lastInitTheme === theme) return;
  mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose', flowchart: { useMaxWidth: true } });
  lastInitTheme = theme;
}

export default function MermaidRenderer({ code }) {
  const wrapRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [svg, setSvg] = useState(null);
  const [err, setErr] = useState(null);
  const [rendering, setRendering] = useState(false);
  const theme = mapTheme(document.documentElement.getAttribute('data-theme'));

  const renderDiagram = useCallback(async () => {
    const src = (code || '').trim();
    if (!src) { setSvg(null); setErr(null); return; }
    ensureInit(theme);
    try {
      setRendering(true); setErr(null);
      const id = 'm-' + Math.random().toString(36).slice(2, 9);
      const { svg } = await mermaid.render(id, src);
      setSvg(svg);
    } catch (e) {
      setErr(e.message || 'Mermaid error');
      setSvg(null);
    } finally { setRendering(false); }
  }, [code, theme]);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach(en => { if (en.isIntersecting) setVisible(true); });
    }, { rootMargin: '150px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => { if (visible) renderDiagram(); }, [visible, renderDiagram]);

  const retry = () => { if (visible) renderDiagram(); };

  return (
    <div ref={wrapRef} className="mermaid-diagram-container" aria-label="Mermaid diagram">
      {/* Toolbar removed intentionally */}
      {!visible && <div className="mermaid-info">(lazy)</div>}
      {visible && rendering && <div className="mermaid-info">Rendering…</div>}
      {visible && err && <div className="mermaid-info mermaid-error">{err} <button onClick={retry}>retry</button></div>}
      {visible && !err && svg && (
        <div className="mermaid-outer-scroll">
          <div className="mermaid-svg-wrapper" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
      {visible && !err && !svg && !rendering && <div className="mermaid-info">(empty)</div>}
      {/* Source code toggle removed */}
    </div>
  );
}
