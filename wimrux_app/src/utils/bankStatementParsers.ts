// =============================================================================
// WIMRUX® FINANCES — Parsers de relevés bancaires africains
// Formats supportés : CSV, OFX/QFX, QIF
// Détection auto du format et du pays (BF, CI, SN, ML, TG, BJ, GN, CM)
// =============================================================================

export interface ParsedTransaction {
  transaction_date: string;   // YYYY-MM-DD
  value_date: string | null;
  amount: number;
  direction: 'debit' | 'credit';
  label: string;
  reference: string | null;
  raw: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  errors: string[];
  format_detected: string;
  bank_hint: string | null;
  country_hint: string | null;
}

export interface CsvColumnMapping {
  date: string;
  label: string;
  debit: string | null;
  credit: string | null;
  amount: string | null;      // colonne unique montant (signé ou non)
  direction: string | null;   // colonne sens optionnelle
  value_date: string | null;
  reference: string | null;
  separator: ',' | ';' | '\t' | '|';
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' | 'DD-MM-YYYY' | 'DD.MM.YYYY';
  decimal_sep: '.' | ',';
}

// ---------------------------------------------------------------------------
// Profils de banques africaines connues (détection automatique)
// ---------------------------------------------------------------------------
export interface AfricanBankProfile {
  bank_name: string;
  country: string;
  currency: string;
  separator: CsvColumnMapping['separator'];
  date_format: CsvColumnMapping['date_format'];
  decimal_sep: CsvColumnMapping['decimal_sep'];
  column_mapping: Partial<CsvColumnMapping>;
  header_signatures: string[];  // mots-clés présents dans l'en-tête CSV
}

export const AFRICAN_BANK_PROFILES: AfricanBankProfile[] = [
  {
    bank_name: 'Coris Bank International',
    country: 'BF',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['coris', 'libelle', 'debit', 'credit', 'solde'],
    column_mapping: { date: 'Date', label: 'Libellé', debit: 'Débit', credit: 'Crédit', reference: 'Référence' },
  },
  {
    bank_name: 'Banque de l\'Habitat du Burkina (BHB)',
    country: 'BF',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['bhb', 'libelle', 'montant'],
    column_mapping: { date: 'Date Opération', label: 'Libellé', amount: 'Montant', reference: 'N° Opé' },
  },
  {
    bank_name: 'Ecobank',
    country: 'BF',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['ecobank', 'transaction', 'debit', 'credit'],
    column_mapping: { date: 'Transaction Date', value_date: 'Value Date', label: 'Description', debit: 'Debit', credit: 'Credit' },
  },
  {
    bank_name: 'SGBF / Société Générale BF',
    country: 'BF',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['sgbf', 'sg', 'libellé', 'débit', 'crédit', 'societe generale'],
    column_mapping: { date: 'Date', value_date: 'Date valeur', label: 'Libellé', debit: 'Débit', credit: 'Crédit', reference: 'Référence' },
  },
  {
    bank_name: 'BOA (Bank of Africa)',
    country: 'BF',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['boa', 'bank of africa', 'libelle', 'debit', 'credit'],
    column_mapping: { date: 'Date', label: 'Libellé', debit: 'Débit', credit: 'Crédit', reference: 'Référence' },
  },
  {
    bank_name: 'UBA (United Bank for Africa)',
    country: 'BF',
    currency: 'XOF',
    separator: ',',
    date_format: 'DD/MM/YYYY',
    decimal_sep: '.',
    header_signatures: ['uba', 'united bank', 'description', 'debit', 'credit'],
    column_mapping: { date: 'Date', label: 'Description', debit: 'Debit', credit: 'Credit', reference: 'Reference' },
  },
  {
    bank_name: 'NSIA Banque CI',
    country: 'CI',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['nsia', 'libelle', 'debit', 'credit'],
    column_mapping: { date: 'Date', label: 'Libellé', debit: 'Débit', credit: 'Crédit' },
  },
  {
    bank_name: 'BIS / Banque Internationale pour le Sahel',
    country: 'SN',
    currency: 'XOF',
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    header_signatures: ['bis', 'sahel', 'mouvement', 'debit', 'credit'],
    column_mapping: { date: 'Date', label: 'Mouvement', debit: 'Débit', credit: 'Crédit' },
  },
];

// ---------------------------------------------------------------------------
// Normalisation des dates
// ---------------------------------------------------------------------------
function parseDate(raw: string, fmt: CsvColumnMapping['date_format']): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    let d: Date | null = null;
    if (fmt === 'DD/MM/YYYY' || fmt === 'DD-MM-YYYY' || fmt === 'DD.MM.YYYY') {
      const sep = s.includes('/') ? '/' : s.includes('-') ? '-' : '.';
      const [dd, mm, yyyy] = s.split(sep);
      d = new Date(`${yyyy}-${mm?.padStart(2, '0')}-${dd?.padStart(2, '0')}`);
    } else if (fmt === 'MM/DD/YYYY') {
      const [mm, dd, yyyy] = s.split('/');
      d = new Date(`${yyyy}-${mm?.padStart(2, '0')}-${dd?.padStart(2, '0')}`);
    } else {
      d = new Date(s);
    }
    if (!d || isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Normalisation des montants (gère "1 234,56" / "1,234.56" / "-500" / "500 CR")
// ---------------------------------------------------------------------------
function parseAmount(raw: string, decimalSep: '.' | ','): number {
  if (!raw) return 0;
  let s = raw.trim().replace(/\s/g, '').replace(/\u00a0/g, '');
  // CR/DB suffixes
  s = s.replace(/CR$/i, '').replace(/DB$/i, '');
  if (decimalSep === ',') {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Détection auto du profil banque africaine à partir des premières lignes CSV
// ---------------------------------------------------------------------------
export function detectBankProfile(rawText: string): AfricanBankProfile | null {
  const lowered = rawText.toLowerCase();
  for (const profile of AFRICAN_BANK_PROFILES) {
    if (profile.header_signatures.some(sig => lowered.includes(sig.toLowerCase()))) {
      return profile;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Détection auto du séparateur CSV
// ---------------------------------------------------------------------------
export function detectCsvSeparator(firstLine: string): CsvColumnMapping['separator'] {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  for (const c of firstLine) {
    if (c in counts) counts[c] = (counts[c] ?? 0) + 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const sep = best?.[0];
  return (sep === ';' || sep === ',' || sep === '\t' || sep === '|' ? sep : ';');
}

// ---------------------------------------------------------------------------
// Extrait les en-têtes d'un CSV et propose un mapping automatique
// ---------------------------------------------------------------------------
export function inferCsvMapping(
  headers: string[],
  profile: AfricanBankProfile | null
): Partial<CsvColumnMapping> & { separator: CsvColumnMapping['separator']; date_format: CsvColumnMapping['date_format']; decimal_sep: CsvColumnMapping['decimal_sep'] } {
  if (profile) {
    return {
      separator: profile.separator,
      date_format: profile.date_format,
      decimal_sep: profile.decimal_sep,
      ...profile.column_mapping,
    };
  }
  // Fallback générique : cherche des colonnes par mots-clés
  const find = (...kw: string[]) =>
    headers.find(h => kw.some(k => h.toLowerCase().includes(k.toLowerCase()))) ?? null;

  return {
    separator: ';',
    date_format: 'DD/MM/YYYY',
    decimal_sep: ',',
    date: find('date opé', 'date op', 'date') ?? headers[0] ?? '',
    value_date: find('valeur', 'value date') ?? null,
    label: find('libellé', 'libelle', 'description', 'motif', 'label', 'intitulé') ?? headers[1] ?? '',
    debit: find('débit', 'debit', 'sortie', 'retrait') ?? null,
    credit: find('crédit', 'credit', 'entrée', 'versement') ?? null,
    amount: find('montant', 'amount', 'solde mouv') ?? null,
    reference: find('référence', 'reference', 'réf', 'n° opé', 'numéro') ?? null,
    direction: null,
  };
}

// ---------------------------------------------------------------------------
// PARSER CSV
// ---------------------------------------------------------------------------
export function parseCsv(rawText: string, mapping: CsvColumnMapping): ParseResult {
  const result: ParseResult = { transactions: [], errors: [], format_detected: 'CSV', bank_hint: null, country_hint: null };
  const profile = detectBankProfile(rawText);
  if (profile) {
    result.bank_hint = profile.bank_name;
    result.country_hint = profile.country;
  }

  const lines = rawText.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { result.errors.push('Fichier trop court (< 2 lignes)'); return result; }

  // Trouver la ligne d'en-tête (première ligne contenant la colonne date)
  let headerIdx = 0;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i]!.toLowerCase().includes(mapping.date.toLowerCase())) { headerIdx = i; break; }
  }

  const headers = lines[headerIdx]!.split(mapping.separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const colIdx = (name: string | null) => name ? headers.findIndex(h => h.toLowerCase() === name.toLowerCase()) : -1;

  const dateIdx    = colIdx(mapping.date);
  const labelIdx   = colIdx(mapping.label);
  const debitIdx   = colIdx(mapping.debit ?? null);
  const creditIdx  = colIdx(mapping.credit ?? null);
  const amtIdx     = colIdx(mapping.amount ?? null);
  const dirIdx     = colIdx(mapping.direction ?? null);
  const valIdx     = colIdx(mapping.value_date ?? null);
  const refIdx     = colIdx(mapping.reference ?? null);

  if (dateIdx < 0 || labelIdx < 0) {
    result.errors.push(`Colonnes obligatoires introuvables (date="${mapping.date}", label="${mapping.label}")`);
    return result;
  }

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.trim()) continue;
    const cells = line.split(mapping.separator).map(c => c.trim().replace(/^["']|["']$/g, ''));

    const rawDate = cells[dateIdx] ?? '';
    const date = parseDate(rawDate, mapping.date_format);
    if (!date) { result.errors.push(`Ligne ${i + 1} : date invalide "${rawDate}"`); continue; }

    const label = cells[labelIdx] ?? '';
    if (!label) { result.errors.push(`Ligne ${i + 1} : libellé vide`); continue; }

    let amount = 0;
    let direction: 'debit' | 'credit' = 'credit';

    if (amtIdx >= 0) {
      // Colonne montant unique : signe détermine le sens
      const rawAmt = cells[amtIdx] ?? '0';
      const signed = parseAmount(rawAmt, mapping.decimal_sep);
      amount = Math.abs(signed);
      if (dirIdx >= 0) {
        const d = (cells[dirIdx] ?? '').toLowerCase();
        direction = (d.includes('d') || d.includes('déb') || d.includes('deb')) ? 'debit' : 'credit';
      } else {
        direction = signed < 0 ? 'debit' : 'credit';
      }
    } else if (debitIdx >= 0 && creditIdx >= 0) {
      const deb = parseAmount(cells[debitIdx] ?? '', mapping.decimal_sep);
      const cre = parseAmount(cells[creditIdx] ?? '', mapping.decimal_sep);
      if (deb > 0) { amount = deb; direction = 'debit'; }
      else if (cre > 0) { amount = cre; direction = 'credit'; }
      else { result.errors.push(`Ligne ${i + 1} : montant nul ignoré`); continue; }
    } else {
      result.errors.push(`Ligne ${i + 1} : impossible de déterminer le montant`); continue;
    }

    result.transactions.push({
      transaction_date: date,
      value_date: valIdx >= 0 ? parseDate(cells[valIdx] ?? '', mapping.date_format) : null,
      amount,
      direction,
      label,
      reference: refIdx >= 0 ? (cells[refIdx] ?? null) : null,
      raw: line,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// PARSER OFX / QFX (Open Financial Exchange)
// ---------------------------------------------------------------------------
export function parseOfx(rawText: string): ParseResult {
  const result: ParseResult = { transactions: [], errors: [], format_detected: 'OFX', bank_hint: null, country_hint: null };

  // Détecter le nom de la banque dans les métadonnées OFX
  const bankIdMatch = rawText.match(/<(?:FI)?ORG>([^<]+)/i);
  if (bankIdMatch) result.bank_hint = bankIdMatch[1]?.trim() ?? null;

  // Extraire tous les blocs STMTTRN
  const blocks = rawText.match(/<STMTTRN[\s\S]*?<\/STMTTRN>/gi) ?? [];

  for (const block of blocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]*)`, 'i'));
      return m ? m[1]?.trim() ?? '' : '';
    };

    const rawDate = get('DTPOSTED') || get('DTAVAIL');
    const date = rawDate ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` : null;
    if (!date) { result.errors.push('Bloc OFX : DTPOSTED manquant'); continue; }

    const trnAmt = parseFloat(get('TRNAMT').replace(',', '.'));
    if (isNaN(trnAmt) || trnAmt === 0) { result.errors.push(`Bloc OFX : montant invalide "${get('TRNAMT')}"`); continue; }

    const rawValDate = get('DTAVAIL') || get('DTPOSTED');
    const valueDate = rawValDate && rawValDate !== rawDate
      ? `${rawValDate.slice(0, 4)}-${rawValDate.slice(4, 6)}-${rawValDate.slice(6, 8)}`
      : null;

    result.transactions.push({
      transaction_date: date,
      value_date: valueDate,
      amount: Math.abs(trnAmt),
      direction: trnAmt < 0 ? 'debit' : 'credit',
      label: get('MEMO') || get('NAME') || get('TRNTYPE'),
      reference: get('FITID') || get('REFNUM') || null,
      raw: block,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// PARSER QIF (Quicken Interchange Format)
// ---------------------------------------------------------------------------
export function parseQif(rawText: string): ParseResult {
  const result: ParseResult = { transactions: [], errors: [], format_detected: 'QIF', bank_hint: null, country_hint: null };
  const entries = rawText.split(/\^/).filter(e => e.trim());

  for (const entry of entries) {
    const lines = entry.trim().split(/\r?\n/);
    let rawDate = '', rawAmt = '', memo = '', payee = '', ref = '';
    for (const line of lines) {
      const tag = line[0] ?? '';
      const val = line.slice(1).trim();
      if (tag === 'D') rawDate = val;
      else if (tag === 'T' || tag === 'U') rawAmt = val;
      else if (tag === 'P') payee = val;
      else if (tag === 'M') memo = val;
      else if (tag === 'N') ref = val;
    }
    if (!rawDate || !rawAmt) continue;

    // QIF date : MM/DD/YYYY or DD/MM/YYYY
    const date = parseDate(rawDate, rawDate.split('/')[2]?.length === 4 ? 'MM/DD/YYYY' : 'DD/MM/YYYY');
    if (!date) { result.errors.push(`QIF : date invalide "${rawDate}"`); continue; }

    const amt = parseFloat(rawAmt.replace(/,/g, '').replace(/\s/g, ''));
    if (isNaN(amt)) { result.errors.push(`QIF : montant invalide "${rawAmt}"`); continue; }

    result.transactions.push({
      transaction_date: date,
      value_date: null,
      amount: Math.abs(amt),
      direction: amt < 0 ? 'debit' : 'credit',
      label: memo || payee || '',
      reference: ref || null,
      raw: entry,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Détection automatique du format à partir du contenu
// ---------------------------------------------------------------------------
export function detectFileFormat(content: string): 'OFX' | 'QIF' | 'CSV' {
  const trimmed = content.trim();
  if (trimmed.startsWith('OFXHEADER') || trimmed.startsWith('<OFX') || /<STMTTRN/i.test(trimmed)) return 'OFX';
  if (/^![BIAaCcEeIiSsX]/m.test(trimmed)) return 'QIF';
  return 'CSV';
}
