/**
 * Données de test réutilisables pour tous les tests E2E
 * Voir aussi : CREDENTIALS_WIMRUX.md à la racine du projet
 */

export const TEST_ACCOUNTS = {
  superAdmin: {
    email: 'admin@wimrux.app',
    password: 'WimruxAdmin2026!',
    role: 'project_admin',
    company: 'WIMRUX SaaS',
    fullName: 'Super Admin',
  },
  adminIltic: {
    email: 'test1@wimrux.app',
    password: 'WimruxAdmin2026!',
    role: 'admin',
    company: 'ILTIC',
    fullName: 'Admin ILTIC',
    phone: '+22665599195',
    twoFaEnabled: true,
  },
  adminWestago: {
    email: 'test2@wimrux.app',
    password: 'WimruxAdmin2026!',
    role: 'admin',
    company: 'WESTAGO',
    fullName: 'Admin WESTAGO',
    phone: '+22665751089',
    twoFaEnabled: true,
  },
} as const;

export const TEST_CLIENTS = {
  pm: {
    type: 'PM' as const,
    name: 'TECHNO SOLUTIONS SARL (TEST)',
    ifu: '00123456A',
    address: 'Zone Industrielle, Ouagadougou',
    phone: '+22670000001',
  },
  cc: {
    type: 'CC' as const,
    name: 'Client Comptoir (TEST)',
  },
};

export const TEST_INVOICE = {
  type: 'FV' as const,
  clientName: 'TECHNO SOLUTIONS SARL (TEST)',
  items: [
    { designation: 'Ordinateur portable (TEST)', qty: 2, priceHt: 450000, taxGroup: 'A' as const },
    { designation: 'Licence logiciel (TEST)', qty: 5, priceHt: 50000, taxGroup: 'B' as const },
    { designation: 'Formation (TEST)', qty: 1, priceHt: 150000, taxGroup: 'C' as const },
  ],
};

export const TEST_BANK_ACCOUNT = {
  name: 'Compte BOA Principal (TEST)',
  type: 'bank' as const,
  initialBalance: 5000000,
};

export const TEST_TREASURY_MOVEMENT = {
  credit: {
    type: 'credit' as const,
    amount: 1500000,
    mode: 'bank_transfer' as const,
    reference: 'Règlement facture TECHNO (TEST)',
  },
  debit: {
    type: 'debit' as const,
    amount: 200000,
    mode: 'cash' as const,
    reference: 'Achat fournitures (TEST)',
  },
};
