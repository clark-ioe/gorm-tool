# GORM Tool - Development Guide

## Architecture Overview

GORM Tool is implemented as a Language Server Protocol (LSP) extension with a client-server architecture:

```
┌─────────────────────┐    LSP Messages    ┌──────────────────────┐
│  VS Code Extension  │ ←────────────────→ │   Language Server    │
│     (Client)        │                    │      (Node.js)       │
└─────────────────────┘                    └──────────────────────┘
```

**Benefits of LSP Architecture:**
- Performance: Server runs in separate process
- Language-agnostic: Can work with other editors
- Rich features: Real-time diagnostics, completion, etc.

## Project Structure

```
gorm-tool/
├── client/                     # VS Code Extension (Language Client)
│   ├── src/
│   │   ├── extension.ts       # Extension entry point & activation
│   │   └── test/              # Integration tests
│   │       ├── extension.test.ts      # Extension activation tests
│   │       ├── diagnostics.test.ts   # Diagnostic validation tests
│   │       ├── completion.test.ts    # Completion feature tests
│   │       ├── helper.ts             # Test utilities
│   │       ├── constants.ts          # Test constants
│   │       └── testFixture/          # Test data files
│   ├── out/                   # Compiled JavaScript
│   ├── package.json          # Client dependencies
│   └── tsconfig.json         # Client TypeScript config
├── server/                    # Language Server Implementation
│   ├── src/
│   │   ├── server.ts         # LSP server main implementation
│   │   ├── parser.ts         # Go struct parser & GORM validator
│   │   └── types.ts          # TypeScript type definitions
│   ├── out/                  # Compiled JavaScript
│   ├── package.json         # Server dependencies
│   └── tsconfig.json        # Server TypeScript config
├── docs/                     # Documentation
│   ├── DEVELOPMENT.md       # This file
│   └── GORM_TAGS_REFERENCE.md # Complete GORM tags reference
├── scripts/                 # Build & test scripts
│   └── e2e.sh              # End-to-end test runner
├── package.json            # Extension manifest & root config
├── tsconfig.json           # Root TypeScript config
├── eslint.config.mjs       # ESLint configuration
└── .vscodeignore          # Files excluded from VSIX package
```

## Development Setup

### Prerequisites
- **Node.js** 16+ 
- **npm** 7+
- **VS Code** 1.75.0+
- **TypeScript** 5.8+ (installed via npm)

### Initial Setup
```bash
# Clone repository
git clone https://github.com/clark-ioe/gorm-tool.git
cd gorm-tool

# Install all dependencies (root, client, server)
npm install

# Compile TypeScript to JavaScript
npm run compile
```

### Development Workflow

#### 1. **Watch Mode Development**
```bash
# Start TypeScript compiler in watch mode
npm run watch
```
This continuously compiles TypeScript files as you edit them.

#### 2. **Debug Extension**
- Open project root in VS Code
- Press `F5` to launch **Extension Development Host**
- Open a `.go` file with GORM tags in the new window
- Edit GORM tags to see real-time validation

#### 3. **Run Tests**
```bash
# Run all tests (unit + integration)
npm test

# Run specific test suites
cd client && npm test
```

#### 4. **Package Extension**
```bash
# Create .vsix package for distribution
npx @vscode/vsce package
```

## Key Components

### 1. Client (`client/src/extension.ts`)

**Responsibilities:**
- Extension activation on Go files
- Language client initialization
- Communication with language server

**Key Functions:**
```typescript
export function activate(context: ExtensionContext) {
  // Creates LanguageClient instance
  // Configures server options (IPC transport)
  // Sets document selector for Go files
  // Starts language server process
}

export function deactivate(): Thenable<void> | undefined {
  // Gracefully stops language server
}
```

**Configuration:**
- Activates on `onLanguage:go` event
- Watches `**/*.go` files for changes
- Uses IPC transport for client-server communication

### 2. Server (`server/src/server.ts`)

**Responsibilities:**
- LSP server implementation
- Document lifecycle management
- Diagnostic generation and publishing
- Completion provider (basic GORM snippets)

**Key Features:**
```typescript
connection.onInitialize() // Server capability negotiation
connection.languages.diagnostics.on() // Real-time validation
connection.onCompletion() // Basic GORM tag completion
documents.onDidChangeContent() // Document change handling
```

**LSP Capabilities Provided:**
- `textDocumentSync`: Incremental document updates
- `diagnosticProvider`: Real-time error/warning reporting
- `completionProvider`: Basic GORM tag snippets

### 3. Parser (`server/src/parser.ts`)

**Core Functions:**

#### `parseGoStructs(source: string): GoStruct[]`
- Parses Go source code for struct definitions
- Uses regex to extract struct names and fields
- Handles nested braces and multi-line structs
- Returns structured data for validation

#### `validateGormTags(structs: GoStruct[]): GormDiagnostic[]`
- Validates all GORM tags in parsed structs
- Checks for duplicate keys, unknown tags, conflicts
- Generates diagnostic messages with precise locations
- Returns array of validation issues

#### `isValidGormKey(key: string): {valid: boolean, recommended: boolean}`
- Validates individual GORM tag keys
- Categorizes tags as recommended, deprecated, or invalid
- Supports 50+ GORM v2 tags with future-proofing

#### `findFieldRange(text: string, structName: string, fieldName: string): Range`
- Locates exact position of fields in source code
- Enables precise error highlighting in VS Code
- Handles complex struct layouts and formatting

## Supported GORM Tags

### ✅ Recommended Tags (50+ supported)
```typescript
// Field Definition
'column', 'type', 'size', 'primarykey', 'autoincrement', 'not null', 
'default', 'unique', 'embedded', 'embeddedprefix', '-'

// Indexes & Constraints  
'index', 'uniqueindex', 'priority', 'check', 'constraint',
'sort', 'length', 'class', 'where', 'option', 'composite'

// Time & Auto-Update
'autocreatetime', 'autoupdatetime', 'precision', 'scale'

// Permissions & Comments
'<-', '->', 'comment', 'serializer'

// Relationships (use with caution)
'foreignkey', 'references', 'many2many', 'joinforeignkey', 
'joinreferences', 'polymorphic', 'polymorphicvalue'
```

### ⚠️ Deprecated Tags (warnings)
```typescript
'primary_key', 'foreign_key', 'auto_create_time', 'auto_update_time',
'association_foreignkey', 'associationforeignkey', // etc.
```

## Validation Logic

### 1. **Duplicate Detection**
- **Tag Keys**: Prevents `gorm:"size:10;size:20"`
- **Column Names**: Detects duplicate `column:name` across struct
- **Primary Keys**: Warns about multiple `primaryKey` fields

### 2. **Conflict Resolution** 
- **primaryKey + unique**: Mutually exclusive
- **Relationship Complexity**: Warns about complex foreign key setups

### 3. **Quote Validation**
- **Comment Quotes**: Ensures proper quote closure in comments
- **Mixed Quotes**: Warns about inconsistent quote styles

### 4. **Syntax Validation**
- **Unknown Tags**: Error for unrecognized tag names
- **Value Validation**: Checks tag value formats where applicable

## Testing Strategy

### Unit Tests (`client/src/test/`)

#### Extension Tests (`extension.test.ts`)
```typescript
test('Extension should be present')
test('Extension should activate') 
test('Should register language client')
test('Should provide diagnostics for Go files')
```

#### Diagnostic Tests (`diagnostics.test.ts`)
```typescript
test('Should validate valid GORM tags without diagnostics')
test('Should detect invalid GORM tag names')
test('Should detect deprecated GORM tags') 
test('Should validate tag syntax and values')
test('Should detect duplicate column names')
test('Should validate comment quote closure')
```

#### Completion Tests (`completion.test.ts`)
```typescript
test('Should provide GORM tag completions')
test('Should provide completion for specific contexts')
test('Should filter completions based on existing content')
```

### Integration Tests
- E2E testing via `scripts/e2e.sh`
- Tests extension in real VS Code environment
- Validates complete client-server interaction

### Test Data (`client/src/testFixture/`)
- Sample Go files with various GORM tag scenarios
- Covers valid tags, invalid tags, edge cases
- Used for automated testing

## Build & Packaging

### TypeScript Compilation
```bash
# Compile all TypeScript files
npm run compile

# Watch mode for development
npm run watch
```

### VSIX Packaging
```bash
# Create distributable package
npx @vscode/vsce package

# Results in: gorm-tool-1.0.0.vsix
```

### Package Configuration (`.vscodeignore`)
Controls which files are included in the VSIX package:
```ignore
.vscode/**           # VS Code settings
**/*.ts              # Source TypeScript files  
**/*.map             # Source maps
client/node_modules/**   # Exclude client deps except:
!client/node_modules/vscode-jsonrpc/**      # Keep LSP deps
!client/node_modules/vscode-languageclient/**
# ... (server node_modules included completely)
```

## Performance Considerations

### 1. **Incremental Updates**
- Server uses `TextDocumentSyncKind.Incremental`
- Only processes changed parts of documents
- Minimizes re-parsing overhead

### 2. **Diagnostic Throttling**
- Configurable max problems limit (`maxNumberOfProblems`)
- Prevents UI overwhelming with too many issues

### 3. **Selective Processing**
- Only activates on Go files
- Only processes files with GORM tags
- Early exits for non-struct files

### 4. **Memory Management**
- Document settings cache with cleanup
- Structured parsing with efficient regex
- Minimal server-client message overhead

## Debugging & Troubleshooting

### Enable Server Tracing
```json
// In VS Code settings.json
{
  "gormLanguageServer.trace.server": "verbose"
}
```

### Common Issues

#### 1. **Extension Not Activating**
- Check file has `.go` extension
- Verify GORM structs are present
- Check VS Code version compatibility (1.75.0+)

#### 2. **No Diagnostics Appearing**
- Ensure TypeScript is compiled (`npm run compile`)
- Check server process is running (Output panel)
- Verify extension activation events

#### 3. **Incorrect Error Positions**
- Parser uses regex for field location
- Complex struct formatting may affect positioning
- Check `findFieldRange` function accuracy

### Development Debugging
```typescript
// Add to server.ts for debugging
console.log('Debug message:', data);
connection.console.log('Message to client console');
```

## Extension Distribution

### Local Installation
```bash
code --install-extension gorm-tool-1.0.0.vsix
```

### VS Code Marketplace (Future)
- Requires publisher account
- Package must meet marketplace guidelines
- Automated CI/CD for releases

## Contributing Guidelines

### Code Style
- Use ESLint configuration provided
- Follow TypeScript strict mode
- Add JSDoc comments for public functions

### Pull Request Process
1. Fork repository
2. Create feature branch  
3. Add/update tests for changes
4. Ensure all tests pass
5. Update documentation as needed
6. Submit PR with clear description

### Adding New GORM Tags
1. Update `isValidGormKey()` in `parser.ts`
2. Add validation logic if needed
3. Update tests in `diagnostics.test.ts`
4. Update documentation

## Future Enhancements

### Planned Features
- **Enhanced Completion**: Context-aware GORM tag suggestions
- **Code Actions**: Quick fixes for common issues
- **Hover Information**: Detailed tag documentation on hover
- **Go Module Integration**: Better struct discovery
- **Performance Optimization**: AST parsing instead of regex

### Architecture Improvements
- **Bundling**: Webpack bundling for smaller package size
- **Caching**: Intelligent caching for large codebases
- **Multi-language**: Support for other GORM language bindings

---

**For questions or issues, please refer to:**
- [GitHub Issues](https://github.com/clark-ioe/gorm-tool/issues)
- [GORM Documentation](https://gorm.io/docs/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- Manages server lifecycle
- Handles LSP communication

### Server (`server/src/server.ts`)
- Implements LSP protocol
- Manages document lifecycle
- Coordinates validation

### Parser (`server/src/parser.ts`)
- Parses Go struct definitions
- Extracts GORM tags
- Validates tag syntax and semantics

## Adding New Validations

1. **Update tag definitions** in `server/src/types.ts`
2. **Add validation logic** in `server/src/parser.ts`
3. **Add test cases** in appropriate test files
4. **Update documentation**

## Building and Packaging

```bash
# Compile
npm run compile

# Lint
npm run lint

# Package
npx vsce package
```

## Debugging

1. Open project in VS Code
2. Press F5 to launch extension development host
3. Open Go files to test validation
4. Use "Developer: Reload Window" to reload changes

### 2. Language Server (`server/src/server.ts`)
- **Purpose**: Core LSP implementation
- **Responsibilities**:
  - Document synchronization
  - Diagnostic management
  - Configuration handling
  - File change monitoring

### 3. Parser (`server/src/parser.ts`)
- **Purpose**: Go code analysis and GORM validation
- **Responsibilities**:
  - Parse Go struct definitions
  - Extract and validate GORM tags
  - Generate diagnostic messages
  - Locate error positions in source

### 4. Types (`server/src/types.ts`)
- **Purpose**: TypeScript type definitions
- **Contains**: Interface definitions for structs, tags, and diagnostics

## Validation Logic

### Tag Categories

1. **✅ Recommended Tags** (Green validation)
   - Core field tags: `column`, `type`, `size`, `primaryKey`, etc.
   - Index tags: `index`, `uniqueIndex`, `priority`
   - Time tracking: `autoCreateTime`, `autoUpdateTime`
   - Permissions: `<-`, `->`, `-`

2. **⚠️ Deprecated Tags** (Warning level)
   - Legacy association tags: `foreignKey`, `references`
   - Suggests modern alternatives

3. **❌ Invalid Tags** (Error level)
   - Unknown tags
   - Malformed values
   - Conflicting combinations

### Validation Rules

#### Syntax Validation
- Tag format: `gorm:"key:value;key2:value2"`
- Value requirements for specific tags
- Type checking for numeric values

#### Semantic Validation
- Primary key uniqueness
- Column name conflicts
- Tag combination conflicts
- Index naming conventions

#### Best Practices
- Suggests improvements
- Warns about deprecated usage
- Recommends modern patterns

## Development Workflow

### Setup
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch
```

### Testing
```bash
# Run test suite
npm test

# Launch Extension Host for manual testing
# Press F5 in VSCode or run "Launch Client" debug config
```

### Debugging

1. **Server Debugging**:
   - Set breakpoints in `server/src/`
   - Use "Attach to Server" debug configuration
   - View console output in Debug Console

2. **Client Debugging**:
   - Set breakpoints in `client/src/`
   - Debug in Extension Host instance
   - Check Output panel → "GORM Language Server"

## Adding New Validation Rules

### 1. Add Tag Definition
In `parser.ts`, update the tag category arrays:

```typescript
const newTags = [
  'column', 'type', 'size', 'newTag' // Add here
];
```

### 2. Add Validation Logic
Implement validation in `validateTagValue()`:

```typescript
case 'newTag':
  if (!value || !isValidFormat(value)) {
    diagnostics.push({
      structName,
      fieldName,
      tag,
      message: `Invalid newTag value '${value}'.`,
      level: 'error'
    });
  }
  break;
```

### 3. Add Tests
Create test cases in `client/src/test/`:

```typescript
test('Should validate newTag', async () => {
  await testDiagnostics(docUri, [
    { message: 'Invalid newTag value', range: toRange(0, 0, 0, 10), severity: DiagnosticSeverity.Error }
  ]);
});
```

## Configuration

### Extension Settings
Configured in `package.json` → `contributes.configuration`:

- `gormLanguageServer.maxNumberOfProblems`: Diagnostic limit
- `gormLanguageServer.trace.server`: Debug verbosity

### Language Server Settings
Handled in server initialization:

```typescript
interface GormLanguageServerSettings {
  maxNumberOfProblems: number;
}
```

## Performance Considerations

### Optimization Strategies

1. **Selective Processing**:
   - Only process `.go` files
   - Skip files without struct definitions
   - Skip structs without GORM tags

2. **Efficient Parsing**:
   - Regex-based struct extraction
   - Line-by-line field processing
   - Early termination on empty content

3. **Smart Caching**:
   - Document settings cache
   - Diagnostic result caching
   - File change debouncing

## Troubleshooting

### Common Issues

1. **Extension Not Activating**:
   - Check `activationEvents` in package.json
   - Verify Go file association
   - Check Output panel for errors

2. **No Diagnostics Showing**:
   - Ensure file contains Go structs
   - Verify GORM tags are present
   - Check server connection status

3. **Incorrect Error Positions**:
   - Debug `findFieldRange()` function
   - Check line/character indexing
   - Verify source parsing logic

### Debug Checklist

- [ ] Extension activates on Go files
- [ ] Language server starts successfully
- [ ] Document synchronization works
- [ ] Struct parsing extracts fields
- [ ] GORM tag extraction works
- [ ] Validation rules execute
- [ ] Diagnostics sent to client
- [ ] Error positions are accurate

## Deployment

### Package Extension
```bash
# Install vsce
npm install -g vsce

# Package extension
vsce package

# Publish to marketplace
vsce publish
```

### Distribution
- **VSIX Package**: For manual installation
- **Marketplace**: For public distribution
- **Private Registry**: For enterprise deployment

## Contributing

### Code Style
- TypeScript with strict mode
- ESLint configuration
- Consistent naming conventions
- Comprehensive comments

### Pull Request Process
1. Fork repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Update documentation
6. Submit pull request

### Testing Requirements
- Unit tests for validation logic
- Integration tests for LSP functionality
- Manual testing with example files
- Performance testing with large files

## Resources

- [LSP Specification](https://microsoft.github.io/language-server-protocol/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [GORM Documentation](https://gorm.io/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

For questions or support, please refer to the project's GitHub repository or create an issue.
