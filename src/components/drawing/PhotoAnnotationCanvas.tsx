'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Stage, Layer, Line, Rect, Circle, Text, Arrow, Image as KonvaImage, Transformer } from 'react-konva'
import { Pencil, Square, Circle as CircleIcon, Type, ArrowRight, Eraser, Undo, Redo, Download, MousePointer, Minus } from 'lucide-react'

interface Annotation {
  id: string
  tool: string
  points?: number[]
  x?: number
  y?: number
  width?: number
  height?: number
  radius?: number
  text?: string
  color: string
  strokeWidth: number
  fontSize?: number
}

interface PhotoAnnotationCanvasProps {
  photoUrl?: string
  onExport: (dataURL: string) => void
  width?: number
  height?: number
}

export function PhotoAnnotationCanvas({
  photoUrl,
  onExport,
  width = 800,
  height = 600
}: PhotoAnnotationCanvasProps) {
  const [tool, setTool] = useState<string>('pen')
  const [color, setColor] = useState('#ff0000')
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)
  const [history, setHistory] = useState<Annotation[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })

  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)

  // Load image when photoUrl changes
  useEffect(() => {
    if (photoUrl) {
      const img = new window.Image()
      img.crossOrigin = 'anonymous'
      img.src = photoUrl
      img.onload = () => {
        setImage(img)
      }
    }
  }, [photoUrl])

  // Update transformer when selection changes
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const stage = stageRef.current
      const selectedNode = stage?.findOne('#' + selectedId)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer().batchDraw()
      }
    }
  }, [selectedId])

  const saveToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newAnnotations)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations(history[historyIndex - 1])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations(history[historyIndex + 1])
    }
  }

  const handleMouseDown = (e: any) => {
    if (tool === 'select') {
      const clickedOnEmpty = e.target === e.target.getStage()
      if (clickedOnEmpty) {
        setSelectedId(null)
      }
      return
    }

    if (tool === 'eraser') {
      return
    }

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    const id = Date.now().toString()

    if (tool === 'text') {
      setTextPosition({ x: pos.x, y: pos.y })
      setShowTextInput(true)
      return
    }

    const newAnnotation: Annotation = {
      id,
      tool,
      color,
      strokeWidth,
      ...(tool === 'pen' || tool === 'line' || tool === 'arrow'
        ? { points: [pos.x, pos.y] }
        : { x: pos.x, y: pos.y, width: 0, height: 0, radius: 0 }
      ),
    }

    setCurrentAnnotation(newAnnotation)
  }

  const handleMouseMove = (e: any) => {
    if (!currentAnnotation) return

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()

    if (currentAnnotation.tool === 'pen') {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...(currentAnnotation.points || []), pos.x, pos.y],
      })
    } else if (currentAnnotation.tool === 'line' || currentAnnotation.tool === 'arrow') {
      const points = currentAnnotation.points || []
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [points[0], points[1], pos.x, pos.y],
      })
    } else if (currentAnnotation.tool === 'rect') {
      setCurrentAnnotation({
        ...currentAnnotation,
        width: pos.x - (currentAnnotation.x || 0),
        height: pos.y - (currentAnnotation.y || 0),
      })
    } else if (currentAnnotation.tool === 'circle') {
      const dx = pos.x - (currentAnnotation.x || 0)
      const dy = pos.y - (currentAnnotation.y || 0)
      setCurrentAnnotation({
        ...currentAnnotation,
        radius: Math.sqrt(dx * dx + dy * dy),
      })
    }
  }

  const handleMouseUp = () => {
    if (currentAnnotation) {
      const newAnnotations = [...annotations, currentAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
      setCurrentAnnotation(null)
    }
  }

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        tool: 'text',
        x: textPosition.x,
        y: textPosition.y,
        text: textInput,
        color,
        strokeWidth,
        fontSize: 20,
      }
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
    }
    setTextInput('')
    setShowTextInput(false)
  }

  const handleDelete = () => {
    if (selectedId) {
      const newAnnotations = annotations.filter(a => a.id !== selectedId)
      setAnnotations(newAnnotations)
      saveToHistory(newAnnotations)
      setSelectedId(null)
    }
  }

  const handleExport = () => {
    if (stageRef.current) {
      const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 })
      onExport(dataURL)
    }
  }

  const clearAll = () => {
    setAnnotations([])
    saveToHistory([])
    setSelectedId(null)
  }

  const renderAnnotation = (annotation: Annotation) => {
    const commonProps = {
      id: annotation.id,
      key: annotation.id,
      stroke: annotation.color,
      strokeWidth: annotation.strokeWidth,
      onClick: () => tool === 'select' && setSelectedId(annotation.id),
      draggable: tool === 'select',
    }

    switch (annotation.tool) {
      case 'pen':
        return (
          <Line
            {...commonProps}
            points={annotation.points}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
          />
        )
      case 'line':
        return (
          <Line
            {...commonProps}
            points={annotation.points}
            lineCap="round"
          />
        )
      case 'arrow':
        return (
          <Arrow
            {...commonProps}
            points={annotation.points || []}
            pointerLength={10}
            pointerWidth={10}
            fill={annotation.color}
          />
        )
      case 'rect':
        return (
          <Rect
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            width={annotation.width}
            height={annotation.height}
            fill="transparent"
          />
        )
      case 'circle':
        return (
          <Circle
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            radius={annotation.radius}
            fill="transparent"
          />
        )
      case 'text':
        return (
          <Text
            {...commonProps}
            x={annotation.x}
            y={annotation.y}
            text={annotation.text}
            fontSize={annotation.fontSize || 20}
            fill={annotation.color}
          />
        )
      default:
        return null
    }
  }

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'pen', icon: Pencil, label: 'Pen' },
    { id: 'line', icon: Minus, label: 'Line' },
    { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
    { id: 'rect', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: CircleIcon, label: 'Circle' },
    { id: 'text', icon: Type, label: 'Text' },
  ]

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000']

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-100 rounded-lg">
        {/* Tools */}
        <div className="flex gap-1 border-r border-gray-300 pr-3">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-2 rounded hover:bg-gray-200 transition-colors ${
                tool === t.id ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
              }`}
              title={t.label}
            >
              <t.icon className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex gap-1 border-r border-gray-300 pr-3">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded border-2 ${
                color === c ? 'border-blue-500 scale-110' : 'border-gray-300'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-2 border-r border-gray-300 pr-3">
          <span className="text-sm text-gray-600">Size:</span>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-600 w-6">{strokeWidth}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={!selectedId}
            className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-red-600"
            title="Delete Selected"
          >
            <Eraser className="w-5 h-5" />
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Clear All
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="font-bold mb-2">Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
              className="border border-gray-300 rounded px-3 py-2 w-64 mb-3"
              placeholder="Enter text..."
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowTextInput(false)}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleTextSubmit}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        >
          <Layer>
            {/* Background image if provided */}
            {image && (
              <KonvaImage
                image={image}
                width={width}
                height={height}
                listening={false}
              />
            )}

            {/* Render all annotations */}
            {annotations.map(renderAnnotation)}

            {/* Render current annotation being drawn */}
            {currentAnnotation && renderAnnotation(currentAnnotation)}

            {/* Transformer for selected items */}
            {selectedId && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (newBox.width < 5 || newBox.height < 5) {
                    return oldBox
                  }
                  return newBox
                }}
              />
            )}
          </Layer>
        </Stage>
      </div>

      {/* Instructions */}
      <p className="text-sm text-gray-500 text-center">
        {tool === 'select'
          ? 'Click on an annotation to select it. Drag to move.'
          : tool === 'text'
          ? 'Click anywhere to add text.'
          : 'Click and drag to draw. Use the toolbar to change tools and colors.'}
      </p>
    </div>
  )
}
