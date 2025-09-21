import { useRef, useEffect, useCallback } from 'react';

function debounce(fn, delay = 800) {
  let t;
  const wrapped = (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

export function useAutosave(onAutosave, editorRef, externalContent) {
  const debounced = useRef(debounce((value) => { onAutosave?.(value); }, 800)).current;

  useEffect(() => () => debounced.cancel?.(), [debounced]);

  const flush = useCallback(() => {
    debounced.cancel?.();
    const value = editorRef.current ? editorRef.current.state.doc.toString() : externalContent;
    onAutosave?.(value);
  }, [debounced, editorRef, externalContent, onAutosave]);

  const schedule = useCallback((val) => debounced(val), [debounced]);

  return { schedule, flush };
}
