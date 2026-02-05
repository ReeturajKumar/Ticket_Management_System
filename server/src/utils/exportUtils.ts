import { createObjectCsvWriter } from 'csv-writer';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import config from '../config/appConfig';

const exportsDir = config.paths.exports;
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
}

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

export const generateExcel = async (
  data: any[],
  headers: { id: string; title: string }[],
  filename: string
): Promise<string> => {
  const filePath = path.join(exportsDir, filename);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  worksheet.columns = headers.map(h => ({
    header: h.title,
    key: h.id,
    width: 25 
  }));

  worksheet.addRows(data);
  worksheet.getRow(1).font = { bold: true };
  
  await workbook.xlsx.writeFile(filePath);
  return filePath;
};

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
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
    doc.moveDown();

    const sections = [
      { key: 'summary', title: 'Summary' },
      { key: 'byPriority', title: 'By Priority' },
      { key: 'byStatus', title: 'By Status' }
    ];

    sections.forEach(({ key, title }) => {
      if (data[key]) {
        doc.fontSize(14).text(title, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        Object.entries(data[key]).forEach(([k, v]) => {
          doc.text(`${k}: ${v}`);
        });
        doc.moveDown();
      }
    });

    if (data.teamPerformance?.length > 0) {
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

export const cleanupOldExports = (): void => {
  try {
    const files = fs.readdirSync(exportsDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(exportsDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old export file: ${file}`);
      }
    });
  } catch (error) {
    console.error('Error cleaning up exports:', error);
  }
};
