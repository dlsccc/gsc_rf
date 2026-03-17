import { DEDUP_KEEP, SORT_ORDER, TRANSFORM_TYPES } from '../utils/constants/pipeline';

const toText = (value) => (value === null || value === undefined ? '' : String(value));

const applySingleTransform = (value, config) => {
  if (!config?.type) return value;
  switch (config.type) {
    case TRANSFORM_TYPES.UPPERCASE:
      return toText(value).toUpperCase();
    case TRANSFORM_TYPES.LOWERCASE:
      return toText(value).toLowerCase();
    case TRANSFORM_TYPES.TRIM:
      return toText(value).trim();
    case TRANSFORM_TYPES.TO_NUMBER: {
      const num = Number(toText(value).replace(/,/g, '').replace(/%/g, ''));
      return Number.isNaN(num) ? value : num;
    }
    case TRANSFORM_TYPES.SET_VALUE:
      return config.fixedValue ?? '';
    default:
      return value;
  }
};

const passFilter = (value, filter) => {
  if (!filter || !filter.operator) return true;

  const text = toText(value);
  const target = toText(filter.value);

  switch (filter.operator) {
    case 'equals':
      return text === target;
    case 'not_equals':
      return text !== target;
    case 'contains':
      return text.includes(target);
    case 'is_empty':
      return text.trim() === '';
    case 'is_not_empty':
      return text.trim() !== '';
    case 'greater_than':
      return Number(text) > Number(target);
    case 'less_than':
      return Number(text) < Number(target);
    default:
      return true;
  }
};

export const buildPreviewRows = ({ sourceRows, mappings, targetFields }) => {
  return sourceRows.map((sourceRow) => {
    const row = {};
    targetFields.forEach((target) => {
      const sourceKeys = mappings[target.name] || [];
      if (sourceKeys.length === 0) {
        row[target.name] = '';
        return;
      }
      row[target.name] = sourceRow[sourceKeys[0]] ?? '';
    });
    return row;
  });
};

export const buildProcessedRows = ({ previewRows, filters, transforms, sortConfig, dedupConfig }) => {
  let rows = [...previewRows];

  rows = rows.filter((row) => {
    return Object.entries(filters).every(([field, filter]) => passFilter(row[field], filter));
  });

  rows = rows.map((row) => {
    const next = { ...row };
    Object.entries(transforms).forEach(([field, transform]) => {
      next[field] = applySingleTransform(next[field], transform);
    });
    return next;
  });

  if (sortConfig?.field) {
    rows.sort((a, b) => {
      const av = a[sortConfig.field];
      const bv = b[sortConfig.field];
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return sortConfig.order === SORT_ORDER.DESC ? -result : result;
    });
  }

  if (dedupConfig?.enabled && dedupConfig.fields?.length) {
    const keyMap = new Map();
    const seq = dedupConfig.keep === DEDUP_KEEP.LAST ? [...rows].reverse() : rows;
    seq.forEach((row) => {
      const key = dedupConfig.fields.map((field) => toText(row[field])).join('||');
      if (!keyMap.has(key)) {
        keyMap.set(key, row);
      }
    });
    rows = Array.from(keyMap.values());
    if (dedupConfig.keep === DEDUP_KEEP.LAST) {
      rows = rows.reverse();
    }
  }

  return rows;
};

