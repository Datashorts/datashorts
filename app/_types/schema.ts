// File: app/_types/schema.ts

export interface Column {
  column_name: string
  data_type: string
  is_nullable?: string
  column_default?: string
  character_maximum_length?: number
  is_primary_key?: boolean
  is_foreign_key?: boolean
  foreign_table?: string
  foreign_column?: string
}

export interface TableSchema {
  tableName: string
  columns: Column[]
  columnCount: number
  relationships?: {
    type: 'one-to-many' | 'many-to-one' | 'many-to-many'
    targetTable: string
    foreignKey: string
  }[]
}

export interface SchemaData {
  connectionId: number
  connectionName: string
  dbType: string
  tableSchema: TableSchema[]
  lastUpdated: Date | string
  stats: {
    totalTables: number
    totalColumns: number
    totalPrimaryKeys: number
    totalForeignKeys: number
    totalRelationships: number
  }
}

export interface SchemaResponse {
  success: boolean
  data?: SchemaData
  error?: string
}

export interface ConnectionData {
  id: number
  connectionName: string
  dbType: string
  updatedAt: Date | string | null
  tableCount: number
  hasSchema: boolean
  host?: string
}

export interface ConnectionsResponse {
  success: boolean
  data?: ConnectionData[]
  error?: string
}