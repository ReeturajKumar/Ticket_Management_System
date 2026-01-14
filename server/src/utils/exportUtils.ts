import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Create exports directory if it doesn't exist
const exportsDir = path.join(__dirname, '../../exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

/**
 * Generate CSV file from data
 */
export const generateCSV = async (
  data: any[],
  headers: { id: string; title: string }[],
  filename: string
): Promise<string> => {
  const filePath = path.join(exportsDir, filename);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: headers,
  });

  await csvWriter.writeRecords(data);
  return filePath;
};

/**
 * Generate Excel file from data
 */
export const generateExcel = async (
  data: any[],
  headers: { id: string; title: string }[],
  filename: string
): Promise<string> => {
  const filePath = path.join(exportsDir, filename);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  // Convert header format { id: 'key', title: 'Title' } to columns
  worksheet.columns = headers.map(h => ({
    header: h.title,
    key: h.id,
    width: 25 
  }));

  // Add rows
  worksheet.addRows(data);

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

/**
 * Generate PDF file from data
 */
export const generatePDF = async (
  title: string,
  data: any,
  filename: string
): Promise<string> => {
  const filePath = path.join(exportsDir, filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Add title
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // Add metadata
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    // Add summary section
    if (data.summary) {
      doc.fontSize(14).text('Summary', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      Object.entries(data.summary).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    // Add by priority section
    if (data.byPriority) {
      doc.fontSize(14).text('By Priority', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      Object.entries(data.byPriority).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    // Add by status section
    if (data.byStatus) {
      doc.fontSize(14).text('By Status', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      Object.entries(data.byStatus).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });
      doc.moveDown();
    }

    // Add team performance section
    if (data.teamPerformance && data.teamPerformance.length > 0) {
      doc.fontSize(14).text('Team Performance', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      data.teamPerformance.forEach((member: any) => {
        doc.text(`${member.name}: ${member.resolved} resolved, Avg: ${member.avgTime}`);
      });
    }

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
};

/**
 * Clean up old export files (older than 24 hours)
 */
export const cleanupOldExports = (): void => {
  try {
    const files = fs.readdirSync(exportsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    files.forEach((file) => {
      const filePath = path.join(exportsDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old export file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up exports:', error);
  }
};
