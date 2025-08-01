# GORM Tool

A VS Code extension for GORM struct tag validation and Go ORM development assistance.

## Features

- **Real-time Validation**: Validates GORM tags as you type in Go files
- **Smart Diagnostics**: Detailed error messages and warnings for invalid/deprecated tags
- **Duplicate Detection**: Identifies duplicate tag keys and column names
- **Quote Validation**: Ensures proper comment quote closure
- **Comprehensive Coverage**: Supports all GORM v2 tags with deprecation warnings
- **Language Server Protocol**: Fast, efficient validation using LSP architecture

## Installation

### From VSIX Package
```bash
code --install-extension gorm-tool-1.0.0.vsix
```

### Development Installation
```bash
git clone https://github.com/clark-ioe/gorm-tool.git
cd gorm-tool
npm install
npm run compile
```

## Usage

The extension automatically activates when you open Go files containing GORM structs:

```go
type User struct {
    ID       uint      `gorm:"primaryKey;autoIncrement;comment:User ID"`
    Username string    `gorm:"column:username;type:varchar(50);unique;not null"`
    Email    string    `gorm:"type:varchar(100);uniqueIndex:idx_email"`
    CreatedAt time.Time `gorm:"autoCreateTime"`
    UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
```

## Supported GORM Tags

### ✅ Core Field Tags
- **Column Definition**: `column`, `type`, `size`, `precision`, `scale`
- **Constraints**: `primaryKey`, `autoIncrement`, `unique`, `not null`, `default`
- **Comments**: `comment`
- **Embedding**: `embedded`, `embeddedPrefix`
- **Permissions**: `<-`, `->`, `-`

### ✅ Index & Constraint Tags
- **Indexes**: `index`, `uniqueIndex`, `priority`
- **Constraints**: `check`, `constraint`
- **Advanced Index Options**: `sort`, `length`, `class`, `where`, `option`, `composite`

### ✅ Time & Auto-Update Tags
- **Auto Timestamps**: `autoCreateTime`, `autoUpdateTime`
- **Auto Increment**: `autoIncrementIncrement`

### ✅ Serialization Tags
- **Serializer**: `serializer` (supports json, gob, etc.)

### ⚠️ Relationship Tags (Use with Caution)
- **Foreign Keys**: `foreignKey`, `references`
- **Many-to-Many**: `many2many`, `joinForeignKey`, `joinReferences`
- **Polymorphic**: `polymorphic`, `polymorphicValue`

### ❌ Deprecated Tags (Warnings)
- `primary_key` → Use `primaryKey`
- `foreign_key` → Use `foreignKey`
- `auto_create_time` → Use `autoCreateTime`
- `auto_update_time` → Use `autoUpdateTime`
- Association tags → Use modern relationship syntax

## Validation Features

### Error Detection
- **Duplicate Keys**: Prevents duplicate tag keys in same field
- **Duplicate Columns**: Detects duplicate column names across struct
- **Multiple Primary Keys**: Warns about multiple primary key fields
- **Conflicting Tags**: Detects `primaryKey` + `unique` conflicts
- **Unknown Tags**: Identifies unsupported or misspelled tags
- **Quote Issues**: Validates comment quote closure

### Warning System
- **Deprecated Tags**: Shows warnings for legacy GORM v1 tags
- **Relationship Complexity**: Warns about complex relationship configurations

## Configuration

Configure via VS Code settings (`settings.json`):

```json
{
  "gormLanguageServer.maxNumberOfProblems": 1000,
  "gormLanguageServer.trace.server": "off"
}
```

### Settings Options
- `maxNumberOfProblems`: Maximum number of validation issues to show (default: 1000)
- `trace.server`: Debug trace level (`off`/`messages`/`verbose`)

## Project Architecture

```
.
├── client/              # Language Client (VS Code Extension)
│   ├── src/
│   │   ├── extension.ts # Extension entry point
│   │   └── test/        # E2E tests
│   └── package.json     # Client dependencies
├── server/              # Language Server Implementation
│   ├── src/
│   │   ├── server.ts    # LSP server implementation
│   │   ├── parser.ts    # Go struct parser & GORM validator
│   │   └── types.ts     # TypeScript type definitions
│   └── package.json     # Server dependencies
├── docs/                # Documentation
│   ├── DEVELOPMENT.md   # Development guide
│   └── GORM_TAGS_REFERENCE.md # Complete GORM tags reference
└── package.json         # Extension manifest
```

## Development

### Build & Run
```bash
# Install dependencies
npm install

# Build extension
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm test
```

### Debug Extension
1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Open any `.go` file with GORM structs
4. See real-time validation in action

## Example Validation

```go
type User struct {
    // ✅ Valid GORM tags
    ID       uint      `gorm:"primaryKey;autoIncrement;comment:User ID"`
    Username string    `gorm:"column:username;type:varchar(50);unique;not null"`
    Email    string    `gorm:"type:varchar(100);uniqueIndex:idx_email"`
    
    // ❌ Issues detected by extension
    Status   int8      `gorm:"unknownTag"`           // Error: Unknown tag
    Name     string    `gorm:"size:abc"`             // Error: Invalid size value  
    Phone    string    `gorm:"primaryKey"`           // Warning: Multiple primary keys
    Bio      string    `gorm:"comment:'Unclosed"`    // Error: Unclosed quote
    Age      int       `gorm:"size:10;size:20"`      // Error: Duplicate keys
}
```

## Requirements

- **VS Code**: 1.75.0 or higher
- **Go Files**: Extension activates on `.go` files with GORM structs
- **Node.js**: For development (TypeScript compilation)

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Submit pull request

## Resources

- **[GORM Official Documentation](https://gorm.io/docs/)**
- **[VS Code Extension API](https://code.visualstudio.com/api)**
- **[Language Server Protocol](https://microsoft.github.io/language-server-protocol/)**

## License

MIT License - See [LICENSE](LICENSE) file for details.

## Author

**Clark-IOE** <clark@intentoriented.com>
- GitHub: [@clark-ioe](https://github.com/clark-ioe)
- Repository: [gorm-tool](https://github.com/clark-ioe/gorm-tool)
