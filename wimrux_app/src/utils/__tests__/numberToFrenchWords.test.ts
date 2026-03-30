import { describe, it, expect } from 'vitest';
import { numberToFrenchWords } from '../numberToFrenchWords';

describe('numberToFrenchWords', () => {
  it('zero', () => {
    expect(numberToFrenchWords(0)).toBe('zéro franc CFA');
  });

  it('single digits', () => {
    expect(numberToFrenchWords(1)).toBe('un francs CFA');
    expect(numberToFrenchWords(5)).toBe('cinq francs CFA');
    expect(numberToFrenchWords(9)).toBe('neuf francs CFA');
  });

  it('teens', () => {
    expect(numberToFrenchWords(10)).toBe('dix francs CFA');
    expect(numberToFrenchWords(11)).toBe('onze francs CFA');
    expect(numberToFrenchWords(15)).toBe('quinze francs CFA');
    expect(numberToFrenchWords(19)).toBe('dix-neuf francs CFA');
  });

  it('tens', () => {
    expect(numberToFrenchWords(20)).toBe('vingt francs CFA');
    expect(numberToFrenchWords(21)).toBe('vingt et un francs CFA');
    expect(numberToFrenchWords(30)).toBe('trente francs CFA');
    expect(numberToFrenchWords(80)).toBe('quatre-vingts francs CFA');
    expect(numberToFrenchWords(81)).toBe('quatre-vingt-un francs CFA');
  });

  it('seventies and nineties (French special)', () => {
    expect(numberToFrenchWords(70)).toContain('soixante');
    expect(numberToFrenchWords(71)).toContain('soixante');
    expect(numberToFrenchWords(90)).toContain('quatre-vingt');
    expect(numberToFrenchWords(99)).toContain('quatre-vingt');
  });

  it('hundreds', () => {
    expect(numberToFrenchWords(100)).toBe('cent francs CFA');
    expect(numberToFrenchWords(200)).toBe('deux cents francs CFA');
    expect(numberToFrenchWords(250)).toContain('deux cent cinquante');
  });

  it('thousands', () => {
    expect(numberToFrenchWords(1000)).toBe('mille francs CFA');
    expect(numberToFrenchWords(2000)).toBe('deux mille francs CFA');
    expect(numberToFrenchWords(5000)).toContain('cinq mille');
  });

  it('typical invoice amounts', () => {
    const r = numberToFrenchWords(25000);
    expect(r).toContain('vingt-cinq mille');
    expect(r).toContain('francs CFA');
  });

  it('large amounts (millions)', () => {
    const r = numberToFrenchWords(1500000);
    expect(r).toContain('million');
    expect(r).toContain('francs CFA');
  });

  it('negative amounts', () => {
    const r = numberToFrenchWords(-5000);
    expect(r).toContain('moins');
    expect(r).toContain('francs CFA');
  });

  it('ends with "francs CFA"', () => {
    expect(numberToFrenchWords(1)).toContain('francs CFA');
    expect(numberToFrenchWords(999999)).toContain('francs CFA');
  });
});
