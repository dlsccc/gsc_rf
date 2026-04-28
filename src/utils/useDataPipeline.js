import { DEDUP_KEEP, SORT_ORDER, TRANSFORM_TYPES } from '@/utils/constants/pipeline.js';

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

const getSourceValueByKey = (row, sourceKey) => {
  const key = toText(sourceKey);
  if (!key) return '';
  return row?.[key] ?? '';
};

const passesTransformRule = (row, field, rule) => {
  const value = toText(rule?.conditionSourceKey)
    ? getSourceValueByKey(row, rule.conditionSourceKey)
    : row?.[field];

  switch (rule?.operator) {
    case 'equals':
      return String(value) === String(rule?.value ?? '');
    case 'not_equals':
      return String(value) !== String(rule?.value ?? '');
    case 'contains':
      return String(value).includes(String(rule?.value ?? ''));
    case 'is_empty':
      return value === null || value === undefined || String(value).trim() === '';
    case 'is_not_empty':
      return !(value === null || value === undefined || String(value).trim() === '');
    case 'greater_than':
      return Number(value) > Number(rule?.value ?? '');
    case 'less_than':
      return Number(value) < Number(rule?.value ?? '');
    default:
      return false;
  }
};

const applyTransformConfig = (row, field, transform) => {
  const base = toText(transform?.actionSourceKey)
    ? getSourceValueByKey(row, transform.actionSourceKey)
    : row?.[field];

  if (transform?.actionMode === 'keep_source') {
    return base;
  }

  return applySingleTransform(base, transform);
};

export const buildPreviewRows = ({ sourceRows, mappings, targetFields }) => {
  return sourceRows.map((sourceRow) => {
    const row = { ...sourceRow };
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
      if (Array.isArray(transform?.chain) && transform.chain.length > 0) {
        let result = next[field];
        transform.chain.forEach((step) => {
          result = applySingleTransform(result, step);
        });
        next[field] = result;
        return;
      }

      if (Array.isArray(transform?.rules) && transform.rules.length > 0) {
        for (const rule of transform.rules) {
          if (passesTransformRule(next, field, rule)) {
            next[field] = applyTransformConfig(next, field, rule);
            return;
          }
        }
        return;
      }

      next[field] = applySingleTransform(next[field], transform);
    });
    return next;
  });

  const sortItems = Array.isArray(sortConfig?.items) && sortConfig.items.length > 0
    ? [...sortConfig.items]
    : (sortConfig?.field ? [{ field: sortConfig.field, order: sortConfig.order || SORT_ORDER.ASC, priority: 1 }] : []);

  if (sortItems.length > 0) {
    const normalizedSortItems = sortItems
      .map((item, index) => ({
        field: item?.field,
        order: item?.order === SORT_ORDER.DESC ? SORT_ORDER.DESC : SORT_ORDER.ASC,
        priority: Number.isFinite(Number(item?.priority)) ? Number(item.priority) : index + 1
      }))
      .filter((item) => item.field)
      .sort((a, b) => a.priority - b.priority);

    rows.sort((a, b) => {
      for (const sortItem of normalizedSortItems) {
        const av = a[sortItem.field];
        const bv = b[sortItem.field];
        if (av === bv) continue;
        const result = av > bv ? 1 : -1;
        return sortItem.order === SORT_ORDER.DESC ? -result : result;
      }
      return 0;
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


