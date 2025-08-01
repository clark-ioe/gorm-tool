import { GoStruct, GormTag, GormDiagnostic } from './types';

/**
 * Parse Go struct definitions from source code
 */
export function parseGoStructs(source: string): GoStruct[] {
  const structs: GoStruct[] = [];
  
  if (!source || source.trim().length === 0) {
    return structs;
  }
  
  // Use regex to parse struct definitions, supporting multi-line and nested braces
  const structRegex = /type\s+(\w+)\s+struct\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/gs;
  let match;
  
  while ((match = structRegex.exec(source)) !== null) {
    const structName = match[1];
    const fieldsText = match[2];
    
    if (!structName || !fieldsText) {
      continue;
    }
    
    try {
      const fields = parseFields(fieldsText);
      
      structs.push({
        name: structName,
        fields
      });
    } catch (error) {
      console.error(`Error parsing fields for struct ${structName}:`, error);
      continue;
    }
  }
  
  return structs;
}

/**
 * Parse struct fields from field text
 */
function parseFields(fieldsText: string): GormTag[] {
  const fields: GormTag[] = [];
  
  if (!fieldsText || fieldsText.trim().length === 0) {
    return fields;
  }
  
  // Process line by line to support multi-line field definitions
  const lines = fieldsText.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('//')) {
      continue;
    }
    
    // Match field definitions: fieldName fieldType `tags` or without tags
    const fieldWithTagsRegex = /^\s*(\w+)\s+([\w[\]*.]+)\s*`([^`]*)`/;
    const fieldWithoutTagsRegex = /^\s*(\w+)\s+([\w[\]*.]+)\s*$/;
    
    let match = fieldWithTagsRegex.exec(trimmedLine);
    let fieldName, fieldType, tags = '';
    
    if (match) {
      fieldName = match[1];
      fieldType = match[2];
      tags = match[3];
    } else {
      match = fieldWithoutTagsRegex.exec(trimmedLine);
      if (match) {
        fieldName = match[1];
        fieldType = match[2];
      }
    }
    
    if (fieldName && fieldType) {
      try {
        // Parse GORM tags
        const gormTag = parseGormTag(tags);
        
        fields.push({
          name: fieldName,
          type: fieldType,
          gormTag
        });
      } catch {
        // Add field even if tag parsing fails, without GORM tag
        fields.push({
          name: fieldName,
          type: fieldType,
          gormTag: ''
        });
      }
    }
  }
  
  return fields;
}

/**
 * Parse GORM tag from tag string
 */
function parseGormTag(tags: string): string {
  if (!tags || tags.trim().length === 0) {
    return '';
  }
  
  // Support various GORM tag formats
  const gormPatterns = [
    /gorm:"([^"]*)"/,  // gorm:"column:name"
    /gorm:'([^']*)'/,  // gorm:'column:name'
    /gorm:([^\s;`]+)/  // gorm:column:name (without quotes)
  ];
  
  for (const pattern of gormPatterns) {
    const match = tags.match(pattern);
    if (match) {
      return match[1] || '';
    }
  }
  
  return '';
}

/**
 * Validate GORM tags in parsed structs
 */
export function validateGormTags(structs: GoStruct[]): GormDiagnostic[] {
  const diagnostics: GormDiagnostic[] = [];
  
  if (!structs || structs.length === 0) {
    return diagnostics;
  }
  
  for (const struct of structs) {
    if (!struct.fields || struct.fields.length === 0) {
      continue;
    }
    
    const columnValues = new Map<string, string>();
    const primaryKeyFields: string[] = [];
    const indexNames = new Map<string, string[]>(); // index name -> fields using this name
    let hasGormTags = false;
    
    for (const field of struct.fields) {
      if (!field.gormTag || field.gormTag.trim().length === 0) {
        continue;
      }
      
      hasGormTags = true;
      
      try {
        // Parse tag key-value pairs
        const tagParts = field.gormTag.split(';').map((part: string) => part.trim()).filter((part: string) => part.length > 0);
        const keys = new Set<string>();
        
        for (const part of tagParts) {
          const colonIndex = part.indexOf(':');
          const key = colonIndex > 0 ? part.substring(0, colonIndex).trim() : part.trim();
          const value = colonIndex > 0 ? part.substring(colonIndex + 1).trim() : '';
          const lowerKey = key.toLowerCase();
          
          // Check for duplicate keys
          if (keys.has(lowerKey)) {
            diagnostics.push({
              structName: struct.name,
              fieldName: field.name,
              tag: field.gormTag,
              message: `Duplicate GORM tag key '${key}' in field`,
              level: 'error',
              errorTag: key
            });
          }
          keys.add(lowerKey);
          
          // Record primary key fields
          if (lowerKey === 'primarykey') {
            primaryKeyFields.push(field.name);
          }
          
          // Check primaryKey and unique conflict
          if (lowerKey === 'primarykey' && keys.has('unique')) {
            diagnostics.push({
              structName: struct.name,
              fieldName: field.name,
              tag: field.gormTag,
              message: "'primaryKey' and 'unique' cannot be used together",
              level: 'error',
              errorTag: key
            });
          }
          if (lowerKey === 'unique' && keys.has('primarykey')) {
            diagnostics.push({
              structName: struct.name,
              fieldName: field.name,
              tag: field.gormTag,
              message: "'unique' and 'primaryKey' cannot be used together",
              level: 'error',
              errorTag: key
            });
          }
          
          // Check column duplicate values
          if (lowerKey === 'column' && value) {
            if (columnValues.has(value)) {
              const existingFieldName = columnValues.get(value);
              diagnostics.push({
                structName: struct.name,
                fieldName: field.name,
                tag: field.gormTag,
                message: `Duplicate column name '${value}' already used by field '${existingFieldName}'. Each column name must be unique within the struct.`,
                level: 'error',
                errorTag: key
              });
            } else {
              columnValues.set(value, field.name);
            }
          }
          
          // Check index name duplication (but allow composite indexes to share names)
          if ((lowerKey === 'index' || lowerKey === 'uniqueindex') && value) {
            if (!indexNames.has(value)) {
              indexNames.set(value, []);
            }
            indexNames.get(value)!.push(field.name);
          }
          
          // Check tag validity
          const keyValidation = isValidGormKey(lowerKey);
          if (!keyValidation.valid) {
            // Unknown tag - error level
            diagnostics.push({
              structName: struct.name,
              fieldName: field.name,
              tag: field.gormTag,
              message: `Unknown GORM tag '${key}'. Check GORM documentation for valid tags.`,
              level: 'error',
              errorTag: key
            });
          } else if (!keyValidation.recommended) {
            // Not recommended tag - warning level
            diagnostics.push({
              structName: struct.name,
              fieldName: field.name,
              tag: field.gormTag,
              message: `GORM tag '${key}' is deprecated or not recommended. Consider using alternative approaches.`,
              level: 'warning',
              errorTag: key
            });
          }
          
          // Check specific tag value formats
          validateTagValue(lowerKey, value, struct.name, field.name, field.gormTag, diagnostics, key);
          
          // Check tag combination conflicts
          validateTagCombinations(keys, lowerKey, struct.name, field.name, field.gormTag, diagnostics, key);
        }
        
        // Field-level validation
        validateFieldLevelRules(keys, struct.name, field.name, field.gormTag, diagnostics);
      } catch (error) {
        diagnostics.push({
          structName: struct.name,
          fieldName: field.name,
          tag: field.gormTag,
          message: `Error parsing GORM tags: ${error instanceof Error ? error.message : String(error)}`,
          level: 'error'
        });
      }
    }
    
    if (!hasGormTags) {
      // Structs without GORM tags are not ORM models, no processing needed
      continue;
    }
    
    // Check multiple primary keys
    if (primaryKeyFields.length > 1) {
      for (const fieldName of primaryKeyFields) {
        const field = struct.fields.find((f: GormTag) => f.name === fieldName);
        if (field) {
          diagnostics.push({
            structName: struct.name,
            fieldName: field.name,
            tag: field.gormTag,
            message: `Multiple primary keys found in struct. Only one primary key is allowed.`,
            level: 'error'
          });
        }
      }
    }
    
    // Check index name conventions and potential conflicts
    for (const [indexName, fieldsUsingIndex] of indexNames.entries()) {
      if (fieldsUsingIndex.length > 1) {
        // This might be a composite index, provide informational hint
        for (const fieldName of fieldsUsingIndex) {
          const field = struct.fields.find((f: GormTag) => f.name === fieldName);
          if (field) {
            diagnostics.push({
              structName: struct.name,
              fieldName: field.name,
              tag: field.gormTag,
              message: `Index '${indexName}' is used by multiple fields: ${fieldsUsingIndex.join(', ')}. Ensure this is intended for composite index.`,
              level: 'warning'
            });
          }
        }
      }
    }
  }
  
  return diagnostics;
}
/**
 * Check if quotes are properly closed in a string value
 */
function checkQuoteClosure(value: string): { hasError: boolean; quoteType?: string; message?: string } {
  let singleQuoteCount = 0;
  let doubleQuoteCount = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;
  
  while (i < value.length) {
    const char = value[i];
    
    if (char === "'" && !inDoubleQuote) {
      if (i === 0 || value[i - 1] !== '\\') { // Not escaped
        singleQuoteCount++;
        inSingleQuote = !inSingleQuote;
      }
    } else if (char === '"' && !inSingleQuote) {
      if (i === 0 || value[i - 1] !== '\\') { // Not escaped
        doubleQuoteCount++;
        inDoubleQuote = !inDoubleQuote;
      }
    }
    i++;
  }
  
  // Check for unmatched quotes
  if (singleQuoteCount % 2 !== 0) {
    return {
      hasError: true,
      quoteType: 'single',
      message: `Found ${singleQuoteCount} single quotes, expected even number for proper closure.`
    };
  }
  
  if (doubleQuoteCount % 2 !== 0) {
    return {
      hasError: true,
      quoteType: 'double',
      message: `Found ${doubleQuoteCount} double quotes, expected even number for proper closure.`
    };
  }
  
  return { hasError: false };
}

/**
 * Validate specific tag value formats
 */
function validateTagValue(key: string, value: string, structName: string, fieldName: string, tag: string, diagnostics: GormDiagnostic[], originalKey?: string) {
  switch (key) {
    case 'size':
      if (value && !/^\d+$/.test(value)) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid size value '${value}'. Size must be a positive integer.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'precision':
      if (value && !/^\d+$/.test(value)) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid precision value '${value}'. Precision must be a positive integer.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'scale':
      if (value && !/^\d+$/.test(value)) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid scale value '${value}'. Scale must be a positive integer.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'autoincrementincrement':
      if (value && !/^\d+$/.test(value)) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid autoIncrementIncrement value '${value}'. Must be a positive integer.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'type':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Type tag requires a value.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'column':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Column tag requires a column name.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'check':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Check constraint requires a condition.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'comment':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Comment tag requires a comment text.`,
          level: 'warning',
          errorTag: originalKey || key
        });
      } else {
        // Check for quote closure in comment value
        const hasUnmatchedQuotes = checkQuoteClosure(value);
        if (hasUnmatchedQuotes.hasError) {
          diagnostics.push({
            structName,
            fieldName,
            tag,
            message: `Comment value has unmatched ${hasUnmatchedQuotes.quoteType} quotes. ${hasUnmatchedQuotes.message}`,
            level: 'error',
            errorTag: originalKey || key
          });
        }
        
        // Warn about mixed quote styles
        if (value.includes("'") && value.includes('"')) {
          diagnostics.push({
            structName,
            fieldName,
            tag,
            message: `Comment value contains both single and double quotes. Consider using consistent quote style or proper escaping.`,
            level: 'warning',
            errorTag: originalKey || key
          });
        }
      }
      break;
    
    case 'default':
      // Check default value format (can be extended as needed)
      if (value && value.includes("'") && value.includes('"')) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Default value should use consistent quote style.`,
          level: 'warning',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'serializer': {
      const validSerializers = ['json', 'gob', 'unixtime'];
      if (value && !validSerializers.includes(value.toLowerCase())) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid serializer '${value}'. Valid options: ${validSerializers.join(', ')}.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    }
    
    case 'sort': {
      const validSortOptions = ['asc', 'desc'];
      if (value && !validSortOptions.includes(value.toLowerCase())) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid sort value '${value}'. Valid options: ${validSortOptions.join(', ')}.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    }
    
    case 'length':
      if (value && !/^\d+$/.test(value)) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid length value '${value}'. Length must be a positive integer.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'priority':
      if (value && !/^\d+$/.test(value)) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid priority value '${value}'. Priority must be a positive integer.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'autocreatetime':
    case 'autoupdatetime':
      if (value && !['', 'nano', 'milli'].includes(value.toLowerCase())) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid time precision '${value}'. Valid options: '', 'nano', 'milli'.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case '<-':
      if (value && !['create', 'update', 'false'].includes(value.toLowerCase())) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid write permission '${value}'. Valid options: 'create', 'update', 'false'.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case '->':
      if (value && value.toLowerCase() !== 'false') {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid read permission '${value}'. Valid option: 'false'.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'foreignkey':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `ForeignKey tag requires a field name.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'references':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `References tag requires a field name.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'many2many':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Many2many tag requires a table name.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'joinforeignkey':
    case 'joinreferences':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `${key} tag requires a field name.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'embeddedprefix':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `EmbeddedPrefix tag requires a prefix value.`,
          level: 'warning',
          errorTag: originalKey || key
        });
      }
      break;
    
    case 'constraint':
      if (!value || value.trim().length === 0) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Constraint tag requires constraint options (e.g., OnUpdate:CASCADE,OnDelete:SET NULL).`,
          level: 'error',
          errorTag: originalKey || key
        });
      } else {
        // Check constraint option format
        const validConstraintOptions = ['onupdate', 'ondelete'];
        const constraintParts = value.toLowerCase().split(',');
        for (const part of constraintParts) {
          const [option] = part.split(':');
          if (option && !validConstraintOptions.includes(option.trim())) {
            diagnostics.push({
              structName,
              fieldName,
              tag,
              message: `Invalid constraint option '${option}'. Valid options: OnUpdate, OnDelete.`,
              level: 'warning',
              errorTag: originalKey || key
            });
          }
        }
      }
      break;
    
    case '-': {
      const validIgnoreOptions = ['', 'all', 'migration'];
      if (value && !validIgnoreOptions.includes(value.toLowerCase())) {
        diagnostics.push({
          structName,
          fieldName,
          tag,
          message: `Invalid ignore option '${value}'. Valid options: ${validIgnoreOptions.join(', ')}.`,
          level: 'error',
          errorTag: originalKey || key
        });
      }
      break;
    }
  }
}

/**
 * Validate tag combination conflicts
 */
function validateTagCombinations(keys: Set<string>, currentKey: string, structName: string, fieldName: string, tag: string, diagnostics: GormDiagnostic[], originalKey?: string) {
  // primaryKey conflicts with other constraints
  if (currentKey === 'primarykey') {
    if (keys.has('unique')) {
      diagnostics.push({
        structName,
        fieldName,
        tag,
        message: "'primaryKey' automatically implies uniqueness. Remove 'unique' tag.",
        level: 'warning',
        errorTag: originalKey || currentKey
      });
    }
    if (keys.has('not null')) {
      diagnostics.push({
        structName,
        fieldName,
        tag,
        message: "'primaryKey' automatically implies 'not null'. Remove 'not null' tag.",
        level: 'warning',
        errorTag: originalKey || currentKey
      });
    }
  }
  
  // Ignore field tag (-) conflicts with other tags
  if (keys.has('-') && keys.size > 1) {
    const otherTags = Array.from(keys).filter(k => k !== '-');
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: `Field marked as ignored ('-') cannot have other tags: ${otherTags.join(', ')}. Remove conflicting tags.`,
      level: 'error',
      errorTag: originalKey || currentKey
    });
  }
  
  // Permission control tag conflicts
  const permissionTags = ['<-', '->', '-'];
  const foundPermissionTags = permissionTags.filter(tag => keys.has(tag));
  if (foundPermissionTags.length > 1) {
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: `Conflicting permission tags: ${foundPermissionTags.join(', ')}. Use only one permission control tag.`,
      level: 'error',
      errorTag: originalKey || currentKey
    });
  }
  
  // Time tracking tag conflict check
  if (keys.has('autocreatetime') && keys.has('autoupdatetime') && currentKey === 'autoupdatetime') {
    // This is not actually a conflict, just a reminder
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: "Field has both creation and update time tracking. Ensure this is intentional.",
      level: 'warning',
      errorTag: originalKey || currentKey
    });
  }
  
  // Index and unique index combination check
  if (keys.has('index') && keys.has('uniqueindex')) {
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: "Field has both 'index' and 'uniqueIndex'. Consider using only 'uniqueIndex'.",
      level: 'warning',
      errorTag: originalKey || currentKey
    });
  }
  
  // Foreign key tag combination check
  if (keys.has('foreignkey') && !keys.has('references')) {
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: "'foreignKey' should be used together with 'references' for proper relationship definition.",
      level: 'warning',
      errorTag: originalKey || currentKey
    });
  }
  
  // Many-to-many association check
  if (keys.has('many2many') && (keys.has('foreignkey') || keys.has('references'))) {
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: "'many2many' cannot be used with 'foreignKey' or 'references'. Use association struct instead.",
      level: 'error',
      errorTag: originalKey || currentKey
    });
  }
  
  // Embedded tag combination check
  if (keys.has('embedded') && keys.has('column')) {
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: "'embedded' fields expand into multiple columns, 'column' tag is not applicable.",
      level: 'error',
      errorTag: originalKey || currentKey
    });
  }
}

/**
 * Validate field-level rules
 */
function validateFieldLevelRules(keys: Set<string>, _structName: string, _fieldName: string, _tag: string, _diagnostics: GormDiagnostic[]) {
  // Only validate GORM tag-related rules, not field names themselves
  
  // Check if there are tags that require values but don't have them
  const tagsRequiringValues = ['type', 'column', 'check', 'size', 'precision', 'scale'];
  for (const requiredTag of tagsRequiringValues) {
    if (keys.has(requiredTag)) {
      // This check is already handled in validateTagValue
      // But additional tag-level checks can be added here
    }
  }
  
  // Note: No longer validate field names themselves, only focus on GORM tag correctness
}

/**
 * Check if a GORM key is valid
 */
function isValidGormKey(key: string): { valid: boolean; recommended: boolean } {
  // General tags (field property configuration) - recommended
  const generalTags = [
    'column', 'type', 'size', 'primarykey', 'autoincrement', 'not null', 
    'default', 'unique', 'embedded', 'embeddedprefix', '-'
  ];
  
  // Index and constraint tags - recommended
  const indexConstraintTags = [
    'index', 'uniqueindex', 'priority', 'check', 'constraint'
  ];
  
  // Time and soft delete tags - recommended
  const timeTags = [
    'autocreatetime', 'autoupdatetime'
  ];
  
  // Numeric precision tags - recommended
  const precisionTags = [
    'precision', 'scale', 'autoincrementincrement'
  ];
  
  // Permission control tags - recommended
  const permissionTags = [
    '<-', '->', 'comment'
  ];
  
  // Serialization tags - recommended
  const serializerTags = [
    'serializer'
  ];
  
  // Advanced index options - recommended
  const indexOptions = [
    'sort', 'length', 'class', 'where', 'option', 'composite'
  ];
  
  // Relationship tags (foreign keys, belongs to, etc.) - partially recommended, partially not
  const relationTags = [
    'foreignkey', 'references', 'many2many', 'joinforeignkey', 
    'joinreferences', 'polymorphic', 'polymorphicvalue'
  ];
  
  // Deprecated association tags
  const deprecatedAssociationTags = [
    'association_foreignkey', 'associationforeignkey', 'associationreferences',
    'joincolumn', 'associationjoincolumn'
  ];
  
  // Deprecated GORM tags (should show warnings)
  const deprecatedTags = [
    'primary_key', 'foreign_key', 'association_foreign_key', 'association_save_reference',
    'auto_create_time', 'auto_update_time', 'foreignkey_tag', 'association_foreignkey_tag'
  ];

  const lowerKey = key.toLowerCase();
  
  // Check recommended tags
  if (generalTags.includes(lowerKey) || 
      indexConstraintTags.includes(lowerKey) || 
      timeTags.includes(lowerKey) ||
      precisionTags.includes(lowerKey) ||
      permissionTags.includes(lowerKey) ||
      serializerTags.includes(lowerKey) ||
      indexOptions.includes(lowerKey)) {
    return { valid: true, recommended: true };
  }
  
  // Check relationship tags (valid but use with caution)
  if (relationTags.includes(lowerKey)) {
    return { valid: true, recommended: false };
  }
  
  // Check deprecated tags (valid but deprecated)
  if (deprecatedTags.includes(lowerKey)) {
    return { valid: true, recommended: false };
  }
  
  // Check completely deprecated tags
  if (deprecatedAssociationTags.includes(lowerKey)) {
    return { valid: false, recommended: false };
  }
  
  return { valid: false, recommended: false };
}

/**
 * Find field position in source code
 */
export function findFieldRange(source: string, structName: string, fieldName: string, errorTag?: string) {
    const lines = source.split('\n');
    let inStruct = false;
    let structFound = false;
    let structStartLine = -1;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check if entering target struct
        if (line.includes(`type ${structName} struct`)) {
            inStruct = true;
            structFound = true;
            structStartLine = i;
            continue;
        }
        
        // If already in struct, look for field
        if (inStruct && structFound) {
            // Check if reached end of struct
            if (line.trim() === '}') {
                break;
            }
            
            // Look for field definition line - more lenient matching
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith(fieldName)) {
                // If specific error tag is specified, try to locate tag position
                if (errorTag && line.includes('gorm:')) {
                    const gormTagStart = line.indexOf('gorm:');
                    const gormTagContent = line.substring(gormTagStart);
                    const errorTagIndex = gormTagContent.indexOf(errorTag);
                    
                    if (errorTagIndex !== -1) {
                        const absoluteStart = gormTagStart + errorTagIndex;
                        
                        return {
                            start: { line: i, character: absoluteStart },
                            end: { line: i, character: absoluteStart + errorTag.length }
                        };
                    }
                }
                
                // If no specific tag or not found, return field name position
                const lineStart = line.indexOf(fieldName);
                
                return {
                    start: { line: i, character: lineStart },
                    end: { line: i, character: lineStart + fieldName.length }
                };
            }
        }
    }
    
    // If specific field position not found but struct found, return struct definition line
    if (structFound && structStartLine >= 0) {
        const structLine = lines[structStartLine];
        const structNameStart = structLine.indexOf(structName);
        
        return {
            start: { line: structStartLine, character: structNameStart },
            end: { line: structStartLine, character: structNameStart + structName.length }
        };
    }
    
    // If nothing found, return document start position
    return {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 }
    };
}