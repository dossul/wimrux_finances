import { describe, it, expect } from 'vitest';
import {
  isValidCadastralAddress,
  formatCadastralAddress,
  isValidIFU,
  isValidExportIFU,
  isValidNIM,
  isValidInvoiceReference,
} from '../validators';

describe('isValidCadastralAddress', () => {
  it('accepts valid format SSSS LLL PPPP', () => {
    expect(isValidCadastralAddress('0012 045 0023')).toBe(true);
    expect(isValidCadastralAddress('1234 567 8901')).toBe(true);
    expect(isValidCadastralAddress('0000 000 0000')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidCadastralAddress('123 456 7890')).toBe(false);   // 3 digits first group
    expect(isValidCadastralAddress('12345 67 8901')).toBe(false);  // 5 digits first group
    expect(isValidCadastralAddress('1234-567-8901')).toBe(false);  // wrong separator
    expect(isValidCadastralAddress('')).toBe(false);
    expect(isValidCadastralAddress('abcd efg hijk')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidCadastralAddress(' 0012 045 0023 ')).toBe(true);
  });
});

describe('formatCadastralAddress', () => {
  it('formats 11-digit string into SSSS LLL PPPP', () => {
    expect(formatCadastralAddress('00120450023')).toBe('0012 045 0023');
  });

  it('returns null for wrong length', () => {
    expect(formatCadastralAddress('12345')).toBeNull();
    expect(formatCadastralAddress('123456789012')).toBeNull();
  });

  it('strips non-numeric characters', () => {
    expect(formatCadastralAddress('0012-045-0023')).toBe('0012 045 0023');
  });
});

describe('isValidIFU', () => {
  it('accepts 8-digit IFU', () => {
    expect(isValidIFU('00089946')).toBe(true);
    expect(isValidIFU('12345678')).toBe(true);
  });

  it('rejects non-8-digit strings', () => {
    expect(isValidIFU('1234567')).toBe(false);    // 7 digits
    expect(isValidIFU('123456789')).toBe(false);   // 9 digits
    expect(isValidIFU('0008994R')).toBe(false);    // letter
    expect(isValidIFU('')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidIFU(' 12345678 ')).toBe(true);
  });
});

describe('isValidExportIFU', () => {
  it('accepts 1-20 character strings', () => {
    expect(isValidExportIFU('X')).toBe(true);
    expect(isValidExportIFU('FOREIGN-IFU-12345')).toBe(true);
    expect(isValidExportIFU('12345678901234567890')).toBe(true);
  });

  it('rejects empty or >20 char strings', () => {
    expect(isValidExportIFU('')).toBe(false);
    expect(isValidExportIFU('   ')).toBe(false);
    expect(isValidExportIFU('123456789012345678901')).toBe(false); // 21 chars
  });
});

describe('isValidNIM', () => {
  it('accepts 10-20 alphanumeric uppercase', () => {
    expect(isValidNIM('ABCDEFGHIJ')).toBe(true);          // 10 chars
    expect(isValidNIM('NIM1234567890')).toBe(true);
  });

  it('converts to uppercase', () => {
    expect(isValidNIM('abcdefghij')).toBe(true);
  });

  it('rejects too short or special chars', () => {
    expect(isValidNIM('ABC')).toBe(false);
    expect(isValidNIM('NIM-1234-5')).toBe(false);         // hyphen
    expect(isValidNIM('')).toBe(false);
  });
});

describe('isValidInvoiceReference', () => {
  it('accepts valid references', () => {
    expect(isValidInvoiceReference('FV-2026-00001')).toBe(true);
    expect(isValidInvoiceReference('FA-2025-12345')).toBe(true);
    expect(isValidInvoiceReference('EV-2026-00100')).toBe(true);
    expect(isValidInvoiceReference('ET-2026-99999')).toBe(true);
    expect(isValidInvoiceReference('EA-2026-00001')).toBe(true);
    expect(isValidInvoiceReference('FT-2026-00001')).toBe(true);
  });

  it('rejects invalid references', () => {
    expect(isValidInvoiceReference('XX-2026-00001')).toBe(false);  // invalid type
    expect(isValidInvoiceReference('FV-26-00001')).toBe(false);    // 2-digit year
    expect(isValidInvoiceReference('FV-2026-0001')).toBe(false);   // 4-digit number
    expect(isValidInvoiceReference('')).toBe(false);
  });
});
