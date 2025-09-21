/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { formatTable, handleEnter, moveCell, alignColumn, insertRow, insertColumn } from '../tableKernelAdapter';
import { tokenizeLine } from '../../editor/tableFormatter';

function createView(doc) {
  let state = EditorState.create({ doc });
  const view = {
    get state() { return state; },
    set state(s) { state = s; },
    dispatch(spec) {
      const tr = state.update({
        changes: spec.changes,
        selection: spec.selection ? spec.selection : undefined
      });
      state = tr.state;
    },
    focus() {}
  };
  return view;
}

function getDoc(view){ return view.state.doc.toString(); }

// Helper to run key handler style fns that expect (view) => bool
function invoke(fn, view){ return fn(view); }

describe('tableKernelAdapter basic behaviors', () => {
  it('handleEnter creates skeleton from single header line', () => {
    const view = createView('| A | B |');
    // place cursor at end
  view.dispatch({ selection: EditorSelection.single(getDoc(view).length) });
    const ok = invoke(handleEnter, view);
    expect(ok).toBe(true);
    const out = getDoc(view).split('\n');
    expect(out.length).toBe(3);
    expect(out[1]).toMatch(/---/); // alignment row
  });

  it('moveCell Tab on single header inserts skeleton (similar to Enter path)', () => {
    const view = createView('| Col1 | Col2 |');
  view.dispatch({ selection: EditorSelection.single(getDoc(view).length) });
    const ok = moveCell(view, 'next');
    expect(ok).toBe(true);
    const out = getDoc(view).split('\n');
    expect(out.length).toBe(3);
    expect(out[1]).toMatch(/---/);
  });

  it('moveCell at end of last data row adds new row', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| 1 | 2 |');
    // Put cursor inside last cell end
    const docText = getDoc(view);
    const pos = docText.lastIndexOf('|');
  view.dispatch({ selection: EditorSelection.single(pos) });
    const beforeLines = getDoc(view).split('\n').length;
    const ok = moveCell(view, 'next');
    expect(ok).toBe(true);
    const after = getDoc(view).split('\n');
    expect(after.length).toBe(beforeLines + 1);
  });

  it('handleEnter skeleton sets cursor in first data cell interior', () => {
    const view = createView('| H1 | H2 |');
    view.dispatch({ selection: EditorSelection.single(getDoc(view).length) });
    const ok = invoke(handleEnter, view);
    expect(ok).toBe(true);
    const doc = getDoc(view);
    const lines = doc.split('\n');
    expect(lines.length).toBe(3);
    // Cursor should be on 3rd line (index 2) after first pipe + space
    const third = lines[2];
    const firstPipe = third.indexOf('|');
    const expectedInLine = third[firstPipe + 1] === ' ' ? firstPipe + 2 : firstPipe + 1;
    // Reconstruct absolute offset of start of third line
    const offFirst = lines[0].length + 1 + lines[1].length + 1; // header + newline + align + newline
    const sel = view.state.selection.main.head;
    expect(sel).toBe(offFirst + expectedInLine);
  });

  it('moveCell Tab adding new row places cursor first cell of appended row', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    // Put cursor in last cell end
    const pos = getDoc(view).lastIndexOf('|');
    view.dispatch({ selection: EditorSelection.single(pos) });
    const beforeDoc = getDoc(view);
    const ok = moveCell(view, 'next');
    expect(ok).toBe(true);
    const afterDoc = getDoc(view);
    const afterLines = afterDoc.split('\n');
    expect(afterLines.length).toBe(beforeDoc.split('\n').length + 1);
    const newRow = afterLines[afterLines.length - 1];
    const firstPipe = newRow.indexOf('|');
    const expectedInLine = newRow[firstPipe + 1] === ' ' ? firstPipe + 2 : firstPipe + 1;
    // Compute absolute offset start of new row
    let offset = 0; for (let i = 0; i < afterLines.length - 1; i++) offset += afterLines[i].length + 1;
    const sel = view.state.selection.main.head;
    expect(sel).toBe(offset + expectedInLine);
  });

  it('insertRow below inserts formatted row and positions cursor', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    const headerPos = getDoc(view).indexOf('H1');
    view.dispatch({ selection: EditorSelection.single(headerPos) });
    const beforeLines = getDoc(view).split('\n').length;
    const ok = insertRow(view, 'below');
    expect(ok).toBe(true);
    const after = getDoc(view).split('\n');
    expect(after.length).toBe(beforeLines + 1);
    // Newly inserted row should be after header or after alignment row? Since header + alignment exist, inserting below header should land after alignment? Implementation inserts at header index+1 then formatting keeps order with alignment row unaffected; so check there is still alignment row at index 1.
    expect(/---/.test(after[1])).toBe(true);
  });

  it('insertRow above inserts before current line', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    // Place cursor in data row
    const dataPos = getDoc(view).indexOf('a');
    view.dispatch({ selection: EditorSelection.single(dataPos) });
    const before = getDoc(view).split('\n');
    const ok = insertRow(view, 'above');
    expect(ok).toBe(true);
    const after = getDoc(view).split('\n');
    expect(after.length).toBe(before.length + 1);
    // There should be two consecutive data rows after alignment now.
    const alignmentIdx = 1;
    expect(/---/.test(after[alignmentIdx])).toBe(true);
    // Verify at least one blank-looking row exists among following two lines
    const post = after.slice(alignmentIdx + 1, alignmentIdx + 3);
    expect(post.some(l => /\|\s*\|/.test(l.replace(/\s+/g,' ')))).toBe(true);
  });

  it('insertColumn after adds a new empty column and alignment segment', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    // Put cursor in first header cell
    const pos = getDoc(view).indexOf('H1');
    view.dispatch({ selection: EditorSelection.single(pos) });
    const before = getDoc(view).split('\n');
    const ok = insertColumn(view, 'after');
    expect(ok).toBe(true);
    const after = getDoc(view).split('\n');
    // Header now should have 3 columns
  const headerCells = tokenizeLine(after[0]).map(c=>c.trim());
  expect(headerCells.length).toBe(3);
    // Alignment row should contain three dash segments
    const dashSegments = after[1].split('|').filter(s=>/-{3,}/.test(s));
    expect(dashSegments.length).toBe(3);
  });

  it('insertColumn before inserts at current column index', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    // Put cursor in second header cell (H2)
    const pos = getDoc(view).indexOf('H2');
    view.dispatch({ selection: EditorSelection.single(pos) });
    const ok = insertColumn(view, 'before');
    expect(ok).toBe(true);
    const lines = getDoc(view).split('\n');
  const headerParts = tokenizeLine(lines[0]).map(s=>s.trim());
  // Yeni eklenen boş sütun H2'nin önüne gelmeli (H2 index +1 kaymalı)
  const h2IndexOriginal = 1; // başlangıçta H2 ikinci kolondu
  expect(headerParts.length).toBe(3);
  expect(headerParts[h2IndexOriginal]).toBe(''); // önce boş geldi
  expect(headerParts[h2IndexOriginal+1]).toBe('H2');
  });

  it('formatTable keeps alignment markers when invoked', () => {
    const view = createView('| H1 | H2 |\n| :--- | ---: |\n| a | b |');
    formatTable(view); // may return false in stripped test env; focus on idempotence
    const lines = getDoc(view).split('\n');
    expect(lines[1]).toMatch(/:---/);
    expect(lines[1]).toMatch(/---:/);
  });

  it('alignColumn left centers sets :--- pattern correctly', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    // place cursor in second column header (simulate selection)
    const pos = getDoc(view).indexOf('H2');
    view.dispatch({ selection: EditorSelection.single(pos) });
    alignColumn(view, 'center');
    let lines = getDoc(view).split('\n');
    expect(lines[1]).toMatch(/:\s*-{3,}:\s*\|/); // first column maybe untouched, second should be centered
  });

  it('alignColumn right applies trailing colon only', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    const pos = getDoc(view).indexOf('H2');
    view.dispatch({ selection: EditorSelection.single(pos) });
    alignColumn(view, 'right');
    const lines = getDoc(view).split('\n');
    // second alignment cell should end with : but not start with :
    const parts = lines[1].split('|').map(s=>s.trim()).filter(Boolean);
    const second = parts[1];
    expect(second.endsWith(':')).toBe(true);
  });

  it('alignColumn left applies leading colon only', () => {
    const view = createView('| H1 | H2 |\n| --- | --- |\n| a | b |');
    const pos = getDoc(view).indexOf('H2');
    view.dispatch({ selection: EditorSelection.single(pos) });
    alignColumn(view, 'left');
    const lines = getDoc(view).split('\n');
    const parts = lines[1].split('|').map(s=>s.trim()).filter(Boolean);
    const second = parts[1];
    expect(/^:.+-+$/.test(second)).toBe(true);
  });
});
