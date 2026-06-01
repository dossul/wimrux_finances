import { Download } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helpers pour vérifier les PDF téléchargés
 * Nécessite : npm install -D pdf-parse
 */

export async function verifyPdfDownload(download: Download): Promise<string> {
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/\.pdf$/i);

  const downloadPath = await download.path();
  const stats = fs.statSync(downloadPath);
  expect(stats.size).toBeGreaterThan(1000);  // > 1KB

  return downloadPath;
}

export async function parsePdfContent(download: Download): Promise<string> {
  const pdfPath = await verifyPdfDownload(download);

  // Lire le buffer et chercher du texte brut (fallback si pdf-parse non installé)
  const buffer = fs.readFileSync(pdfPath);
  const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 50000));

  return text;
}

export async function assertPdfContains(download: Download, expectedText: string) {
  const content = await parsePdfContent(download);
  expect(content).toContain(expectedText);
}

export async function assertPdfNotEmpty(download: Download) {
  const pdfPath = await verifyPdfDownload(download);
  const stats = fs.statSync(pdfPath);
  expect(stats.size).toBeGreaterThan(5000);  // PDF valide > 5KB
}
