import { keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import { TableEditor } from '@susisu/mte-kernel';
import { formatMarkdownTable, tokenizeLine } from './tableFormatter';

// Feature flags / debug
const TABLE_KERNEL_ENABLE = false; // Kernel tamamen devre dışı (fallback zorlanır)
const TABLE_DEBUG = true; // debug aktif

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

function applyEdit(view, region, newText, cursorOffset) {
  const { state } = view;
  const from = state.doc.line(region.start).from;
  const to = state.doc.line(region.end).to;
  view.dispatch({
    changes: { from, to, insert: newText },
    selection: cursorOffset != null ? EditorSelection.single(from + cursorOffset) : undefined,
    scrollIntoView: true
  });
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
  if (TABLE_KERNEL_ENABLE) {
    try {
      kernel = buildKernel(original);
    } catch (e) {
      if (TABLE_DEBUG) console.warn('[table.kernel.init] failed', e);
      // Kernel başarısızsa manuel fallback devam edecek
      kernel = null;
    }
  }

  let result;
  try {
    const tableStartFrom = state.doc.line(region.start).from;
    result = fn(kernel, pos - tableStartFrom, { region, state, original, tableStartFrom });
  } catch (e) {
    if (TABLE_DEBUG) console.warn('[table.op] failed, aborting op', e);
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
    applyEdit(view, region, newText, cursor);
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
    if (TABLE_DEBUG) console.log('[table.moveCell]', { dir, relCursor, region: ctx.region, original: ctx.original.split('\n')[0] + '...' });
    // Provisional single header line: use Tab (next) to create skeleton if Enter not used yet
    if (dir === 'next') {
      const { state } = view;
      const pos = state.selection.main.head;
      const region = locateTable(state, pos);
      if (region && region.start === region.end) {
        const headerLine = state.doc.line(region.start).text;
        const headerCells = splitCells(headerLine);
        if (headerCells.length >= 2) {
          if (TABLE_DEBUG) console.log('[table.tab.skeletonTrigger]', headerCells);
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
          // append a new empty data row (headerCells from first line)
            const headerCells = splitCells(lines[0]);
            if (headerCells.length >= 2) {
              lines.push(buildEmptyRow(headerCells));
              newRowAdded = true;
              targetLine = lines.length - 1;
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
    // Always format after movement (user request)
    const formattedLines = formatMarkdownTable(lines);
    const newText = formattedLines.join('\n');
    // Recompute target line & cell start inside formatted output
    // Because formatting may pad cells, find target cell interior by counting pipes.
    const targetLineText = formattedLines[targetLine];
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
    let newOffsets = []; let acc2 = 0; for (const l of formattedLines) { newOffsets.push(acc2); acc2 += l.length + 1; }
    const cursor = newOffsets[targetLine] + interiorPos;
    if (TABLE_DEBUG) console.log('[table.moveCell.done]', { dir, targetLine, targetCol, newRowAdded });
    return { text: newText, cursor };
  });
}

export function insertRow(view, where) {
  return runWithKernel(view, (kernel, relCursor, ctx) => {
    // Try kernel
    // Kernel devre dışı -> manuel
    // Manual fallback
    const { original } = ctx;
    const lines = original.split('\n');
    const header = lines[0];
    const colCount = header.split('|').length - 2;
    const blankRow = '|' + Array(colCount).fill('').join('|') + '|';
    // line offsets
    let lineOffsets = []; let acc=0; for (const l of lines){lineOffsets.push(acc); acc+=l.length+1;}
    let curLine=0; for(let i=0;i<lines.length;i++){ if(relCursor>=lineOffsets[i] && relCursor<=lineOffsets[i]+lines[i].length){curLine=i;break;} }
    const insIndex = where === 'below' ? curLine+1 : curLine;
    lines.splice(insIndex,0,blankRow);
    const newText = lines.join('\n');
    const cursor = lineOffsets[curLine];
    return { text: newText, cursor };
  });
}

export function insertColumn(view, where) {
  return runWithKernel(view, (kernel, relCursor, ctx) => {
    // Kernel devre dışı -> manuel
    const { original } = ctx;
    const lines = original.split('\n');
    // Determine position
    let lineOffsets=[];let acc=0;for(const l of lines){lineOffsets.push(acc);acc+=l.length+1;}
    let curLine=0;for(let i=0;i<lines.length;i++){if(relCursor>=lineOffsets[i] && relCursor<=lineOffsets[i]+lines[i].length){curLine=i;break;}}
    const relInLine = relCursor - lineOffsets[curLine];
    const pipesPositions=[]; for(let i=0;i<lines[curLine].length;i++){ if(lines[curLine][i]==='|') pipesPositions.push(i); }
    const headerParts = lines[0].split('|');
    const colCount = headerParts.length - 2;
    let col=0; for(let i=1;i<pipesPositions.length;i++){ if(relInLine>=pipesPositions[i-1] && relInLine<pipesPositions[i]) { col=i-1; break; } if(relInLine>=pipesPositions[pipesPositions.length-1]) col=colCount-1; }
    const insertAt = where==='after' ? col+1 : col;
    function addCell(line,isAlign){
      const parts=line.split('|');
      const cells=parts.slice(1,parts.length-1);
      const newCell=isAlign? '---' : '';
      cells.splice(insertAt,0,newCell);
      return '|' + cells.join('|') + '|';
    }
    for(let i=0;i<lines.length;i++){
      if(i===1) lines[i]=addCell(lines[i],true); else lines[i]=addCell(lines[i],false);
    }
    return { text: lines.join('\n') };
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
  return tokenizeLine(line).map(c => c.trim());
}

function buildAlignmentFromHeader(headerCells) {
  return '|' + headerCells.map(c => '---').join('|') + '|';
}

function buildEmptyRow(headerCells) {
  return '|' + headerCells.map(() => ' ').join('|') + '|';
}


export function handleEnter(view) {
  const { state } = view;
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const atLineEnd = pos === line.to;
  if (!atLineEnd) return false; // only intercept Enter at EOL
  const text = line.text;
  if (!/\|/.test(text)) return false;
  const region = locateTable(state, pos);
  if (TABLE_DEBUG) console.log('[table.enter.check]', { line: text, region });
  // Case 1: single header line (no alignment row yet)
  if (region && region.start === region.end) {
    const headerCells = splitCells(text);
    if (TABLE_DEBUG) console.log('[table.enter.headerCandidate]', headerCells);
    if (headerCells.length >= 2) {
      const alignRow = buildAlignmentFromHeader(headerCells);
      const emptyRow = buildEmptyRow(headerCells);
      const insertion = '\n' + alignRow + '\n' + emptyRow;
      const from = line.to;
      view.dispatch({
        changes: { from, to: from, insert: insertion },
      });
      if (TABLE_DEBUG) console.log('[table.enter.skeletonInserted]', { alignRow, emptyRow });
      // Reformat (widths) after insertion
      const newState = view.state;
      const newRegion = locateTable(newState, from + 1) || region; // updated region now 3 lines
      if (newRegion) {
        const originalBlock = extractTable(newState, newRegion);
  const formattedLines = formatMarkdownTable(originalBlock.split('\n'));
        const formatted = formattedLines.join('\n');
        if (TABLE_DEBUG) console.log('[table.enter.formatted]', formattedLines);
        const blockFrom = newState.doc.line(newRegion.start).from;
        const blockTo = newState.doc.line(newRegion.end).to;
        view.dispatch({ changes: { from: blockFrom, to: blockTo, insert: formatted } });
        // place cursor in first data row first cell
        const afterFormatState = view.state;
        const formattedRegion = locateTable(afterFormatState, blockFrom) || newRegion;
        // data row is line index start+2
        const dataLine = afterFormatState.doc.line(formattedRegion.start + 2);
        const dataText = dataLine.text;
        const firstPipe = dataText.indexOf('|');
        const secondPipe = dataText.indexOf('|', firstPipe + 1);
        const cursor = (firstPipe >=0 && secondPipe>firstPipe) ? dataLine.from + firstPipe + 2 : dataLine.from + dataText.length; // inside first cell
        view.dispatch({ selection: EditorSelection.single(cursor), scrollIntoView: true });
      }
      return true;
    }
  }
  // Case 2: alignment row line -> add empty data row below
  if (isAlignmentRow(text)) {
    if (TABLE_DEBUG) console.log('[table.enter.onAlignmentRow]');
    // Need header above to know column count
    if (line.number > 1) {
      const headerLine = state.doc.line(line.number - 1).text;
      const headerCells = splitCells(headerLine);
      if (headerCells.length) {
        const emptyRow = '\n' + buildEmptyRow(headerCells);
        const from = line.to;
        view.dispatch({ changes: { from, to: from, insert: emptyRow } });
        // Reformat entire table (including new row)
        const newState = view.state;
        const region2 = locateTable(newState, from + 1);
        if (region2) {
          const originalBlock = extractTable(newState, region2);
          const formattedLines = formatMarkdownTable(originalBlock.split('\n'));
          const formatted = formattedLines.join('\n');
          if (TABLE_DEBUG) console.log('[table.enter.newDataRowFormatted]', formattedLines);
          const blockFrom = newState.doc.line(region2.start).from;
          const blockTo = newState.doc.line(region2.end).to;
          view.dispatch({ changes: { from: blockFrom, to: blockTo, insert: formatted } });
          const afterFormatState = view.state;
          // cursor to new row first cell
            const formattedRegion = locateTable(afterFormatState, blockFrom) || region2;
            const dataLineIdx = formattedRegion.start + 2; // header, align, first data
            const dataLine = afterFormatState.doc.line(dataLineIdx + (region2.end - region2.start + 1) - (formattedRegion.end - formattedRegion.start + 1)); // fallback simple
            const dl = afterFormatState.doc.line(formattedRegion.end); // simpler: place at last line (new row)
            const dlText = dl.text;
            const pipe1 = dlText.indexOf('|');
            const cursor = pipe1 >=0 ? dl.from + pipe1 + 2 : dl.to;
            view.dispatch({ selection: EditorSelection.single(cursor), scrollIntoView: true });
        }
        return true;
      }
    }
  }
  // Case 3: inside an existing table on a normal data row -> create new data row below
  if (region && region.start !== region.end && line.number >= region.start && line.number <= region.end && !isAlignmentRow(text)) {
    // Header is first line of region
    const headerLine = state.doc.line(region.start).text;
    const headerCells = splitCells(headerLine);
    if (headerCells.length >= 2) {
      const emptyRow = '\n' + buildEmptyRow(headerCells);
      const from = line.to;
      view.dispatch({ changes: { from, to: from, insert: emptyRow } });
      if (TABLE_DEBUG) console.log('[table.enter.newDataRowInserted]');
      // Reformat entire updated table
      const afterInsertState = view.state;
      const region3 = locateTable(afterInsertState, from + 1) || region;
      if (region3) {
        const block = extractTable(afterInsertState, region3);
        const formattedLines = formatMarkdownTable(block.split('\n'));
        const formatted = formattedLines.join('\n');
        if (TABLE_DEBUG) console.log('[table.enter.dataRow.formatted]', formattedLines);
        const blockFrom = afterInsertState.doc.line(region3.start).from;
        const blockTo = afterInsertState.doc.line(region3.end).to;
        view.dispatch({ changes: { from: blockFrom, to: blockTo, insert: formatted } });
        const finalState = view.state;
        // New row should now be last line of region (or specifically the one after current line)
        const finalRegion = locateTable(finalState, blockFrom) || region3;
        // Find line number of newly inserted row: original line.number + 1 after formatting
        const newLineNumber = line.number + 1; // formatting preserves line count
        const newLine = finalState.doc.line(newLineNumber);
        const nlText = newLine.text;
        const firstPipe = nlText.indexOf('|');
        const secondPipe = nlText.indexOf('|', firstPipe + 1);
        const cursor = (firstPipe >=0 && secondPipe>firstPipe) ? newLine.from + firstPipe + 2 : newLine.from + nlText.length;
        view.dispatch({ selection: EditorSelection.single(cursor), scrollIntoView: true });
      }
      return true;
    }
  }
  return false;
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
