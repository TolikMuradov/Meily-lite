import { useEffect, useCallback } from 'react';

export function useImageDrop(editorRef, pushToast, containerRef) {
  const insertImage = useCallback(async (file) => {
    try {
      if (!window.api?.copyImage && !window.api?.copyImageBuffer) {
        console.warn('copyImage APIs unavailable');
        return false;
      }
      let imagePath = null;
      if (file.path && window.api.copyImage) imagePath = await window.api.copyImage(file.path);
      if (!imagePath && window.api.copyImageBuffer) {
        const buf = await file.arrayBuffer();
        imagePath = await window.api.copyImageBuffer(file.name, buf);
      }
      if (!imagePath) return false;
      const view = editorRef.current;
      if (!view) return false;
      const alt = file.name.replace(/\.[^.]+$/, '');
      const safePath = encodeURI(String(imagePath).replace(/^\//, ''));
      const md = `\n\n![${alt}](${safePath})\n\n`;
      const { state, dispatch } = view;
      const pos = state.selection.main.head;
      dispatch({ changes: { from: pos, to: pos, insert: md }, selection: { anchor: pos + md.length } });
      return true;
    } catch (e) {
      console.error('insertImage failed', e);
      return false;
    }
  }, [editorRef]);

  const handleContainerDrop = useCallback(async (e) => {
    const files = Array.from(e.dataTransfer?.files || []);
    const images = files.filter(f => /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(f.name));
    if (!images.length) return;
    e.preventDefault(); e.stopPropagation();
    pushToast?.(`Importing ${images.length} image${images.length>1?'s':''}...`);
    let inserted = 0;
    for (const file of images) {
      const ok = await insertImage(file);
      if (ok) inserted++;
    }
    pushToast?.(`Inserted ${inserted} image${inserted!==1?'s':''}`);
    editorRef.current?.focus();
  }, [editorRef, insertImage, pushToast]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onDragOver = (e) => {
      const hasFiles = Array.from(e.dataTransfer?.items || []).some(i => i.kind === 'file');
      if (!hasFiles) return;
      if (!container.contains(e.target)) return;
      e.preventDefault(); e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (e) => {
      if (!container.contains(e.target)) return;
      handleContainerDrop(e);
    };
    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('drop', onDrop, true);
    };
  }, [containerRef, handleContainerDrop]);

  return { handleContainerDrop };
}
