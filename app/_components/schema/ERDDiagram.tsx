import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Database, 
  ZoomIn, 
  ZoomOut, 
  Move,
  MousePointer,
  Maximize,
  KeyRound,
  Lock,
  RotateCcw,
  Grid3x3,
  Settings,
  Expand,
  Minimize
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Types matching your data structure
interface Column {
  column_name: string;
  data_type: string;
  is_nullable?: string;
  column_default?: string;
  character_maximum_length?: number;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  foreign_table?: string;
  foreign_column?: string;
}

interface TableSchema {
  tableName: string;
  columns: Column[];
  columnCount: number;
  relationships?: {
    type: 'one-to-many' | 'many-to-one' | 'many-to-many'
    targetTable: string;
    foreignKey: string;
  }[];
}

interface TablePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Relationship {
  fromTable: string;
  toTable: string;
  fromColumn: string;
  toColumn: string;
  type: 'one-to-many' | 'many-to-one' | 'many-to-many';
}

interface ERDDiagramProps {
  connectionId: number;
  schemaData?: TableSchema[];
  onTableSelect?: (tableName: string | null) => void;
  onExport?: (format: 'json' | 'sql' | 'png') => void;
}

export default function ERDDiagram({
  connectionId,
  schemaData = [],
  onTableSelect,
  onExport
}: ERDDiagramProps) {
  const [tablePositions, setTablePositions] = useState<Map<string, TablePosition>>(new Map());
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [draggedTable, setDraggedTable] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 100, y: 100 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [interactionMode, setInteractionMode] = useState<'select' | 'pan'>('select');
  const [isLocked, setIsLocked] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const diagramRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  // Initialize layout when schema data changes
  useEffect(() => {
    if (schemaData.length > 0) {
      generateInitialLayout(schemaData);
      generateRelationships(schemaData);
    }
  }, [schemaData]);

  const generateInitialLayout = (tables: TableSchema[]) => {
    const positions = new Map<string, TablePosition>();
    const tableWidth = 320;
    const baseHeight = 80;
    const columnHeight = 32;
    const padding = 150;
    
    const totalTables = tables.length;
    const cols = Math.ceil(Math.sqrt(totalTables * 1.2));
    
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const tableHeight = baseHeight + (table.columns.length * columnHeight);
      
      positions.set(table.tableName, {
        x: col * (tableWidth + padding) + 150,
        y: row * (tableHeight + padding) + 150,
        width: tableWidth,
        height: tableHeight
      });
    });
    
    setTablePositions(positions);
  };

  const generateRelationships = (tables: TableSchema[]) => {
    const rels: Relationship[] = [];
    const tableMap = new Map<string, TableSchema>();
    
    tables.forEach(table => {
      tableMap.set(table.tableName, table);
    });
    
    tables.forEach(table => {
      table.columns.forEach(column => {
        if (column.is_foreign_key && column.foreign_table) {
          const targetTable = tableMap.get(column.foreign_table);
          
          if (targetTable) {
            let relationType: 'one-to-many' | 'many-to-one' | 'many-to-many' = 'many-to-one';
            const hasMutualReference = targetTable.columns.some(
              targetCol => targetCol.is_foreign_key && 
              targetCol.foreign_table === table.tableName
            );
            
            if (hasMutualReference) {
              relationType = 'many-to-many';
            }
            
            rels.push({
              fromTable: table.tableName,
              toTable: column.foreign_table,
              fromColumn: column.column_name,
              toColumn: column.foreign_column || 'id',
              type: relationType
            });
          }
        }
      });
    });
    
    setRelationships(rels);
  };

  const handleTableMouseDown = useCallback((tableName: string, event: React.MouseEvent) => {
    if (isLocked || interactionMode !== 'select') return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = diagramRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const tablePos = tablePositions.get(tableName);
    if (tablePos) {
      setDraggedTable(tableName);
      const clientX = (event.clientX - rect.left - panOffset.x) / zoomLevel;
      const clientY = (event.clientY - rect.top - panOffset.y) / zoomLevel;
      setDragOffset({
        x: clientX - tablePos.x,
        y: clientY - tablePos.y
      });
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    }
  }, [isLocked, interactionMode, tablePositions, panOffset, zoomLevel]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (isLocked) return;
    
    event.preventDefault();
    
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    
    rafRef.current = requestAnimationFrame(() => {
      const rect = diagramRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      if (draggedTable && interactionMode === 'select') {
        const clientX = (event.clientX - rect.left - panOffset.x) / zoomLevel;
        const clientY = (event.clientY - rect.top - panOffset.y) / zoomLevel;
        
        const snapTo = (val: number) => Math.round(val / 20) * 20;
        const newX = snapTo(clientX - dragOffset.x);
        const newY = snapTo(clientY - dragOffset.y);
        
        setTablePositions(prev => {
          const newPositions = new Map(prev);
          const currentPos = newPositions.get(draggedTable);
          if (currentPos) {
            newPositions.set(draggedTable, {
              ...currentPos,
              x: Math.max(0, newX),
              y: Math.max(0, newY)
            });
          }
          return newPositions;
        });
      } else if (isPanning && interactionMode === 'pan') {
        const deltaX = event.clientX - lastMousePosition.current.x;
        const deltaY = event.clientY - lastMousePosition.current.y;
        
        setPanOffset(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY
        }));
      }
      
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    });
  }, [draggedTable, isPanning, interactionMode, dragOffset, panOffset, zoomLevel, isLocked]);

  const handleMouseUp = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDraggedTable(null);
    setIsPanning(false);
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove, handleMouseUp]);

  const getConnectionPoints = (fromTable: string, toTable: string, fromColumn: string) => {
    const fromPos = tablePositions.get(fromTable);
    const toPos = tablePositions.get(toTable);
    
    if (!fromPos || !toPos) return null;
    
    const fromIndex = schemaData.find(t => t.tableName === fromTable)?.columns.findIndex(c => c.column_name === fromColumn) || 0;
    const toIndex = schemaData.find(t => t.tableName === toTable)?.columns.findIndex(c => c.column_name === 'id') || 0;
    
    const headerHeight = 50;
    const columnHeight = 32;
    
    let initialFromY = fromPos.y + headerHeight + (fromIndex + 0.5) * columnHeight;
    let initialToY = toPos.y + headerHeight + (toIndex + 0.5) * columnHeight;
    
    const fromCenterX = fromPos.x + fromPos.width / 2;
    const fromCenterY = fromPos.y + fromPos.height / 2;
    const toCenterX = toPos.x + toPos.width / 2;
    const toCenterY = toPos.y + toPos.height / 2;
    
    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    
    let fromX, fromY, toX, toY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        fromY = initialFromY;
        toY = initialToY;
        fromX = dx > 0 ? fromPos.x + fromPos.width : fromPos.x;
        toX = dx > 0 ? toPos.x : toPos.x + toPos.width;
    } else {
        fromX = fromCenterX;
        toX = toCenterX;
        fromY = dy > 0 ? fromPos.y + fromPos.height : fromPos.y;
        toY = dy > 0 ? toPos.y : toPos.y + toPos.height;
    }
    
    return { fromX, fromY, toX, toY };
  };

  const renderRelationshipLine = (relationship: Relationship, index: number) => {
    const points = getConnectionPoints(relationship.fromTable, relationship.toTable, relationship.fromColumn);
    if (!points) return null;
    
    const { fromX, fromY, toX, toY } = points;
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    
    const pathD = Math.abs(fromX - toX) > Math.abs(fromY - toY)
      ? `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
      : `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
    
    return (
      <g key={`rel-${index}`} className="relationship">
        <path
          d={pathD}
          stroke="url(#connectionGradient)"
          strokeWidth="2"
          fill="none"
          className="relationship-line drop-shadow-sm"
        />
        <circle
          cx={fromX}
          cy={fromY}
          r="4"
          fill="#3b82f6"
          className="connection-point drop-shadow-sm"
        />
        <circle
          cx={toX}
          cy={toY}
          r="4"
          fill="#8b5cf6"
          className="connection-point drop-shadow-sm"
        />
        <g transform={`translate(${midX}, ${midY})`}>
          <rect 
            x="-30" 
            y="-12" 
            width="60" 
            height="24" 
            rx="12" 
            fill="rgba(0, 0, 0, 0.8)" 
            stroke="rgba(59, 130, 246, 0.3)" 
            className="backdrop-blur-sm"
          />
          <text 
            x="0" 
            y="4" 
            fontSize="10" 
            fontFamily="Inter, sans-serif" 
            textAnchor="middle" 
            fill="#e5e7eb"
            className="font-medium"
          >
            {relationship.type.replace('-', ' ')}
          </text>
        </g>
      </g>
    );
  };

  const getTableHeaderColor = (tableName: string) => {
    const colors = [
      'from-blue-600 to-blue-700',
      'from-purple-600 to-purple-700', 
      'from-teal-600 to-teal-700',
      'from-indigo-600 to-indigo-700',
      'from-cyan-600 to-cyan-700',
      'from-violet-600 to-violet-700',
      'from-emerald-600 to-emerald-700',
      'from-sky-600 to-sky-700'
    ];
    const hash = tableName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const handleDiagramMouseDown = useCallback((event: React.MouseEvent) => {
    if (isLocked || interactionMode !== 'pan') return;
    
    event.preventDefault();
    event.stopPropagation();
    
    setIsPanning(true);
    lastMousePosition.current = { x: event.clientX, y: event.clientY };
  }, [isLocked, interactionMode]);

  const handleTableClick = useCallback((tableName: string, event: React.MouseEvent) => {
    if (interactionMode === 'select' && !draggedTable) {
      event.stopPropagation();
      const newSelection = selectedTable === tableName ? null : tableName;
      setSelectedTable(newSelection);
      if (onTableSelect) {
        onTableSelect(newSelection);
      }
    }
  }, [interactionMode, draggedTable, selectedTable, onTableSelect]);

  const autoLayout = () => {
    generateInitialLayout(schemaData);
  };

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 100, y: 100 });
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (isLocked) return;
    
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      const zoomSensitivity = 0.05;
      const delta = e.deltaY > 0 ? -zoomSensitivity : zoomSensitivity;
      const minZoom = 0.1;
      const maxZoom = 3;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
      
      if (newZoom !== zoomLevel) {
        const rect = diagramRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const newPanOffset = {
          x: mouseX - (mouseX - panOffset.x) * (newZoom / zoomLevel),
          y: mouseY - (mouseY - panOffset.y) * (newZoom / zoomLevel)
        };
        
        setZoomLevel(newZoom);
        setPanOffset(newPanOffset);
      }
    } else {
      const panSensitivity = 0.5;
      setPanOffset(prev => ({
        x: prev.x - e.deltaX * panSensitivity,
        y: prev.y - e.deltaY * panSensitivity
      }));
    }
  }, [isLocked, zoomLevel, panOffset]);

  if (schemaData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black border border-white/10 rounded-xl">
        <div className="text-center">
          <Database className="h-16 w-16 text-blue-400 mx-auto mb-6" />
          <h3 className="text-2xl font-semibold text-white mb-3">No Schema Data</h3>
          <p className="text-gray-400 text-lg">Load a database connection to view its schema diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-[9999] bg-black' : 'bg-gradient-to-br from-black via-gray-900 to-black rounded-xl border border-white/10 overflow-hidden'}`}>
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="bg-white/5 rounded-lg p-1 flex items-center border border-white/10">
            <Button
              variant={interactionMode === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInteractionMode('select')}
              className={interactionMode === 'select' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-9 px-3 text-white shadow-lg' 
                : 'hover:bg-white/10 h-9 px-3 text-gray-300'}
              disabled={isLocked}
            >
              <MousePointer className="h-4 w-4 mr-1" />
              Select
            </Button>
            <Button
              variant={interactionMode === 'pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInteractionMode('pan')}
              className={interactionMode === 'pan' 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-9 px-3 text-white shadow-lg' 
                : 'hover:bg-white/10 h-9 px-3 text-gray-300'}
              disabled={isLocked}
            >
              <Move className="h-4 w-4 mr-1" />
              Pan
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2 border border-white/10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
              className="hover:bg-white/10 h-8 w-8 p-0 text-gray-300"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <div className="relative w-32 mx-2">
              <input 
                type="range" 
                min="10" 
                max="300" 
                step="10"
                value={zoomLevel * 100} 
                onChange={(e) => setZoomLevel(parseInt(e.target.value) / 100)}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <span className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 font-medium">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.1))}
              className="hover:bg-white/10 h-8 w-8 p-0 text-gray-300"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={autoLayout}
              className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 h-9"
              disabled={isLocked}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Auto Layout
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetView}
              className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 h-9"
            >
              <Maximize className="h-4 w-4 mr-2" />
              Reset View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className={`border-white/20 h-9 ${showGrid ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-300'} hover:bg-white/10`}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-white/20 text-gray-300 bg-white/5">
              {schemaData.length} tables
            </Badge>
            <Badge variant="outline" className="border-white/20 text-gray-300 bg-white/5">
              {relationships.length} relationships
            </Badge>
            {selectedTable && (
              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {selectedTable}
              </Badge>
            )}
          </div>
          
          <Button
            variant={isLocked ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsLocked(!isLocked)}
            className={isLocked 
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 h-9 text-white' 
              : 'bg-white/5 border-white/20 hover:bg-white/10 text-gray-300 h-9'}
          >
            <Lock className="h-4 w-4 mr-2" />
            {isLocked ? 'Unlock' : 'Lock'}
          </Button>
        </div>
      </div>

      {/* Diagram Canvas */}
      <div 
        ref={diagramRef}
        className={`flex-1 relative overflow-hidden ${
          interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        } ${isLocked ? 'cursor-not-allowed' : ''}`}
        onMouseDown={handleDiagramMouseDown}
        onWheel={handleWheel}
        style={{
          backgroundImage: showGrid ? `
            radial-gradient(circle at 1px 1px, rgba(59, 130, 246, 0.2) 1px, transparent 0),
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)
          ` : 'none',
          backgroundSize: showGrid ? '40px 40px, 40px 40px, 40px 40px' : 'auto',
          height: "100%"
        }}
      >
        <div 
          className="diagram-container absolute"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
            width: '10000px',
            height: '10000px',
            transition: draggedTable || isPanning ? 'none' : 'transform 0.2s ease-out'
          }}
        >
          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            {relationships.map((rel, index) => renderRelationshipLine(rel, index))}
          </svg>

          {schemaData.map(table => {
            const position = tablePositions.get(table.tableName);
            if (!position) return null;

            const headerGradient = getTableHeaderColor(table.tableName);

            return (
              <div
                key={table.tableName}
                className={`absolute bg-black/60 backdrop-blur-md border rounded-xl shadow-2xl select-none transition-all duration-200 ${
                  selectedTable === table.tableName
                    ? 'border-blue-500 shadow-blue-500/25 ring-2 ring-blue-500/30 scale-105'
                    : 'border-white/20 hover:border-white/30 hover:shadow-xl'
                } ${draggedTable === table.tableName ? 'shadow-2xl z-50 opacity-95 scale-110' : ''}`}
                style={{
                  left: position.x,
                  top: position.y,
                  width: position.width,
                  minHeight: position.height,
                  zIndex: selectedTable === table.tableName || draggedTable === table.tableName ? 10 : 1,
                }}
                onMouseDown={(e) => handleTableMouseDown(table.tableName, e)}
                onClick={(e) => handleTableClick(table.tableName, e)}
              >
                <div className={`bg-gradient-to-r ${headerGradient} rounded-t-xl px-5 py-4 cursor-move border-b border-white/10`}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-base">{table.tableName}</h4>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                      {table.columnCount}
                    </Badge>
                  </div>
                </div>
                <div className="divide-y divide-white/10">
                  {table.columns.map((column, index) => (
                    <div
                      key={column.column_name}
                      className={`flex items-center justify-between px-5 py-3 text-sm hover:bg-white/5 transition-colors ${
                        column.is_primary_key ? 'bg-yellow-500/10 border-l-2 border-yellow-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {column.is_primary_key && (
                          <div className="flex-shrink-0 bg-yellow-500/20 p-1 rounded" title="Primary Key">
                            <KeyRound className="w-3 h-3 text-yellow-400" />
                          </div>
                        )}
                        {column.is_foreign_key && !column.is_primary_key && (
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex-shrink-0" 
                               title={`Foreign Key to ${column.foreign_table}`} />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-white truncate font-semibold block">
                            {column.column_name}
                          </span>
                          {column.is_foreign_key && (
                            <span className="text-xs text-blue-400 truncate block">
                              → {column.foreign_table}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-400 text-right ml-3 flex-shrink-0">
                        <div className="text-xs bg-white/10 px-2 py-1 rounded font-mono">
                          {column.data_type}
                          {column.character_maximum_length && `(${column.character_maximum_length})`}
                          {column.is_nullable === 'NO' ? '' : '?'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enhanced Minimap */}
        <div className="absolute bottom-6 right-6 w-56 h-40 bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl overflow-hidden">
          <div className="w-full h-full relative bg-gradient-to-br from-gray-900/50 to-black/50">
            <div 
              className="absolute" 
              style={{
                transform: `scale(${0.04})`, 
                transformOrigin: 'top left'
              }}
            >
              {schemaData.map(table => {
                const position = tablePositions.get(table.tableName);
                if (!position) return null;
                
                const headerGradient = getTableHeaderColor(table.tableName);
                
                return (
                  <div
                    key={`mini-${table.tableName}`}
                    className={`absolute border border-white/40 rounded`}
                    style={{
                      left: position.x,
                      top: position.y,
                      width: position.width,
                      height: Math.min(position.height, 120),
                      background: headerGradient.includes('blue') ? 'rgba(59, 130, 246, 0.6)' :
                                 headerGradient.includes('purple') ? 'rgba(139, 92, 246, 0.6)' :
                                 headerGradient.includes('teal') ? 'rgba(45, 212, 191, 0.6)' :
                                 'rgba(99, 102, 241, 0.6)',
                      opacity: selectedTable === table.tableName ? 1 : 0.7
                    }}
                  />
                );
              })}
            </div>
            <div 
              className="absolute border-2 border-blue-400 bg-blue-400/20 pointer-events-none rounded"
              style={{
                left: `${Math.min(95, Math.max(0, (-panOffset.x / 120) * 5))}%`,
                top: `${Math.min(95, Math.max(0, (-panOffset.y / 120) * 5))}%`,
                width: `${Math.min(100, 100 / zoomLevel)}%`,
                height: `${Math.min(100, 100 / zoomLevel)}%`,
              }}
            />
          </div>
          <div className="absolute top-2 left-2 text-xs text-gray-400 font-medium">
            Minimap
          </div>
        </div>
      </div>

      {/* Enhanced Status Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <Database className="h-4 w-4" />
            <span className="font-medium">{schemaData.length} Tables</span>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            <span className="font-medium">{relationships.length} Relationships</span>
          </div>
          <div className="text-gray-400">
            Zoom: <span className="font-medium text-white">{Math.round(zoomLevel * 100)}%</span>
          </div>
          <div className="text-gray-400">
            Mode: <span className="font-medium text-white capitalize">{interactionMode}</span>
          </div>
          {isLocked && (
            <div className="flex items-center gap-2 text-amber-400">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Locked</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full border border-yellow-400"></div>
              <span className="text-gray-400">Primary Key</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span className="text-gray-400">Foreign Key</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="24" height="12" className="inline">
                <defs>
                  <linearGradient id="legendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <line x1="0" y1="6" x2="24" y2="6" stroke="url(#legendGradient)" strokeWidth="2" />
              </svg>
              <span className="text-gray-400">Relationship</span>
            </div>
          </div>

          <div className="text-gray-400 text-xs">
            {interactionMode === 'select' ? (
              <span>Click to select • Drag to move tables</span>
            ) : (
              <span>Drag to pan • Ctrl+Scroll to zoom</span>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          cursor: pointer;
          border: 2px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}