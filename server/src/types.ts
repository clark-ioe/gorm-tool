export interface GoStruct {
  name: string;
  fields: GormTag[];
}

export interface GormTag {
  name: string;
  type: string;
  gormTag: string;
}

export interface GormDiagnostic {
  structName: string;
  fieldName: string;
  tag: string;
  message: string;
  level: 'error' | 'warning';
  errorTag?: string;  // Specific error tag for precise positioning
}

export interface ValidationResult {
  diagnostics: GormDiagnostic[];
} 