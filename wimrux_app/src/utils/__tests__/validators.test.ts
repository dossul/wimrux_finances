import { describe, it, expect } from 'vitest';
import {
  isValidLegacyCadastralAddress,
  isValidCadastralAddressParts,
  formatLegacyCadastralAddress,
  formatCadastralAddress,
  isValidIFU,
  isValidExportIFU,
  isValidPhoneWithCountryCode,
  isValidNIM,
  isValidInvoiceReference,
} from '../validators';

describe('isValidLegacyCadastralAddress', () => {
  it('accepts valid format SSSS LLL PPPP', () => {
    expect(isValidLegacyCadastralAddress('0012 045 0023')).toBe(true);
    expect(isValidLegacyCadastralAddress('1234 567 8901')).toBe(true);
    expect(isValidLegacyCadastralAddress('0000 000 0000')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(isValidLegacyCadastralAddress('123 456 7890')).toBe(false);   // 3 digits first group
    expect(isValidLegacyCadastralAddress('12345 67 8901')).toBe(false);  // 5 digits first group
    expect(isValidLegacyCadastralAddress('1234-567-8901')).toBe(false);  // wrong separator
    expect(isValidLegacyCadastralAddress('')).toBe(false);
    expect(isValidLegacyCadastralAddress('abcd efg hijk')).toBe(false);
  });

  it('trims whitespace', () => {
    expect(isValidLegacyCadastralAddress(' 0012 045 0023 ')).toBe(true);
  });
});

describe('isValidCadastralAddressParts', () => {
  it('accepts non-empty section, lot and parcel', () => {
    expect(isValidCadastralAddressParts({ section: 'A', lot: '12', parcel: '45' })).toBe(true);
  });

  it('rejects empty parts', () => {
    expect(isValidCadastralAddressParts({ section: '', lot: '12', parcel: '45' })).toBe(false);
    expect(isValidCadastralAddressParts({ section: 'A', lot: '', parcel: '45' })).toBe(false);
    expect(isValidCadastralAddressParts({ section: 'A', lot: '12', parcel: '' })).toBe(false);
  });
});

describe('formatLegacyCadastralAddress', () => {
  it('formats 11-digit string into SSSS LLL PPPP', () => {
    expect(formatLegacyCadastralAddress('00120450023')).toBe('0012 045 0023');
  });

  it('returns null for wrong length', () => {
    expect(formatLegacyCadastralAddress('12345')).toBeNull();
    expect(formatLegacyCadastralAddress('123456789012')).toBeNull();
  });

  it('strips non-numeric characters', () => {
    expect(formatLegacyCadastralAddress('0012-045-0023')).toBe('0012 045 0023');
  });
});

describe('formatCadastralAddress', () => {
  it('formats parcel, lot and section', () => {
    expect(formatCadastralAddress({ parcel: '45', lot: '12', section: 'A' })).toBe('Plle 45, Lot 12, Section A');
  });

  it('returns empty string for incomplete parts', () => {
    expect(formatCadastralAddress({ parcel: '45', lot: '', section: 'A' })).toBe('');
  });
});

describe('isValidIFU', () => {
  it('accepts 1-20 alphanumeric characters', () => {
    expect(isValidIFU('A')).toBe(true);
    expect(isValidIFU('00089946')).toBe(true);
    expect(isValidIFU('00014674A')).toBe(true);
    expect(isValidIFU('12345678901234567890')).toBe(true);
  });

  it('rejects empty or >20 char strings', () => {
    expect(isValidIFU('')).toBe(false);
    expect(isValidIFU('   ')).toBe(false);
    expect(isValidIFU('123456789012345678901')).toBe(false); // 21 chars
  });

  it('rejects special characters', () => {
    expect(isValidIFU('0008994-')).toBe(false);
    expect(isValidIFU('IFU 1234')).toBe(false);
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

describe('isValidPhoneWithCountryCode', () => {
  it('accepts local number without country code', () => {
    expect(isValidPhoneWithCountryCode('75757575', '+226')).toBe(true);
  });

  it('accepts full international number with plus and spaces', () => {
    expect(isValidPhoneWithCountryCode('+226 65599195', '+226')).toBe(true);
    expect(isValidPhoneWithCountryCode('+226 75 75 75 75', '+226')).toBe(true);
  });

  it('accepts full international number without plus', () => {
    expect(isValidPhoneWithCountryCode('22675757575', '+226')).toBe(true);
  });

  it('accepts empty value', () => {
    expect(isValidPhoneWithCountryCode('', '+226')).toBe(true);
  });

  it('rejects invalid characters', () => {
    expect(isValidPhoneWithCountryCode('abcdefgh', '+226')).toBe(false);
    expect(isValidPhoneWithCountryCode('+226-65599195', '+226')).toBe(false);
  });

  it('rejects too short numbers', () => {
    expect(isValidPhoneWithCountryCode('12345', '+226')).toBe(false);
  });

  it('rejects numbers with too many digits', () => {
    expect(isValidPhoneWithCountryCode('+226 1234567890123456', '+226')).toBe(false);
  });

  it('rejects numbers too long overall', () => {
    expect(isValidPhoneWithCountryCode('+226 1234 5678 9012 3456', '+226')).toBe(false);
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
