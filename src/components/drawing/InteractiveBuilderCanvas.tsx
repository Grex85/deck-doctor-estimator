'use client'

import React, { useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Circle } from 'react-konva'
import { Download, RotateCw, Trash2, ZoomIn, ZoomOut, Grid, Plus } from 'lucide-react'

interface DeckComponent {
  id: string
  type: 'deck' | 'stairs' | 'railing' | 'post' | 'beam' | 'landing'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  color: string
  label?: string
}

interface InteractiveBuilderCanvasProps {
  onExport: (dataURL: string) => void
  width?: number
  height?: number
  initialComponents?: DeckComponent[]
}

const GRID_SIZE = 20
const SCALE_FACTOR = 10 // 1 foot = 10 pixels

const componentTemplates: Record<string, Partial<DeckComponent>> = {
  deck: { width: 120, height: 100, color: '#8B4513', label: 'Deck' },
  stairs: { width: 40, height: 60, color: '#A0522D', label: 'Stairs' },
  railing: { width: 100, height: 10, color: '#4A4A4A', label: 'Railing' },
  post: { width: 15, height: 15, color: '#2F4F4F', label: 'Post' },
  beam: { width: 120, height: 8, color: '#654321', label: 'Beam' },
  landing: { width: 50, height: 50, color: '#A9A9A9', label: 'Landing' },
}

export function InteractiveBuilderCanvas({
  onExport,
  width = 800,
  height = 600,
  initialComponents = []
}: InteractiveBuilderCanvasProps) {
  const [components, setComponents] = useState<DeckComponent[]>(initialComponents)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [scale, setScale] = useState(1)
  const stageRef = useRef<any>(null)

  const addComponent = (type: DeckComponent['type']) => {
    const template = componentTemplates[type]
    const newComponent: DeckComponent = {
      id: Date.now().toString(),
      type,
      x: width / 2 - (template.width || 100) / 2,
      y: height / 2 - (template.height || 100) / 2,
      width: template.width || 100,
      height: template.height || 100,
      rotation: 0,
      color: template.color || '#888888',
      label: template.label,
    }
    setComponents([...components, newComponent])
    setSelectedId(newComponent.id)
  }

  const updateComponent = (id: string, updates: Partial<DeckComponent>) => {
    setComponents(components.map(c =>
      c.id === id ? { ...c, ...updates } : c
    ))
  }

  const deleteComponent = (id: string) => {
    setComponents(components.filter(c => c.id !== id))
    setSelectedId(null)
  }

  const rotateComponent = (id: string) => {
    const component = components.find(c => c.id === id)
    if (component) {
      updateComponent(id, { rotation: (component.rotation + 90) % 360 })
    }
  }

  const snapToGrid = (value: number) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE
  }

  const handleDragEnd = (id: string, e: any) => {
    const node = e.target
    updateComponent(id, {
      x: snapToGrid(node.x()),
      y: snapToGrid(node.y()),
    })
  }

  const handleExport = () => {
    if (stageRef.current) {
      // Temporarily hide selection
      const prevSelected = selectedId
      setSelectedId(null)

      setTimeout(() => {
        const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 })
        onExport(dataURL)
        setSelectedId(prevSelected)
      }, 100)
    }
  }

  const renderGrid = () => {
    const lines = []
    // Vertical lines
    for (let i = 0; i <= width / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      )
    }
    // Horizontal lines
    for (let i = 0; i <= height / GRID_SIZE; i++) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i * GRID_SIZE, width, i * GRID_SIZE]}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      )
    }
    return lines
  }

  const renderComponent = (component: DeckComponent) => {
    const isSelected = selectedId === component.id

    return (
      <Group
        key={component.id}
        x={component.x}
        y={component.y}
        rotation={component.rotation}
        draggable
        onClick={() => setSelectedId(component.id)}
        onTap={() => setSelectedId(component.id)}
        onDragEnd={(e) => handleDragEnd(component.id, e)}
      >
        {/* Main shape */}
        {component.type === 'post' ? (
          <Circle
            width={component.width}
            height={component.height}
            fill={component.color}
            stroke={isSelected ? '#0066ff' : '#333'}
            strokeWidth={isSelected ? 3 : 1}
            radius={component.width / 2}
            offsetX={-component.width / 2}
            offsetY={-component.height / 2}
          />
        ) : (
          <Rect
            width={component.width}
            height={component.height}
            fill={component.color}
            stroke={isSelected ? '#0066ff' : '#333'}
            strokeWidth={isSelected ? 3 : 1}
            cornerRadius={component.type === 'landing' ? 5 : 2}
          />
        )}

        {/* Label */}
        {component.label && (
          <Text
            text={component.label}
            x={5}
            y={component.height / 2 - 6}
            fontSize={12}
            fill="#ffffff"
            fontStyle="bold"
          />
        )}

        {/* Dimensions label */}
        <Text
          text={`${Math.round(component.width / SCALE_FACTOR)}'×${Math.round(component.height / SCALE_FACTOR)}'`}
          x={component.width / 2 - 15}
          y={component.height + 5}
          fontSize={10}
          fill="#666"
        />

        {/* Selection handles */}
        {isSelected && (
          <>
            {/* Resize handles */}
            <Rect
              x={component.width - 6}
              y={component.height - 6}
              width={12}
              height={12}
              fill="#0066ff"
              cornerRadius={2}
              draggable
              onDragMove={(e) => {
                const node = e.target
                const newWidth = Math.max(20, snapToGrid(component.width + node.x() - component.width + 6))
                const newHeight = Math.max(20, snapToGrid(component.height + node.y() - component.height + 6))
                updateComponent(component.id, { width: newWidth, height: newHeight })
                node.position({ x: component.width - 6, y: component.height - 6 })
              }}
            />
          </>
        )}
      </Group>
    )
  }

  const selectedComponent = components.find(c => c.id === selectedId)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-100 rounded-lg">
        {/* Add Components */}
        <div className="flex gap-1 border-r border-gray-300 pr-3">
          <span className="text-sm text-gray-600 mr-2">Add:</span>
          {Object.keys(componentTemplates).map((type) => (
            <button
              key={type}
              onClick={() => addComponent(type as DeckComponent['type'])}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 capitalize"
              title={`Add ${type}`}
            >
              <Plus className="w-3 h-3 inline mr-1" />
              {type}
            </button>
          ))}
        </div>

        {/* View Controls */}
        <div className="flex gap-1 border-r border-gray-300 pr-3">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded hover:bg-gray-200 ${showGrid ? 'bg-blue-100 text-blue-600' : ''}`}
            title="Toggle Grid"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScale(Math.min(scale + 0.1, 2))}
            className="p-2 rounded hover:bg-gray-200"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScale(Math.max(scale - 0.1, 0.5))}
            className="p-2 rounded hover:bg-gray-200"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>

        {/* Selection Actions */}
        {selectedComponent && (
          <div className="flex gap-1 border-r border-gray-300 pr-3">
            <button
              onClick={() => rotateComponent(selectedId!)}
              className="p-2 rounded hover:bg-gray-200"
              title="Rotate 90°"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => deleteComponent(selectedId!)}
              className="p-2 rounded hover:bg-gray-200 text-red-600"
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Size inputs for selected component */}
        {selectedComponent && (
          <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
            <span className="text-sm text-gray-600">Size:</span>
            <input
              type="number"
              value={Math.round(selectedComponent.width / SCALE_FACTOR)}
              onChange={(e) => updateComponent(selectedId!, { width: Number(e.target.value) * SCALE_FACTOR })}
              className="w-14 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
            />
            <span className="text-sm text-gray-600">×</span>
            <input
              type="number"
              value={Math.round(selectedComponent.height / SCALE_FACTOR)}
              onChange={(e) => updateComponent(selectedId!, { height: Number(e.target.value) * SCALE_FACTOR })}
              className="w-14 px-2 py-1 border border-gray-300 rounded text-sm"
              min="1"
            />
            <span className="text-sm text-gray-600">ft</span>
          </div>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 ml-auto"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          onClick={(e) => {
            if (e.target === e.target.getStage()) {
              setSelectedId(null)
            }
          }}
        >
          <Layer>
            {/* Grid */}
            {showGrid && renderGrid()}

            {/* Scale indicator */}
            <Text
              text={`Scale: 1 grid = ${GRID_SIZE / SCALE_FACTOR} ft | Zoom: ${Math.round(scale * 100)}%`}
              x={10}
              y={height / scale - 25}
              fontSize={11}
              fill="#666"
            />

            {/* Components */}
            {components.map(renderComponent)}
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-500 text-center space-y-1">
        <p>Click components to select. Drag to move. Drag corner handles to resize.</p>
        <p>Use the number inputs to set exact dimensions in feet.</p>
      </div>
    </div>
  )
}
