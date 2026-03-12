const makeParam = (name, type, value) => ({
  param_name: name,
  param_type: type,
  param_value: value
});

const trimText = (value) => String(value ?? '').trim();

const normalizeFileName = (name) => {
  return String(name || 'pipeline_dsl')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_');
};

const makeRuleInput = (sourceTable, keyColumns = []) => ({
  source_table: sourceTable,
  key_columns: Array.isArray(keyColumns) ? keyColumns.filter(Boolean) : []
});

const makeRuleOutput = (outputTable, outputColumn) => ({
  ...(outputTable ? { output_table: outputTable } : {}),
  ...(outputColumn ? { output_column: outputColumn } : {})
});

const getModelCode = (selectedModel) => {
  return trimText(
    selectedModel?.modelCode
    || selectedModel?.code
    || selectedModel?.name
    || 'target_model'
  );
};

const sourceOrder = {
  table_a: 0,
  table_b: 1
};

const toSourceFiles = (uploadedFiles = []) => {
  return [...uploadedFiles].sort((a, b) => {
    const oa = sourceOrder[a?.source] ?? 99;
    const ob = sourceOrder[b?.source] ?? 99;
    return oa - ob;
  });
};

const pickSampleValue = (rows = [], field) => {
  const sample = rows.find((row) => trimText(row?.[field]) !== '');
  return sample?.[field] ?? '';
};

const inferColumnType = (value) => {
  const text = trimText(value);
  if (!text) return 'string';

  if (/^(true|false)$/i.test(text)) return 'boolean';
  if (/^-?\d+(\.\d+)?$/.test(text)) return 'decimal';
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) return 'decimal';
  if (
    /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}([ T]\d{1,2}:\d{2}(:\d{2})?)?$/.test(text)
    || /^\d{1,2}:\d{2}(:\d{2})?$/.test(text)
  ) {
    return 'datetime';
  }
  return 'string';
};

const OPERATOR_MAP = {
  equals: 'equal',
  not_equals: 'not_equal',
  contains: 'contains',
  is_empty: 'is_empty',
  is_not_empty: 'is_not_empty',
  greater_than: 'greater_than',
  less_than: 'less_than'
};

const toDslOperator = (operator) => OPERATOR_MAP[operator] || operator || '';

const transformTypeMap = {
  uppercase: 'to_upper',
  lowercase: 'to_lower',
  trim: 'trim',
  format_datetime: 'format_datetime',
  extract_year: 'extract_year',
  extract_month: 'extract_month',
  extract_time: 'extract_time',
  format_time: 'format_time',
  calc_week: 'calc_week',
  calc_weekday: 'calc_weekday',
  to_number: 'to_number',
  remove_thousand_sep: 'remove_thousand_sep',
  remove_percent: 'remove_percent',
  set_value: 'set_value',
  concat: 'concat',
  replace: 'replace',
  formula: 'formula'
};

const hasEffectiveFilter = (config) => {
  if (!config) return false;
  if (config.mode === 'simple') return !!config.operator;
  if (config.mode === 'formula') return !!trimText(config.formula);
  if (config.mode === 'compound') {
    return Array.isArray(config.conditions) && config.conditions.some((item) => !!item.operator);
  }
  return !!config.operator;
};

const hasEffectiveTransform = (config) => {
  if (!config) return false;
  if (Array.isArray(config.chain) && config.chain.length > 0) return true;
  if (Array.isArray(config.rules) && config.rules.length > 0) return true;
  return !!config.type;
};

const buildFilterDsl = (config) => {
  if (!hasEffectiveFilter(config)) return undefined;

  const columnRef = '$rule_input[0].key_columns[0]';

  if (config.mode === 'formula') {
    return [
      makeParam('operator', 'enum', 'formula'),
      makeParam('column', 'string', columnRef),
      makeParam('formula', 'string', trimText(config.formula))
    ];
  }

  if (config.mode === 'compound') {
    const conditions = (config.conditions || [])
      .filter((item) => !!item.operator)
      .map((item) => ({
        operator: toDslOperator(item.operator),
        value: item.value ?? ''
      }));

    if (conditions.length === 0) return undefined;

    return [
      makeParam('operator', 'enum', 'compound'),
      makeParam('column', 'string', columnRef),
      makeParam('logic', 'enum', config.logic || 'AND'),
      makeParam('conditions', 'array', conditions)
    ];
  }

  return [
    makeParam('operator', 'enum', toDslOperator(config.operator)),
    makeParam('column', 'string', columnRef),
    makeParam('value', 'string', config.value ?? '')
  ];
};

const buildTransformStep = (step = {}, columnRef = '$rule_output.output_column') => {
  const params = [
    makeParam('transform_type', 'enum', transformTypeMap[step.type] || step.type || ''),
    makeParam('column', 'string', columnRef)
  ];

  if (step.fixedValue !== undefined) params.push(makeParam('value', 'string', step.fixedValue));
  if (step.delimiter !== undefined) params.push(makeParam('delimiter', 'string', step.delimiter));
  if (step.search !== undefined) params.push(makeParam('search_value', 'string', step.search));
  if (step.replace !== undefined) params.push(makeParam('replace_value', 'string', step.replace));
  if (step.formula !== undefined) params.push(makeParam('formula', 'string', step.formula));
  if (step.inputFormat !== undefined) params.push(makeParam('input_format', 'string', step.inputFormat));
  if (step.outputFormat !== undefined) params.push(makeParam('output_format', 'string', step.outputFormat));
  if (step.precision !== undefined) params.push(makeParam('precision', 'integer', step.precision));

  return {
    ability_name: 'transform',
    params
  };
};

const buildTransformDsl = (config) => {
  if (!hasEffectiveTransform(config)) return undefined;

  if (Array.isArray(config.chain) && config.chain.length > 0) {
    return {
      ability_name: 'transform',
      params: [
        makeParam('transform_type', 'enum', 'chain'),
        makeParam('steps', 'array', config.chain.map((step) => ({
          transform_type: transformTypeMap[step.type] || step.type || '',
          delimiter: step.delimiter ?? '',
          value: step.fixedValue ?? '',
          search_value: step.search ?? '',
          replace_value: step.replace ?? '',
          formula: step.formula ?? ''
        })))
      ]
    };
  }

  if (Array.isArray(config.rules) && config.rules.length > 0) {
    return {
      ability_name: 'conditional_transform',
      params: [
        makeParam('rules', 'array', config.rules.map((rule) => ({
          operator: toDslOperator(rule.operator),
          value: rule.value ?? '',
          transform_type: transformTypeMap[rule.type] || rule.type || '',
          delimiter: rule.delimiter ?? '',
          fixed_value: rule.fixedValue ?? '',
          search_value: rule.search ?? '',
          replace_value: rule.replace ?? '',
          formula: rule.formula ?? ''
        })))
      ]
    };
  }

  return buildTransformStep(config);
};

const toDataSourceDsl = (uploadedFiles = []) => {
  return toSourceFiles(uploadedFiles).map((file) => {
    const columns = (file.fields || []).map((fieldName) => {
      const sample = pickSampleValue(file.rows, fieldName);
      return {
        name: fieldName,
        type: inferColumnType(sample),
        sample_value: sample
      };
    });

    return {
      source_id: file.source,
      source_name: file.name || file.source,
      source_type: 'file',
      file_path: `/uploads/${file.name || file.source}`,
      columns
    };
  });
};

const buildMappingConfig = (mappings = {}, sourceTable = 'table_a') => {
  const rows = Object.entries(mappings)
    .filter(([, sourceKeys]) => Array.isArray(sourceKeys) && sourceKeys.length > 0)
    .map(([targetField, sourceKeys]) => ({
      target_column: targetField,
      source_columns: sourceKeys,
      merge_strategy: sourceKeys.length > 1 ? 'concat' : 'direct'
    }));

  return {
    index: 'map_fields',
    rule_input: [makeRuleInput(sourceTable, [])],
    rule_output: makeRuleOutput('table_mapped'),
    rule: {
      ability_name: 'field_mapping',
      params: [
        makeParam('mappings', 'array', rows)
      ]
    }
  };
};

const defaultJoinFields = (tableA = [], tableB = []) => {
  const common = tableA.filter((field) => tableB.includes(field));
  if (common.length === 0) return [];
  return [{ leftField: common[0], rightField: common[0] }];
};

const normalizeJoinType = (type) => {
  const value = String(type || '').toLowerCase();
  const allowed = ['inner', 'left', 'full'];
  return allowed.includes(value) ? value : 'left';
};

const buildJoinDsl = (uploadedFiles = [], joinConfig = {}) => {
  const sourceFiles = toSourceFiles(uploadedFiles);
  if (sourceFiles.length < 2) return undefined;

  const tableA = sourceFiles.find((item) => item.source === 'table_a') || sourceFiles[0];
  const tableB = sourceFiles.find((item) => item.source === 'table_b') || sourceFiles[1];

  const pairs = (Array.isArray(joinConfig.fields) ? joinConfig.fields : [])
    .filter((item) => item.leftField || item.rightField);
  const finalPairs = pairs.length > 0 ? pairs : defaultJoinFields(tableA?.fields || [], tableB?.fields || []);

  const leftKeys = finalPairs.map((item) => item.leftField).filter(Boolean);
  const rightKeys = finalPairs.map((item) => item.rightField).filter(Boolean);

  const params = [
    makeParam('join_type', 'enum', normalizeJoinType(joinConfig.type)),
    makeParam('left_table', 'string', '$rule_input[0].source_table'),
    makeParam('right_table', 'string', '$rule_input[1].source_table')
  ];

  if (leftKeys.length <= 1 && rightKeys.length <= 1) {
    params.push(makeParam('left_key', 'string', '$rule_input[0].key_columns[0]'));
    params.push(makeParam('right_key', 'string', '$rule_input[1].key_columns[0]'));
  } else {
    params.push(makeParam('left_keys', 'array', '$rule_input[0].key_columns'));
    params.push(makeParam('right_keys', 'array', '$rule_input[1].key_columns'));
  }

  params.push(makeParam('suffix', 'string', '_right'));
  params.push(makeParam('on_no_match', 'enum', 'null'));

  return {
    index: 'join_tables',
    rule_input: [
      makeRuleInput(tableA?.source || 'table_a', leftKeys),
      makeRuleInput(tableB?.source || 'table_b', rightKeys)
    ],
    rule_output: makeRuleOutput('table_joined'),
    rule: {
      ability_name: 'join',
      params
    }
  };
};

const buildDedupDsl = (dedupConfig = {}) => {
  if (!dedupConfig.enabled || !Array.isArray(dedupConfig.fields) || dedupConfig.fields.length === 0) {
    return undefined;
  }

  const value = dedupConfig.fields.length === 1
    ? '$rule_input[0].key_columns[0]'
    : '$rule_input[0].key_columns';
  const type = dedupConfig.fields.length === 1 ? 'string' : 'array';

  return {
    index: 'deduplicate_data',
    rule_input: [
      makeRuleInput('table_mapped', [...dedupConfig.fields])
    ],
    rule_output: makeRuleOutput('table_mapped'),
    rule: {
      ability_name: 'deduplicate',
      params: [
        makeParam('dedup_keys', type, value),
        makeParam('keep', 'enum', dedupConfig.keep || 'first')
      ]
    }
  };
};

const buildDataProcessingDsl = (filters = {}, transforms = {}, sortConfig = {}) => {
  const fields = new Set([...Object.keys(filters || {}), ...Object.keys(transforms || {})]);
  const rules = [];

  fields.forEach((fieldName, idx) => {
    const filter = buildFilterDsl(filters[fieldName]);
    const rule = buildTransformDsl(transforms[fieldName]) || {
      ability_name: 'transform',
      params: [
        makeParam('transform_type', 'enum', 'identity'),
        makeParam('column', 'string', '$rule_output.output_column')
      ]
    };

    const item = {
      index: `rule_${fieldName.toLowerCase()}_${idx + 1}`,
      rule_input: [makeRuleInput('table_mapped', [fieldName])],
      rule_output: makeRuleOutput('table_mapped', fieldName),
      ...(filter ? { filter } : {}),
      rule
    };

    if (sortConfig?.field && sortConfig.field === fieldName) {
      item.sort = [
        makeParam('directions', 'enum', sortConfig.order || 'asc'),
        makeParam('nulls_position', 'enum', 'last')
      ];
    }

    rules.push(item);
  });

  if (sortConfig?.field && ![...fields].includes(sortConfig.field)) {
    rules.push({
      index: 'rule_global_sort',
      rule_input: [makeRuleInput('table_mapped', [sortConfig.field])],
      rule_output: makeRuleOutput('table_mapped'),
      rule: {
        ability_name: 'sort',
        params: [
          makeParam('column', 'string', '$rule_input[0].key_columns[0]')
        ]
      },
      sort: [
        makeParam('directions', 'enum', sortConfig.order || 'asc'),
        makeParam('nulls_position', 'enum', 'last')
      ]
    });
  }

  return {
    source_table: 'table_mapped',
    rules
  };
};

const buildWriteDsl = (selectedModel, writeConfig = {}, dedupConfig = {}) => {
  const modelCode = getModelCode(selectedModel);
  const partitionBy = [];

  if (selectedModel?.fields?.some((field) => field.name === 'PARTITION_FIELD')) {
    partitionBy.push('PARTITION_FIELD');
  }

  return {
    index: 'rule_write_final',
    rule_input: [
      makeRuleInput('table_mapped', dedupConfig?.enabled ? dedupConfig.fields || [] : [])
    ],
    rule_output: makeRuleOutput(modelCode),
    rule: {
      ability_name: 'write',
      params: [
        makeParam('format', 'enum', 'parquet'),
        makeParam('output_path', 'string', `/data/output/${modelCode}/`),
        makeParam('partition_by', 'array', partitionBy),
        makeParam('overwrite', 'boolean', writeConfig.mode === 'replace'),
        makeParam('write_mode', 'enum', writeConfig.mode || 'append'),
        makeParam('deduplication', 'boolean', !!writeConfig.deduplication),
        makeParam('dedup_fields', 'array', writeConfig.dedupFields || []),
        makeParam('conflict_strategy', 'enum', writeConfig.conflictStrategy || 'keep_old')
      ]
    }
  };
};

export const buildPipelineDsl = ({
  ruleName = '',
  projectId = '',
  selectedModel = null,
  uploadedFiles = [],
  mappings = {},
  joinConfig = {},
  filters = {},
  transforms = {},
  sortConfig = {},
  dedupConfig = {},
  writeConfig = {}
} = {}) => {
  const sourceFiles = toSourceFiles(uploadedFiles);
  const hasJoin = sourceFiles.length >= 2;
  const sourceTable = hasJoin ? 'table_joined' : (sourceFiles[0]?.source || 'table_a');

  const modelCode = getModelCode(selectedModel);
  const dedupDsl = buildDedupDsl(dedupConfig);

  return {
    meta: {
      version: '1.0',
      generated_at: new Date().toISOString(),
      rule_name: ruleName || modelCode,
      project_id: projectId
    },
    model_selection: {
      model_code: modelCode
    },
    global_setting: {
      index: 'mapping_step_001',
      data_sources: {
        tables: toDataSourceDsl(sourceFiles)
      },
      mapping_config: buildMappingConfig(mappings, sourceTable),
      ...(hasJoin ? { join_config: buildJoinDsl(sourceFiles, joinConfig) } : {}),
      ...(dedupDsl ? { deduplicate: dedupDsl } : {})
    },
    data_processing: buildDataProcessingDsl(filters, transforms, sortConfig),
    write_config: buildWriteDsl(selectedModel, writeConfig, dedupConfig)
  };
};

export const downloadDslFile = (dsl, fileName = 'pipeline_dsl.json') => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(dsl, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = normalizeFileName(fileName);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(url);
};



