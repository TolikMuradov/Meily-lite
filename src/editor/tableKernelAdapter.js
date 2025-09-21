import { keymap } from '@codemirror/view';
import { EditorSelection, Transaction } from '@codemirror/state';
import { TableEditor } from '@susisu/mte-kernel';
import { formatMarkdownTable, tokenizeLine } from './tableFormatter';
import { getTableConfig } from '../config/tableConfig';

// Config backed flags
function cfg() { return getTableConfig(); }

// Utility: extract full table text block at a given cursor position
function locateTable(state, pos) {
  const doc = state.doc;
  const line = doc.lineAt(pos);
  const isTableLike = (text) => /\|/.test(text) && /\|.*\|/.test(text) && !/^\s*```/.test(text);
  if (!isTableLike(line.text)) return null;
  let start = line.number;
  let end = line.number;
  const max = doc.lines;
  const get = (n) => doc.line(n).text;
  while (start > 1 && isTableLike(get(start - 1))) start--;
  while (end < max && isTableLike(get(end + 1))) end++;
  return { start, end };
}

function extractTable(state, region) {
  const lines = [];
  for (let ln = region.start; ln <= region.end; ln++) {
    lines.push(state.doc.line(ln).text);
  }
  return lines.join('\n');
}

function applyEdit(view, region, newText, cursorOffset, userEvent) {
  const { state } = view;
  const from = state.doc.line(region.start).from;
  const to = state.doc.line(region.end).to;
  const original = state.sliceDoc(from, to);
  const changeNeeded = newText !== original;
  const annotations = [];
  if (userEvent) annotations.push(Transaction.userEvent.of(userEvent));
  if (changeNeeded) {
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: cursorOffset != null ? EditorSelection.single(from + cursorOffset) : undefined,
      scrollIntoView: true,
      annotations
    });
  } else if (cursorOffset != null) {
    // Only cursor move; no content change -> selection update without history (no userEvent)
    view.dispatch({
      selection: EditorSelection.single(from + cursorOffset),
      scrollIntoView: true
    });
  }
}

function buildKernel(tableText) {
  return new TableEditor(tableText);
}

function validateTable(text) {
  // Basic heuristic: at least one pipe per line and an alignment row with dashes
  const lines = text.split(/\n/);
  if (lines.length < 2) return false;
  if (!lines[0].includes('|')) return false;
  const hasDashRow = lines.slice(1, 4).some(l => /\|/.test(l) && /-/.test(l));
  return hasDashRow;
}

function runWithKernel(view, fn) {
  const { state } = view;
  const pos = state.selection.main.head;
  const region = locateTable(state, pos);
  if (!region) return false; // tablo değil -> false (indent vb. devam etsin)
  const original = extractTable(state, region);
  // validateTable or provisional single-header line
  if (!validateTable(original)) {
    // Allow single-line header (no alignment yet) for Enter skeleton generation
    const singleLine = region.start === region.end;
    const headerCells = singleLine ? original.split('|').slice(1, -1).map(s=>s.trim()).filter(Boolean) : [];
    if (!(singleLine && headerCells.length >= 2)) return false;
  }

  let kernel = null;
  if (cfg().kernelEnabled) {
    try {
      kernel = buildKernel(original);
    } catch (e) {
  if (cfg().debug) console.warn('[table.kernel.init] failed', e);
      // Kernel başarısızsa manuel fallback devam edecek
      kernel = null;
    }
  }

  let result;
  try {
    const tableStartFrom = state.doc.line(region.start).from;
    result = fn(kernel, pos - tableStartFrom, { region, state, original, tableStartFrom });
  } catch (e) {
  if (cfg().debug) console.warn('[table.op] failed, aborting op', e);
    return false;
  }
  if (!result) return false;

  // Normalize result
  let newText = null;
  let cursor = null;
  if (typeof result === 'string') newText = result;
  else if (result.text) newText = result.text;
  else if (Array.isArray(result.lines)) newText = result.lines.join('\n');
  if (!newText) newText = original; // text değişmeyebilir (sadece cursor hareketi)
  if (result.cursor != null) cursor = result.cursor;

  // Değişim (veya sadece cursor) uygula
  if (newText !== original || cursor != null) {
    applyEdit(view, region, newText, cursor, result.userEvent);
    return true;
  }
  return true; // tablo içindeydik ama hareket yok -> yine de handled
}

// Determine current column index relative to the table line by counting pipes.
// relCursor: offset within the current line.
function getColumnIndex(lineText, relCursor) {
  // Strategy: count pipes BEFORE cursor; first pipe corresponds to column 0 (cell to its right)
  let col = -1;
  for (let i = 0; i < relCursor; i++) {
    if (lineText[i] === '|') col++;
  }
  // If no pipe seen yet we are in first column
  if (col < 0) col = 0;
  // If cursor sits exactly on a pipe, keep the previous column (already reflected)
  return col;
}

// Operations
export function formatTable(view) {
  const start = performance.now();
  const ok = runWithKernel(view, (kernel, rel, ctx) => {
    const out = kernel.format ? kernel.format(rel) : null;
    // out could be string or { text, cursor }
    return out || ctx.original; // if format no-op
  });
  if (ok) {
    const dur = performance.now() - start;
    if (dur > 16) console.warn('[table.format] slow format', dur.toFixed(2),'ms');
  }
  return ok;
}

export function moveCell(view, dir) {
  return runWithKernel(view, (kernel, relCursor, ctx) => {
  if (cfg().debug) console.log('[table.moveCell]', { dir, relCursor, region: ctx.region, original: ctx.original.split('\n')[0] + '...' });
    // Provisional single header line: use Tab (next) to create skeleton if Enter not used yet
    if (dir === 'next') {
      const { state } = view;
      const pos = state.selection.main.head;
      const region = locateTable(state, pos);
      if (region && region.start === region.end) {
        const headerLine = state.doc.line(region.start).text;
        const headerCells = splitCells(headerLine);
        if (headerCells.length >= 2) {
          if (cfg().debug) console.log('[table.tab.skeletonTrigger]', headerCells);
          const alignRow = buildAlignmentFromHeader(headerCells);
          const emptyRow = buildEmptyRow(headerCells);
          const from = state.doc.line(region.start).to;
          view.dispatch({ changes: { from, to: from, insert: '\n' + alignRow + '\n' + emptyRow } });
          const newState = view.state;
          const newRegion = locateTable(newState, from + 1) || region;
          if (newRegion) {
            const block = extractTable(newState, newRegion);
            const formatted = formatMarkdownTable(block.split('\n')).join('\n');
            const blockFrom = newState.doc.line(newRegion.start).from;
            const blockTo = newState.doc.line(newRegion.end).to;
            view.dispatch({ changes: { from: blockFrom, to: blockTo, insert: formatted } });
            const after = view.state;
            const dataLine = after.doc.line(newRegion.start + 2);
            const fp = dataLine.text.indexOf('|');
            const cursor = fp >= 0 ? dataLine.from + fp + 2 : dataLine.from;
            view.dispatch({ selection: EditorSelection.single(cursor), scrollIntoView: true });
          }
          return { text: ctx.original };
        }
      }
    }
    // Kernel devre dışı, manuel navigation + auto format + optional new row creation
    const { original } = ctx;
    let lines = original.split('\n');
    // Build offsets per line (pre-format, pre-change)
    const computeLineOffsets = (arr) => {
      const offs = []; let a = 0; for (const l of arr) { offs.push(a); a += l.length + 1; } return offs; };
    let lineOffsets = computeLineOffsets(lines);
    // Find current line index
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const start = lineOffsets[i]; const end = start + lines[i].length;
      if (relCursor >= start && relCursor <= end) { lineIndex = i; break; }
    }
    // Helper to get cell ranges for a line
    const colInfo = (ln) => {
      const raw = lines[ln];
      const parts = raw.split('|');
      let pos = parts[0].length + 1; // skip leading segment + first pipe
      const ranges = [];
      for (let i = 1; i < parts.length - 1; i++) {
        const cellText = parts[i];
        const cellStart = pos;
        ranges.push({ index: i - 1, start: cellStart, end: cellStart + cellText.length });
        pos += cellText.length + 1; // + pipe
      }
      return { ranges, raw };
    };
    const { ranges } = colInfo(lineIndex);
    const inLinePos = relCursor - lineOffsets[lineIndex];
    const currentCol = (() => {
      for (const r of ranges) if (inLinePos >= r.start && inLinePos <= r.end) return r.index;
      return ranges.length - 1;
    })();
    let targetLine = lineIndex;
    let targetCol = currentCol;
    let newRowAdded = false;
    if (dir === 'next') {
      if (currentCol < ranges.length - 1) {
        targetCol = currentCol + 1;
      } else {
        // seek next non-alignment line
        let ni = lineIndex + 1;
        while (ni < lines.length && /^\|\s*:?[- ]+:?/.test(lines[ni])) ni++;
        if (ni < lines.length) {
          targetLine = ni; targetCol = 0;
        } else {
          // append a new empty data row via helper
            const insertAt = lines.length; // push at end
            const res = insertEmptyRowFormatted(lines, insertAt, 'tab.appendRow');
            if (res) {
              newRowAdded = true;
              // replace lines with formatted result
              lines = res.lines;
              targetLine = insertAt;
              targetCol = 0;
            } else return null; // cannot add row
        }
      }
    } else { // prev
      if (currentCol > 0) {
        targetCol = currentCol - 1;
      } else {
        let pi = lineIndex - 1;
        // Skip alignment rows
        while (pi >= 0 && isAlignmentRow(lines[pi])) pi--;
        if (pi >= 0) {
          // Allow jumping to header as previous row; if header we still take last cell
          targetLine = pi;
          const prevRanges = colInfo(pi).ranges;
          if (prevRanges.length) targetCol = prevRanges.length - 1; else targetCol = 0;
        } else {
          // No previous row (already at top) -> stay in place but mark handled
          targetLine = lineIndex;
          targetCol = currentCol; // will yield same cursor; prevents default indent
        }
      }
    }
    // Conditional formatting: only if autoFormatOnTab enabled or a new row was added.
    let finalLines;
    if (cfg().autoFormatOnTab || newRowAdded) {
      const t0 = performance.now();
      finalLines = formatMarkdownTable(lines);
      const dur = performance.now() - t0;
      const threshold = cfg().perfWarnThresholdMs || 24;
      if (dur > threshold) console.warn('[table.perf.format.moveCell]', { dur: dur.toFixed(2), threshold, rows: lines.length });
    } else {
      finalLines = lines; // raw (un-padded) movement
    }
    const newText = finalLines.join('\n');
    // Recompute target line & cell start inside (possibly formatted) output
    const targetLineText = finalLines[targetLine];
    let pipeCount = -1; let interiorPos = null;
    for (let i = 0; i < targetLineText.length; i++) {
      if (targetLineText[i] === '|') {
        pipeCount++;
        if (pipeCount === targetCol) {
          // Expect pattern '| ' then content; place after space if exists
          if (targetLineText[i + 1] === ' ') interiorPos = i + 2; else interiorPos = i + 1;
          break;
        }
      }
    }
    if (interiorPos == null) interiorPos = targetLineText.length; // fallback
    // Compute cursor absolute offset
    let newOffsets = []; let acc2 = 0; for (const l of finalLines) { newOffsets.push(acc2); acc2 += l.length + 1; }
    const cursor = newOffsets[targetLine] + interiorPos;
  if (cfg().debug) console.log('[table.moveCell.done]', { dir, targetLine, targetCol, newRowAdded });
    // If text did not change (no formatting & no new row) return only cursor movement
    if (newText === ctx.original) return { text: ctx.original, cursor, userEvent: 'tableMove' };
    // If new row added treat as structure change so it becomes separate undo group boundary
    return { text: newText, cursor, userEvent: newRowAdded ? 'tableStructure' : 'tableMove' };
  });
}

export function insertRow(view, where) {
  return runWithKernel(view, (kernel, relCursor, ctx) => {
    const { original } = ctx;
    let lines = original.split('\n');
    // Determine current line index
    let lineOffsets = []; let acc=0; for(const l of lines){ lineOffsets.push(acc); acc += l.length + 1; }
    let curLine = 0; for(let i=0;i<lines.length;i++){ if(relCursor>=lineOffsets[i] && relCursor<=lineOffsets[i]+lines[i].length){ curLine=i; break; } }
    const insIndex = where === 'below' ? curLine + 1 : curLine;
    const res = insertEmptyRowFormatted(lines, insIndex, 'insertRow');
    if (!res) return false;
    return { text: res.lines.join('\n'), cursor: res.cursorOffsetInTable, userEvent: 'tableStructure' };
  });
}

export function insertColumn(view, where) {
  return runWithKernel(view, (kernel, relCursor, ctx) => {
    const { original } = ctx;
    let lines = original.split('\n');
    if (lines.length < 2) return false; // not a full table
    // Determine current line index & in-line position
    let lineOffsets=[];let acc=0;for(const l of lines){lineOffsets.push(acc);acc+=l.length+1;}
    let curLine=0;for(let i=0;i<lines.length;i++){ if(relCursor>=lineOffsets[i] && relCursor<=lineOffsets[i]+lines[i].length){ curLine=i; break; } }
    const relInLine = relCursor - lineOffsets[curLine];
    // Use header as column reference
    const header = lines[0];
    const headerCells = splitCells(header);
    if (headerCells.length < 1) return false;
    // Kolon indeksini mevcut yardımcıyla (pipe sayımı) hesapla
    const lineText = lines[curLine];
    let col = getColumnIndex(lineText, relInLine);
    if (col < 0) col = 0;
    const insertAt = where === 'after' ? col + 1 : col;
    // Mutate each line inserting blank / alignment cell
    lines = lines.map((ln, idx) => {
      const cells = splitCells(ln);
      if (idx === 1 && isAlignmentRow(ln)) {
        cells.splice(insertAt, 0, '---');
      } else {
        cells.splice(insertAt, 0, ''); // boş header/data hücresi
      }
      return '|' + cells.join('|') + '|';
    });
    // Format entire table for padding & alignment widths
    const formatted = formatMarkdownTable(lines);
    const newText = formatted.join('\n');
    // Compute cursor: go to first data row (if exists) in new column interior; else header
    const targetLineIndex = formatted.length > 2 ? 2 : 0;
    const targetLine = formatted[targetLineIndex];
    // Find pipe corresponding to insertAt
    let pipeCount = -1; let cursorInLine = 0;
    for (let i=0;i<targetLine.length;i++) {
      if (targetLine[i] === '|') {
        pipeCount++;
        if (pipeCount === insertAt) {
          cursorInLine = (targetLine[i+1] === ' ' ? i+2 : i+1);
          break;
        }
      }
    }
    // Build offsets to compute absolute cursor
    let off=0; const offs=[]; for(const l of formatted){ offs.push(off); off += l.length + 1; }
    const cursor = offs[targetLineIndex] + cursorInLine;
    return { text: newText, cursor, userEvent: 'tableStructure' };
  });
}

export function alignColumn(view, alignment) {
  // alignment: 'left' | 'center' | 'right'
  return runWithKernel(view, (kernel, relCursor, ctx) => {
    const { state, original } = ctx;
    const line = state.doc.lineAt(state.selection.main.head);
    const colIndex = getColumnIndex(line.text, relCursor);
    // If kernel exposes alignColumn we prefer that.
    // Kernel devre dışı -> manuel alignment
    const source = original; // fallback manual manipulation of alignment row
    const tableLines = source.split('\n');
    if (tableLines.length < 2) return { text: source };
    const header = tableLines[0];
    const align = tableLines[1];
    // Quick heuristic: second line must contain dashes
    if (!/-/.test(align)) return { text: source };
    const headerParts = header.split('|');
    let leadingEmpty = headerParts[0].trim() === '';
    let trailingEmpty = headerParts[headerParts.length - 1].trim() === '';
    const alignParts = align.split('|');
    // Build list of indices that correspond to real columns
    const contentIdxs = [];
    for (let i = 0; i < alignParts.length; i++) {
      if (i === 0 && leadingEmpty) continue;
      if (i === alignParts.length - 1 && trailingEmpty) continue;
      contentIdxs.push(i);
    }
    const targetPartIdx = contentIdxs[colIndex];
    if (targetPartIdx == null) return { text: source };
    // Determine width (dash count) of target cell to preserve formatting
    const raw = alignParts[targetPartIdx];
    const dashMatch = raw.match(/-+/);
    const dashCount = dashMatch ? dashMatch[0].length : 3;
    const dashes = '-'.repeat(Math.max(3, dashCount));
    let left = false, right = false;
    if (alignment === 'left') left = true; else if (alignment === 'right') right = true; else if (alignment === 'center') { left = true; right = true; }
    alignParts[targetPartIdx] = (left ? ':' : '') + dashes + (right ? ':' : '');
    tableLines[1] = alignParts.join('|');
    // Optional debug (comment out in production)
    // console.debug('[table.align]', { alignment, colIndex, targetPartIdx, result: tableLines[1] });
    return { text: tableLines.join('\n') };
  });
}

// --- Automatic table skeleton & formatting ---
function isAlignmentRow(text) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(text);
}

function splitCells(line) {
  return tokenizeLine(line).map(_cell => _cell.trim());
}

function buildAlignmentFromHeader(headerCells) {
  return '|' + headerCells.map(() => '---').join('|') + '|';
}

function buildEmptyRow(headerCells) {
  return '|' + headerCells.map(() => ' ').join('|') + '|';
}

// Shared helper: insert an empty data row at given index, format, compute cursor inside first cell.
// Returns { lines, cursorOffsetInTable } or null on failure.
function insertEmptyRowFormatted(lines, insertAt, perfLabel) {
  const headerCells = splitCells(lines[0]);
  if (headerCells.length < 2) return null;
  const emptyRow = buildEmptyRow(headerCells);
  lines.splice(insertAt, 0, emptyRow);
  const t0 = performance.now();
  const formatted = formatMarkdownTable(lines);
  const dur = performance.now() - t0;
  const threshold = cfg().perfWarnThresholdMs || 24;
  if (dur > threshold) console.warn('[table.perf.format.' + perfLabel + ']', { dur: dur.toFixed(2), threshold, rows: formatted.length });
  const dataLine = formatted[insertAt];
  const firstPipe = dataLine.indexOf('|');
  const cursorInLine = firstPipe >= 0 ? (dataLine[firstPipe + 1] === ' ' ? firstPipe + 2 : firstPipe + 1) : dataLine.length;
  let off = 0; const formattedOffsets = [];
  for (const l of formatted) { formattedOffsets.push(off); off += l.length + 1; }
  return { lines: formatted, cursorOffsetInTable: formattedOffsets[insertAt] + cursorInLine };
}

export function handleEnter(view) {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  if (pos !== line.to) return false; // only at EOL
  if (!/\|/.test(line.text)) return false;
  // Use runWithKernel for uniform single-dispatch editing.
  return runWithKernel(view, (_kernel, relCursor, ctx) => {
    const { original, region } = ctx;
    const lines = original.split('\n');
    // Determine current line index inside table
    let offsets = []; let acc = 0; for (const l of lines) { offsets.push(acc); acc += l.length + 1; }
    let lineIndex = 0; for (let i = 0; i < lines.length; i++) { if (relCursor >= offsets[i] && relCursor <= offsets[i] + lines[i].length) { lineIndex = i; break; } }
    const currentLine = lines[lineIndex];
    if (cfg().debug) console.log('[table.enter.singleDispatch]', { lineIndex, total: lines.length });

    // Case A: single header line (skeleton creation)
    if (lines.length === 1) {
      const headerCells = splitCells(currentLine);
      if (headerCells.length >= 2) {
        const alignRow = buildAlignmentFromHeader(headerCells);
        const emptyRow = buildEmptyRow(headerCells);
        let newLines = [currentLine, alignRow, emptyRow];
        const t0 = performance.now();
        const formatted = formatMarkdownTable(newLines);
        const dur = performance.now() - t0; const threshold = cfg().perfWarnThresholdMs || 24; if (dur > threshold) console.warn('[table.perf.format.enter.skeleton]', { dur: dur.toFixed(2), threshold, rows: formatted.length });
        // Cursor: first data row (index 2) first cell interior
        const dataLine = formatted[2];
        const firstPipe = dataLine.indexOf('|');
        const cursorInLine = firstPipe >= 0 ? (dataLine[firstPipe + 1] === ' ' ? firstPipe + 2 : firstPipe + 1) : dataLine.length;
        // Build new offsets for formatted lines
        let off2 = 0; let formattedOffsets = []; for (const l of formatted) { formattedOffsets.push(off2); off2 += l.length + 1; }
        return { text: formatted.join('\n'), cursor: formattedOffsets[2] + cursorInLine };
      }
      return false;
    }

    // Case B: alignment row line (insert new first data row below alignment)
    if (isAlignmentRow(currentLine)) {
      // Need header for column count
      if (lineIndex > 0) {
        const insertAt = lineIndex + 1;
        const res = insertEmptyRowFormatted(lines, insertAt, 'enter.alignmentRow');
        if (res) return { text: res.lines.join('\n'), cursor: res.cursorOffsetInTable };
      }
      return false;
    }

    // Case C: existing table normal (header or data) line -> insert new data row below current line.
    if (region.start !== region.end) {
      const insertAt = lineIndex + 1;
      const res = insertEmptyRowFormatted(lines, insertAt, 'enter.dataRow');
      if (res) return { text: res.lines.join('\n'), cursor: res.cursorOffsetInTable };
    }

    return false; // not handled -> allow default newline
  });
}

export function tableKernelExtension() {
  return keymap.of([
    // Enter: sadece tablo header/alignment durumlarında true döner; aksi halde default newline devam eder
    { key: 'Enter', run: handleEnter },
    // Format komutu explicit; true döndürür ve default engellenir
    { key: 'Alt-Shift-r', run: formatTable },
    // Tab / Shift-Tab: tablo içinde hareket başarısızsa false -> default indent
    { key: 'Tab', run: (v) => moveCell(v, 'next') },
    { key: 'Shift-Tab', run: (v) => moveCell(v, 'prev') },
    { key: 'Alt-Shift-Enter', run: (v) => insertRow(v, 'below') },
    { key: 'Alt-Shift-c', run: (v) => insertColumn(v, 'after') }
  ]);
}
