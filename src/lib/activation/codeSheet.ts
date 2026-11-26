// REPO: kisanshaktiai/kisan-command-center-nexus (admin panel)  BRANCH: SaaS-dashboard-3007  (NEW FILE)
// PATH: src/lib/activation/codeSheet.ts
//
// CHANGE LOG
// 2026-11-25 — Farmer activation codes: builds the printable PDF (one QR per code) and the CSV
//   in the browser. New dependencies: qrcode, jspdf.
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import type { RevealedCode } from '@/services/ActivationCodeService';

/**
 * Printable / downloadable sheets of activation codes.
 *
 * The plain codes arrive from activation_reveal_codes (audited by the
 * database) and leave this module inside the file the admin downloads.
 * Nothing is kept afterwards. Both builders run entirely in the browser.
 */

export interface SheetMeta {
  tenantName: string;
  batchLabel: string | null;
  expiresAt: string;        // ISO
  generatedAt?: Date;
}

/**
 * Words printed on the sheet. The PDF uses the built-in Latin fonts of jsPDF,
 * so these must be Latin-script text (the caller passes the English strings).
 */
export interface SheetLabels {
  title: string;        // after the tenant name in the page header
  validUntil: string;   // before the date
  sheet: string;        // "Sheet"
  of: string;           // "of"
  printed: string;      // "Printed"
  cardNote: string;     // one line under each code
}

const QR_ERROR_LEVEL = 'M';  // survives a smudged print; the payload is short
const QR_QUIET_MODULES = 2;  // white border, in modules, inside the drawn square

/**
 * Draws the QR for `payload` as vector squares (no embedded image), so a sheet
 * of 2000 codes stays a small file and prints sharp at any size.
 */
function drawQr(doc: jsPDF, payload: string, x: number, y: number, size: number): void {
  const qr = QRCode.create(payload, { errorCorrectionLevel: QR_ERROR_LEVEL });
  const n = qr.modules.size;
  const data = qr.modules.data;
  const cell = size / (n + QR_QUIET_MODULES * 2);
  doc.setFillColor(0, 0, 0);
  for (let row = 0; row < n; row++) {
    let col = 0;
    while (col < n) {
      if (!data[row * n + col]) { col++; continue; }
      let run = 1;                                   // merge a run of dark modules into one rectangle
      while (col + run < n && data[row * n + col + run]) run++;
      // a hair of overlap hides the seams some PDF viewers show between touching squares
      doc.rect(x + (col + QR_QUIET_MODULES) * cell, y + (row + QR_QUIET_MODULES) * cell, run * cell + 0.02, cell + 0.02, 'F');
      col += run;
    }
  }
}

/** CSV, one row per code. Opens in Excel; quoting is per RFC 4180. */
export function buildCsv(codes: RevealedCode[], meta: SheetMeta): Blob {
  const q = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ['code', 'qr_payload', 'state', 'expires_at', 'tenant', 'batch'].join(',');
  const rows = codes.map((c) =>
    [c.code, c.qr_payload, c.state, c.expires_at, meta.tenantName, meta.batchLabel ?? ''].map(q).join(','),
  );
  // BOM so Excel on Windows reads it as UTF-8
  return new Blob(['﻿' + [header, ...rows].join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' });
}

/**
 * A4 PDF: a grid of cards, each with its own QR, the code in large print,
 * the tenant name and the expiry. 2 columns x 4 rows = 8 codes per page.
 * 2000 codes = 250 pages.
 */
export function buildPdf(codes: RevealedCode[], meta: SheetMeta, labels: SheetLabels): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const page = { w: 210, h: 297, margin: 12 };
  const cols = 2, rows = 4;
  const gap = 6;
  const cardW = (page.w - page.margin * 2 - gap * (cols - 1)) / cols;
  const cardH = (page.h - page.margin * 2 - 10 - gap * (rows - 1)) / rows;
  const perPage = cols * rows;
  const expires = formatDate(meta.expiresAt);
  const generated = formatDate((meta.generatedAt ?? new Date()).toISOString());

  for (let i = 0; i < codes.length; i++) {
    const slot = i % perPage;
    if (slot === 0) {
      if (i > 0) doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`${meta.tenantName} - ${labels.title}`, page.margin, page.margin);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(
        `${meta.batchLabel ? meta.batchLabel + ' | ' : ''}${labels.validUntil} ${expires} | ${labels.sheet} ${Math.floor(i / perPage) + 1} ${labels.of} ${Math.ceil(codes.length / perPage)} | ${labels.printed} ${generated}`,
        page.margin, page.margin + 4.5,
      );
    }
    const col = slot % cols;
    const row = Math.floor(slot / cols);
    const x = page.margin + col * (cardW + gap);
    const y = page.margin + 10 + row * (cardH + gap);
    const c = codes[i];

    doc.setDrawColor(160);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardW, cardH, 2, 2);

    const qrSize = Math.min(cardH - 10, 36);
    drawQr(doc, c.qr_payload, x + 3, y + (cardH - qrSize) / 2, qrSize);

    const tx = x + 3 + qrSize + 3;
    const tw = cardW - (qrSize + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(meta.tenantName, tx, y + 9, { maxWidth: tw });
    doc.setFont('courier', 'bold');
    doc.setFontSize(14);                             // 14 characters of Courier 14pt = 41.5 mm, inside tw
    doc.text(c.code, tx, y + cardH / 2 + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${labels.validUntil} ${expires}`, tx, y + cardH - 11, { maxWidth: tw });
    doc.text(labels.cardNote, tx, y + cardH - 6.5, { maxWidth: tw });
  }
  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export function sheetFilename(meta: SheetMeta, batchId: string, ext: 'pdf' | 'csv'): string {
  const safe = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  return `activation-codes_${safe(meta.tenantName)}_${batchId.slice(0, 8)}.${ext}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}
