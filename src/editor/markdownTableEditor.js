import { keymap } from '@codemirror/view';

function detectTableRegion(state, lineNumber) {
  const doc = state.doc;
  const totalLines = doc.lines;
  let start = lineNumber;
  let end = lineNumber;
  const isRow = (text) => /\|/.test(text) && /^\s*\|.*\|\s*$/.test(text.trim());
  const isSep = (text) => /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/.test(text.trim());
  const isTableLine = (text) => isRow(text) || isSep(text);
  const getLine = (n) => doc.line(n).text;
  if (!isTableLine(getLine(lineNumber))) return null;
  while (start > 1 && isTableLine(getLine(start - 1))) start--;
  while (end < totalLines && isTableLine(getLine(end + 1))) end++;
  return { start, end };
}

function parseTable(state, region) {
  const rows = [];
  let align = [];
  for (let ln = region.start; ln <= region.end; ln++) {
    const raw = state.doc.line(ln).text;
    if (/^\s*$/.test(raw)) continue;
    const isSep = /^\s*\|?(\s*:?-+:?\s*\|)+\s*$/.test(raw.trim());
    const parts = raw.split('|');
    if (parts.length < 2) continue;
    if (parts[0].trim() === '') parts.shift();
    if (parts[parts.length - 1].trim() === '') parts.pop();
    const cells = parts.map(c => c.replace(/\s+/g, ' ').trim());
    if (isSep) {
      align = cells.map(c => {
        const t = c.trim();
        const left = t.startsWith(':');
        const right = t.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        if (left) return 'left';
        return 'left';
      });
    } else {
      rows.push({ line: ln, cells });
    }
  }
  const colCount = rows.reduce((m, r) => Math.max(m, r.cells.length), 0);
  if (!align.length) align = Array(colCount).fill('left');
  if (align.length < colCount) align = align.concat(Array(colCount - align.length).fill('left'));
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
  return [
    keymap.of([
      { key: 'Alt-Shift-r', preventDefault: true, run: reformatTable },
      { key: 'Alt-Shift-Enter', preventDefault: true, run: addRow },
      { key: 'Alt-Shift-c', preventDefault: true, run: addColumn },
    ])
  ];
}
