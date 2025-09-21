import { describe, it, expect } from 'vitest';
import { formatMarkdownTable, tokenizeLine } from '../src/editor/tableFormatter';

describe('tokenizeLine', () => {
  it('splits simple header', () => {
    expect(tokenizeLine('| a | b |')).toEqual([' a ', ' b ']);
  });
  it('handles missing leading/trailing pipes', () => {
    expect(tokenizeLine('a|b|c')).toEqual(['a', 'b', 'c']);
  });
  it('ignores escaped pipes', () => {
    expect(tokenizeLine('| a \\| b | c |')).toEqual([' a \\| b ', ' c ']);
  });
  it('ignores pipes inside inline code', () => {
    expect(tokenizeLine('| `a|b` | c |')).toEqual([' `a|b` ', ' c ']);
  });
});

describe('formatMarkdownTable', () => {
  it('returns original if not a table', () => {
    const out = formatMarkdownTable(['no table line']);
    expect(out).toEqual(['no table line']);
  });
  it('formats basic table', () => {
    const input = [
      '| H1 | H2 |',
      '| --- | --- |',
      '| a | longer |'
    ];
    const out = formatMarkdownTable(input);
    expect(out[0]).toMatch(/\| H1 +\| H2 +\|/);
    // Alignment satırı artık her hücrede sondaki boşluğu atıyor: "| :---| :---|" gibi.
    expect(out[1]).toMatch(/^\| :?-{3,}:?\| :?-{3,}:?\|$/);
    expect(out[2]).toMatch(/\| a +\| longer +\|/);
  });
  it('preserves alignment spec', () => {
    const input = [
      '| H1 | H2 | H3 |',
      '| :--- | ---: | :---: |',
      '| a | b | c |'
    ];
    const out = formatMarkdownTable(input);
    expect(out[1]).toMatch(/:---/); // left
    expect(out[1]).toMatch(/---:/); // right
    expect(out[1]).toMatch(/:---:/); // center
  });
  it('pads center alignment symmetrically', () => {
    const input = [
      '| H1 |',
      '| :---: |',
      '| x |'
    ];
    const out = formatMarkdownTable(input);
    expect(out[1]).toMatch(/:---:/);
  });
});
