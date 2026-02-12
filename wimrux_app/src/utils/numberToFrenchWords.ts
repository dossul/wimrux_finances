// Convertit un nombre en toutes lettres (français, convention FCFA)
// Ex: 123456 → "cent vingt-trois mille quatre cent cinquante-six francs CFA"

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
const TEENS = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

function convertBelow1000(n: number): string {
  if (n === 0) return '';

  let result = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    if (hundreds === 1) {
      result = 'cent';
    } else {
      result = UNITS[hundreds] + ' cent';
    }
    if (remainder === 0 && hundreds > 1) {
      result += 's';
    }
    if (remainder > 0) result += ' ';
  }

  if (remainder > 0) {
    if (remainder < 10) {
      result += UNITS[remainder];
    } else if (remainder < 20) {
      result += TEENS[remainder - 10];
    } else {
      const ten = Math.floor(remainder / 10);
      const unit = remainder % 10;

      if (ten === 7 || ten === 9) {
        // 70-79: soixante-dix..., 90-99: quatre-vingt-dix...
        const base = TENS[ten];
        const sub = remainder - ten * 10;
        if (sub === 0) {
          result += base + '-dix';
        } else if (sub === 1 && ten === 7) {
          result += base + ' et onze';
        } else if (sub < 10 && sub >= 1) {
          result += base + '-' + TEENS[sub];
        } else {
          result += base + '-' + TEENS[sub];
        }
      } else {
        result += TENS[ten];
        if (unit === 1 && ten !== 8) {
          result += ' et un';
        } else if (unit === 1 && ten === 8) {
          result += '-un';
        } else if (unit > 0) {
          result += '-' + UNITS[unit];
        } else if (ten === 8) {
          result += 's'; // quatre-vingts
        }
      }
    }
  }

  return result;
}

export function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro franc CFA';

  const abs = Math.abs(Math.floor(n));
  if (abs === 0) return 'zéro franc CFA';

  const parts: string[] = [];

  const billions = Math.floor(abs / 1_000_000_000);
  const millions = Math.floor((abs % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((abs % 1_000_000) / 1_000);
  const remainder = abs % 1_000;

  if (billions > 0) {
    parts.push(convertBelow1000(billions) + ' milliard' + (billions > 1 ? 's' : ''));
  }
  if (millions > 0) {
    parts.push(convertBelow1000(millions) + ' million' + (millions > 1 ? 's' : ''));
  }
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('mille');
    } else {
      parts.push(convertBelow1000(thousands) + ' mille');
    }
  }
  if (remainder > 0) {
    parts.push(convertBelow1000(remainder));
  }

  let text = parts.join(' ').replace(/\s+/g, ' ').trim();

  if (n < 0) text = 'moins ' + text;

  return text + ' francs CFA';
}
