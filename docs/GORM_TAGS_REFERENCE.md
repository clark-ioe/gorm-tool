# GORM Tags Reference

Complete reference for GORM struct tags supported by this extension. This covers GORM v2 tags with validation status indicators.

## Basic Syntax

```go
type Model struct {
    Field Type `gorm:"tag1:value1;tag2:value2;tag3"`
}
```

**Rules:**
- Tags are separated by semicolons (`;`)
- Key-value pairs use colon (`:`) separator
- Flags (like `primaryKey`) don't need values
- Quote values containing spaces or special characters

## ✅ Core Field Tags (Recommended)

### Column Definition
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `column` | `column:user_name` | Custom column name | ✅ Duplicate detection |
| `type` | `type:varchar(255)` | Column data type | ✅ Syntax validation |
| `size` | `size:100` | Column size | ✅ Numeric validation |
| `precision` | `precision:10` | Decimal precision | ✅ Numeric validation |
| `scale` | `scale:2` | Decimal scale | ✅ Numeric validation |

### Constraints
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `primaryKey` | `primaryKey` | Primary key field | ✅ Multiple PK detection |
| `unique` | `unique` | Unique constraint | ✅ Conflict with primaryKey |
| `not null` | `not null` | NOT NULL constraint | ✅ Syntax validation |
| `default` | `default:0` | Default value | ✅ Value format check |
| `autoIncrement` | `autoIncrement` | Auto increment | ✅ Requires primaryKey |
| `autoIncrementIncrement` | `autoIncrementIncrement:10` | Custom increment step | ✅ Numeric validation |

### Metadata
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `comment` | `comment:'User ID'` | Column comment | ✅ Quote closure validation |
| `embedded` | `embedded` | Embed struct | ✅ Struct validation |
| `embeddedPrefix` | `embeddedPrefix:user_` | Embedded field prefix | ✅ Naming validation |

## ✅ Index & Constraint Tags (Recommended)

### Basic Indexes
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `index` | `index:idx_name` | Create index | ✅ Name uniqueness |
| `uniqueIndex` | `uniqueIndex:idx_email` | Unique index | ✅ Name uniqueness |
| `priority` | `priority:1` | Index priority | ✅ Numeric validation |

### Advanced Index Options
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `sort` | `sort:desc` | Sort order (asc/desc) | ✅ Value validation |
| `length` | `length:10` | Index key length | ✅ Numeric validation |
| `class` | `class:FULLTEXT` | Index class | ✅ Database-specific |
| `where` | `where:active = 1` | Partial index condition | ✅ SQL syntax |
| `option` | `option:CONCURRENTLY` | Index creation options | ✅ Database-specific |
| `composite` | `composite:idx_name` | Composite index name | ✅ Name validation |

### Constraints
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `check` | `check:age > 0` | Check constraint | ✅ SQL syntax validation |
| `constraint` | `constraint:OnDelete:CASCADE` | FK constraint options | ✅ Option validation |

## ✅ Time & Permission Tags (Recommended)

### Auto Timestamps
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `autoCreateTime` | `autoCreateTime` | Auto set on create | ✅ Time field validation |
| `autoUpdateTime` | `autoUpdateTime` | Auto update on modify | ✅ Time field validation |

### Permission Controls
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `<-` | `<-` | Write-only field | ✅ Permission syntax |
| `->` | `->` | Read-only field | ✅ Permission syntax |
| `-` | `-` | Ignore field | ✅ No conflicts |

### Serialization
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `serializer` | `serializer:json` | Custom serializer | ✅ Serializer type validation |

## ⚠️ Relationship Tags (Use with Caution)

### Foreign Keys
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `foreignKey` | `foreignKey:UserID` | FK field name | ⚠️ Relationship complexity |
| `references` | `references:ID` | Referenced field | ⚠️ Reference validation |

### Many-to-Many
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `many2many` | `many2many:user_roles` | Join table name | ⚠️ Table name validation |
| `joinForeignKey` | `joinForeignKey:user_id` | Join table FK | ⚠️ Naming consistency |
| `joinReferences` | `joinReferences:role_id` | Join table reference | ⚠️ Reference validation |

### Polymorphic
| Tag | Example | Description | Validation |
|-----|---------|-------------|------------|
| `polymorphic` | `polymorphic:Owner` | Polymorphic association | ⚠️ Complexity warning |
| `polymorphicValue` | `polymorphicValue:user` | Polymorphic type value | ⚠️ Value consistency |

## ❌ Deprecated Tags (Warnings Generated)

### GORM v1 Legacy Tags
| Deprecated Tag | Modern Alternative | Status |
|----------------|-------------------|---------|
| `primary_key` | `primaryKey` | ⚠️ Deprecated |
| `foreign_key` | `foreignKey` | ⚠️ Deprecated |
| `auto_create_time` | `autoCreateTime` | ⚠️ Deprecated |
| `auto_update_time` | `autoUpdateTime` | ⚠️ Deprecated |
| `association_foreignkey` | Modern relationship syntax | ❌ Not recommended |
| `association_save_reference` | Explicit relationship management | ❌ Not recommended |

## Validation Examples

### ✅ Valid GORM Tag Usage
```go
type User struct {
    // Primary key with auto increment
    ID uint `gorm:"primaryKey;autoIncrement;comment:'User ID'"`
    
    // Unique username with custom column name
    Username string `gorm:"column:user_name;type:varchar(50);unique;not null"`
    
    // Email with unique index
    Email string `gorm:"type:varchar(100);uniqueIndex:idx_user_email"`
    
    // Timestamps
    CreatedAt time.Time `gorm:"autoCreateTime"`
    UpdatedAt time.Time `gorm:"autoUpdateTime"`
    
    // Soft delete (read-only when deleted)
    DeletedAt gorm.DeletedAt `gorm:"index"`
    
    // Decimal field with precision
    Balance decimal.Decimal `gorm:"type:decimal(15,2);default:0.00"`
    
    // JSON field with serializer
    Metadata JSON `gorm:"type:json;serializer:json"`
}
```

### ❌ Common Validation Errors
```go
type BadExample struct {
    // ERROR: Multiple primary keys
    ID1 uint `gorm:"primaryKey"`
    ID2 uint `gorm:"primaryKey"`
    
    // ERROR: Duplicate tag keys
    Name string `gorm:"size:50;size:100"`
    
    // ERROR: Duplicate column names
    Email1 string `gorm:"column:email"`
    Email2 string `gorm:"column:email"`
    
    // ERROR: Conflicting tags
    Status string `gorm:"primaryKey;unique"`
    
    // ERROR: Unknown tag
    Invalid string `gorm:"unknownTag"`
    
    // WARNING: Deprecated tag
    Legacy string `gorm:"primary_key"`
    
    // ERROR: Unclosed quotes in comment
    Bio string `gorm:"comment:'User's bio"`
}
```

## Extension Configuration

### VS Code Settings
```json
{
  // Maximum validation problems to show
  "gormLanguageServer.maxNumberOfProblems": 1000,
  
  // Server debug trace level
  "gormLanguageServer.trace.server": "off" // "off" | "messages" | "verbose"
}
```

### Validation Levels

| Level | Icon | Description | Examples |
|-------|------|-------------|----------|
| **Error** | ❌ | Blocks functionality | Unknown tags, syntax errors, conflicts |
| **Warning** | ⚠️ | Works but not recommended | Deprecated tags, complex relationships |
| **Info** | ℹ️ | Suggestions for improvement | Style recommendations |

## Advanced Usage

### Composite Indexes
```go
type User struct {
    FirstName string `gorm:"index:idx_name,priority:1"`
    LastName  string `gorm:"index:idx_name,priority:2"`
    // Creates composite index on (FirstName, LastName)
}
```

### Conditional Indexes
```go
type User struct {
    Email  string `gorm:"uniqueIndex:idx_active_email,where:active = true"`
    Active bool   `gorm:"default:true"`
    // Unique index only for active users
}
```

### Custom Types with Serialization
```go
type User struct {
    Tags []string `gorm:"type:json;serializer:json"`
    // Stores string array as JSON in database
}
```

## Database-Specific Notes

### PostgreSQL
- Supports advanced index options (`class`, `where`, `option`)
- Full-text search indexes: `class:gin`
- Partial indexes: `where:condition`

### MySQL
- Index length limits: `length:255`
- Full-text indexes: `class:fulltext`

### SQLite
- Limited constraint support
- Simple index options only

## Resources

- **[GORM Official Documentation](https://gorm.io/docs/)**
- **[GORM Tags Guide](https://gorm.io/docs/models.html#Tags)**
- **[Database Migration](https://gorm.io/docs/migration.html)**
- **[Performance Tips](https://gorm.io/docs/performance.html)**

---

**Need help?** 
- Check validation messages in VS Code Problems panel
- Hover over highlighted tags for detailed explanations
- Refer to GORM official docs for advanced usage
|-----|---------|-------------|
| `autoCreateTime` | `autoCreateTime` | Auto set on create |
| `autoUpdateTime` | `autoUpdateTime` | Auto update on save |

## Serialization

| Tag | Example | Description |
|-----|---------|-------------|
| `serializer` | `serializer:json` | Data serialization |
| `json` | `json:name` | JSON field name |
| `gob` | `gob:name` | GOB encoding |

## Permissions

| Tag | Example | Description |
|-----|---------|-------------|
| `<-:create` | `<-:create` | Allow create |
| `<-:update` | `<-:update` | Allow update |
| `<-:false` | `<-:false` | Read-only |
| `->` | `->` | Read-only |
| `->:false` | `->:false` | Write-only |
| `-` | `-` | Ignore field |

## Embedded

| Tag | Example | Description |
|-----|---------|-------------|
| `embedded` | `embedded` | Embed struct |
| `embeddedPrefix` | `embeddedPrefix:user_` | Prefix for embedded fields |

## Validation Rules

- No duplicate tags
- Proper quote matching
- Valid tag combinations
- Required relationship pairs (foreignKey + references)

## Field Tags

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `column` | `column:name` | Specify column name | `gorm:"column:user_name"` | ✅ Recommended |
| `type` | `type:datatype` | Specify data type | `gorm:"type:varchar(100)"` | ✅ Recommended |
| `size` | `size:length` | Specify field length | `gorm:"size:256"` | ✅ Recommended |
| `primaryKey` | `primaryKey` | Set as primary key | `gorm:"primaryKey"` | ✅ Recommended |
| `unique` | `unique` | Unique constraint | `gorm:"unique"` | ✅ Recommended |
| `default` | `default:value` | Default value | `gorm:"default:true"` | ✅ Recommended |
| `precision` | `precision:digits` | Numeric precision | `gorm:"precision:10"` | ✅ Recommended |
| `scale` | `scale:digits` | Decimal places | `gorm:"scale:2"` | ✅ Recommended |
| `not null` | `not null` | NOT NULL constraint | `gorm:"not null"` | ✅ Recommended |
| `autoIncrement` | `autoIncrement` | Auto increment | `gorm:"autoIncrement"` | ✅ Recommended |
| `autoIncrementIncrement` | `autoIncrementIncrement:step` | Auto increment step | `gorm:"autoIncrementIncrement:10"` | ✅ Recommended |
| `comment` | `comment:text` | Field comment | `gorm:"comment:User name"` | ✅ Recommended |

### Embedded Tags

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `embedded` | `embedded` | Embed struct | `gorm:"embedded"` | ✅ Recommended |
| `embeddedPrefix` | `embeddedPrefix:prefix` | Embedded field prefix | `gorm:"embeddedPrefix:user_"` | ✅ Recommended |

---

## 🔍 Index Tags

### Basic Indexes

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `index` | `index` | Create regular index | `gorm:"index"` | ✅ Recommended |
| `index` | `index:name` | Specify index name | `gorm:"index:idx_name"` | ✅ Recommended |
| `uniqueIndex` | `uniqueIndex` | Create unique index | `gorm:"uniqueIndex"` | ✅ Recommended |
| `uniqueIndex` | `uniqueIndex:name` | Specify unique index name | `gorm:"uniqueIndex:idx_email"` | ✅ Recommended |

### Advanced Index Options

| Option | Syntax | Description | Example |
|--------|--------|-------------|---------|
| `sort` | `sort:desc` | Sort order | `gorm:"index:,sort:desc"` |
| `length` | `length:10` | Index length | `gorm:"index:,length:10"` |
| `class` | `class:FULLTEXT` | Index type | `gorm:"index:,class:FULLTEXT"` |
| `type` | `type:btree` | Index method | `gorm:"index:,type:btree"` |
| `where` | `where:condition` | Conditional index | `gorm:"index:,where:age > 18"` |
| `comment` | `comment:text` | Index comment | `gorm:"index:,comment:User index"` |
| `option` | `option:params` | Database-specific options | `gorm:"index:,option:CONCURRENTLY"` |
| `priority` | `priority:1` | Composite index field order | `gorm:"index:idx_name,priority:1"` |
| `composite` | `composite:name` | Shared composite index | `gorm:"index:,composite:myname"` |

### Complete Index Examples

```go
type User struct {
    // Simple indexes
    Name     string `gorm:"index"`
    Email    string `gorm:"uniqueIndex"`
    
    // Composite indexes
    FirstName string `gorm:"index:idx_name"`
    LastName  string `gorm:"index:idx_name"`
    
    // Advanced indexes
    Content   string `gorm:"index:,class:FULLTEXT,comment:Full-text search"`
    Age       int    `gorm:"index:,where:age > 0,sort:desc"`
    
    // Multiple indexes
    Code      string `gorm:"index:idx_code;uniqueIndex:idx_unique_code"`
}
```

---

## 🔒 Constraint Tags

### CHECK Constraints

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `check` | `check:condition` | Check constraint | `gorm:"check:age > 0"` | ✅ Recommended |
| `check` | `check:name,condition` | Named check constraint | `gorm:"check:age_check,age > 0"` | ✅ Recommended |

### Foreign Key Constraints

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `constraint` | `constraint:OnUpdate:CASCADE,OnDelete:SET NULL` | Foreign key constraint | `gorm:"constraint:OnUpdate:CASCADE"` | ✅ Recommended |

---

## 🛡️ Permission Control Tags

### Read/Write Permissions

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `<-` | `<-:create` | Write only on create | `gorm:"<-:create"` | ✅ Recommended |
| `<-` | `<-:update` | Write only on update | `gorm:"<-:update"` | ✅ Recommended |
| `<-` | `<-` | Allow read/write | `gorm:"<-"` | ✅ Recommended |
| `<-` | `<-:false` | Disable write | `gorm:"<-:false"` | ✅ Recommended |
| `->` | `->` | Read-only field | `gorm:"->"` | ✅ Recommended |
| `->` | `->:false` | Disable read | `gorm:"->:false"` | ✅ Recommended |
| `-` | `-` | Ignore field | `gorm:"-"` | ✅ Recommended |
| `-` | `-:all` | Completely ignore | `gorm:"-:all"` | ✅ Recommended |
| `-` | `-:migration` | Ignore during migration | `gorm:"-:migration"` | ✅ Recommended |

---

## ⏰ Time Tracking Tags

### Auto Timestamps

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `autoCreateTime` | `autoCreateTime` | Auto set time on create | `gorm:"autoCreateTime"` | ✅ Recommended |
| `autoCreateTime` | `autoCreateTime:nano` | Unix nanosecond timestamp | `gorm:"autoCreateTime:nano"` | ✅ Recommended |
| `autoCreateTime` | `autoCreateTime:milli` | Unix millisecond timestamp | `gorm:"autoCreateTime:milli"` | ✅ Recommended |
| `autoUpdateTime` | `autoUpdateTime` | Auto update time on save | `gorm:"autoUpdateTime"` | ✅ Recommended |
| `autoUpdateTime` | `autoUpdateTime:nano` | Unix nanosecond timestamp | `gorm:"autoUpdateTime:nano"` | ✅ Recommended |
| `autoUpdateTime` | `autoUpdateTime:milli` | Unix millisecond timestamp | `gorm:"autoUpdateTime:milli"` | ✅ Recommended |

### Time Field Examples

```go
type User struct {
    CreatedAt time.Time // Auto recognized
    UpdatedAt time.Time // Auto recognized
    
    // Custom time fields
    CreatedUnix int64 `gorm:"autoCreateTime"`
    UpdatedNano int64 `gorm:"autoUpdateTime:nano"`
}
```

---

## 📦 Serialization Tags

### Serializers

| Tag | Syntax | Description | Example | Level |
|-----|--------|-------------|---------|-------|
| `serializer` | `serializer:json` | JSON serialization | `gorm:"serializer:json"` | ✅ Recommended |
| `serializer` | `serializer:gob` | GOB serialization | `gorm:"serializer:gob"` | ✅ Recommended |
| `serializer` | `serializer:unixtime` | Unix time serialization | `gorm:"serializer:unixtime"` | ✅ Recommended |

---

## 🔗 Association Tags

### Foreign Key Associations

| Tag | Syntax | Description | Level |
|-----|--------|-------------|-------|
| `foreignKey` | `foreignKey:field` | Specify foreign key field | ⚠️ Not Recommended |
| `references` | `references:field` | Specify reference field | ⚠️ Not Recommended |
| `many2many` | `many2many:table` | Many-to-many join table | ⚠️ Not Recommended |
| `joinForeignKey` | `joinForeignKey:field` | Join table foreign key | ⚠️ Not Recommended |
| `joinReferences` | `joinReferences:field` | Join table reference | ⚠️ Not Recommended |
| `constraint` | `constraint:OnUpdate:CASCADE` | Association constraint | ✅ Recommended |

> **Note**: Some association tags are not recommended in newer versions, suggest using struct-based association definitions.

---

## 🚨 Error Level Classification

### 🔴 Error (Usage Error, Must Fix)

1. **Completely unknown tags**
   ```go
   ID string `gorm:"unknownTag"` // ❌ Error
   ```

2. **Duplicate tag keys**
   ```go
   Name string `gorm:"unique;unique"` // ❌ Error
   ```

3. **Tag conflicts**
   ```go
   ID string `gorm:"primaryKey;unique"` // ❌ Error: Primary key and unique key conflict
   ```

4. **Format errors**
   ```go
   Size int `gorm:"size:abc"` // ❌ Error: size must be numeric
   ```

5. **Missing required values**
   ```go
   Data string `gorm:"type:"` // ❌ Error: type tag requires value
   ```

6. **Multiple primary keys**
   ```go
   ID1 int `gorm:"primaryKey"`
   ID2 int `gorm:"primaryKey"` // ❌ Error: Only one primary key allowed
   ```

### 🟡 Warning (Recognizable but Not Recommended)

1. **Deprecated association tags**
   ```go
   UserID int  `gorm:"foreignKey"` // ⚠️ Warning: Recommend using association structs
   User   User `gorm:"references:ID"` // ⚠️ Warning
   ```

2. **Inconsistent quote styles**
   ```go
   Status string `gorm:"default:'active\""` // ⚠️ Warning: Mixed quotes
   ```

3. **Not recommended patterns**
   ```go
   Name string `gorm:"many2many:user_roles"` // ⚠️ Warning: Using association structs is better
   ```

---

## 📝 Best Practice Examples

### Complete User Model

```go
type User struct {
    // Primary key - Auto increment ID
    ID uint `gorm:"primaryKey;autoIncrement;comment:User ID"`
    
    // Basic information
    Username string    `gorm:"column:username;type:varchar(50);unique;not null;comment:Username"`
    Email    string    `gorm:"type:varchar(100);uniqueIndex:idx_email;comment:Email"`
    Password string    `gorm:"type:varchar(255);not null;comment:Password"`
    Phone    *string   `gorm:"type:varchar(20);index;comment:Phone number"`
    
    // Status fields
    Status   int8      `gorm:"default:1;check:status IN (0,1,2);comment:Status:0-Disabled,1-Normal,2-Pending"`
    IsAdmin  bool      `gorm:"default:false;comment:Is admin"`
    
    // JSON serialization fields
    Settings  JSONMap  `gorm:"serializer:json;comment:User settings"`
    
    // Time fields
    CreatedAt time.Time `gorm:"autoCreateTime;comment:Created time"`
    UpdatedAt time.Time `gorm:"autoUpdateTime;comment:Updated time"`
    LoginAt   *time.Time `gorm:"comment:Last login time"`
    
    // Soft delete
    DeletedAt gorm.DeletedAt `gorm:"index;comment:Deleted time"`
    
    // Permission control fields
    InternalID string `gorm:"<-:create;comment:Internal ID"` // Write only on create
    ViewCount  int    `gorm:"->;comment:View count"`      // Read-only field
    
    // Ignored fields
    TempField string `gorm:"-"` // Completely ignored
}

// Composite indexes
func (User) TableName() string {
    return "users"
}
```

### Composite Index Examples

```go
type Product struct {
    ID          uint      `gorm:"primaryKey"`
    CategoryID  uint      `gorm:"index:idx_category_status,priority:1"`
    Status      int8      `gorm:"index:idx_category_status,priority:2"`
    Name        string    `gorm:"index:idx_name_brand,priority:1"`
    Brand       string    `gorm:"index:idx_name_brand,priority:2"`
    Price       decimal.Decimal `gorm:"precision:10;scale:2"`
    CreatedAt   time.Time
}
```

---

## 📚 Reference Links

- [GORM Official Documentation - Models](https://gorm.io/docs/models.html)
- [GORM Official Documentation - Indexes](https://gorm.io/docs/indexes.html)
- [GORM Official Documentation - Constraints](https://gorm.io/docs/constraints.html)
- [GORM Official Documentation - Associations](https://gorm.io/docs/associations.html)

---

## 📋 Quick Checklist

Use this checklist to verify your GORM tags:

- [ ] Tag syntax is correct (semicolon separated, colon assignment)
- [ ] No unknown tags used
- [ ] No duplicate tag keys
- [ ] Numeric tags like `size` use correct format
- [ ] Only one primary key
- [ ] Foreign key constraints use `constraint` instead of deprecated tags
- [ ] Time fields use appropriate auto-tracking tags
- [ ] Permission control tags used appropriately
- [ ] Composite index priorities set reasonably

---

*Last updated: 2025-01-27*
*Version: v1.0.0*
