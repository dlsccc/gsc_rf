import * as XLSX from 'xlsx';
import { createId } from '../core/utils/id';

const normalizeRows = (rows) => {
  return rows.map((row) => {
    const result = {};
    Object.keys(row || {}).forEach((key) => {
      result[String(key).trim()] = row[key];
    });
    return result;
  });
};

export const parseLocalFile = async (file, source = 'table_a') => {
  const ext = String(file?.name || '').split('.').pop()?.toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new Error(`暂不支持的文件类型: ${ext || 'unknown'}`);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheet = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheet];

  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  const headers = rows.length > 0
    ? Object.keys(rows[0]).map((header) => String(header).trim())
    : (XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || []).map((header) => String(header).trim());

  const normalized = normalizeRows(rows).map((row) => {
    const next = {};
    headers.forEach((header) => {
      next[header] = row[header] ?? '';
    });
    return next;
  });

  return {
    id: createId(),
    source,
    name: file.name,
    size: file.size,
    rows: normalized,
    fields: headers,
    sheetName: firstSheet
  };
};

export const parseLocalFiles = async (fileList) => {
  const files = Array.from(fileList || []).slice(0, 2);
  const tasks = files.map((file, index) => parseLocalFile(file, index === 0 ? 'table_a' : 'table_b'));
  return Promise.all(tasks);
};
