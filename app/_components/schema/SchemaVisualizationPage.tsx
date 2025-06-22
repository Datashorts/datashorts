'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Database, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Settings,
  Eye,
  List,
  FileJson,
  FileText,
  Image,
  Search
} from 'lucide-react'
import ERDDiagram from './ERDDiagram'

// Sample data to match the diagram in the screenshot
const sampleSchemaData = [
  {
    tableName: "songs",
    columnCount: 12,
    columns: [
      { column_name: "id", data_type: "varchar(36)", is_nullable: "NO", is_primary_key: true, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "album_id", data_type: "int", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: true, foreign_table: "albums", foreign_column: "id" },
      { column_name: "artist_id", data_type: "int?", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: true, foreign_table: "artists", foreign_column: "id" },
      { column_name: "title", data_type: "varchar", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "length", data_type: "float", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "track", data_type: "int?", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "disc", data_type: "int", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "lyrics", data_type: "text", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "path", data_type: "text", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "mtime", data_type: "int", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "created_at", data_type: "datetime", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "updated_at", data_type: "datetime", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined }
    ],
    relationships: [
      { type: "many-to-one" as const, targetTable: "albums", foreignKey: "album_id" },
      { type: "many-to-one" as const, targetTable: "artists", foreignKey: "artist_id" }
    ]
  },
  {
    tableName: "albums",
    columnCount: 6,
    columns: [
      { column_name: "id", data_type: "int", is_nullable: "NO", is_primary_key: true, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "artist_id", data_type: "int", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: true, foreign_table: "artists", foreign_column: "id" },
      { column_name: "name", data_type: "varchar", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "cover", data_type: "varchar", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "created_at", data_type: "datetime", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "updated_at", data_type: "datetime", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined }
    ],
    relationships: [
      { type: "many-to-one" as const, targetTable: "artists", foreignKey: "artist_id" },
      { type: "one-to-many" as const, targetTable: "songs", foreignKey: "album_id" }
    ]
  },
  {
    tableName: "artists",
    columnCount: 5,
    columns: [
      { column_name: "id", data_type: "int", is_nullable: "NO", is_primary_key: true, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "name", data_type: "varchar", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "image", data_type: "varchar?", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "created_at", data_type: "datetime", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "updated_at", data_type: "datetime", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined }
    ],
    relationships: [
      { type: "one-to-many" as const, targetTable: "albums", foreignKey: "artist_id" },
      { type: "one-to-many" as const, targetTable: "songs", foreignKey: "artist_id" }
    ]
  },
  {
    tableName: "interactions",
    columnCount: 7,
    columns: [
      { column_name: "id", data_type: "bigint", is_nullable: "NO", is_primary_key: true, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "user_id", data_type: "int", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "song_id", data_type: "varchar(36)", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: true, foreign_table: "songs", foreign_column: "id" },
      { column_name: "liked", data_type: "boolean", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "play_count", data_type: "int", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "created_at", data_type: "datetime", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "updated_at", data_type: "datetime", is_nullable: "NO", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined }
    ],
    relationships: [
      { type: "many-to-one" as const, targetTable: "songs", foreignKey: "song_id" }
    ]
  },
  {
    tableName: "settings",
    columnCount: 2,
    columns: [
      { column_name: "key", data_type: "varchar", is_nullable: "NO", is_primary_key: true, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined },
      { column_name: "value", data_type: "text", is_nullable: "YES", is_primary_key: undefined, is_foreign_key: undefined, foreign_table: undefined, foreign_column: undefined }
    ]
  }
];

export default function SchemaVisualizationPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('diagram');
  const [schemaData] = useState(sampleSchemaData);
  
  const filteredTables = schemaData.filter(table =>
    table.tableName.toLowerCase().includes(searchTerm.toLowerCase())
  );

interface Column {
    column_name: string;
    data_type: string;
    is_nullable: string;
    is_primary_key?: boolean;
    is_foreign_key?: boolean;
    foreign_table?: string;
    foreign_column?: string;
}

interface Relationship {
    type: string;
    targetTable: string;
    foreignKey: string;
}

interface TableSchema {
    tableName: string;
    columnCount: number;
    columns: Column[];
    relationships?: Relationship[];
}

const getDataTypeColor = (dataType: string): string => {
    if (dataType.includes('int') || dataType.includes('bigint')) return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    if (dataType.includes('varchar') || dataType.includes('text')) return 'bg-green-500/20 text-green-500 border-green-500/30';
    if (dataType.includes('datetime') || dataType.includes('date')) return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    if (dataType.includes('boolean')) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    if (dataType.includes('float') || dataType.includes('numeric') || dataType.includes('decimal')) 
        return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
};

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Music Database Schema</h3>
            <Badge variant="outline" className="border-gray-300 text-gray-600">
              {schemaData.length} tables
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tables..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:outline-none w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
          >
            <FileJson className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
          >
            <FileText className="h-4 w-4 mr-2" />
            Export SQL
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {}}
          >
            <Image className="h-4 w-4 mr-2" />
            Export PNG
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200">
          <TabsList>
            <TabsTrigger value="diagram">
              <Eye className="h-4 w-4 mr-2" />
              ERD Diagram
            </TabsTrigger>
            <TabsTrigger value="tables">
              <List className="h-4 w-4 mr-2" />
              Table List
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="diagram" className="flex-1 m-0">
          <ERDDiagram 
            connectionId={1} 
            schemaData={filteredTables}
            onTableSelect={setSelectedTable}
          />
        </TabsContent>

        <TabsContent value="tables" className="flex-1 m-0 p-6 overflow-y-auto">
          <div className="grid gap-4">
            {filteredTables.map(table => (
              <Card key={table.tableName} className="border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <Database className="h-5 w-5" />
                    {table.tableName}
                    <Badge variant="outline" className="ml-auto border-gray-300 text-gray-600">
                      {table.columnCount} columns
                    </Badge>
                    {selectedTable === table.tableName && (
                      <Badge variant="default" className="bg-blue-600 text-white">
                        Selected
                      </Badge>
                    )}
                  </CardTitle>
                  {table.relationships && table.relationships.length > 0 && (
                    <CardDescription>
                      {table.relationships.length} relationship{table.relationships.length !== 1 ? 's' : ''}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left p-2 text-gray-600">Column</th>
                          <th className="text-left p-2 text-gray-600">Type</th>
                          <th className="text-left p-2 text-gray-600">Nullable</th>
                          <th className="text-left p-2 text-gray-600">Constraints</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map(column => (
                          <tr key={column.column_name} className="border-b border-gray-100">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {column.is_primary_key && <div className="w-3 h-3 bg-yellow-400 rounded-full" title="Primary Key" />}
                                {column.is_foreign_key && !column.is_primary_key && <div className="w-3 h-3 bg-blue-400 rounded-full" title="Foreign Key" />}
                                <span className="font-mono text-gray-800">
                                  {column.column_name}
                                </span>
                              </div>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline" className={getDataTypeColor(column.data_type)}>
                                {column.data_type}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-600">
                              {column.is_nullable === 'NO' ? 'No' : 'Yes'}
                            </td>
                            <td className="p-2">
                              <div className="flex gap-1 flex-wrap">
                                {column.is_primary_key && (
                                  <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                                    PRIMARY KEY
                                  </Badge>
                                )}
                                {column.is_foreign_key && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                                    FK → {column.foreign_table}
                                  </Badge>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}