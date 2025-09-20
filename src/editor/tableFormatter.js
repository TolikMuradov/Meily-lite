// Advanced Markdown table formatter (inspired by common VSCode extensions)
// Focus: robust splitting (ignores escaped pipes and inline code), width calc, alignment preservation.
// MIT-friendly: original logic adapted & simplified.

const PIPE_SPLIT_REGEX = /\|/g;

function tokenizeLine(line) {
  // Return array of raw cell contents (trim not yet applied)
  // We assume leading and trailing pipes optional; normalize by adding if missing
  let work = line.trim();
  if (!work.startsWith('|')) work = '|' + work;
  if (!work.endsWith('|')) work = work + '|';
  const cells = [];
  let current = '';
  let escaped = false;
  let inCode = false; // inline code backticks
  for (let i = 1; i < work.length; i++) { // skip first pipe
    const ch = work[i];
    const prev = work[i - 1];
    if (!escaped && ch === '`') inCode = !inCode; // toggle
    if (!escaped && !inCode && ch === '|') {
      cells.push(current);
      current = '';
      continue;
    }
    if (!escaped && ch === '\\') {
      escaped = true;
      continue;
    }
    escaped = false;
    current += ch;
  }
  return cells;
}

function isAlignmentRow(line) {
  // after normalization must contain only pipes, dashes, colons, spaces
  const raw = line.trim();
  if (!/\|/.test(raw)) return false;
  const cleaned = raw.replace(/^[^|]*/, '');
  const parts = tokenizeLine(cleaned).map(c => c.trim());
  if (!parts.length) return false;
  return parts.every(p => /^:?-{3,}:?$/.test(p) || p === '');
}

function detectAlignment(parts) {
  return parts.map(p => {
    const trimmed = p.trim();
    const left = trimmed.startsWith(':');
    const right = trimmed.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    // default left
    return 'left';
  });
}

function buildAlignment(parts, widths, alignSpec) {
  // Add a leading and trailing space just like header/data rows so vertical pipes align visually.
  return '|' + parts.map((_, i) => {
    const w = Math.max(3, widths[i]);
    const d = '-'.repeat(w);
    const a = alignSpec[i];
    let seg;
    if (a === 'center') seg = ':' + d + ':'; else if (a === 'right') seg = d + ':'; else seg = ':' + d; // left
    return ' ' + seg + ' ';
  }).join('|') + '|';
}

function padCell(text, width, align) {
  const raw = text.trim();
  const len = raw.length;
  if (len >= width) return raw;
  const diff = width - len;
  if (align === 'right') return ' '.repeat(diff) + raw;
  if (align === 'center') {
    const left = Math.floor(diff / 2);
    const right = diff - left;
    return ' '.repeat(left) + raw + ' '.repeat(right);
  }
  return raw + ' '.repeat(diff); // left
}

export function formatMarkdownTable(lines) {
  if (lines.length < 2) return lines;
  // Normalize lines with at least one pipe
  const norm = lines.map(l => l.trimEnd());
  const headerCells = tokenizeLine(norm[0]);
  if (headerCells.length < 2) return lines; // not a table header
  // alignment row detection
  if (!isAlignmentRow(norm[1])) return lines; // must have alignment row already
  const alignCellsRaw = tokenizeLine(norm[1]);
  const dataLines = norm.slice(2);
  const rows = [headerCells, ...dataLines.map(tokenizeLine)];
  const widths = headerCells.map((_, i) => Math.max(3, ...rows.map(r => (r[i] ? r[i].trim().length : 0))));
  const alignSpec = detectAlignment(alignCellsRaw);

  const headerOut = '|' + headerCells.map((c,i) => ' ' + padCell(c, widths[i], 'left') + ' ').join('|') + '|';
  const alignOut = buildAlignment(alignCellsRaw, widths, alignSpec);
  const dataOut = dataLines.map(dl => {
    const cells = tokenizeLine(dl);
    return '|' + widths.map((_, i) => ' ' + padCell(cells[i]||'', widths[i], alignSpec[i] || 'left') + ' ').join('|') + '|';
  });
  return [headerOut, alignOut, ...dataOut];
}

export { tokenizeLine }; // expose for adapter provisional parsing
