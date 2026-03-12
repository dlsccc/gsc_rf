export const PIPELINE_STEPS = [
  '选择模型',
  '字段映射',
  '数据处理',
  '写入配置'
];

export const JOIN_TYPES = {
  INNER: 'inner',
  LEFT: 'left',
  FULL: 'full'
};

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc'
};

export const DEDUP_KEEP = {
  FIRST: 'first',
  LAST: 'last',
  ANY: 'any'
};

export const TRANSFORM_TYPES = {
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
  TRIM: 'trim',
  FORMAT_DATETIME: 'format_datetime',
  EXTRACT_YEAR: 'extract_year',
  EXTRACT_MONTH: 'extract_month',
  EXTRACT_TIME: 'extract_time',
  FORMAT_TIME: 'format_time',
  CALC_WEEK: 'calc_week',
  CALC_WEEKDAY: 'calc_weekday',
  TO_NUMBER: 'to_number',
  REMOVE_THOUSAND_SEP: 'remove_thousand_sep',
  REMOVE_PERCENT: 'remove_percent',
  SET_VALUE: 'set_value',
  CONCAT: 'concat',
  REPLACE: 'replace',
  FORMULA: 'formula'
};

