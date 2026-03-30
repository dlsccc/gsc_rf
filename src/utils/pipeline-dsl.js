const makeParam = (name, type, value) => ({
  param_name: name,
  param_type: type,
  param_value: value
});

const trimText = (value) => String(value ?? '').trim();
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  const text = trimText(value).toLowerCase();
  if (!text) return false;
  if (['true', '1', 'y', 'yes'].includes(text)) return true;
  if (['false', '0', 'n', 'no'].includes(text)) return false;
  return Boolean(value);
};

const createUuid = () => {
  const randomUUID = globalThis?.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : ((random & 0x3) | 0x8);
    return value.toString(16);
  });
};

const createPrefixedId = (prefix) => {
  return `${prefix}_${createUuid().replace(/-/g, '_')}`;
};

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

const resolveFileEdmId = (file = {}) => {
  return trimText(file?.edmId || file?.edmID || file?.fileCode || file?.id || '');
};

const normalizeFieldInfoItem = (item = {}) => {
  const rawSeq = item?.seq ?? item?.fieldSeq ?? item?.field_seq ?? '';
  return {
    seq: rawSeq,
    field_name: trimText(item?.fieldName || item?.field_name || item?.name),
    field_alias: trimText(item?.fieldAlias || item?.field_alias || item?.alias),
    field_type: trimText(item?.fieldType || item?.field_type || item?.type)
  };
};

const toFieldInfoList = (file = {}) => {
  const source = Array.isArray(file?.fieldInfoList)
    ? file.fieldInfoList
    : (Array.isArray(file?.field_info_list) ? file.field_info_list : []);

  return source
    .map((item) => normalizeFieldInfoItem(item))
    .filter((item) => item.seq !== '' || item.field_name || item.field_alias || item.field_type);
};

const pickSampleValue = (rows = [], field) => {
  const sample = rows.find((row) => trimText(row?.[field]) !== '');
  return sample?.[field] ?? '';
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
  round_decimal: 'round_decimal',
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

const parseSourceKey = (key) => {
  const text = trimText(key);
  if (!text) return { sourceTable: 'raw', column: '', full: '' };

  const parts = text.split('.');
  if (parts.length >= 2) {
    return {
      sourceTable: parts[0],
      column: parts.slice(1).join('.'),
      full: text
    };
  }

  return {
    sourceTable: 'raw',
    column: text,
    full: text
  };
};

const unique = (arr) => Array.from(new Set(arr));

const normalizeIndexPart = (value) => {
  return trimText(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item';
};

const formatConditionValue = (value) => {
  if (value === null || value === undefined) return 'null';
  const text = String(value);
  if (/^-?\d+(\.\d+)?$/.test(text)) return text;
  if (/^(true|false)$/i.test(text)) return text.toLowerCase();
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
};

const buildConditionExpression = (rule = {}, columnRef = '$rule_input[0].key_columns[0]') => {
  const operator = String(rule?.operator || '').toLowerCase();
  const valueText = formatConditionValue(rule?.value ?? '');

  if (operator === 'equals') return `${columnRef} == ${valueText}`;
  if (operator === 'not_equals') return `${columnRef} != ${valueText}`;
  if (operator === 'greater_than') return `${columnRef} > ${valueText}`;
  if (operator === 'less_than') return `${columnRef} < ${valueText}`;
  if (operator === 'contains') return `contains(${columnRef}, ${valueText})`;
  if (operator === 'is_empty') return `${columnRef} == null || ${columnRef} == ""`;
  if (operator === 'is_not_empty') return `${columnRef} != null && ${columnRef} != ""`;
  return '';
};

const toRuleInputsByRawSources = (sourceKeys = []) => {
  const grouped = new Map();

  (Array.isArray(sourceKeys) ? sourceKeys : []).forEach((key) => {
    const parsed = parseSourceKey(key);
    if (!parsed.column) return;

    if (!grouped.has(parsed.sourceTable)) {
      grouped.set(parsed.sourceTable, []);
    }
    grouped.get(parsed.sourceTable).push(parsed.column);
  });

  return Array.from(grouped.entries()).map(([sourceTable, columns]) => {
    return makeRuleInput(sourceTable, unique(columns));
  });
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
    const branches = config.rules
      .filter((rule) => !!rule?.operator)
      .map((rule, index) => {
        const condition = buildConditionExpression(rule);
        if (!condition) return null;

        const subRule = buildTransformStep({
          type: rule.type,
          delimiter: rule.delimiter,
          fixedValue: rule.fixedValue,
          search: rule.search,
          replace: rule.replace,
          formula: rule.formula,
          precision: rule.precision
        });

        return {
          index: `sub_rule_${normalizeIndexPart(rule.type)}_${index + 1}`,
          condition,
          rule: subRule
        };
      })
      .filter(Boolean);

    if (branches.length === 0) return undefined;

    return {
      kind: 'if_branch',
      branches
    };
  }

  return buildTransformStep(config);
};

const toDataSourceDsl = (uploadedFiles = []) => {
  return toSourceFiles(uploadedFiles).map((file) => {
    const columns = (file.fields || []).map((fieldName) => {
      const sample = pickSampleValue(file.rows, fieldName);
      return {
        column_id: createPrefixedId('data_smart_base_field'),
        name: fieldName,
        sample_value: sample,
        format: ''
      };
    });

    return {
      source_id: createPrefixedId('data_smart_base_model'),
      edmId: resolveFileEdmId(file),
      source_name: file.name || file.source,
      source_type: 'file',
      file_path: `/uploads/${file.name || file.source}`,
      columns,
      field_info_list: toFieldInfoList(file)
    };
  });
};

const toTargetColumns = (selectedModel = {}) => {
  const fields = Array.isArray(selectedModel?.fields) ? selectedModel.fields : [];
  const involveCalc = selectedModel?.tags?.involveCalc !== undefined
    ? toBoolean(selectedModel.tags?.involveCalc)
    : toBoolean(selectedModel?.involveCalc);
  return fields
    .map((field) => {
      const name = trimText(field?.name || field?.fieldName);
      if (!name) return null;
      return {
        name,
        type: trimText(field?.type || field?.fieldType),
        format: trimText(field?.format || field?.dataFormat),
        involve_calc: involveCalc
      };
    })
    .filter(Boolean);
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

const resolveTargetFieldNames = (selectedModel = {}, mappings = {}) => {
  const fromModel = (selectedModel?.fields || [])
    .map((field) => trimText(field?.name))
    .filter(Boolean);

  if (fromModel.length > 0) return fromModel;

  return Object.keys(mappings || {})
    .map((name) => trimText(name))
    .filter(Boolean);
};

const buildDataProcessingDsl = ({
  selectedModel,
  mappings = {},
  filters = {},
  transforms = {},
  sortConfig = {}
}) => {
  const modelCode = getModelCode(selectedModel);
  const targetFields = resolveTargetFieldNames(selectedModel, mappings);
  const rules = [];
  let idx = 0;

  targetFields.forEach((fieldName) => {
    idx += 1;
    const sourceKeys = mappings[fieldName] || [];
    const ruleInputs = toRuleInputsByRawSources(sourceKeys);
    const baseRuleInput = ruleInputs.length > 0 ? ruleInputs : [makeRuleInput('', [])];
    const baseRuleOutput = makeRuleOutput(modelCode, fieldName);

    const filter = buildFilterDsl(filters[fieldName]);
    const transform = buildTransformDsl(transforms[fieldName]);

    const sortParams = sortConfig?.field && sortConfig.field === fieldName
      ? [
        makeParam('directions', 'enum', sortConfig.order || 'asc'),
        makeParam('nulls_position', 'enum', 'last')
      ]
      : null;

    if (transform?.kind === 'if_branch') {
      transform.branches.forEach((branch, branchIndex) => {
        const branchItem = {
          index: `rule_conditional_${normalizeIndexPart(fieldName)}_${branchIndex + 1}`,
          rule_input: baseRuleInput,
          rule_output: baseRuleOutput,
          rule: {
            ability_name: 'if_branch',
            params: [
              makeParam('condition', 'string', branch.condition)
            ]
          },
          then: [
            {
              index: branch.index,
              rule: branch.rule
            }
          ]
        };

        if (filter) {
          branchItem.filter = filter;
        }

        if (sortParams && branchIndex === transform.branches.length - 1) {
          branchItem.sort = sortParams;
        }

        rules.push(branchItem);
      });
      return;
    }

    const item = {
      index: `rule_${fieldName.toLowerCase()}_${idx}`,
      rule_input: baseRuleInput,
      rule_output: baseRuleOutput
    };

    if (filter) {
      item.filter = filter;
    }

    if (transform) {
      item.rule = transform;
    }

    if (sortParams) {
      item.sort = sortParams;
    }

    rules.push(item);
  });

  return {
    source_table: 'raw_sources',
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
      makeRuleInput(modelCode, dedupConfig?.enabled ? dedupConfig.fields || [] : [])
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
        makeParam('conflict_strategy', 'enum', 'keep_old')
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
      model_code: modelCode,
      target_columns: toTargetColumns(selectedModel)
    },
    global_setting: {
      index: 'mapping_step_001',
      data_sources: {
        tables: toDataSourceDsl(sourceFiles)
      },
      ...(hasJoin ? { join_config: buildJoinDsl(sourceFiles, joinConfig) } : {}),
      ...(dedupDsl ? { deduplicate: dedupDsl } : {})
    },
    data_processing: buildDataProcessingDsl({
      selectedModel,
      mappings,
      filters,
      transforms,
      sortConfig
    }),
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

