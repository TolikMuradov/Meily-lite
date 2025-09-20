import { keymap } from '@codemirror/view';

function detectTableRegion(state, lineNumber) {
  const doc = state.doc;
  const totalLines = doc.lines;
  let start = lineNumber;
  let end = lineNumber;
  const isSep = (text) => /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/.test(text.trim());
  const isRow = (text) => {
    const t = text.trim();
    if (!t) return false;
    if (t.startsWith('```') || t.startsWith('~~~')) return false; // ignore code fences
    if (/^>/ .test(t)) return false; // blockquote lines skip
    // any line containing at least one pipe and not just separator row
    return t.includes('|') && !isSep(t);
  };
  const isTableLine = (text) => isSep(text) || isRow(text);
  const getLine = (n) => doc.line(n).text;
  if (!isTableLine(getLine(lineNumber))) return null;
  while (start > 1 && isTableLine(getLine(start - 1))) start--;
  while (end < totalLines && isTableLine(getLine(end + 1))) end++;
  return { start, end };
}

function parseTable(state, region) {
  const rows = [];
  let align = [];
  const sepRegex = /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/;
  for (let ln = region.start; ln <= region.end; ln++) {
    const raw = state.doc.line(ln).text;
    if (/^\s*$/.test(raw)) continue;
    const isSep = sepRegex.test(raw.trim());
    if (isSep) {
      // build align array
      const parts = raw.split('|').map(p => p.trim()).filter(p => p.length);
      align = parts.map(p => {
        const left = p.startsWith(':');
        const right = p.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return 'left';
      });
      continue;
    }
    if (!raw.includes('|')) continue;
    // Normalize: ensure leading/trailing pipe for consistent parsing later
    let normalized = raw.trim();
    if (!normalized.startsWith('|')) normalized = '| ' + normalized;
    if (!normalized.endsWith('|')) normalized = normalized + ' |';
    const parts = normalized.split('|');
    parts.shift(); // first empty
    if (parts[parts.length -1].trim() === '') parts.pop();
    const cells = parts.map(c => c.replace(/\s+/g, ' ').trim());
    rows.push({ line: ln, cells });
  }
  const colCount = rows.reduce((m, r) => Math.max(m, r.cells.length), 0);
  if (!colCount) return { rows: [], align: [], colCount: 0 };
  if (!align.length) align = Array(colCount).fill('left');
  if (align.length < colCount) align = [...align, ...Array(colCount - align.length).fill('left')];
  return { rows, align, colCount };
}

function buildSeparator(align) {
  const parts = align.map(a => {
    if (a === 'center') return ':---:';
    if (a === 'right') return '---:';
    return ':---'; // treat left as :--- for consistency (will render left)
  });
  return `| ${parts.join(' | ')} |`;
}

function padCell(text, width, alignment) {
  const len = [...text].length;
  const pad = width - len;
  if (pad <= 0) return text;
  if (alignment === 'right') return ' '.repeat(pad) + text;
  if (alignment === 'center') {
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return ' '.repeat(left) + text + ' '.repeat(right);
  }
  return text + ' '.repeat(pad);
}

function reformatTable(view) {
  const { state } = view;
  const lineNumber = state.doc.lineAt(state.selection.main.head).number;
  const region = detectTableRegion(state, lineNumber);
  if (!region) return false;
  const parsed = parseTable(state, region);
  if (!parsed.rows.length) return false;
  const widths = Array(parsed.colCount).fill(0);
  parsed.rows.forEach(r => r.cells.forEach((c, i) => { widths[i] = Math.max(widths[i], [...c].length); }));
  // Ensure minimum width for readability
  for (let i = 0; i < widths.length; i++) widths[i] = Math.max(widths[i], 3);
  const sep = buildSeparator(parsed.align.slice(0, parsed.colCount));
  const newLines = [];
  parsed.rows.forEach((r, idx) => {
    const cells = [];
    for (let i = 0; i < parsed.colCount; i++) {
      const raw = r.cells[i] || '';
      cells.push(padCell(raw, widths[i], parsed.align[i]));
    }
    newLines.push(`| ${cells.join(' | ')} |`);
    if (idx === 0) newLines.push(sep);
  });
  const from = state.doc.line(region.start).from;
  const to = state.doc.line(region.end).to;
  view.dispatch({ changes: { from, to, insert: newLines.join('\n') } });
  return true;
}

function addRow(view) {
  const { state } = view;
  const lineNumber = state.doc.lineAt(state.selection.main.head).number;
  const region = detectTableRegion(state, lineNumber);
  if (!region) return false;
  const parsed = parseTable(state, region);
  if (!parsed.rows.length) return false;
  const empty = Array(parsed.colCount).fill('');
  const newRow = `| ${empty.join(' | ')} |`;
  const insertPos = state.doc.line(region.end).to;
  view.dispatch({ changes: { from: insertPos, to: insertPos, insert: '\n' + newRow }, selection: { anchor: insertPos + 1 + newRow.length - 2 } });
  return true;
}

function addColumn(view) {
  const { state } = view;
  const lineNumber = state.doc.lineAt(state.selection.main.head).number;
  const region = detectTableRegion(state, lineNumber);
  if (!region) return false;
  const parsed = parseTable(state, region);
  if (!parsed.rows.length) return false;
  const sepLineIndex = region.start + 1; // after first row (header)
  const tr = [];
  for (let ln = region.start; ln <= region.end; ln++) {
    const line = state.doc.line(ln);
    const isSep = ln === sepLineIndex && /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/.test(line.text.trim());
    if (isSep) {
      tr.push({ from: line.from, to: line.to, insert: line.text.replace(/\|\s*$/, '') + ' :--- |' });
    } else {
      tr.push({ from: line.from, to: line.to, insert: line.text.replace(/\|\s*$/, '') + '  |' });
    }
  }
  view.dispatch({ changes: tr });
  return true;
}

export function markdownTableEditor() {
  return keymap.of([
      { key: 'Alt-Shift-r', preventDefault: true, run: reformatTable },
      { key: 'Alt-Shift-Enter', preventDefault: true, run: addRow },
      { key: 'Alt-Shift-c', preventDefault: true, run: addColumn },
      {
        key: 'Tab',
        preventDefault: true,
        run: (view) => {
          const { state } = view;
          const lineNumber = state.doc.lineAt(state.selection.main.head).number;
          const region = detectTableRegion(state, lineNumber);
          if (!region) return false; // outside table allow fallback
          reformatTable(view);
          const st2 = view.state;
          const ln2 = st2.doc.lineAt(st2.selection.main.head).number;
          const region2 = detectTableRegion(st2, ln2) || region;
          const lineObj = st2.doc.line(ln2);
          const text = lineObj.text;
          let normalized = text;
          if (!/^\s*\|/.test(normalized)) normalized = '| ' + normalized;
          if (!/\|\s*$/.test(normalized)) normalized = normalized + ' |';
          const parts = normalized.split('|');
          // Remove outer empties
          if (parts[0].trim() === '') parts.shift();
          if (parts[parts.length -1].trim() === '') parts.pop();
          const cursorCol = st2.selection.main.head - lineObj.from;
          // Reconstruct offsets relative to original line
          let rebuilt = normalized;
          // Map cells to start/end in rebuilt (approx, since we may have added pipes)
          const cellRanges = [];
          let off = 0;
          let pre = rebuilt.indexOf('|'); // first pipe index
          // build by scanning between pipes
          const pipePositions = [];
          for (let i = 0; i < rebuilt.length; i++) if (rebuilt[i] === '|') pipePositions.push(i);
          for (let i = 0; i < pipePositions.length -1; i++) {
            const start = pipePositions[i] + 1;
            const end = pipePositions[i+1];
            const seg = rebuilt.slice(start, end);
            if (/^\s*$/.test(seg) && i === 0) continue;
            cellRanges.push({ start, end });
          }
          // Translate cursor into rebuilt coordinate (best effort)
          // Use proportion: if we added a leading pipe adjust by +2 maybe; fallback simple detection
          let cellIndex = cellRanges.findIndex(r => cursorCol >= r.start && cursorCol < r.end);
          if (cellIndex === -1) cellIndex = 0;
          if (cellIndex < cellRanges.length -1) {
            const target = cellRanges[cellIndex +1];
            const anchor = lineObj.from + target.start + 1; // inside next cell
            view.dispatch({ selection: { anchor }, scrollIntoView: true });
            return true;
          } else {
            // next row
            if (ln2 < region2.end) {
              let nextLineNum = ln2 + 1;
              // skip separator
              const sepRegex = /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/;
              const nextLineObj = st2.doc.line(nextLineNum);
              if (sepRegex.test(nextLineObj.text) && nextLineNum + 1 <= region2.end) nextLineNum++;
              const tLine = st2.doc.line(nextLineNum);
              const anchor = tLine.from + 2; // after '| '
              view.dispatch({ selection: { anchor }, scrollIntoView: true });
              return true;
            } else {
              addRow(view);
              return true;
            }
          }
        }
      },
      {
        key: 'Shift-Tab',
        preventDefault: true,
        run: (view) => {
          const { state } = view;
          const lineNumber = state.doc.lineAt(state.selection.main.head).number;
          const region = detectTableRegion(state, lineNumber);
          if (!region) return false;
          reformatTable(view);
          const newState = view.state;
          const newLineNumber = newState.doc.lineAt(newState.selection.main.head).number;
          const lineObj = newState.doc.line(newLineNumber);
          const text = lineObj.text;
          const cursorCol = newState.selection.main.head - lineObj.from;
          const segments = text.split('|');
          const cellRanges = [];
          let offset = 0;
          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            if (i === 0 && seg.trim() === '') { offset += seg.length + 1; continue; }
            if (i === segments.length -1 && seg.trim() === '') break;
            const start = offset;
            const end = offset + seg.length;
            cellRanges.push({ start, end });
            offset = end + 1;
          }
          let cellIndex = cellRanges.findIndex(r => cursorCol >= r.start && cursorCol <= r.end);
          if (cellIndex === -1) cellIndex = cellRanges.length -1;
          if (cellIndex > 0) {
            const target = cellRanges[cellIndex -1];
            const anchor = lineObj.from + target.start + 1;
            view.dispatch({ selection: { anchor }, scrollIntoView: true });
            return true;
          } else {
            // Move to previous row last cell
            if (newLineNumber > region.start) {
              // Might need to skip separator line
              const prevLine = newState.doc.line(newLineNumber -1);
              const sepRegex = /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/;
              let targetLine = prevLine;
              if (sepRegex.test(prevLine.text) && (newLineNumber -2) >= region.start) {
                targetLine = newState.doc.line(newLineNumber -2);
              }
              const tText = targetLine.text;
              const tSegs = tText.split('|');
              // compute last cell start
              let tOffset = 0; let last = { start: 0, end: 0 };
              for (let i = 0; i < tSegs.length; i++) {
                const s = tSegs[i];
                if (i === 0 && s.trim() === '') { tOffset += s.length + 1; continue; }
                if (i === tSegs.length -1 && s.trim() === '') break;
                const start = tOffset; const end = tOffset + s.length; last = { start, end }; tOffset = end + 1;
              }
              const anchor = targetLine.from + last.start + 1;
              view.dispatch({ selection: { anchor }, scrollIntoView: true });
              return true;
            }
          }
          return true;
        }
      }
    ]);
}
