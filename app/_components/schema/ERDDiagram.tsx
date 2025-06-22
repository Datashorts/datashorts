import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Database, 
  ZoomIn, 
  ZoomOut, 
  Move,
  MousePointer,
  Maximize,
  KeyRound,
  Lock
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
    const tableWidth = 280;
    const baseHeight = 60;
    const columnHeight = 28;
    const padding = 100;
    
    const totalTables = tables.length;
    const cols = Math.ceil(Math.sqrt(totalTables * 1.5));
    
    tables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const tableHeight = baseHeight + (table.columns.length * columnHeight);
      
      positions.set(table.tableName, {
        x: col * (tableWidth + padding) + 100,
        y: row * (tableHeight + padding) + 100,
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
    
    tables.forEach(table => {
      if (table.relationships) {
        table.relationships.forEach(rel => {
          if (rel.type === 'one-to-many') {
            const targetTable = tableMap.get(rel.targetTable);
            if (targetTable) {
              const fkColumn = targetTable.columns.find(col => col.column_name === rel.foreignKey);
              if (fkColumn) {
                rels.push({
                  fromTable: table.tableName,
                  toTable: rel.targetTable,
                  fromColumn: fkColumn.foreign_column || 'id',
                  toColumn: rel.foreignKey,
                  type: 'one-to-many'
                });
              }
            }
          }
        });
      }
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
        
        const snapTo = (val: number) => Math.round(val / 10) * 10;
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
    
    const fromColumnObj = schemaData.find(t => t.tableName === fromTable)?.columns.find(c => c.column_name === fromColumn);
    const toColumnObj = schemaData.find(t => t.tableName === toTable)?.columns.find(c => c.column_name === 'id');
    
    if (!fromColumnObj) return null;
    
    // Use find instead of find23
    const fromIndex = schemaData.find(t => t.tableName === fromTable)?.columns.findIndex(c => c.column_name === fromColumn) || 0;
    const toIndex = schemaData.find(t => t.tableName === toTable)?.columns.findIndex(c => c.column_name === 'id') || 0;
    
    const headerHeight = 40;
    const columnHeight = 28;
    
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
    
    const isRightToLeft = fromX > toX;
    
    const getRelationshipMarkers = () => {
      const isHorizontal = Math.abs(fromX - toX) > Math.abs(fromY - toY);
      const markerX = isHorizontal ? midX : (fromX + toX) / 2;
      const markerY = isHorizontal ? (fromY + toY) / 2 : midY;
      
      if (relationship.type === 'many-to-one') {
        return (
          <>
            <g transform={`translate(${fromX + (isRightToLeft ? -20 : 20)}, ${fromY})`}>
              <path 
                d="M-6,-5 L0,0 L-6,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={isRightToLeft ? "scale(-1,1)" : ""}
              />
              <path 
                d="M-10,-5 L-4,0 L-10,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={isRightToLeft ? "scale(-1,1)" : ""}
              />
            </g>
            <g transform={`translate(${toX + (isRightToLeft ? 20 : -20)}, ${toY})`}>
              <line 
                x1="-5" 
                y1="-8" 
                x2="-5" 
                y2="8" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                transform={!isRightToLeft ? "scale(-1,1)" : ""}
              />
            </g>
          </>
        );
      } else if (relationship.type === 'one-to-many') {
        return (
          <>
            <g transform={`translate(${fromX + (isRightToLeft ? -20 : 20)}, ${fromY})`}>
              <line 
                x1="-5" 
                y1="-8" 
                x2="-5" 
                y2="8" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                transform={isRightToLeft ? "scale(-1,1)" : ""}
              />
            </g>
            <g transform={`translate(${toX + (isRightToLeft ? 20 : -20)}, ${toY})`}>
              <path 
                d="M-6,-5 L0,0 L-6,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={!isRightToLeft ? "scale(-1,1)" : ""}
              />
              <path 
                d="M-10,-5 L-4,0 L-10,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={!isRightToLeft ? "scale(-1,1)" : ""}
              />
            </g>
          </>
        );
      } else if (relationship.type === 'many-to-many') {
        return (
          <>
            <g transform={`translate(${fromX + (isRightToLeft ? -20 : 20)}, ${fromY})`}>
              <path 
                d="M-6,-5 L0,0 L-6,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={isRightToLeft ? "scale(-1,1)" : ""}
              />
              <path 
                d="M-10,-5 L-4,0 L-10,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={isRightToLeft ? "scale(-1,1)" : ""}
              />
            </g>
            <g transform={`translate(${toX + (isRightToLeft ? 20 : -20)}, ${toY})`}>
              <path 
                d="M-6,-5 L0,0 L-6,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={!isRightToLeft ? "scale(-1,1)" : ""}
              />
              <path 
                d="M-10,-5 L-4,0 L-10,5" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                fill="none"
                transform={!isRightToLeft ? "scale(-1,1)" : ""}
              />
            </g>
          </>
        );
      }
      
      return null;
    };
    
    return (
      <g key={`rel-${index}`} className="relationship">
        <path
          d={pathD}
          stroke="#6b7280"
          strokeWidth="1.5"
          fill="none"
          className="relationship-line"
        />
        <circle
          cx={fromX}
          cy={fromY}
          r="3"
          fill="#3b82f6"
          className="connection-point"
        />
        <circle
          cx={toX}
          cy={toY}
          r="3"
          fill="#3b82f6"
          className="connection-point"
        />
        {getRelationshipMarkers()}
        <g transform={`translate(${midX}, ${midY})`}>
          <rect 
            x="-25" 
            y="-10" 
            width="50" 
            height="20" 
            rx="4" 
            fill="white" 
            stroke="#e5e7eb" 
          />
          <text 
            x="0" 
            y="4" 
            fontSize="8" 
            fontFamily="sans-serif" 
            textAnchor="middle" 
            fill="#6b7280"
          >
            {relationship.type.replace('-', ' ')}
          </text>
        </g>
      </g>
    );
  };

  const getTableHeaderColor = (tableName: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500', 
      'bg-purple-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-cyan-500',
      'bg-pink-500',
      'bg-indigo-500'
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
      const maxZoom = 5;
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

  const toggleInteractionMode = () => {
    setInteractionMode(prev => prev === 'select' ? 'pan' : 'select');
    setIsPanning(false);
    setDraggedTable(null);
  };

  const toggleLock = () => {
    setIsLocked(prev => !prev);
    setIsPanning(false);
    setDraggedTable(null);
  };

  const exportAsPng = () => {
    if (!diagramRef.current || !svgRef.current) return;
    if (onExport) {
      onExport('png');
    }
  };

  if (schemaData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Schema Data</h3>
          <p className="text-gray-500">Load a database connection to view its schema diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex items-center justify-between p-2 bg-white border-b border-gray-200 gap-2">
        <div className="flex items-center gap-1">
          <div className="bg-gray-100 rounded-md p-0.5 flex items-center mr-2">
            <Button
              variant={interactionMode === 'select' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInteractionMode('select')}
              className={interactionMode === 'select' 
                ? 'bg-blue-600 hover:bg-blue-700 h-8 px-2 rounded-sm shadow-sm' 
                : 'hover:bg-gray-200 h-8 px-2 rounded-sm'}
              disabled={isLocked}
              title="Select Mode"
            >
              <MousePointer className="h-4 w-4" />
            </Button>
            <Button
              variant={interactionMode === 'pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setInteractionMode('pan')}
              className={interactionMode === 'pan' 
                ? 'bg-blue-600 hover:bg-blue-700 h-8 px-2 rounded-sm shadow-sm' 
                : 'hover:bg-gray-200 h-8 px-2 rounded-sm'}
              disabled={isLocked}
              title="Pan Mode"
            >
              <Move className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-gray-100 rounded-md p-1 flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
              className="hover:bg-gray-200 h-6 w-6 p-0 rounded-sm"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <div className="relative w-28 mx-1">
              <input 
                type="range" 
                min="10" 
                max="500" 
                step="5"
                value={zoomLevel * 100} 
                onChange={(e) => setZoomLevel(parseInt(e.target.value) / 100)}
                className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
              <span className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.min(5, zoomLevel + 0.1))}
              className="hover:bg-gray-200 h-6 w-6 p-0 rounded-sm"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="h-6 mx-2 w-px bg-gray-300" />
          <Button
            variant="outline"
            size="sm"
            onClick={autoLayout}
            className="hover:bg-gray-100 h-8 text-xs"
            disabled={isLocked}
            title="Auto-arrange tables"
          >
            <Move className="h-3.5 w-3.5 mr-1" />
            Auto Layout
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            className="hover:bg-gray-100 h-8 text-xs"
            title="Reset zoom and position"
          >
            <Maximize className="h-3.5 w-3.5 mr-1" />
            Reset View
          </Button>
          <Button
            variant={isLocked ? 'default' : 'outline'}
            size="sm"
            onClick={toggleLock}
            className={isLocked 
              ? 'bg-amber-600 hover:bg-amber-700 h-8 text-xs' 
              : 'hover:bg-gray-100 h-8 text-xs'}
            title={isLocked ? "Unlock diagram" : "Lock diagram to prevent changes"}
          >
            <Lock className="h-3.5 w-3.5 mr-1" />
            {isLocked ? 'Unlock' : 'Lock View'}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            {schemaData.length} tables
          </Badge>
          <Badge variant="outline" className="border-gray-300 text-gray-600">
            {relationships.length} relationships
          </Badge>
          {selectedTable && (
            <Badge variant="default" className="bg-blue-600">
              {selectedTable}
            </Badge>
          )}
        </div>
      </div>
      <div 
        ref={diagramRef}
        className={`flex-1 relative overflow-hidden touch-none ${
          interactionMode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        } ${isLocked ? 'cursor-not-allowed' : ''}`}
        onMouseDown={handleDiagramMouseDown}
        onWheel={handleWheel}
        style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '24px 24px',
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
            transition: draggedTable || isPanning ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          <svg
            ref={svgRef}
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            {relationships.map((rel, index) => renderRelationshipLine(rel, index))}
          </svg>
          {schemaData.map(table => {
            const position = tablePositions.get(table.tableName);
            if (!position) return null;

            const headerColor = getTableHeaderColor(table.tableName);

            return (
              <div
                key={table.tableName}
                className={`absolute bg-white border rounded-lg shadow-lg select-none ${
                  selectedTable === table.tableName
                    ? 'border-blue-500 shadow-blue-200 ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                } ${draggedTable === table.tableName ? 'shadow-xl z-50 opacity-90 scale-[1.02]' : ''}`}
                style={{
                  left: position.x,
                  top: position.y,
                  width: position.width,
                  minHeight: position.height,
                  zIndex: selectedTable === table.tableName || draggedTable === table.tableName ? 10 : 1,
                  transition: draggedTable === table.tableName ? 'none' : 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
                }}
                onMouseDown={(e) => handleTableMouseDown(table.tableName, e)}
                onClick={(e) => handleTableClick(table.tableName, e)}
              >
                <div className={`table-header ${headerColor} rounded-t-lg px-4 py-3 cursor-move`}>
                  <h4 className="font-bold text-white text-sm">{table.tableName}</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {table.columns.map((column, index) => (
                    <div
                      key={column.column_name}
                      className={`flex items-center justify-between px-4 py-2 text-xs ${
                        column.is_primary_key ? 'bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* FIXED: Wrapped KeyRound in span with title */}
                        {column.is_primary_key && (
                          <span title="Primary Key">
                            <KeyRound className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                          </span>
                        )}
                        {column.is_foreign_key && !column.is_primary_key && (
                          <div className="w-3 h-3 bg-blue-400 rounded-full flex-shrink-0" title={`Foreign Key to ${column.foreign_table}`} />
                        )}
                        <span className="font-mono text-gray-800 truncate font-medium">
                          {column.column_name}
                        </span>
                        {column.is_foreign_key && (
                          <span className="text-xs text-blue-500 truncate">
                            → {column.foreign_table}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-right ml-2 flex-shrink-0">
                        {column.data_type}
                        {column.character_maximum_length && `(${column.character_maximum_length})`}
                        {column.is_nullable === 'NO' ? '' : '?'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
          <div className="w-full h-full relative bg-gray-50">
            <div 
              className="absolute" 
              style={{
                transform: `scale(${0.05})`, 
                transformOrigin: 'top left'
              }}
            >
              {schemaData.map(table => {
                const position = tablePositions.get(table.tableName);
                if (!position) return null;
                
                const headerColor = getTableHeaderColor(table.tableName);
                
                return (
                  <div
                    key={`mini-${table.tableName}`}
                    className={`absolute ${headerColor}`}
                    style={{
                      left: position.x,
                      top: position.y,
                      width: position.width,
                      height: 30,
                      opacity: 0.8
                    }}
                  />
                );
              })}
            </div>
            <div 
              className="absolute border-2 border-blue-500 bg-blue-500/10 pointer-events-none"
              style={{
                left: `${Math.min(100, Math.max(0, (-panOffset.x / 100) * 5))}%`,
                top: `${Math.min(100, Math.max(0, (-panOffset.y / 100) * 5))}%`,
                width: `${Math.min(100, 100 / zoomLevel)}%`,
                height: `${Math.min(100, 100 / zoomLevel)}%`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span>Tables: {schemaData.length}</span>
          <span>Relationships: {relationships.length}</span>
          <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
          <span>Mode: {interactionMode === 'select' ? 'Select' : 'Pan'}</span>
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>PK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>FK</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="20" height="8" className="inline">
                <line x1="0" y1="4" x2="5" y2="4" stroke="#6b7280" strokeWidth="1.5" />
                <line x1="10" y1="0" x2="10" y2="8" stroke="#6b7280" strokeWidth="1.5" />
                <line x1="15" y1="4" x2="20" y2="4" stroke="#6b7280" strokeWidth="1.5" />
              </svg>
              <span>One</span>
            </div>
            <div className="flex items-center gap-1">
              <svg width="20" height="8" className="inline">
                <line x1="0" y1="4" x2="5" y2="4" stroke="#6b7280" strokeWidth="1.5" />
                <path d="M10,0 L15,4 L10,8" stroke="#6b7280" strokeWidth="1.5" fill="none" />
                <line x1="15" y1="4" x2="20" y2="4" stroke="#6b7280" strokeWidth="1.5" />
              </svg>
              <span>Many</span>
            </div>
          </div>
          {isLocked && <span className="text-amber-600 font-medium">View Locked</span>}
        </div>
        <div className="flex items-center gap-2">
          {interactionMode === 'select' ? (
            <>
              <MousePointer className="h-3 w-3" />
              <span>Click to select • Drag to move tables</span>
            </>
          ) : (
            <>
              <Move className="h-3 w-3" />
              <span>Drag to pan • Ctrl+Scroll to zoom</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}